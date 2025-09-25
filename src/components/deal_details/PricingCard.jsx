
import React, { useState, useEffect } from 'react';
import { Deal } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, FileText, Calculator, ChevronDown, Save, HandCoins, Banknote, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge'; // Added import for Badge

// Define status colors and labels, assuming common deal statuses
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
  closed: 'bg-blue-100 text-blue-800',
  // Add other statuses as needed
};

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
  closed: 'Closed',
};

const purchaseTypeInfo = {
  cash: { icon: Banknote, label: 'Cash Purchase' },
  finance: { icon: Landmark, label: 'Financed Deal' },
  lease: { icon: HandCoins, label: 'Lease Agreement' },
};

const PriceItem = ({ label, value, colorClass, icon: Icon }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${colorClass || 'text-slate-600'}`} />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </div>
    <span className={`text-base font-bold ${colorClass || 'text-slate-900'}`}>
      {value ? `$${value.toLocaleString()}` : 'N/A'}
    </span>
  </div>
);

const FeesBreakdown = ({ deal, onDealUpdate }) => {
  const initialFees = {
    doc_fee: '',
    destination_fee: '',
    tax: '',
    title_fee: '',
    registration_fee: '',
    other_fees: '',
    ...deal.fees_breakdown
  };
  
  const [fees, setFees] = useState(initialFees);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when deal.fees_breakdown changes from parent
  useEffect(() => {
    setFees(prevFees => ({
      ...prevFees,
      ...deal.fees_breakdown
    }));
  }, [deal.fees_breakdown]);


  const handleFeeChange = (e) => {
    const { name, value } = e.target;
    setFees(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveFees = async () => {
    setIsSaving(true);
    try {
      const numericFees = Object.entries(fees).reduce((acc, [key, value]) => {
        // Ensure values are numbers before parsing, default to 0 if empty or invalid
        acc[key] = value !== '' && value !== null ? parseFloat(value) : 0;
        return acc;
      }, {});
      
      const updatedDeal = await Deal.update(deal.id, { fees_breakdown: numericFees });
      onDealUpdate(updatedDeal);
      toast.success('Fees updated successfully!');
    } catch (error) {
      console.error('Failed to save fees:', error);
      toast.error('Failed to save fees.');
    } finally {
      setIsSaving(false);
    }
  };

  const feeFields = [
    { name: 'doc_fee', label: 'Doc Fee' },
    { name: 'destination_fee', label: 'Destination' },
    { name: 'tax', label: 'Taxes' },
    { name: 'title_fee', label: 'Title Fee' },
    { name: 'registration_fee', label: 'Registration' },
    { name: 'other_fees', label: 'Other Fees' },
  ];

  return (
    <div className="space-y-3 pt-4 border-t border-slate-200">
      {feeFields.map(field => (
        <div key={field.name} className="flex items-center gap-2">
          <label htmlFor={field.name} className="text-sm text-slate-600 w-28 shrink-0">{field.label}</label>
          <Input
            id={field.name}
            type="number"
            name={field.name}
            placeholder="0.00"
            value={fees[field.name] !== undefined && fees[field.name] !== null ? fees[field.name] : ''} // Ensure controlled input with empty string for undefined/null
            onChange={handleFeeChange}
            className="text-sm"
          />
        </div>
      ))}
      <div className="pt-2">
        <Button onClick={handleSaveFees} disabled={isSaving} className="w-full bg-lime-600 hover:bg-lime-700">
          {isSaving ? <motion.div animate={{rotate:360}} transition={{duration:1, repeat:Infinity}} className="w-4 h-4 border-2 rounded-full border-t-transparent mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Update Fees
        </Button>
      </div>
    </div>
  );
};

export default function PricingCard({ deal, onDealUpdate }) {
  const [showFees, setShowFees] = useState(false);
  
  const totalFees = Object.values(deal.fees_breakdown || {}).reduce((sum, fee) => sum + (fee || 0), 0);
  const otdPrice = (deal.current_offer || deal.asking_price || 0) + totalFees;

  const PurchaseIcon = purchaseTypeInfo[deal.purchase_type]?.icon || Banknote;
  const purchaseLabel = purchaseTypeInfo[deal.purchase_type]?.label || 'Purchase Type N/A';


  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <DollarSign className="w-5 h-5 text-slate-700" />
            Pricing Overview
          </CardTitle>
          {deal.status && statusLabels[deal.status] && ( // Only render badge if status and label exist
            <Badge className={`${statusColors[deal.status] || 'bg-gray-100 text-gray-800'} border font-medium`}>
              {statusLabels[deal.status]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 pt-1">
          <PurchaseIcon className="w-4 h-4" />
          <span>{purchaseLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <PriceItem label="Asking Price" value={deal.asking_price} icon={FileText} />
        <PriceItem label="Current Offer" value={deal.current_offer} colorClass="text-blue-600" icon={DollarSign} />
        <PriceItem label="Target Price" value={deal.target_price} colorClass="text-green-600" icon={DollarSign} />

        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div 
            className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-slate-50"
            onClick={() => setShowFees(!showFees)}
          >
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-800">Total Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">${totalFees.toLocaleString()}</span>
              <motion.div animate={{ rotate: showFees ? 180 : 0 }}>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </motion.div>
            </div>
          </div>
          
          <AnimatePresence>
            {showFees && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden px-2"
              >
                <FeesBreakdown deal={deal} onDealUpdate={onDealUpdate} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="!mt-4 bg-teal-600 text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
            <h3 className="text-lg font-bold">Out-The-Door Price</h3>
            <p className="text-2xl font-extrabold tracking-tight">
              ${otdPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
