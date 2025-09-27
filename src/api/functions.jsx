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
  
  // Get current user for proper email context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get user profile for email details
  const { data: userProfile } = await supabase
    .from('users')
    .select('full_name, email_identifier')
    .eq('id', user.id)
    .single();
  
  // Get dealer information
  const { data: dealer } = await supabase
    .from('dealers')
    .select('name, contact_email')
    .eq('id', dealer_id)
    .single();
  
  // Get vehicle information for context
  const { data: deal } = await supabase
    .from('deals')
    .select('vehicle_id')
    .eq('id', deal_id)
    .single();
  
  let vehicleInfo = 'Vehicle';
  if (deal?.vehicle_id) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('year, make, model')
      .eq('id', deal.vehicle_id)
      .single();
    
    if (vehicle) {
      vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }
  }
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sodjajtwzboyeuqvztwk.supabase.co';
      data: {
        success: true,
        message: 'Mock email sent (Supabase config missing)',
        message_id: `mock-${Date.now()}`
      }
    };
  }
  
  try {
    console.log('Calling Supabase Edge Function...');
    
    const fromEmail = userProfile?.email_identifier 
      ? `deals-${userProfile.email_identifier}@hagglehub.app`
      : user.email;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: dealer?.contact_email || 'test@example.com',
        subject: `Re: ${vehicleInfo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0f766e; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Message from ${userProfile?.full_name || user.email}</h1>
            </div>
            <div style="padding: 30px; background-color: #f8fafc;">
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #0f766e; margin-top: 0;">Regarding:</h3>
                <p style="font-size: 16px; font-weight: bold; color: #1e293b;">${vehicleInfo}</p>
              </div>
              <div style="background-color: white; padding: 20px; border-radius: 8px;">
                <h3 style="color: #0f766e; margin-top: 0;">Message:</h3>
                <p style="line-height: 1.6; white-space: pre-wrap;">${message_content}</p>
              </div>
            </div>
            <div style="background-color: #e2e8f0; padding: 20px; text-align: center; font-size: 14px; color: #64748b;">
              <p>From: ${userProfile?.full_name || user.email} (${user.email})</p>
              <p>Sent via HaggleHub</p>
            </div>
          </div>
        `,
        text: message_content,
        from: `${userProfile?.full_name || user.email} via HaggleHub <${fromEmail}>`,
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
}
export const emailHandler = async (data) => ({ success: true, message: 'Mock email handled' });