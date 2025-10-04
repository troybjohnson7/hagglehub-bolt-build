import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils';

const quickActions = [
  {
    id: 'accept_offer',
    label: 'Accept Offer',
   message: "Great! I'm ready to move forward with this offer. What's the next step to finalize everything?"
  },
  {
    id: 'counter_offer',
    label: 'Counter',
   message: "Thank you for the offer. I was hoping we could get closer to $[TARGET_PRICE]. Is there any flexibility on the price?"
  },
  {
    id: 'need_time',
    label: 'Need Time',
   message: "I appreciate the offer. I need some time to discuss this with my family. When do you need a decision by?"
  },
  {
    id: 'request_better',
    label: 'Best Price?',
   message: "Is this your absolute best price? I've been researching similar vehicles and want to make sure I'm getting a fair deal."
  }
];

export default function QuickActions({ deal, onAction }) {
  const handleQuickAction = (action) => {
    let message = action.message;
    
    // Replace placeholders with actual values
    if (deal.target_price) {
      message = message.replace('[TARGET_PRICE]', formatCurrency(deal.target_price).replace('$', ''));
    }
    
    onAction('send_message', { message });
  };

  return (
    <div className="bg-white border-t border-slate-200 p-2 sm:p-4">
      <div className="mb-2">
        <p className="text-xs font-medium text-slate-600 hidden sm:block">Quick Actions:</p>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:gap-2">
        {quickActions.map((action) => (
          <motion.div key={action.id} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => handleQuickAction(action)}
              className="w-full text-xs py-1.5 sm:py-2 px-2 sm:px-3 justify-center font-semibold bg-brand-teal hover:bg-brand-teal-dark text-white"
              size="sm"
            >
              {action.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}