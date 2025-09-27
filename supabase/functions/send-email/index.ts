import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  deal_id?: string
  dealer_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('=== EMAIL FUNCTION CALLED ===')
  console.log('Request method:', req.method)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { to, subject, html, text, from, deal_id, dealer_id }: EmailRequest = await req.json()

    console.log('Email request data:', { to, subject, from, deal_id, dealer_id })
    console.log('HTML content length:', html?.length)

    // Validate required fields
    if (!to || !subject || !html) {
      console.error('Missing required fields:', { to: !!to, subject: !!subject, html: !!html })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Mailgun credentials from environment
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN') || 'hagglehub.app'
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
    
    console.log('Mailgun config:', { 
      domain: mailgunDomain ? 'SET' : 'MISSING',
      apiKey: mailgunApiKey ? 'SET' : 'MISSING'
    })

    if (!mailgunApiKey) {
      console.error('MAILGUN_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'Mailgun not configured - missing API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    let currentUserId = null
    
    if (authHeader) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (user && !authError) {
          currentUserId = user.id
          console.log('Authenticated user ID:', currentUserId)
        } else {
          console.log('Auth error:', authError)
        }
      } catch (authErr) {
        console.log('Failed to get user from token:', authErr)
      }
    }

    console.log('Preparing to send via Mailgun...')

    // Prepare email data for Mailgun
    const formData = new FormData()
    formData.append('from', from || `HaggleHub <noreply@${mailgunDomain}>`)
    formData.append('to', to)
    formData.append('subject', subject)
    formData.append('html', html)
    if (text) formData.append('text', text)
    
    // Add tracking tags
    formData.append('o:tag', 'hagglehub')
    if (deal_id) formData.append('o:tag', `deal-${deal_id}`)
    if (dealer_id) formData.append('o:tag', `dealer-${dealer_id}`)

    console.log('Sending to Mailgun API...')

    // Send email via Mailgun
    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`
        },
        body: formData
      }
    )

    const mailgunResult = await mailgunResponse.json()

    console.log('Mailgun response status:', mailgunResponse.status)
    console.log('Mailgun response:', mailgunResult)
    
    if (!mailgunResponse.ok) {
      console.error('Mailgun error:', mailgunResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: mailgunResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email sent successfully via Mailgun!')
    
    // Log the sent message to database
    if (deal_id && dealer_id && currentUserId) {
      console.log('Logging sent message to database...')
      
      const { data: insertedMessage, error: dbError } = await supabase
        .from('messages')
        .insert({
          deal_id,
          dealer_id,
          content: text || html.replace(/<[^>]*>/g, ''),
          direction: 'outbound',
          channel: 'email',
          is_read: true,
          mailgun_id: mailgunResult.id,
          created_by: currentUserId
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        return new Response(
          JSON.stringify({ error: 'Failed to log message to database', details: dbError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log('Message logged to database successfully:', insertedMessage)
      }
    } else {
      console.error('Missing required data for database logging:', { 
        deal_id: !!deal_id, 
        dealer_id: !!dealer_id, 
        currentUserId: !!currentUserId 
      })
      return new Response(
        JSON.stringify({ error: 'Missing required data for message logging' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: mailgunResult.id,
        message: 'Email sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})