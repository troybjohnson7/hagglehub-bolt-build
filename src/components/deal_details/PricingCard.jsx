import React, { useState, useEffect } from 'react';
import { Deal } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, FileText, Calculator, ChevronDown, Save, HandCoins, Banknote, Landmark, Edit3, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Define status colors and labels, assuming common deal statuses
const statusColors = {
  quote_requested: 'bg-yellow-100 text-yellow-800',
  negotiating: 'bg-blue-100 text-blue-800',
  final_offer: 'bg-orange-100 text-orange-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  quote_requested: 'Quote Requested',
  negotiating: 'Negotiating',
  final_offer: 'Final Offer',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

const purchaseTypeInfo = {
  cash: { icon: Banknote, label: 'Cash Purchase' },
  finance: { icon: Landmark, label: 'Finance' },
  lease: { icon: HandCoins, label: 'Lease' },
};

const EditablePriceItem = ({ label, value, colorClass, icon: Icon, placeholder, onSave, isOTDMode, totalFees }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    // When editing, show the appropriate value based on mode
    if (isOTDMode && (label.includes('Asking') || label.includes('Target'))) {
      // For OTD mode, show the sales price + fees
      setEditValue((value || 0) + totalFees);
    } else {
      // For sales price mode or current offer, show the raw value
      setEditValue(value || '');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const numericValue = parseFloat(editValue);
      if (!isNaN(numericValue) && numericValue > 0) {
        let finalValue = numericValue;
        
        // If we're in OTD mode and this is asking/target price, subtract fees to get sales price
        if (isOTDMode && (label.includes('Asking') || label.includes('Target'))) {
          finalValue = numericValue - totalFees;
        }
        
        await onSave(finalValue);
        setIsEditing(false);
        toast.success(`${label} updated successfully!`);
      } else {
        toast.error('Please enter a valid price');
      }
    } catch (error) {
      console.error('Failed to save price:', error);
      toast.error('Failed to save price');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  // Display value based on mode
  const displayValue = () => {
    if (!value) return null;
    if (isOTDMode && (label.includes('Asking') || label.includes('Target') || label.includes('Current Offer'))) {
      return value + totalFees;
    }
    return value;
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${colorClass || 'text-slate-600'}`} />
          <span className="text-sm font-medium text-slate-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="w-32 h-8 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-2"
          >
            {isSaving ? (
              <motion.div animate={{rotate:360}} transition={{duration:1, repeat:Infinity}} className="w-3 h-3 border border-t-transparent rounded-full" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="h-8 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border group hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${colorClass || 'text-slate-600'}`} />
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-base font-bold ${colorClass || 'text-slate-900'}`}>
          {displayValue() ? `$${displayValue().toLocaleString()}` : 'N/A'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEdit}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit3 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

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

export default function PricingCard({ deal, onDealUpdate, messages = [] }) {
  const [showFees, setShowFees] = useState(false);
  const [isOTDMode, setIsOTDMode] = useState(false);
  const [analyzedPricing, setAnalyzedPricing] = useState({
    latestOffer: null,
    priceHistory: [],
    negotiationProgress: null
  });
  
  const handleUpdateDealField = async (field, value) => {
    try {
      const updatedDeal = await Deal.update(deal.id, { [field]: value });
      onDealUpdate(updatedDeal);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      throw error;
    }
  };

  // Analyze messages for pricing information
  useEffect(() => {
    if (messages.length === 0) return;
    
    console.log('Analyzing messages for pricing information...');
    
    // Extract all prices from messages
    const priceHistory = [];
    let latestOffer = deal.current_offer;
    
    messages.forEach(message => {
      // Extract prices from message content using enhanced patterns
      const extractedPrices = extractPricesFromText(message.content);
      
      if (extractedPrices.length > 0) {
        extractedPrices.forEach(price => {
          priceHistory.push({
            price: price,
            date: message.created_date,
            direction: message.direction,
            content: message.content
          });
        });
        
        // Update latest offer if this is more recent inbound message
        if (message.direction === 'inbound') {
          const highestPrice = Math.max(...extractedPrices);
          if (!latestOffer || highestPrice !== latestOffer) {
            latestOffer = highestPrice;
          }
        }
      }
      
      // Also check the existing extracted_price field for backward compatibility
      if (message.contains_offer && message.extracted_price) {
        const existingPrice = message.extracted_price;
        // Only add if we didn't already extract this price
        const alreadyExtracted = extractedPrices.includes(existingPrice);
        if (!alreadyExtracted) {
          priceHistory.push({
            price: existingPrice,
            date: message.created_date,
            direction: message.direction,
            content: message.content
          });
          
          if (message.direction === 'inbound' && 
              (!latestOffer || existingPrice !== latestOffer)) {
            latestOffer = existingPrice;
          }
        }
      }
    });
    
    // Sort price history by date
    priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate negotiation progress
    let negotiationProgress = null;
    if (deal.asking_price && latestOffer) {
      const totalGap = deal.asking_price - (deal.target_price || latestOffer);
      const currentGap = deal.asking_price - latestOffer;
      const progressPercentage = totalGap > 0 ? ((totalGap - currentGap) / totalGap) * 100 : 0;
      
      negotiationProgress = {
        percentage: Math.max(0, Math.min(100, progressPercentage)),
        savings: deal.asking_price - latestOffer,
        remaining: latestOffer - (deal.target_price || latestOffer)
      };
    }
    
    setAnalyzedPricing({
      latestOffer,
      priceHistory,
      negotiationProgress
    });
    
    // Auto-update deal if we found a new offer
    if (latestOffer && latestOffer !== deal.current_offer) {
      console.log('Found new offer in messages:', latestOffer);
      handleAutoUpdateOffer(latestOffer);
    }
    
  }, [messages, deal.asking_price, deal.target_price, deal.current_offer]);

  // Enhanced price extraction function
  const extractPricesFromText = (text) => {
    const prices = [];
    
    // Pattern 1: $52K, $52k (with dollar sign and K)
    const dollarKPattern = /\$(\d{1,3}(?:\.\d)?)[kK]/g;
    let match;
    while ((match = dollarKPattern.exec(text)) !== null) {
      const price = parseFloat(match[1]) * 1000;
      if (price >= 1000 && price <= 500000) {
        prices.push(price);
        console.log('Extracted $K format price:', price, 'from:', match[0]);
      }
    }
    
    // Pattern 2: 52K, 52k (without dollar sign but with K)
    const kPattern = /\b(\d{1,3}(?:\.\d)?)[kK]\b/g;
    while ((match = kPattern.exec(text)) !== null) {
      const price = parseFloat(match[1]) * 1000;
      if (price >= 1000 && price <= 500000) {
        prices.push(price);
        console.log('Extracted K format price:', price, 'from:', match[0]);
      }
    }
    
    // Pattern 3: $52,000, $52000 (traditional dollar format)
    const dollarPattern = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    while ((match = dollarPattern.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 1000 && price <= 500000) {
        prices.push(price);
        console.log('Extracted $ format price:', price, 'from:', match[0]);
      }
    }
    
    // Pattern 4: 52000, 52,000 (numbers without $ in pricing context)
    // Only extract if the number appears in a pricing context
    const contextPattern = /(?:price|offer|cost|pay|payment|deal|quote|asking|selling|worth|value|total|otd|out.the.door)\s*[:\-]?\s*(\d{2,3}(?:,\d{3})*)\b/gi;
    while ((match = contextPattern.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 1000 && price <= 500000) {
        prices.push(price);
        console.log('Extracted contextual price:', price, 'from:', match[0]);
      }
    }
    
    // Pattern 5: Standalone large numbers that look like car prices (5-6 digits)
    const standalonePattern = /\b(\d{2,3}(?:,\d{3})+)\b/g;
    while ((match = standalonePattern.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price >= 10000 && price <= 500000) {
        prices.push(price);
        console.log('Extracted standalone price:', price, 'from:', match[0]);
      }
    }
    
    // Remove duplicates and return
    return [...new Set(prices)];
  };
  
  const handleAutoUpdateOffer = async (newOffer) => {
    try {
      const updatedDeal = await Deal.update(deal.id, { 
        current_offer: newOffer,
        status: 'negotiating'
      });
      onDealUpdate(updatedDeal);
      console.log('Auto-updated deal with new offer:', newOffer);
    } catch (error) {
      console.error('Failed to auto-update deal:', error);
    }
  };
  
  const totalFees = Object.values(deal.fees_breakdown || {}).reduce((sum, fee) => sum + (fee || 0), 0);
  const currentPrice = analyzedPricing.latestOffer || deal.current_offer || deal.asking_price || 0;
  const otdPrice = currentPrice + totalFees;

  const PurchaseIcon = purchaseTypeInfo[deal.purchase_type]?.icon || Banknote;
  const purchaseLabel = purchaseTypeInfo[deal.purchase_type]?.label || 'Purchase Type N/A';
  
  // Calculate negotiation progress based on current mode
  const negotiationProgress = (() => {
    if (!deal.asking_price || !currentPrice) {
      return { percentage: 0, savings: 0, remaining: 0 };
    }

    if (isOTDMode) {
      // OTD Mode: Add fees to all prices
      const askingOTD = deal.asking_price + totalFees;
      const currentOfferOTD = currentPrice + totalFees;
      const targetOTD = deal.target_price ? (deal.target_price + totalFees) : currentOfferOTD;
      
      const totalGap = askingOTD - targetOTD;
      const currentGap = askingOTD - currentOfferOTD;
      const progressPercentage = totalGap > 0 ? ((totalGap - currentGap) / totalGap) * 100 : 0;
      
      return {
        percentage: Math.max(0, Math.min(100, progressPercentage)),
        savings: askingOTD - currentOfferOTD,
        remaining: Math.max(0, currentOfferOTD - targetOTD)
      };
    } else {
      // Sales Price Mode: Use raw sales prices
      const askingPrice = deal.asking_price;
      const currentOffer = currentPrice;
      const targetPrice = deal.target_price || currentOffer;
      
      const totalGap = askingPrice - targetPrice;
      const currentGap = askingPrice - currentOffer;
      const progressPercentage = totalGap > 0 ? ((totalGap - currentGap) / totalGap) * 100 : 0;
      
      return {
        percentage: Math.max(0, Math.min(100, progressPercentage)),
        savings: askingPrice - currentOffer,
        remaining: Math.max(0, currentOffer - targetPrice)
      };
    }

  })();

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <DollarSign className="w-5 h-5 text-slate-700" />
            Pricing Overview
          </CardTitle>
          {deal.status && statusLabels[deal.status] && (
            <Badge className={`${statusColors[deal.status] || 'bg-gray-100 text-gray-800'} border font-medium`}>
              {statusLabels[deal.status]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 pt-1">
          <PurchaseIcon className="w-4 h-4" />
          <span>{purchaseLabel}</span>
        </div>
        
        {/* OTD Toggle Checkbox */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <input
            type="checkbox"
            id="otd-mode"
            checked={isOTDMode}
            onChange={(e) => setIsOTDMode(e.target.checked)}
            className="rounded border-slate-300"
          />
          <label htmlFor="otd-mode" className="text-sm text-slate-600 font-medium">
            Show Out-the-Door prices (includes taxes & fees)
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="group">
          <EditablePriceItem 
            label={isOTDMode ? "Asking Out-the-Door" : "Asking Sales Price"} 
            value={deal.asking_price} 
            icon={FileText}
            placeholder="Enter asking price"
            onSave={(value) => handleUpdateDealField('asking_price', value)}
            isOTDMode={isOTDMode}
            totalFees={totalFees}
          />
        </div>
        <div className="group">
          <EditablePriceItem 
            label="Current Offer" 
            value={analyzedPricing.latestOffer || deal.current_offer} 
            colorClass="text-blue-600" 
            icon={DollarSign}
            placeholder="Enter current offer"
            onSave={(value) => handleUpdateDealField('current_offer', value)}
            isOTDMode={isOTDMode}
            totalFees={totalFees}
          />
        </div>
        <div className="group">
          <EditablePriceItem 
            label={isOTDMode ? "Your Target Out-the-Door" : "Your Target Sales Price"} 
            value={deal.target_price} 
            colorClass="text-green-600" 
            icon={DollarSign}
            placeholder="Enter target price"
            onSave={(value) => handleUpdateDealField('target_price', value)}
            isOTDMode={isOTDMode}
            totalFees={totalFees}
          />
        </div>
        
        {/* Negotiation Progress Bar */}
        {(deal.asking_price && currentPrice) && (
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-800">Negotiation Progress</span>
            </div>
            
            {(() => {
              // Simple calculation: Asking - Current Offer = Savings
              const askingPrice = isOTDMode ? (deal.asking_price + totalFees) : deal.asking_price;
              const currentOffer = isOTDMode ? ((analyzedPricing.latestOffer || deal.current_offer) + totalFees) : (analyzedPricing.latestOffer || deal.current_offer);
              const savings = askingPrice - currentOffer;
              
              return (
                <div>
                  <div className="text-2xl font-bold text-brand-teal mb-1">
                    ${savings > 0 ? savings.toLocaleString() : '0'}
                  </div>
                  <div className="text-sm text-slate-600">
                    Total Savings
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {isOTDMode ? 'Based on Out-the-Door prices' : 'Based on Sales prices'}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Price History */}
        {analyzedPricing.priceHistory.length > 0 && (
          <div className="bg-slate-50 border rounded-lg p-3">
            <h4 className="text-sm font-medium text-slate-800 mb-2">Recent Price Activity</h4>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {analyzedPricing.priceHistory.slice(-3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${entry.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`}>
                    {entry.direction === 'inbound' ? 'Dealer' : 'You'}: ${entry.price.toLocaleString()}
                  </span>
                  <span className="text-slate-500">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div>
              <h3 className="text-lg font-bold">Out-The-Door Price</h3>
              <p className="text-xs text-teal-200">Sales Price + Fees</p>
            </div>
            <p className="text-2xl font-extrabold tracking-tight">
              ${otdPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}