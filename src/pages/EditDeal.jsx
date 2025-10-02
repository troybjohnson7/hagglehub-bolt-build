
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Deal } from '@/api/entities';
import { Vehicle } from '@/api/entities';
import { Dealer } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function EditDealPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dealId = searchParams.get('deal_id');

  const [deal, setDeal] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dealData, setDealData] = useState({
    asking_price: '',
    current_offer: '',
    target_price: '',
    otd_price: '',
    status: '',
    priority: '',
    quote_expires: ''
  });

  useEffect(() => {
    async function loadDealData() {
      if (!dealId) {
        navigate('/');
        return;
      }

      try {
        const [dealData, vehicles, dealers] = await Promise.all([
          Deal.filter({ id: dealId }),
          Vehicle.list(),
          Dealer.list()
        ]);

        if (dealData.length === 0) {
          navigate('/');
          return;
        }

        const currentDeal = dealData[0];
        const currentVehicle = vehicles.find(v => v.id === currentDeal.vehicle_id);
        const currentDealer = dealers.find(d => d.id === currentDeal.dealer_id);

        setDeal(currentDeal);
        setVehicle(currentVehicle);
        setDealer(currentDealer);
        setDealData({
          asking_price: currentDeal.asking_price || '',
          current_offer: currentDeal.current_offer || '',
          target_price: currentDeal.target_price || '',
          otd_price: currentDeal.otd_price || '',
          status: currentDeal.status || 'quote_requested',
          priority: currentDeal.priority || 'medium',
          quote_expires: currentDeal.quote_expires ? currentDeal.quote_expires.split('T')[0] : ''
        });
      } catch (error) {
        console.error('Failed to load deal:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadDealData();
  }, [dealId, navigate]);

  const handleInputChange = (field, value) => {
    setDealData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updateData = {
        ...dealData,
        asking_price: dealData.asking_price ? parseFloat(dealData.asking_price) : null,
        current_offer: dealData.current_offer ? parseFloat(dealData.current_offer) : null,
        target_price: dealData.target_price ? parseFloat(dealData.target_price) : null,
        otd_price: dealData.otd_price ? parseFloat(dealData.otd_price) : null
      };

      await Deal.update(dealId, updateData);
      navigate('/');
    } catch (error) {
      console.error('Failed to update deal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await Deal.delete(dealId);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete deal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-lime-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6"
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </motion.div>
          <h1 className="text-xl font-bold text-slate-900">Edit Deal</h1>
        </div>

        <Card className="shadow-lg border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle Info'}
            </CardTitle>
            <p className="text-slate-600 text-sm">
              {dealer ? dealer.name : 'Dealer Info'}
            </p>
          </CardHeader>
        </Card>

        <Card className="shadow-lg border-slate-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Pricing Information</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Asking Sales Price"
                    type="number"
                    value={dealData.asking_price}
                    onChange={(e) => handleInputChange('asking_price', e.target.value)}
                  />
                  <Input
                    placeholder="Current Sales Price Offer"
                    type="number"
                    value={dealData.current_offer}
                    onChange={(e) => handleInputChange('current_offer', e.target.value)}
                  />
                  <Input
                    placeholder="Your Target Sales Price"
                    type="number"
                    value={dealData.target_price}
                    onChange={(e) => handleInputChange('target_price', e.target.value)}
                  />
                  <Input
                    placeholder="Out-the-Door Price"
                    type="number"
                    value={dealData.otd_price}
                    onChange={(e) => handleInputChange('otd_price', e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  💡 <strong>Sales Price:</strong> Vehicle price before taxes/fees.<br/>
                  <strong>Out-the-Door:</strong> Total including taxes, fees, add-ons.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Deal Status</h3>
                <div className="space-y-3">
                  <Select value={dealData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Deal Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quote_requested">Quote Requested</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="final_offer">Final Offer</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dealData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Quote Expires (Date)"
                    type="date"
                    value={dealData.quote_expires}
                    onChange={(e) => handleInputChange('quote_expires', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Notes</h3>
                <Textarea
                  placeholder="Negotiation notes, conditions, special terms..."
                  value=""
                  onChange={() => {}}
                  disabled
                  className="min-h-[100px]"
                />
                <p className="text-xs text-slate-500 mt-1">Notes feature temporarily unavailable</p>
              </div>

              <div className="flex gap-3 pt-4">
                <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-lime-600 hover:bg-lime-700 py-3 text-base font-medium"
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 px-4"
                        disabled={isSaving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this deal for the{' '}
                        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'vehicle'}?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Deal
                        </AlertDialogAction>
                      </motion.div>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
