
import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Dealer } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditDealerPage() {
  const [searchParams] = useSearchParams();
  const { dealerId: paramDealerId } = useParams();
  const navigate = useNavigate();
  const dealerId = paramDealerId || searchParams.get('dealer_id');

  const [dealer, setDealer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dealerData, setDealerData] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    contact_email: '',
    sales_rep_name: '',
    rating: '',
    notes: ''
  });

  useEffect(() => {
    async function loadDealerData() {
      if (!dealerId) {
        navigate('/');
        return;
      }

      try {
        const dealers = await Dealer.list();
        const currentDealer = dealers.find(d => d.id === dealerId);

        if (!currentDealer) {
          navigate('/');
          return;
        }

        setDealer(currentDealer);
        setDealerData({
          name: currentDealer.name || '',
          address: currentDealer.address || '',
          phone: currentDealer.phone || '',
          website: currentDealer.website || '',
          contact_email: currentDealer.contact_email || '',
          sales_rep_name: currentDealer.sales_rep_name || '',
          rating: currentDealer.rating || '',
          notes: currentDealer.notes || ''
        });
      } catch (error) {
        console.error('Failed to load dealer:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadDealerData();
  }, [dealerId, navigate]);

  const handleInputChange = (field, value) => {
    setDealerData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updateData = {
        ...dealerData,
        rating: dealerData.rating ? parseFloat(dealerData.rating) : null
      };

      await Dealer.update(dealerId, updateData);
      navigate(-1); // Go back to previous page instead of dashboard
      toast.success('Dealer information updated successfully!');
    } catch (error) {
      console.error('Failed to update dealer:', error);
      toast.error('Failed to update dealer information');
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
          <h1 className="text-xl font-bold text-slate-900">Edit Dealer</h1>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">
              {dealer ? dealer.name : 'Dealer Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Basic Information</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Dealer Name"
                    value={dealerData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Address"
                    value={dealerData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                  <Input
                    placeholder="Website"
                    type="url"
                    value={dealerData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Phone Number"
                    type="tel"
                    value={dealerData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                  <Input
                    placeholder="Contact Email"
                    type="email"
                    value={dealerData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  />
                  <Input
                    placeholder="Sales Rep Name"
                    value={dealerData.sales_rep_name}
                    onChange={(e) => handleInputChange('sales_rep_name', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Additional Details</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Rating (1-5)"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={dealerData.rating}
                    onChange={(e) => handleInputChange('rating', e.target.value)}
                  />
                  <Textarea
                    placeholder="Notes about this dealer..."
                    value={dealerData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <motion.div whileTap={{ scale: 0.98 }}>
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
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
