// Email service functions for HaggleHub

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export async function sendReply({ message_content, dealer_id, deal_id }) {
  try {
    console.log('Calling Edge Function with:', { message_content, dealer_id, deal_id });
    
    // Get current user to use their unique email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user profile to get email_identifier
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('email_identifier, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.email_identifier) {
      throw new Error('User email identifier not found');
    }

    const userEmail = `deals-${profile.email_identifier}@hagglehub.app`;
    const fromName = profile.full_name || 'HaggleHub User';

    // Get the current session token properly
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No valid session found:', sessionError);
      throw new Error('Authentication required');
    }

    console.log('Using session token for Edge Function call');
    console.log('Sending from user email:', userEmail);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Re: Vehicle Inquiry',
        to: 'troy.b.johnson@gmail.com',
        html: `<p>${message_content}</p>`,
        text: message_content,
        from: `${fromName} <${userEmail}>`,
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