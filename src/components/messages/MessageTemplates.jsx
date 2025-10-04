
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils';

const templates = {
  connect_understand: {
    title: "1. Connect & Understand",
    templates: [
      "It sounds like you're under a lot of pressure to move inventory this month.",
      "It seems like you really want to make this deal work for both of us.",
      "So if I understand correctly, you need to hit your monthly numbers and this car has been on the lot for a while. Is that right?"
    ]
  },
  gently_challenge: {
    title: "2. Gently Challenge the Price", 
    templates: [
      "How am I supposed to afford that payment with my budget?",
      "What would need to happen for us to get closer to $[TARGET_PRICE]?",
      "How does this price compare to what similar cars are selling for?"
    ]
  },
  control_conversation: {
    title: "3. Control the Conversation",
    templates: [
      "$[CURRENT_OFFER]? I was thinking more like $[TARGET_PRICE].",
      "So you're saying the absolute best you can do is $[CURRENT_OFFER]?",
      "The best price? Help me understand what 'best' means in this situation."
    ]
  },
  get_ahead_of_objections: {
    title: "4. Get Ahead of Objections",
    templates: [
      "You probably think I'm being unrealistic with my budget, but I've done my research on market prices.",
      "I know you might think I'm just another tire-kicker, but I'm ready to buy today at the right price.",
      "You're probably thinking this offer is too low, but I'm basing it on what these cars are actually selling for."
    ]
  },
  finalize_deal: {
    title: "5. Finalize the Deal",
    templates: [
      "It sounds like we both want the same thing: a fair deal that works for everyone.",
      "Let me make sure I've got this straight - you can do $[CURRENT_OFFER] but only if I finance through you?",
      "Great! If we can agree on that price, what's the next step to get the paperwork started?"
    ]
  }
};

export default function MessageTemplates({ onSelect, deal }) {
  const replaceVariables = (template) => {
    let message = template;
    
    // Replace common variables
    message = message.replace(/\[VEHICLE\]/g, 'vehicle');
    if (deal?.target_price) {
      message = message.replace(/\[TARGET_PRICE\]/g, formatCurrency(deal.target_price).replace('$', ''));
    }
    if (deal?.current_offer) {
      message = message.replace(/\[CURRENT_OFFER\]/g, formatCurrency(deal.current_offer).replace('$', ''));
    }
    
    return message;
  };

  return (
    <div className="overflow-y-auto space-y-4 mt-4 pb-4" style={{ maxHeight: 'calc(60vh - 120px)' }}>
      {Object.entries(templates).map(([category, data]) => (
        <Card key={category} className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700">{data.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.templates.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full text-left justify-start h-auto p-3 text-xs whitespace-normal"
                onClick={() => onSelect(replaceVariables(template))}
              >
                {replaceVariables(template)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
