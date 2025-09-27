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
        subject: 'Test from HaggleHub',
        to: 'troy.b.johnson@gmail.com', // Your test email
        html: `<p>${message_content}</p>`,
      body: JSON.stringify({
        text: message_content,
      },
        from: 'HaggleHub <noreply@hagglehub.app>',
        'Content-Type': 'application/json',
        deal_id,
        'Authorization': `Bearer ${supabaseKey}`,
        dealer_id
      headers: {
      })
      method: 'POST',
    });
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {

    // Actually call the Supabase Edge Function