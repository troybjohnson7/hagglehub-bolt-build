import { createClient } from '@supabase/supabase-js';

// Create Supabase client for functions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sodjajtwzboyeuqvztwk.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZGphanR3emJveWV1cXZ6dHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NzQ0NzQsImV4cCI6MjA0ODE1MDQ3NH0.YHBnkKGBxWJWKqJdLZQJmJGvQOQJmJGvQOQJmJGvQOQ';
const supabase = createClient(supabaseUrl, supabaseKey);

export const testReceiver = async (data) => ({ success: true, message: 'Mock test receiver' });
export const messageProcessor = async (data) => ({ success: true, message: 'Mock message processed' });

// Real email sending function that calls Supabase Edge Function
export const sendReply = async ({ message_content, dealer_id, deal_id }) => {
  console.log('sendReply called with:', { message_content, dealer_id, deal_id });
  
  try {
    // Actually call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'troy.b.johnson@gmail.com', // Your test email
        subject: 'Test from HaggleHub',
        html: `<p>${message_content}</p>`,
        text: message_content,
        from: 'HaggleHub <noreply@hagglehub.app>',
        deal_id,
        dealer_id
      })
    });

    console.log('Edge Function response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      throw new Error(`Edge Function failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Edge Function result:', result);
    
    return {
      data: result
    };
  } catch (error) {
    console.error('sendReply error:', error);
    throw error;
  }
};
export const emailHandler = async (data) => ({ success: true, message: 'Mock email handled' });