// Email service functions for HaggleHub

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export async function sendReply({ message_content, dealer_id, deal_id }) {
  try {
    console.log('Calling Edge Function with:', { message_content, dealer_id, deal_id });
    
    // Get the current session token properly
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No valid session found:', sessionError);
      throw new Error('Authentication required');
    }

    console.log('Using session token for Edge Function call');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Test from HaggleHub',
        to: 'troy.b.johnson@gmail.com', // Your test email
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
}