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
    // Use advanced matching logic to find the correct deal
    const matchResult = await findMatchingDeal(supabase, emailData, user.id, dealer.id)
    const matchedDeal = matchResult.deal
    
    let dealId = matchedDeal ? matchedDeal.id : user.fallback_deal_id
    console.log('Matched deal ID:', dealId)
    console.log('Is fallback deal:', dealId === user.fallback_deal_id)
    console.log('Match method:', matchedDeal ? 'VIN/Stock/Dealer' : 'Fallback')
    
    // If we found VIN or stock info but no matching vehicle, log it for potential manual review
    if (!matchedDeal && (matchResult.extractedVin || matchResult.extractedStock)) {
      console.log('=== POTENTIAL NEW VEHICLE DETECTED ===')
      console.log('VIN:', matchResult.extractedVin)
      console.log('Stock:', matchResult.extractedStock)
      console.log('This email may be about a new vehicle not yet tracked')
    }

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
  
  // Split content into lines for processing
  const lines = content.split('\n');
  const filteredLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Stop at lines starting with > (quoted text)
    if (trimmedLine.startsWith('>')) {
      console.log('Found quoted line starting with >, stopping at:', trimmedLine);
      break;
    }
    
    // Stop at "On [date] at [time] [name] <email> wrote:" patterns
    if (trimmedLine.match(/^On\s+\w+,\s+\w+\s+\d+,\s+\d{4}\s+at\s+\d+:\d+\s+(AM|PM).*wrote:\s*$/i)) {
      console.log('Found "On date at time wrote:" pattern, stopping at:', trimmedLine);
      break;
    }
    
    // Stop at other "wrote:" patterns with email addresses
    if (trimmedLine.includes('wrote:') && trimmedLine.includes('@')) {
      console.log('Found email wrote pattern, stopping at:', trimmedLine);
      break;
    }
    
    // Stop at email headers
    if (trimmedLine.startsWith('From:') || 
        trimmedLine.startsWith('Sent:') || 
        trimmedLine.startsWith('To:') || 
        trimmedLine.startsWith('Subject:')) {
      console.log('Found email header, stopping at:', trimmedLine);
      break;
    }
    
    filteredLines.push(line);
  }
  
  let cleaned = filteredLines.join('\n').trim();
  
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
  
  const finalCleaned = cleaned.trim();
  console.log('Cleaned content:', finalCleaned);
  return finalCleaned;
}

// Advanced message matching logic similar to Base44 processor
async function findMatchingDeal(supabase: any, emailData: Partial<InboundEmail>, userId: string, dealerId: string) {
  console.log('=== FINDING MATCHING DEAL ===');
  console.log('User ID:', userId);
  console.log('Dealer ID:', dealerId);
  
  const { sender, subject, 'body-plain': bodyPlain } = emailData;
  
  // Extract potential VIN from email content
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;
  const vinMatches = (subject + ' ' + bodyPlain).match(vinPattern);
  const extractedVin = vinMatches ? vinMatches[0].toUpperCase() : null;
  
  console.log('Extracted VIN from email:', extractedVin);
  
  // Extract potential stock number
  const stockPattern = /(?:stock|stk)[\s#:]*([A-Z0-9]+)/gi;
  const stockMatches = (subject + ' ' + bodyPlain).match(stockPattern);
  const extractedStock = stockMatches ? stockMatches[1] : null;
  
  console.log('Extracted stock number:', extractedStock);
  
  // Extract phone numbers from email signature
  const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const phoneMatches = bodyPlain.match(phonePattern);
  const extractedPhone = phoneMatches ? phoneMatches[0] : null;
  
  console.log('Extracted phone:', extractedPhone);
  
  let matchedDeal = null;
  
  // Step 1: Try VIN matching first (most reliable)
  if (extractedVin) {
    console.log('Step 1: Attempting VIN match for:', extractedVin);
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('vin', extractedVin)
      .eq('created_by', userId);
      
    if (vehicles && vehicles.length > 0) {
      console.log('Found vehicle with VIN:', vehicles[0].id);
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('vehicle_id', vehicles[0].id)
        .eq('created_by', userId)
        .in('status', ['quote_requested', 'negotiating', 'final_offer']);
        
      if (deals && deals.length > 0) {
        matchedDeal = deals[0];
        console.log('VIN matched to deal:', matchedDeal.id);
      }
    }
  }
  
  // Step 2: Try stock number matching
  if (!matchedDeal && extractedStock) {
    console.log('Step 2: Attempting stock number match for:', extractedStock);
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('stock_number', extractedStock)
      .eq('created_by', userId);
      
    if (vehicles && vehicles.length > 0) {
      console.log('Found vehicle with stock number:', vehicles[0].id);
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('vehicle_id', vehicles[0].id)
        .eq('created_by', userId)
        .in('status', ['quote_requested', 'negotiating', 'final_offer']);
        
      if (deals && deals.length > 0) {
        matchedDeal = deals[0];
        console.log('Stock number matched to deal:', matchedDeal.id);
      }
    }
  }
  
  // Step 3: Try dealer contact info matching (phone or email)
  if (!matchedDeal) {
    console.log('Step 3: Attempting dealer contact matching');
    
    // Update dealer with new contact info if we found any
    const dealerUpdates = {};
    if (extractedPhone && extractedPhone !== dealerId.phone) {
      dealerUpdates.phone = extractedPhone;
    }
    if (sender && sender !== dealerId.contact_email) {
      dealerUpdates.contact_email = sender;
    }
    
    if (Object.keys(dealerUpdates).length > 0) {
      console.log('Updating dealer with new contact info:', dealerUpdates);
      await supabase
        .from('dealers')
        .update(dealerUpdates)
        .eq('id', dealerId);
    }
    
    // Find active deals with this dealer
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('created_by', userId)
      .in('status', ['quote_requested', 'negotiating', 'final_offer'])
      .order('created_date', { ascending: false });
      
    if (deals && deals.length > 0) {
      matchedDeal = deals[0]; // Use most recent active deal
      console.log('Matched to most recent active deal with dealer:', matchedDeal.id);
    }
  }
  
  console.log('Final matched deal:', matchedDeal?.id || 'none');
  return {
    deal: matchedDeal,
    extractedVin,
    extractedStock,
    extractedPhone
  };
}