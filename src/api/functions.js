import { base44 } from './base44Client';

export const testReceiver = async (data) => ({ success: true, message: 'Mock test receiver' });
export const messageProcessor = async (data) => ({ success: true, message: 'Mock message processed' });

// Real email sending function that calls Supabase Edge Function
export const sendReply = async ({ message_content, dealer_id, deal_id }) => {
  console.log('sendReply called with:', { message_content, dealer_id, deal_id });
  
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables');
    throw new Error('Supabase configuration missing');
  }
  
  try {
    console.log('Calling Supabase Edge Function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'test@example.com', // We'll get real dealer email later
        subject: 'Test from HaggleHub',
        html: `<p>${message_content}</p>`,
        text: message_content,
        deal_id,
        dealer_id
      })
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    return {
      data: {
        success: true,
        message: result.message || 'Email sent successfully',
        message_id: result.message_id
      }
    };
  } catch (error) {
    console.error('sendReply error:', error);
    throw error;
  }
};

export const emailHandler = async (data) => ({ success: true, message: 'Mock email handled' });