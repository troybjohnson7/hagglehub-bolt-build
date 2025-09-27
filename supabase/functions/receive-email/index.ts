/*
  # Receive Email Webhook Handler

  1. Purpose
    - Processes inbound emails from Mailgun webhooks
    - Routes emails to appropriate users based on email identifier
    - Creates message records and updates deals automatically

  2. Features
    - Handles Mailgun webhook format
    - Extracts user identifier from recipient email
    - Auto-creates dealers from unknown senders
    - Price extraction from email content
    - Automatic deal updates when offers are received

  3. Security
    - Uses service role key for database access
    - No authentication required (webhook endpoint)
    - Validates email format and user existence
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface InboundEmail {
  sender: string
  recipient: string
  subject: string
  'body-plain': string
  'body-html': string
  'message-id': string
  timestamp: string
}

Deno.serve(async (req: Request) => {
  const timestamp = new Date().toISOString()
  console.log('=== RECEIVE EMAIL FUNCTION STARTED ===')
  console.log('Timestamp:', timestamp)
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  if (req.method === "OPTIONS") {
    console.log('CORS preflight request - returning OK')
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== CREATING SUPABASE CLIENT WITH SERVICE ROLE ===')
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('Supabase client created with service role key')

    console.log('=== PARSING FORM DATA ===')
    // Parse form data from Mailgun webhook
    const formData = await req.formData()
    const emailData: Partial<InboundEmail> = {}
    
    for (const [key, value] of formData.entries()) {
      emailData[key as keyof InboundEmail] = value as string
    }
    
    console.log('=== RECEIVED EMAIL DATA ===')
    console.log('Full email data keys:', Object.keys(emailData))
    console.log('Sender:', emailData.sender)
    console.log('Recipient:', emailData.recipient)
    console.log('Subject:', emailData.subject)
    console.log('Body length:', emailData['body-plain']?.length)

    const { sender, recipient, subject, 'body-plain': bodyPlain, 'body-html': bodyHtml, 'message-id': messageId } = emailData
    
    if (!sender || !recipient || !bodyPlain) {
      console.error('=== MISSING REQUIRED FIELDS ===')
      console.error('sender:', !!sender)
      console.error('recipient:', !!recipient) 
      console.error('bodyPlain:', !!bodyPlain)
      return new Response('OK', { status: 200 })
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
      .select('id, fallback_deal_id, email_identifier')
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
    console.log('Found user:', user.id, 'with identifier:', user.email_identifier)

    console.log('=== FINDING OR CREATING DEALER ===')
    // Try to find existing dealer by sender email
    let dealer = null
    const { data: existingDealers } = await supabase
      .from('dealers')
      .select('id, name, contact_email')
      .eq('contact_email', sender)
      .eq('created_by', user.id)
      .limit(1)

    console.log('Existing dealers found:', existingDealers?.length || 0)
    
    if (existingDealers && existingDealers.length > 0) {
      dealer = existingDealers[0]
      console.log('Using existing dealer:', dealer.name)
    } else {
      // Create new dealer from sender info
      const senderDomain = sender.split('@')[1] || 'unknown.com'
      const dealerName = senderDomain.replace(/\.(com|net|org)$/, '').replace(/^www\./, '')
      console.log('Creating new dealer from domain:', dealerName)
      
      const { data: newDealer, error: dealerError } = await supabase
        .from('dealers')
        .insert({
          name: dealerName.charAt(0).toUpperCase() + dealerName.slice(1) + ' (Auto-created)',
          contact_email: sender,
          created_by: user.id
        })
        .select('id, name, contact_email')
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
      .select('id, status')
      .eq('dealer_id', dealer.id)
      .eq('created_by', user.id)
      .in('status', ['quote_requested', 'negotiating', 'final_offer'])
      .limit(1)

    let dealId = existingDeals && existingDeals.length > 0 
      ? existingDeals[0].id 
      : user.fallback_deal_id

    console.log('Using deal ID:', dealId)
    console.log('Is fallback deal:', dealId === user.fallback_deal_id)

    console.log('=== CREATING MESSAGE RECORD ===')
    // Clean the email content to remove quoted replies and signatures
    const cleanedContent = cleanEmailContent(bodyPlain)
    console.log('Original content length:', bodyPlain.length)
    console.log('Cleaned content length:', cleanedContent.length)
    console.log('Cleaned content:', cleanedContent)
    
    // Create the message record
    const { data: createdMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        deal_id: dealId,
        dealer_id: dealer.id,
        content: cleanedContent,
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
    // Update deal with new offer if price was extracted and it's not the fallback deal
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
    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('=== FUNCTION ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response('Error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

function cleanEmailContent(content: string): string {
  if (!content) return content;
  
  console.log('=== CLEANING EMAIL CONTENT ===');
  console.log('Original content:', content);
  
  // Remove quoted reply sections - look for common patterns
  
  // Split by lines and process line by line
    const trimmedLine = line.trim();
    
    // Stop at quoted text markers
    if (line.trim().startsWith('>')) {
    }
    
    // Stop at "On [date]... wrote:" patterns
    }
    
    // Stop at email headers
    if (trimmedLine.startsWith('From:') || 
        trimmedLine.startsWith('Sent:') || 
        trimmedLine.startsWith('To:') || 
    // Stop at "On [date]... wrote:" patterns
    if (trimmedLine.startsWith('On ') && trimmedLine.includes('wrote:')) {
      break;
    }
    
    // Stop at email headers
    if (trimmedLine.startsWith('From:') || 
        trimmedLine.startsWith('Sent:') || 
        trimmedLine.startsWith('To:') || 
        trimmedLine.startsWith('Subject:')) {
      break;
    }
    
    filteredLines.push(line);
  // Remove common email signatures
  const signaturePatterns = [
    /\n\n--\s*\n[\s\S]*$/,  // Standard signature delimiter
    /\n\nSent from my iPhone[\s\S]*$/i,
    /\n\nSent from my Android[\s\S]*$/i,
    /\n\nGet Outlook for iOS[\s\S]*$/i,
    /\n\nThanks,?\s*\n[\s\S]*$/i,
    /\n\nBest regards?,?\s*\n[\s\S]*$/i,
    /\n\nSincerely,?\s*\n[\s\S]*$/i
  ];
  
  for (const pattern of signaturePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  cleaned = filteredLines.join('\n');
  
  const finalCleaned = cleaned.trim();
  console.log('Cleaned content:', finalCleaned);
  return finalCleaned;
}