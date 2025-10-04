import React, { useState, useEffect } from 'react';
import { Deal } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DollarSign, FileText, Calculator, ChevronDown, Save, HandCoins, Banknote, Landmark, Edit3, Check, X, MapPin, Info, Lock, Unlock, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  calculateTaxesAndFees,
  calculateOTDFromComponents,
  saveDealFees,
  isValidZipCode,
  formatCurrency,
  formatTaxRate,
  convertSalesPriceToOTD,
  convertOTDToSalesPrice,
  getTotalFees,
  syncOTDPricesFromSalesPrice,
  syncSalesPricesFromOTD,
  toggleNegotiationMode
} from '@/utils/taxCalculations';

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

const EditablePriceItem = ({ label, value, colorClass, icon: Icon, placeholder, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(value || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const numericValue = parseFloat(editValue);
      if (!isNaN(numericValue) && numericValue > 0) {
        await onSave(numericValue);
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
          {value ? formatCurrency(value) : 'N/A'}
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

const TaxesAndFeesSection = ({ deal, onDealUpdate, onFeesChange }) => {
  const [zipCode, setZipCode] = useState(deal.buyer_zip_code || '');
  const [isEditingFees, setIsEditingFees] = useState(false);
  const [manualFees, setManualFees] = useState({
    salesTax: deal.estimated_sales_tax || 0,
    registrationFee: deal.estimated_registration_fee || 0,
    docFee: deal.estimated_doc_fee || 0,
    titleFee: deal.estimated_title_fee || 0
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taxRateInfo, setTaxRateInfo] = useState(null);

  useEffect(() => {
    setManualFees({
      salesTax: deal.estimated_sales_tax || 0,
      registrationFee: deal.estimated_registration_fee || 0,
      docFee: deal.estimated_doc_fee || 0,
      titleFee: deal.estimated_title_fee || 0
    });
  }, [deal]);

  const handleCalculateFees = async () => {
    if (!deal.asking_price) {
      toast.error('Please enter an asking sales price first');
      return;
    }

    if (!isValidZipCode(zipCode)) {
      toast.error('Please enter a valid 5-digit zip code');
      return;
    }

    setIsCalculating(true);
    try {
      const fees = await calculateTaxesAndFees(deal.asking_price, zipCode);

      setManualFees({
        salesTax: fees.salesTax,
        registrationFee: fees.registrationFee,
        docFee: fees.docFee,
        titleFee: fees.titleFee
      });

      setTaxRateInfo(fees.zipCodeData);

      await saveDealFees(deal.id, fees, false);

      const [updatedDeal] = await Deal.filter({ id: deal.id });
      onDealUpdate(updatedDeal);
      onFeesChange(fees.totalFees);

      if (fees.calculationMethod === 'zip_code_lookup') {
        toast.success(`Fees calculated using ${fees.zipCodeData.city}, ${fees.zipCodeData.state} tax rates`);
      } else {
        toast.success('Fees estimated (no specific tax data for this zip code)');
      }
    } catch (error) {
      console.error('Failed to calculate fees:', error);
      toast.error('Failed to calculate fees');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleManualFeeChange = (field, value) => {
    const numericValue = parseFloat(value) || 0;
    setManualFees(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleSaveManualFees = async () => {
    if (!deal.asking_price) {
      toast.error('Please enter an asking sales price first');
      return;
    }

    setIsSaving(true);
    try {
      const totalFees = manualFees.registrationFee + manualFees.docFee + manualFees.titleFee;
      const estimatedOTD = deal.asking_price + manualFees.salesTax + totalFees;

      const fees = {
        salesTax: manualFees.salesTax,
        registrationFee: manualFees.registrationFee,
        docFee: manualFees.docFee,
        titleFee: manualFees.titleFee,
        totalFees: totalFees,
        estimatedOTD: estimatedOTD,
        taxRate: deal.asking_price > 0 ? (manualFees.salesTax / deal.asking_price) : 0,
        zipCodeData: taxRateInfo,
        calculationMethod: 'manual_override'
      };

      await saveDealFees(deal.id, fees, true);

      const [updatedDeal] = await Deal.filter({ id: deal.id });
      onDealUpdate(updatedDeal);
      onFeesChange(totalFees);

      setIsEditingFees(false);
      toast.success('Manual fees saved successfully!');
    } catch (error) {
      console.error('Failed to save manual fees:', error);
      toast.error('Failed to save manual fees');
    } finally {
      setIsSaving(false);
    }
  };

  const totalFees = manualFees.registrationFee + manualFees.docFee + manualFees.titleFee;
  const estimatedOTD = (deal.asking_price || 0) + manualFees.salesTax + totalFees;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Taxes & Fees
          {deal.manual_fees_override && (
            <Badge variant="outline" className="text-xs">
              Manual
            </Badge>
          )}
        </h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditingFees(!isEditingFees)}
          className="h-7 text-xs"
        >
          {isEditingFees ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
          {isEditingFees ? 'Lock' : 'Edit'}
        </Button>
      </div>

      {!isEditingFees && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <Input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter zip code"
              maxLength={5}
              className="text-sm h-8 flex-1"
            />
            <Button
              size="sm"
              onClick={handleCalculateFees}
              disabled={isCalculating || !deal.asking_price}
              className="h-8 bg-brand-teal hover:bg-brand-teal/90"
            >
              {isCalculating ? 'Calculating...' : 'Calculate'}
            </Button>
          </div>

          {taxRateInfo && (
            <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                Using rates for {taxRateInfo.city}, {taxRateInfo.state} ({formatTaxRate(taxRateInfo.sales_tax_rate)} sales tax)
              </span>
            </div>
          )}

          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sales Tax</span>
              <span className="font-medium">{formatCurrency(manualFees.salesTax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Registration Fee</span>
              <span className="font-medium">{formatCurrency(manualFees.registrationFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Doc Fee</span>
              <span className="font-medium">{formatCurrency(manualFees.docFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Title Fee</span>
              <span className="font-medium">{formatCurrency(manualFees.titleFee)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-800 font-semibold">Total Fees</span>
              <span className="font-bold text-slate-900">{formatCurrency(totalFees)}</span>
            </div>
          </div>
        </div>
      )}

      {isEditingFees && (
        <div className="space-y-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800 flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Edit fees manually if you have exact numbers from the dealer. This will override automatic calculations.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700 w-28 shrink-0">Sales Tax</label>
              <Input
                type="number"
                value={manualFees.salesTax}
                onChange={(e) => handleManualFeeChange('salesTax', e.target.value)}
                className="text-sm h-8"
                step="0.01"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700 w-28 shrink-0">Registration</label>
              <Input
                type="number"
                value={manualFees.registrationFee}
                onChange={(e) => handleManualFeeChange('registrationFee', e.target.value)}
                className="text-sm h-8"
                step="0.01"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700 w-28 shrink-0">Doc Fee</label>
              <Input
                type="number"
                value={manualFees.docFee}
                onChange={(e) => handleManualFeeChange('docFee', e.target.value)}
                className="text-sm h-8"
                step="0.01"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700 w-28 shrink-0">Title Fee</label>
              <Input
                type="number"
                value={manualFees.titleFee}
                onChange={(e) => handleManualFeeChange('titleFee', e.target.value)}
                className="text-sm h-8"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSaveManualFees}
              disabled={isSaving}
              className="flex-1 bg-brand-lime hover:bg-brand-lime/90 h-8 text-sm"
            >
              {isSaving ? (
                <motion.div animate={{rotate:360}} transition={{duration:1, repeat:Infinity}} className="w-3 h-3 border border-t-transparent rounded-full mr-2" />
              ) : (
                <Save className="w-3 h-3 mr-2" />
              )}
              Save Manual Fees
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditingFees(false)}
              className="h-8 text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-brand-teal">Estimated Out-The-Door</span>
          <span className="text-xl font-bold text-brand-teal">{formatCurrency(estimatedOTD)}</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">Sales Price + Taxes + Fees</p>
      </div>
    </div>
  );
};

export default function PricingCard({ deal, onDealUpdate, messages = [] }) {
  const [showTaxesFees, setShowTaxesFees] = useState(false);
  const [currentFees, setCurrentFees] = useState(deal.estimated_total_fees || 0);
  const [isOTDMode, setIsOTDMode] = useState(deal.negotiation_mode === 'otd');
  const [isTogglingMode, setIsTogglingMode] = useState(false);

  const handleUpdateDealField = async (field, value) => {
    try {
      const updateData = { [field]: value };

      if (isOTDMode) {
        if (field === 'asking_price') updateData.otd_asking_price = value;
        if (field === 'current_offer') updateData.otd_current_offer = value;
        if (field === 'target_price') updateData.otd_target_price = value;
      }

      const updatedDeal = await Deal.update(deal.id, updateData);

      if (isOTDMode && deal.estimated_sales_tax) {
        await syncSalesPricesFromOTD(deal.id, updatedDeal);
      }

      if (!isOTDMode && deal.estimated_sales_tax) {
        await syncOTDPricesFromSalesPrice(deal.id, updatedDeal);
      }

      const [refreshedDeal] = await Deal.filter({ id: deal.id });
      onDealUpdate(refreshedDeal);

      if (field === 'asking_price' && deal.buyer_zip_code && !deal.manual_fees_override && !isOTDMode) {
        const fees = await calculateTaxesAndFees(value, deal.buyer_zip_code);
        await saveDealFees(deal.id, fees, false);
        const [finalDeal] = await Deal.filter({ id: deal.id });
        onDealUpdate(finalDeal);
        setCurrentFees(fees.totalFees);
        toast.success('Asking price and fees updated!');
      }
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      throw error;
    }
  };

  const handleToggleOTDMode = async () => {
    if (!deal.estimated_sales_tax) {
      toast.error('Please calculate taxes and fees first before switching to OTD mode');
      setShowTaxesFees(true);
      return;
    }

    setIsTogglingMode(true);
    try {
      const newMode = isOTDMode ? 'sales_price' : 'otd';

      if (newMode === 'otd') {
        await syncOTDPricesFromSalesPrice(deal.id, deal);
      } else {
        await syncSalesPricesFromOTD(deal.id, deal);
      }

      const updatedDeal = await toggleNegotiationMode(deal.id, newMode, deal);

      const [refreshedDeal] = await Deal.filter({ id: deal.id });

      setIsOTDMode(newMode === 'otd');
      onDealUpdate(refreshedDeal);

      toast.success(`Switched to ${newMode === 'otd' ? 'Out-The-Door' : 'Sales Price'} mode`);
    } catch (error) {
      console.error('Failed to toggle mode:', error);
      toast.error('Failed to switch mode');
    } finally {
      setIsTogglingMode(false);
    }
  };

  const PurchaseIcon = purchaseTypeInfo[deal.purchase_type]?.icon || Banknote;
  const purchaseLabel = purchaseTypeInfo[deal.purchase_type]?.label || 'Purchase Type N/A';

  const getDisplayPrice = (salesPrice, otdPrice) => {
    if (isOTDMode && otdPrice) return otdPrice;
    return salesPrice || 0;
  };

  const displayAskingPrice = getDisplayPrice(deal.asking_price, deal.otd_asking_price);
  const displayCurrentOffer = getDisplayPrice(deal.current_offer, deal.otd_current_offer);
  const displayTargetPrice = getDisplayPrice(deal.target_price, deal.otd_target_price);

  const savings = displayAskingPrice && displayCurrentOffer
    ? Math.round(displayAskingPrice - displayCurrentOffer)
    : 0;

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
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <PurchaseIcon className="w-4 h-4" />
            <span>{purchaseLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">
              {isOTDMode ? 'Out-The-Door' : 'Sales Price'}
            </span>
            <Switch
              checked={isOTDMode}
              onCheckedChange={handleToggleOTDMode}
              disabled={isTogglingMode}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="wait">
          {isOTDMode ? (
            <motion.div
              key="otd-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <div className="text-xs text-orange-800 bg-orange-50 p-2 rounded flex items-start gap-2 border border-orange-200">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Out-The-Door Mode Active:</strong> All prices shown include taxes and fees totaling {formatCurrency(getTotalFees(deal))}.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sales-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <p className="text-xs text-slate-600 bg-blue-50 p-2 rounded flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                All prices below are SALES PRICES (before taxes and fees). Toggle to OTD mode to negotiate the final total.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="group">
          <EditablePriceItem
            label={isOTDMode ? "Dealer's Asking OTD Price" : "Dealer's Asking Sales Price"}
            value={displayAskingPrice}
            icon={FileText}
            placeholder={isOTDMode ? "Enter asking OTD price" : "Enter asking price"}
            onSave={(value) => handleUpdateDealField('asking_price', value)}
          />
        </div>

        <div className="group">
          <EditablePriceItem
            label={isOTDMode ? "Your Current OTD Offer" : "Your Current Offer"}
            value={displayCurrentOffer}
            colorClass="text-blue-600"
            icon={DollarSign}
            placeholder={isOTDMode ? "Enter current OTD offer" : "Enter current offer"}
            onSave={(value) => handleUpdateDealField('current_offer', value)}
          />
        </div>

        <div className="group">
          <EditablePriceItem
            label={isOTDMode ? "Your Target OTD Price" : "Your Target Sales Price"}
            value={displayTargetPrice}
            colorClass="text-green-600"
            icon={DollarSign}
            placeholder={isOTDMode ? "Enter target OTD price" : "Enter target price"}
            onSave={(value) => handleUpdateDealField('target_price', value)}
          />
        </div>

        {savings > 0 && (
          <div className={`${isOTDMode ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'} border rounded-lg p-3`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isOTDMode ? 'text-orange-800' : 'text-green-800'}`}>Your Savings</span>
              <span className={`text-xl font-bold ${isOTDMode ? 'text-orange-700' : 'text-green-700'}`}>{formatCurrency(savings)}</span>
            </div>
            <p className={`text-xs ${isOTDMode ? 'text-orange-700' : 'text-green-700'} mt-1`}>
              Below asking {isOTDMode ? 'OTD' : 'price'}
            </p>
          </div>
        )}

        <div className="border-t border-slate-200 pt-3">
          <div
            className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={() => setShowTaxesFees(!showTaxesFees)}
          >
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-800">Taxes & Fees Breakdown</span>
            </div>
            <motion.div animate={{ rotate: showTaxesFees ? 180 : 0 }}>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </motion.div>
          </div>

          <AnimatePresence>
            {showTaxesFees && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <TaxesAndFeesSection
                  deal={deal}
                  onDealUpdate={onDealUpdate}
                  onFeesChange={setCurrentFees}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
