import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MailgunWebhook {
  'event-data': {
    event: string
    message: {
      headers: {
        'message-id': string
        from: string
        to: string
        subject: string
      }
    }
    recipient: string
    sender: string
    timestamp: number
  }
  signature: {
    timestamp: string
    token: string
    signature: string
  }
}

interface InboundEmail {
  sender: string
  recipient: string
  subject: string
  'body-plain': string
  'body-html': string
  'message-id': string
  timestamp: string
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

    // Parse form data from Mailgun webhook
    const formData = await req.formData()
    const emailData: Partial<InboundEmail> = {}
    
    for (const [key, value] of formData.entries()) {
      emailData[key as keyof InboundEmail] = value as string
    }

    const { sender, recipient, subject, 'body-plain': bodyPlain, 'body-html': bodyHtml, 'message-id': messageId } = emailData

    if (!sender || !recipient || !bodyPlain) {
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract user identifier from recipient email
    // Format: deals-{user_identifier}@hagglehub.app
    const recipientMatch = recipient?.match(/deals-([^@]+)@/)
    if (!recipientMatch) {
      console.log('Invalid recipient format:', recipient)
      return new Response('OK', { status: 200 })
    }

    const userIdentifier = recipientMatch[1]

    // Find user by email identifier
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, fallback_deal_id')
      .eq('email_identifier', userIdentifier)
      .limit(1)

    if (userError || !users || users.length === 0) {
      console.error('User not found for identifier:', userIdentifier, userError)
      return new Response('OK', { status: 200 })
    }

    const user = users[0]

    // Try to find existing dealer by sender email
    let dealer = null
    const { data: existingDealers } = await supabase
      .from('dealers')
      .select('id, name')
      .eq('contact_email', sender)
      .limit(1)

    if (existingDealers && existingDealers.length > 0) {
      dealer = existingDealers[0]
    } else {
      // Create new dealer from sender info
      const dealerName = sender.split('@')[1]?.replace(/\.(com|net|org)$/, '') || 'Unknown Dealer'
      
      const { data: newDealer, error: dealerError } = await supabase
        .from('dealers')
        .insert({
          name: dealerName.charAt(0).toUpperCase() + dealerName.slice(1),
          contact_email: sender,
          created_by: user.id
        })
        .select('id, name')
        .single()

      if (dealerError) {
        console.error('Failed to create dealer:', dealerError)
        return new Response('OK', { status: 200 })
      }

      dealer = newDealer
    }

    // Extract price information from email content
    const priceRegex = /\$[\d,]+(?:\.\d{2})?/g
    const prices = bodyPlain.match(priceRegex)
    let extractedPrice = null
    let containsOffer = false

    if (prices && prices.length > 0) {
      const numericPrice = parseFloat(prices[0].replace(/[$,]/g, ''))
      if (numericPrice > 1000) {
        extractedPrice = numericPrice
        containsOffer = true
      }
    }

    // Try to find an existing deal for this dealer
    const { data: existingDeals } = await supabase
      .from('deals')
      .select('id')
      .eq('dealer_id', dealer.id)
      .in('status', ['quote_requested', 'negotiating', 'final_offer'])
      .limit(1)

    let dealId = existingDeals && existingDeals.length > 0 
      ? existingDeals[0].id 
      : user.fallback_deal_id

    // Create the message record
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        deal_id: dealId,
        dealer_id: dealer.id,
        content: bodyPlain,
        direction: 'inbound',
        channel: 'email',
        is_read: false,
        contains_offer: containsOffer,
        extracted_price: extractedPrice,
        mailgun_id: messageId,
        created_by: user.id
      })

    if (messageError) {
      console.error('Failed to create message:', messageError)
      return new Response('Error', { status: 500 })
    }

    // Update deal with new offer if price was extracted and it's higher than current
    if (extractedPrice && dealId && dealId !== user.fallback_deal_id) {
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('current_offer')
        .eq('id', dealId)
        .single()

      if (currentDeal && (!currentDeal.current_offer || extractedPrice !== currentDeal.current_offer)) {
        await supabase
          .from('deals')
          .update({ 
            current_offer: extractedPrice,
            status: 'negotiating'
          })
          .eq('id', dealId)
      }
    }

    console.log(`Processed inbound email from ${sender} to ${recipient}`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Receive email error:', error)
    return new Response('Error', { status: 500 })
  }
})