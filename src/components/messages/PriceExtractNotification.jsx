import React, { useState } from 'react';
import { Deal } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function PriceExtractNotification({ show, price, deal, onClose, onUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateDeal = async () => {
    if (!price || !deal) return;
    
    setIsUpdating(true);
    try {
      await Deal.update(deal.id, { 
        current_offer: price,
        status: 'negotiating' // Auto-update status when price is received
      });
      toast.success('Deal updated with new offer!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update deal:', error);
      toast.error('Failed to update deal');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {show && price && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-20 left-4 right-4 z-50"
        >
          <Card className="bg-lime-50 border-lime-200 shadow-lg max-w-sm mx-auto">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lime-200 rounded-full">
                    <DollarSign className="w-4 h-4 text-lime-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-lime-800">
                      Price detected: ${price.toLocaleString()}
                    </p>
                    <p className="text-xs text-lime-600">
                      Update your deal with this offer?
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-lime-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleUpdateDeal}
                  disabled={isUpdating}
                  className="flex-1 bg-lime-600 hover:bg-lime-700 text-white text-xs py-2"
                >
                  {isUpdating ? (
                    <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity}} className="w-3 h-3 border border-white border-t-transparent rounded-full mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  Update Deal
                </Button>
                <Button variant="outline" onClick={onClose} className="text-xs py-2 px-3">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}