import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse Mailgun webhook data
    const formData = await req.formData()
    const eventData: any = {}
    
    for (const [key, value] of formData.entries()) {
      eventData[key] = value
    }

    const { event, recipient, 'message-id': messageId, timestamp } = eventData

    if (!event || !messageId) {
      return new Response('OK', { status: 200 })
    }

    // Update message status based on event
    let updateData: any = {}
    
    switch (event) {
      case 'delivered':
        updateData = { email_status: 'delivered', delivered_at: new Date(parseInt(timestamp) * 1000).toISOString() }
        break
      case 'opened':
        updateData = { email_status: 'opened', opened_at: new Date(parseInt(timestamp) * 1000).toISOString() }
        break
      case 'clicked':
        updateData = { email_status: 'clicked', clicked_at: new Date(parseInt(timestamp) * 1000).toISOString() }
        break
      case 'bounced':
      case 'dropped':
        updateData = { email_status: 'failed', failed_at: new Date(parseInt(timestamp) * 1000).toISOString() }
        break
      default:
        return new Response('OK', { status: 200 })
    }

    // Update the message record
    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('mailgun_id', messageId)

    if (error) {
      console.error('Failed to update message status:', error)
    }

    console.log(`Updated message ${messageId} status to ${event}`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Email status webhook error:', error)
    return new Response('OK', { status: 200 })
  }
})