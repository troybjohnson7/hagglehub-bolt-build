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
  const timestamp = new Date().toISOString()
  console.log('=== RECEIVE EMAIL FUNCTION STARTED ===')
  console.log('Timestamp:', timestamp)
  console.log('Request method:', req.method)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request - returning OK')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('=== PARSING FORM DATA ===')
    // Parse form data from Mailgun webhook
    const formData = await req.formData()
    const emailData: Partial<InboundEmail> = {}
    
    for (const [key, value] of formData.entries()) {
      emailData[key as keyof InboundEmail] = value as string
    }
    
    console.log('=== RECEIVED EMAIL DATA ===')
    console.log('Full email data:', JSON.stringify(emailData, null, 2))

    const { sender, recipient, subject, 'body-plain': bodyPlain, 'body-html': bodyHtml, 'message-id': messageId } = emailData
    
    console.log('=== EXTRACTED FIELDS ===')
    console.log('Sender:', sender)
    console.log('Recipient:', recipient)
    console.log('Subject:', subject)
    console.log('Body (first 100 chars):', bodyPlain?.substring(0, 100))
    console.log('Message ID:', messageId)

    if (!sender || !recipient || !bodyPlain) {
      console.error('=== MISSING REQUIRED FIELDS ===')
      console.error('sender:', !!sender)
      console.error('recipient:', !!recipient) 
      console.error('bodyPlain:', !!bodyPlain)
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== EXTRACTING USER IDENTIFIER ===')
    // Extract user identifier from recipient email
    // Format: deals-{user_identifier}@hagglehub.app
    const recipientMatch = recipient?.match(/deals-([^@]+)@/)
    console.log('Recipient match result:', recipientMatch)
    
    if (!recipientMatch) {
      console.error('=== INVALID RECIPIENT FORMAT ===')
      console.error('Expected format: deals-{identifier}@hagglehub.app')
      console.error('Actual recipient:', recipient)
      return new Response('OK', { status: 200 })
    }

    const userIdentifier = recipientMatch[1]
    console.log('Extracted user identifier:', userIdentifier)

    console.log('=== FINDING USER BY IDENTIFIER ===')
    // Find user by email identifier
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, fallback_deal_id')
      .eq('email_identifier', userIdentifier)
      .limit(1)

    console.log('User query result:', { users, userError })
    
    if (userError || !users || users.length === 0) {
      console.error('=== USER NOT FOUND ===')
      console.error('Identifier:', userIdentifier)
      console.error('Error:', userError)
      console.error('Users found:', users?.length || 0)
      return new Response('OK', { status: 200 })
    }

    const user = users[0]
    console.log('Found user:', user.id)

    console.log('=== FINDING OR CREATING DEALER ===')
    // Try to find existing dealer by sender email
    let dealer = null
    const { data: existingDealers } = await supabase
      .from('dealers')
      .select('id, name')
      .eq('contact_email', sender)
      .limit(1)

    console.log('Existing dealers found:', existingDealers?.length || 0)
    
    if (existingDealers && existingDealers.length > 0) {
      dealer = existingDealers[0]
      console.log('Using existing dealer:', dealer.name)
    } else {
      // Create new dealer from sender info
      const dealerName = sender.split('@')[1]?.replace(/\.(com|net|org)$/, '') || 'Unknown Dealer'
      console.log('Creating new dealer:', dealerName)
      
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
        console.error('=== DEALER CREATION FAILED ===')
        console.error('Error:', dealerError)
        return new Response('OK', { status: 200 })
      }

      dealer = newDealer
      console.log('Created new dealer:', dealer.name)
    }

    console.log('=== EXTRACTING PRICE INFORMATION ===')
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
        console.log('Extracted price:', extractedPrice)
      }
    }

    console.log('=== FINDING DEAL FOR MESSAGE ===')
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

    console.log('Using deal ID:', dealId)
    console.log('Is fallback deal:', dealId === user.fallback_deal_id)

    console.log('=== CREATING MESSAGE RECORD ===')
    // Create the message record
    const { data: createdMessage, error: messageError } = await supabase
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
      .select()
      .single()

    if (messageError) {
      console.error('=== MESSAGE CREATION FAILED ===')
      console.error('Error:', messageError)
      return new Response('Error', { status: 500 })
    }

    console.log('=== MESSAGE CREATED SUCCESSFULLY ===')
    console.log('Created message ID:', createdMessage.id)

    console.log('=== UPDATING DEAL IF NEEDED ===')
    // Update deal with new offer if price was extracted and it's higher than current
    if (extractedPrice && dealId && dealId !== user.fallback_deal_id) {
      console.log('Checking if deal needs price update...')
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('current_offer')
        .eq('id', dealId)
        .single()

      if (currentDeal && (!currentDeal.current_offer || extractedPrice !== currentDeal.current_offer)) {
        console.log('Updating deal with new price:', extractedPrice)
        const { error: updateError } = await supabase
          .from('deals')
          .update({ 
            current_offer: extractedPrice,
            status: 'negotiating'
          })
          .eq('id', dealId)
          
        if (updateError) {
          console.error('Failed to update deal:', updateError)
        } else {
          console.log('Deal updated successfully')
        }
      }
    }

    console.log('=== FUNCTION COMPLETED SUCCESSFULLY ===')
    console.log(`Processed inbound email from ${sender} to ${recipient}`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('=== FUNCTION ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response('Error', { status: 500 })
  }
})