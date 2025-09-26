
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Link2, ArrowLeft, ShieldAlert, ClipboardList, Send } from 'lucide-react';
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

// Main component orchestrating the flow
export default function AddVehiclePage() {
  const [step, setStep] = useState('initial'); // 'initial', 'parsed', 'trackingForm', 'leadForm', 'submittingLead', 'leadResult'
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

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
        {step === 'parsed' && <ParsedStep parsedData={parsedData} setStep={setStep} checkDealLimit={checkDealLimit} />}
        {step === 'trackingForm' && <DealForm parsedData={parsedData} setStep={setStep} currentUser={currentUser} />}
        {step === 'leadForm' && <LeadForm parsedData={parsedData} setStep={setStep} url={urlInput} />}
        {step === 'leadResult' && <LeadResultStep resetState={resetState} />}
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

// Step 2: Show parsed data and ask user what to do next
function ParsedStep({ parsedData, setStep, checkDealLimit }) {
  const handleTrackDeal = async () => {
    const user = await User.me();
    const canAdd = await checkDealLimit(user);
    if (canAdd) setStep('trackingForm');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setStep('initial')}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-bold text-slate-900">Analysis Complete</h1>
      </div>
      <Card className="shadow-sm border-green-200 bg-green-50 mb-6">
        <CardContent className="p-4 text-green-800">
          <p className="text-sm font-semibold">✓ Vehicle found!</p>
          <p className="text-sm">{parsedData.vehicle?.year} {parsedData.vehicle?.make} {parsedData.vehicle?.model}</p>
          <p className="text-sm">From: {parsedData.dealer?.name}</p>
        </CardContent>
      </Card>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">What's next?</h2>
        <p className="text-slate-600">Choose how you want to proceed with this vehicle.</p>
      </div>
      <div className="space-y-4">
        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handleTrackDeal}>
          <CardContent className="p-6 flex items-center gap-4">
            <ClipboardList className="w-8 h-8 text-brand-teal" />
            <div>
              <h3 className="font-bold text-slate-900">Track This Deal</h3>
              <p className="text-sm text-slate-600">Manually track negotiations, offers, and messages in your dashboard.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setStep('leadForm')}>
          <CardContent className="p-6 flex items-center gap-4">
            <Send className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900">Submit Inquiry</h3>
              <p className="text-sm text-slate-600">Let HaggleHub's AI contact the dealer on your behalf to start the conversation.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// Step 3a: The form for tracking a deal
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
      toast.success("Deal successfully created!");
      console.log('AddVehicle: Deal created successfully, navigating to dashboard');
      // Force a page reload to ensure fresh data
      window.location.href = '/dashboard';
    } catch (error) {
      console.error("Failed to create new deal:", error);
      toast.error("Failed to create deal. Please check your inputs.");
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
                <Input name="asking_price" placeholder="Asking Price *" type="number" value={dealData.asking_price} onChange={handleChange(setDealData)} required />
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

// Step 3b: The form for submitting a lead
function LeadForm({ parsedData, setStep, url }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leadData, setLeadData] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' });
  const [leadResult, setLeadResult] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const currentUser = await User.me();
      setUser(currentUser);
      const nameParts = currentUser.full_name?.split(' ') || [];
      const vehicleInfo = `${parsedData.vehicle?.year || ''} ${parsedData.vehicle?.make || ''} ${parsedData.vehicle?.model || ''}`.trim();
      
      setLeadData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: currentUser.email || '',
        phone: '',
        message: `Hi, I'm interested in the ${vehicleInfo}. Could you please provide your best price and availability? Thank you.`
      });
    }
    fetchUser();
  }, [parsedData]);
  
  const handleSubmitLead = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await InvokeLLM({
        prompt: `Submit a lead inquiry for the vehicle at ${url} using this info: Name: ${leadData.firstName} ${leadData.lastName}, Email: ${leadData.email}, Phone: ${leadData.phone}, Message: ${leadData.message}. Find the contact form or email on the page and submit it.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object", properties: { status: { type: "string", enum: ["success", "failed"] }, details: { type: "string" }, next_steps: { type: "string" } }
        }
      });
      setLeadResult(result);
    } catch(err) {
      console.error(err);
      toast.error("An error occurred while submitting the lead.");
      setLeadResult({ status: 'failed', details: 'A technical error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (leadResult) {
    return <LeadResultStep result={leadResult} setStep={setStep} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setStep('parsed')}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-bold text-slate-900">Submit Inquiry</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmitLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input value={leadData.firstName} onChange={(e) => setLeadData(p => ({...p, firstName: e.target.value}))} placeholder="First Name *" required />
              <Input value={leadData.lastName} onChange={(e) => setLeadData(p => ({...p, lastName: e.target.value}))} placeholder="Last Name" />
            </div>
            <Input value={leadData.email} type="email" placeholder="Email *" required readOnly />
            <Textarea value={leadData.message} onChange={(e) => setLeadData(p => ({...p, message: e.target.value}))} className="min-h-[100px]" />
            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 py-3">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Submit Inquiry to Dealer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Step 4: Show the result of the lead submission
function LeadResultStep({ result, setStep }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
       <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setStep('initial')}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-bold text-slate-900">Inquiry Result</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Submission {result.status}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>{result.details}</p>
          {result.next_steps && <p className="font-semibold">Next Steps: {result.next_steps}</p>}
          <Button onClick={() => setStep('initial')} className="w-full">Submit Another</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
