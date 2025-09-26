// Test script to verify email functionality
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sodjajtwzboyeuqvztwk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailFunction() {
  console.log('🧪 Testing HaggleHub Email Functionality...\n');
  
  try {
    console.log('📧 Testing send-email edge function...');
    
    const testEmailData = {
      to: 'test@example.com',
      subject: 'HaggleHub Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from HaggleHub.</p>',
      text: 'Test Email\n\nThis is a test email from HaggleHub.',
      from: 'HaggleHub Test <noreply@hagglehub.app>',
      deal_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
      dealer_id: '123e4567-e89b-12d3-a456-426614174001'  // Valid UUID format
    };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Send-email function working!');
      console.log('Response:', result);
    } else {
      console.log('❌ Send-email function failed');
      console.log('Error:', result);
    }
    
    console.log('\n📨 Testing receive-email edge function...');
    
    // Test the receive-email function with mock data
    const mockInboundEmail = new FormData();
    mockInboundEmail.append('sender', 'dealer@toyotaofcedarpark.com');
    mockInboundEmail.append('recipient', 'deals-admin123@hagglehub.app');
    mockInboundEmail.append('subject', 'Re: 2019 Buick Encore');
    mockInboundEmail.append('body-plain', 'Hi! Thanks for your interest. Our best price is $13,500. Let me know if you want to move forward!');
    mockInboundEmail.append('message-id', `test-${Date.now()}`);
    
    const receiveResponse = await fetch(`${supabaseUrl}/functions/v1/receive-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: mockInboundEmail
    });
    
    if (receiveResponse.ok) {
      console.log('✅ Receive-email function working!');
    } else {
      console.log('❌ Receive-email function failed');
      const receiveResult = await receiveResponse.text();
      console.log('Error:', receiveResult);
    }
    
    console.log('\n🎯 Email system test complete!');
    console.log('\nNext steps:');
    console.log('1. Set up Mailgun domain and API key for production');
    console.log('2. Configure DNS records for hagglehub.app');
    console.log('3. Test with real email addresses');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEmailFunction();