// Email service for HaggleHub using Supabase Edge Functions with Mailgun

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class EmailService {
  static async sendEmail({ to, subject, html, text, from, deal_id, dealer_id }) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
          from,
          deal_id,
          dealer_id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      return result;
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  static async sendDealerInquiry({ dealerEmail, dealerName, userEmail, userName, vehicleInfo, message, deal_id, dealer_id }) {
    const subject = `Inquiry about ${vehicleInfo}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0f766e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Vehicle Inquiry</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">New Customer Inquiry</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #0f766e; margin-top: 0;">Vehicle of Interest:</h3>
            <p style="font-size: 16px; font-weight: bold; color: #1e293b;">${vehicleInfo}</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #0f766e; margin-top: 0;">Customer Information:</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #0f766e; margin-top: 0;">Message:</h3>
            <p style="line-height: 1.6;">${message}</p>
          </div>
        </div>
        
        <div style="background-color: #e2e8f0; padding: 20px; text-align: center; font-size: 14px; color: #64748b;">
          <p>This inquiry was sent through HaggleHub. Please respond directly to the customer's email address above.</p>
        </div>
      </div>
    `;

    const text = `
Vehicle Inquiry

Vehicle of Interest: ${vehicleInfo}

Customer Information:
Name: ${userName}
Email: ${userEmail}

Message:
${message}

---
This inquiry was sent through HaggleHub. Please respond directly to the customer's email address above.
    `;

    return this.sendEmail({
      to: dealerEmail,
      subject,
      html,
      text,
      from: `${userName} via HaggleHub <noreply@hagglehub.app>`,
      deal_id,
      dealer_id
    });
  }

  static async sendReplyToDealer({ dealerEmail, dealerName, userEmail, userName, vehicleInfo, message, deal_id, dealer_id }) {
    const subject = `Re: ${vehicleInfo}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0f766e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Message from ${userName}</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8fafc;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #0f766e; margin-top: 0;">Regarding:</h3>
            <p style="font-size: 16px; font-weight: bold; color: #1e293b;">${vehicleInfo}</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #0f766e; margin-top: 0;">Message:</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        
        <div style="background-color: #e2e8f0; padding: 20px; text-align: center; font-size: 14px; color: #64748b;">
          <p>From: ${userName} (${userEmail})</p>
          <p>Sent via HaggleHub</p>
        </div>
      </div>
    `;

    const text = `
Message from ${userName}

Regarding: ${vehicleInfo}

Message:
${message}

---
From: ${userName} (${userEmail})
Sent via HaggleHub
    `;

    return this.sendEmail({
      to: dealerEmail,
      subject,
      html,
      text,
      from: `${userName} via HaggleHub <noreply@hagglehub.app>`,
      deal_id,
      dealer_id
    });
  }

  static generateUserEmail(userIdentifier) {
    return `deals-${userIdentifier}@hagglehub.app`;
  }
}