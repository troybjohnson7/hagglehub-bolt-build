import { useState } from 'react';
import { Deal } from '@/api/entities';
import { MarketData } from '@/api/entities';
import { formatCurrency } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, TrendingUp, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function CompleteDealModal({ 
  isOpen, 
  onClose, 
  deal, 
  vehicle, 
  onDealCompleted 
}) {
  const [outcome, setOutcome] = useState(''); // 'deal_won' or 'deal_lost'
  const [finalPrice, setFinalPrice] = useState(deal?.current_offer?.toString() || '');
  const [notes, setNotes] = useState('');
  const [shareData, setShareData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outcome) {
      toast.error('Please select deal outcome');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate negotiation duration
      const startDate = new Date(deal.created_date);
      const endDate = new Date();
      const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      // Update the deal
      const updatedDeal = await Deal.update(deal.id, {
        status: outcome,
        final_price: outcome === 'deal_won' ? parseFloat(finalPrice) : null,
        negotiation_duration_days: durationDays,
        shared_anonymously: shareData
      });

      // If user opted to share data and deal was won, create market data
      if (shareData && outcome === 'deal_won' && vehicle) {
        const savings = deal.asking_price - parseFloat(finalPrice);
        const savingsPercentage = (savings / deal.asking_price) * 100;
        
        // Generalize mileage for privacy
        const getMileageRange = (mileage) => {
          if (!mileage) return 'other';
          if (mileage <= 10000) return '0-10k';
          if (mileage <= 30000) return '10k-30k';
          if (mileage <= 50000) return '30k-50k';
          if (mileage <= 75000) return '50k-75k';
          if (mileage <= 100000) return '75k-100k';
          return '100k+';
        };

        await MarketData.create({
          vehicle_year: vehicle.year,
          vehicle_make: vehicle.make,
          vehicle_model: vehicle.model,
          vehicle_trim: vehicle.trim,
          mileage_range: getMileageRange(vehicle.mileage),
          purchase_type: deal.purchase_type,
          asking_price: deal.asking_price,
          final_price: parseFloat(finalPrice),
          savings_amount: savings,
          savings_percentage: savingsPercentage,
          negotiation_duration_days: durationDays,
          region: 'other', // Could be enhanced to detect region
          deal_outcome: outcome
        });
      }

      toast.success(
        outcome === 'deal_won' 
          ? `Congratulations! Deal completed${shareData ? ' and data shared to help the community.' : '.'}` 
          : 'Deal marked as lost. Better luck next time!'
      );
      
      onDealCompleted(updatedDeal);
      onClose();
    } catch (error) {
      console.error('Failed to complete deal:', error);
      toast.error('Failed to complete deal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!deal || !vehicle) return null;

  const potentialSavings = deal.asking_price && finalPrice ? 
    deal.asking_price - parseFloat(finalPrice) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Deal</DialogTitle>
          <DialogDescription>
            Let us know how your negotiation turned out for {vehicle.year} {vehicle.make} {vehicle.model}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Outcome Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">How did it go?</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${
                  outcome === 'deal_won' ? 'border-green-500 bg-green-50' : 'hover:border-green-300'
                }`}
                onClick={() => setOutcome('deal_won')}
              >
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Deal Won!</p>
                  <p className="text-xs text-green-600">I bought the car</p>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all ${
                  outcome === 'deal_lost' ? 'border-red-500 bg-red-50' : 'hover:border-red-300'
                }`}
                onClick={() => setOutcome('deal_lost')}
              >
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="font-semibold text-red-800">Deal Lost</p>
                  <p className="text-xs text-red-600">It didn't work out</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Final Price (if won) */}
          {outcome === 'deal_won' && (
            <div className="space-y-2">
              <Label htmlFor="final_price">Final Price *</Label>
              <Input
                id="final_price"
                type="number"
                step="0.01"
                placeholder="Enter final agreed price"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                required
              />
              {finalPrice && parseFloat(finalPrice) > 0 && (
                <p className="text-sm text-slate-600">
                  Final price: <span className="font-semibold text-slate-900">{formatCurrency(parseFloat(finalPrice))}</span>
                </p>
              )}
              {potentialSavings > 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>You saved {formatCurrency(potentialSavings)}!</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Final Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any final thoughts or lessons learned?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Data Sharing Opt-in */}
          {outcome === 'deal_won' && (
            <Card className="border-lime-200 bg-lime-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="share_data"
                    checked={shareData}
                    onCheckedChange={setShareData}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="share_data" className="text-sm font-semibold text-lime-800 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4" />
                        Help the HaggleHub community
                      </div>
                    </Label>
                    <p className="text-xs text-lime-700">
                      Anonymously share this deal's data to improve market insights for all users. 
                      We'll never share your personal information.
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="w-3 h-3 text-lime-600" />
                      <span className="text-xs text-lime-600">100% Anonymous</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-brand-teal hover:bg-brand-teal-dark"
            >
              {isSubmitting ? 'Completing...' : 'Complete Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}