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
  const timestamp = new Date().toISOString()
  console.log('=== EMAIL FUNCTION STARTED ===')
  console.log('Timestamp:', timestamp)
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request - returning OK')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== PARSING REQUEST BODY ===')
    const requestBody = await req.json()
    console.log(`[${timestamp}] Request body received:`, JSON.stringify(requestBody, null, 2))

    const { to, subject, html, text, from, deal_id, dealer_id }: EmailRequest = requestBody
    
    // Special logging for test messages
    if (subject?.includes('Test') || html?.includes('Test')) {
      console.log(`🧪 [TEST MESSAGE DETECTED] ${timestamp}`)
      console.log(`🧪 Subject: "${subject}"`)
      console.log(`🧪 Content: "${html}"`)
      console.log(`🧪 To: "${to}"`)
    }

    console.log('=== VALIDATING REQUIRED FIELDS ===')
    console.log('to:', to)
    console.log('subject:', subject)
    console.log('html length:', html?.length)
    console.log('from:', from)
    console.log('deal_id:', deal_id)
    console.log('dealer_id:', dealer_id)

    // Validate required fields
    if (!to || !subject || !html) {
      console.error('VALIDATION FAILED - Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== CHECKING ENVIRONMENT VARIABLES ===')
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
    
    console.log('MAILGUN_DOMAIN:', mailgunDomain ? `SET (${mailgunDomain})` : 'NOT SET')
    console.log('MAILGUN_API_KEY:', mailgunApiKey ? `SET (length: ${mailgunApiKey.length})` : 'NOT SET')

    if (!mailgunApiKey) {
      console.error('MAILGUN_API_KEY is missing')
      return new Response(
        JSON.stringify({ error: 'Mailgun API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== CREATING SUPABASE CLIENT ===')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET')

    const supabase = createClient(supabaseUrl ?? '', supabaseServiceKey ?? '')

    console.log('=== AUTHENTICATING USER ===')
    const authHeader = req.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    let currentUserId = null
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        console.log('Extracted token length:', token.length)
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError) {
          console.error('Auth error:', authError)
        } else if (user) {
          currentUserId = user.id
          console.log('Authenticated user ID:', currentUserId)
        } else {
          console.log('No user returned from auth')
        }
      } catch (authErr) {
        console.error('Exception during auth:', authErr)
      }
    } else {
      console.log('No authorization header provided')
    }

    console.log('=== PREPARING MAILGUN REQUEST ===')
    const fromEmail = from || `HaggleHub <noreply@${mailgunDomain}>`
    console.log('From email:', fromEmail)
    console.log('To email:', to)
    console.log('Subject:', subject)

    // Prepare email data for Mailgun
    const formData = new FormData()
    formData.append('from', fromEmail)
    formData.append('to', to)
    formData.append('subject', subject)
    formData.append('html', html)
    if (text) formData.append('text', text)
    
    // Add tracking tags
    formData.append('o:tag', 'hagglehub')
    if (deal_id) formData.append('o:tag', `deal-${deal_id}`)
    if (dealer_id) formData.append('o:tag', `dealer-${dealer_id}`)

    console.log('FormData prepared with tags')

    console.log('=== CALLING MAILGUN API ===')
    const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`
    console.log('Mailgun URL:', mailgunUrl)
    
    const authString = `api:${mailgunApiKey}`
    const encodedAuth = btoa(authString)
    console.log('Auth string prepared (length):', authString.length)

    try {
      const mailgunResponse = await fetch(mailgunUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedAuth}`
        },
        body: formData
      })

      console.log('Mailgun response status:', mailgunResponse.status)
      console.log('Mailgun response headers:', Object.fromEntries(mailgunResponse.headers.entries()))

      const mailgunResult = await mailgunResponse.text()
      console.log('Mailgun response body:', mailgunResult)

      let parsedResult
      try {
        parsedResult = JSON.parse(mailgunResult)
        console.log('Parsed Mailgun result:', parsedResult)
      } catch (parseError) {
        console.error('Failed to parse Mailgun response as JSON:', parseError)
        console.log('Raw response:', mailgunResult)
        throw new Error(`Mailgun returned non-JSON response: ${mailgunResult}`)
      }

      if (!mailgunResponse.ok) {
        console.error('Mailgun API error:', parsedResult)
        throw new Error(`Mailgun API error: ${JSON.stringify(parsedResult)}`)
      }

      console.log('=== EMAIL SENT SUCCESSFULLY ===')
      console.log('Mailgun message ID:', parsedResult.id)

    } catch (mailgunError) {
      console.error('=== MAILGUN ERROR ===')
      console.error('Error details:', mailgunError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via Mailgun', 
          details: mailgunError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== LOGGING MESSAGE TO DATABASE ===')
    if (deal_id && dealer_id && currentUserId) {
      console.log('All required data present for database logging')
      
      const messageData = {
        deal_id,
        dealer_id,
        content: text || html.replace(/<[^>]*>/g, ''),
        direction: 'outbound',
        channel: 'email',
        is_read: true,
        mailgun_id: parsedResult.id || null,
        created_by: currentUserId
      }
      
      console.log('Message data to insert:', messageData)

      const { data: insertedMessage, error: dbError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (dbError) {
        console.error('=== DATABASE ERROR ===')
        console.error('Database error details:', dbError)
        return new Response(
          JSON.stringify({ 
            error: 'Email sent but failed to log to database', 
            details: dbError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('=== MESSAGE LOGGED SUCCESSFULLY ===')
      console.log('Inserted message:', insertedMessage)
    } else {
      console.error('=== MISSING DATA FOR DATABASE LOGGING ===')
      console.error('deal_id:', deal_id)
      console.error('dealer_id:', dealer_id) 
      console.error('currentUserId:', currentUserId)
      
      // Return error if we can't log the message
      return new Response(
        JSON.stringify({ 
          error: 'Missing required data for message logging',
          details: `deal_id: ${deal_id}, dealer_id: ${dealer_id}, user: ${currentUserId ? 'present' : 'missing'}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== FUNCTION COMPLETED SUCCESSFULLY ===')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: parsedResult.id,
        message: 'Email sent and logged successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== FUNCTION ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})