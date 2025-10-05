
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Vehicle } from '@/api/entities';
import { Dealer } from '@/api/entities';
import { Deal } from '@/api/entities';
import { User } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Link2, ArrowLeft, ShieldAlert, Upload, X, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// Main component orchestrating the flow
export default function AddVehiclePage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('initial'); // 'initial', 'parsed', 'trackingForm'
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Check for parsed data from messages on component mount
  useEffect(() => {
    const parsedDataParam = searchParams.get('parsed_data');
    const fromMessages = searchParams.get('from_messages');
    
    if (parsedDataParam && fromMessages) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(parsedDataParam));
        console.log('Received parsed data from messages:', decodedData);
        setParsedData(decodedData);
        setStep('parsed');
      } catch (error) {
        console.error('Failed to parse data from URL:', error);
        toast.error('Failed to parse conversation data');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    fetchUser();
  }, []);

  const resetState = () => {
    setStep('initial');
    setUrlInput('');
    setIsLoading(false);
    setParsedData(null);
    setIsLimitReached(false);
    setLimitMessage('');
  };

  const handleUrlParse = async () => {
    if (!urlInput.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await InvokeLLM({
        prompt: `Extract structured vehicle, dealer, and pricing information from this car listing URL: ${urlInput}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            vehicle: {
              type: "object",
              properties: { year: { type: "number" }, make: { type: "string" }, model: { type: "string" }, trim: { type: "string" }, vin: { type: "string" }, stock_number: { type: "string" }, mileage: { type: "number" }, condition: { type: "string" }, exterior_color: { type: "string" }, interior_color: { type: "string" }, image_url: { type: "string" } }
            },
            dealer: {
              type: "object", 
              properties: { name: { type: "string" }, contact_email: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, website: { type: "string" } }
            },
            pricing: {
              type: "object",
              properties: { asking_price: { type: "number" } }
            }
          }
        }
      });
      setParsedData(result);
      setStep('parsed');
    } catch (error) {
      console.error('Failed to parse URL:', error);
      toast.error("Failed to parse URL. Please check the link or try manual entry.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkDealLimit = async (user) => {
    const plans = { free: 1, haggler: 3, negotiator: 10, closer_annual: Infinity };
    try {
      const userTier = user.subscription_tier || 'free';
      const limit = plans[userTier];

      if (userTier === 'free') {
        const vehicles = await Vehicle.list();
        if (vehicles.length >= limit) {
          setLimitMessage('You have reached the 1 vehicle limit for the Free plan. Please upgrade to add more vehicles.');
          setIsLimitReached(true);
          return false;
        }
      } else {
        const deals = await Deal.list();
        const activeDeals = deals.filter(d => ['quote_requested', 'negotiating', 'final_offer'].includes(d.status));
        
        if (activeDeals.length >= limit) {
          setLimitMessage('You have reached the maximum number of active deals for your current plan. Please upgrade your subscription to add more deals.');
          setIsLimitReached(true);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error checking deal limit:", error);
      toast.error("Could not verify your subscription status. Please try again.");
      return false;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6">
      <AlertDialog open={isLimitReached} onOpenChange={setIsLimitReached}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-orange-500" /> Plan Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>{limitMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction asChild><a href={createPageUrl("Account")}>Upgrade Plan</a></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-md mx-auto">
        {step === 'initial' && <InitialStep setStep={setStep} urlInput={urlInput} setUrlInput={setUrlInput} handleUrlParse={handleUrlParse} isLoading={isLoading} />}
        {step === 'parsed' && <ParsedStep parsedData={parsedData} setEditedData={setEditedData} setStep={setStep} checkDealLimit={checkDealLimit} />}
        {step === 'trackingForm' && <DealForm parsedData={editedData || parsedData} setStep={setStep} currentUser={currentUser} />}
      </div>
    </div>
  );
}

// Step 1: Initial URL input or manual entry choice
function InitialStep({ setStep, urlInput, setUrlInput, handleUrlParse, isLoading }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Add New Deal</h1>
        <p className="text-slate-600 text-sm">Start by pasting a vehicle listing URL.</p>
      </div>
      <Card className="shadow-lg border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-center">Vehicle Listing URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="https://www.example-dealer.com/vehicle/..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="text-sm"
          />
          <Button onClick={handleUrlParse} disabled={!urlInput.trim() || isLoading} className="w-full bg-blue-600 hover:bg-blue-700 py-3">
            {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing...</> : <><Link2 className="w-5 h-5 mr-2" />Analyze Listing</>}
          </Button>
          <div className="text-center">
            <Button variant="ghost" onClick={() => setStep('trackingForm')} className="text-sm text-slate-600">
              Or enter details manually
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Step 2: Show parsed data and proceed to deal form
function ParsedStep({ parsedData, setEditedData, setStep, checkDealLimit }) {
  const [vehicleData, setVehicleData] = useState({
    year: parsedData?.vehicle?.year || '',
    make: parsedData?.vehicle?.make || '',
    model: parsedData?.vehicle?.model || '',
    vin: parsedData?.vehicle?.vin || '',
    mileage: parsedData?.vehicle?.mileage || '',
    trim: parsedData?.vehicle?.trim || ''
  });

  const [dealerData, setDealerData] = useState({
    name: parsedData?.dealer?.name || '',
    contact_email: parsedData?.dealer?.contact_email || '',
    phone: parsedData?.dealer?.phone || '',
    address: parsedData?.dealer?.address || ''
  });

  const [pricingData, setPricingData] = useState({
    asking_price: parsedData?.pricing?.asking_price || ''
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    const user = await User.me();
    const canAdd = await checkDealLimit(user);
    if (canAdd) {
      setEditedData({
        vehicle: vehicleData,
        dealer: dealerData,
        pricing: pricingData,
        files: uploadedFiles
      });
      setStep('trackingForm');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setStep('initial')}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-bold text-slate-900">Review & Edit Details</h1>
      </div>
      <Card className="shadow-sm border-green-200 bg-green-50 mb-6">
        <CardContent className="p-4 text-green-800">
          <p className="text-sm font-semibold">✓ Vehicle found!</p>
          <p className="text-sm">Review and edit the details below before continuing.</p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Vehicle Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Year</label>
                    <Input
                      placeholder="Year"
                      value={vehicleData.year}
                      onChange={(e) => setVehicleData(prev => ({...prev, year: e.target.value}))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Make</label>
                    <Input
                      placeholder="Make"
                      value={vehicleData.make}
                      onChange={(e) => setVehicleData(prev => ({...prev, make: e.target.value}))}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Model</label>
                  <Input
                    placeholder="Model"
                    value={vehicleData.model}
                    onChange={(e) => setVehicleData(prev => ({...prev, model: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">VIN</label>
                  <Input
                    placeholder="VIN"
                    value={vehicleData.vin}
                    onChange={(e) => setVehicleData(prev => ({...prev, vin: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Mileage</label>
                  <Input
                    placeholder="Mileage"
                    type="number"
                    value={vehicleData.mileage}
                    onChange={(e) => setVehicleData(prev => ({...prev, mileage: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Asking Price</label>
                  <Input
                    placeholder="Asking Price"
                    type="number"
                    value={pricingData.asking_price}
                    onChange={(e) => setPricingData(prev => ({...prev, asking_price: e.target.value}))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Dealer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Dealer Name</label>
                  <Input
                    placeholder="Dealer Name"
                    value={dealerData.name}
                    onChange={(e) => setDealerData(prev => ({...prev, name: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Contact Email</label>
                  <Input
                    placeholder="Contact Email"
                    type="email"
                    value={dealerData.contact_email}
                    onChange={(e) => setDealerData(prev => ({...prev, contact_email: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Phone</label>
                  <Input
                    placeholder="Phone"
                    value={dealerData.phone}
                    onChange={(e) => setDealerData(prev => ({...prev, phone: e.target.value}))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Attachments (Optional)</h3>
              <p className="text-xs text-slate-600 mb-3">Upload dealer emails, quotes, or other documents</p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.eml,.msg"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-3"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleContinue} className="w-full bg-brand-teal hover:bg-brand-teal-dark py-3">
              Continue to Deal Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Step 3: The form for tracking a deal
function DealForm({ parsedData, setStep, currentUser }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    year: parsedData?.vehicle?.year?.toString() || '', make: parsedData?.vehicle?.make || '', model: parsedData?.vehicle?.model || '', trim: parsedData?.vehicle?.trim || '', vin: parsedData?.vehicle?.vin || '', stock_number: parsedData?.vehicle?.stock_number || '', mileage: parsedData?.vehicle?.mileage?.toString() || '', listing_url: parsedData?.vehicle?.listing_url || ''
  });
  const [dealerData, setDealerData] = useState({
    name: parsedData?.dealer?.name || '', contact_email: parsedData?.dealer?.contact_email || '', phone: parsedData?.dealer?.phone || '', address: parsedData?.dealer?.address || ''
  });
  const [dealData, setDealData] = useState({
    asking_price: parsedData?.pricing?.asking_price?.toString() || '',
    target_price: '',
    purchase_type: 'finance'
  });

  const handleChange = (setter) => (e) => {
    setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleSelectChange = (setter, field) => (value) => {
    setter(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newVehicle = await Vehicle.create({
        ...vehicleData,
        year: vehicleData.year ? parseInt(vehicleData.year) : undefined,
        mileage: vehicleData.mileage ? parseInt(vehicleData.mileage) : undefined,
        listing_url: vehicleData.listing_url
      });
      const newDealer = await Dealer.create({
        ...dealerData
      });
      const newDeal = await Deal.create({
        ...dealData,
        asking_price: dealData.asking_price ? parseFloat(dealData.asking_price) : undefined,
        vehicle_id: newVehicle.id,
        dealer_id: newDealer.id,
        status: 'quote_requested'
      });
      
      // If this deal was created from messages (indicated by parsedData), 
      // move all messages from the original dealer to this new deal
      if (parsedData && parsedData.originalDealerId) {
        try {
          console.log('Moving messages from original dealer to new deal...');
          const originalMessages = await Message.filter({ dealer_id: parsedData.originalDealerId });
          
          // Update all messages to point to the new dealer and deal
          await Promise.all(
            originalMessages.map(msg => 
              Message.update(msg.id, { 
                dealer_id: newDealer.id,
                deal_id: newDeal.id 
              })
            )
          );
          
          // Delete the original dealer if it has no other data
          const originalDealer = await Dealer.filter({ id: parsedData.originalDealerId });
          if (originalDealer.length > 0) {
            await Dealer.delete(parsedData.originalDealerId);
            console.log('Deleted original dealer after moving messages');
          }
          
          console.log(`Moved ${originalMessages.length} messages to new deal`);
        } catch (error) {
          console.error('Failed to move messages to new deal:', error);
          // Don't fail the whole operation if message moving fails
        }
      }
      
      toast.success("Deal successfully created!");
      console.log('AddVehicle: Deal created successfully, navigating to dashboard');
      console.log('AddVehicle: Created deal:', newDeal);
      console.log('AddVehicle: Created vehicle:', newVehicle);
      console.log('AddVehicle: Created dealer:', newDealer);
      
      // Navigate back to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error("Failed to create new deal:", error);
      if (error.message?.includes('Not authenticated')) {
        toast.error("Please log in to create deals");
        navigate('/', { replace: true });
      } else {
        toast.error("Failed to create deal. Please check your inputs and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setStep(parsedData ? 'parsed' : 'initial')}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-bold text-slate-900">Track New Deal</h1>
      </div>
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Vehicle Information</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input name="year" placeholder="Year *" value={vehicleData.year} onChange={handleChange(setVehicleData)} required />
                  <Input name="make" placeholder="Make *" value={vehicleData.make} onChange={handleChange(setVehicleData)} required />
                </div>
                <Input name="model" placeholder="Model *" value={vehicleData.model} onChange={handleChange(setVehicleData)} required />
                <Input name="vin" placeholder="VIN" value={vehicleData.vin} onChange={handleChange(setVehicleData)} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Dealer Information</h3>
              <div className="space-y-3">
                <Input name="name" placeholder="Dealer Name *" value={dealerData.name} onChange={handleChange(setDealerData)} required />
                <Input name="contact_email" placeholder="Contact Email *" type="email" value={dealerData.contact_email} onChange={handleChange(setDealerData)} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Deal Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input name="asking_price" placeholder="Asking Sales Price *" type="number" value={dealData.asking_price} onChange={handleChange(setDealData)} required />
                <Input name="target_price" placeholder="Your Target Sales Price" type="number" value={dealData.target_price} onChange={handleChange(setDealData)} />
              </div>
              <div className="grid grid-cols-1 gap-3 mt-3">
                <Select value={dealData.purchase_type} onValueChange={handleSelectChange(setDealData, 'purchase_type')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Purchase Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 <strong>Sales Price:</strong> The price of the vehicle before taxes, fees, and add-ons.<br/>
                <strong>Out-the-Door Price:</strong> Total price including all taxes, fees, and add-ons.
              </p>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-brand-teal hover:bg-brand-teal-dark py-3">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create Deal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

