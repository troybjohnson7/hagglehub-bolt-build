
import React, { useState, useEffect, useCallback } from 'react';
import {
  Link,
  useSearchParams,
  useNavigate
} from 'react-router-dom';
import {
  createPageUrl
} from '@/utils';
import {
  Deal
} from '@/api/entities';
import {
  Vehicle
} from '@/api/entities';
import {
  Dealer
} from '@/api/entities';
import {
  Message
} from '@/api/entities';
import {
  Button
} from '@/components/ui/button';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MessageSquare
} from 'lucide-react';
import {
  motion
} from 'framer-motion';
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
import { toast } from 'sonner';

import VehicleSummary from '../components/deal_details/VehicleSummary';
import PricingCard from '../components/deal_details/PricingCard';
import DealerInfoCard from '../components/deal_details/DealerInfoCard';
import MessageTimeline from '../components/deal_details/MessageTimeline';
import NegotiationCoach from '../components/deal_details/NegotiationCoach';
import CompleteDealModal from '../components/deal_details/CompleteDealModal';

export default function DealDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dealId = searchParams.get('deal_id');

  const [deal, setDeal] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!dealId) {
      navigate(createPageUrl("Dashboard"));
      return;
    }
    
    // Validate that dealId is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dealId)) {
      console.error("Invalid deal ID format:", dealId);
      navigate(createPageUrl("Dashboard"));
      return;
    }
    
    try {
      setIsLoading(true);
      const [dealData, vehicles, dealers] = await Promise.all([
        Deal.filter({ id: dealId }),
        Vehicle.list(),
        Dealer.list(),
      ]);

      if (!dealData || dealData.length === 0) {
        navigate(createPageUrl("Dashboard"));
        return;
      }

      const currentDeal = dealData[0];
      const currentVehicle = vehicles.find(v => v.id === currentDeal.vehicle_id);
      const currentDealer = dealers.find(d => d.id === currentDeal.dealer_id);
      
      if(currentDealer) {
        const messageData = await Message.filter({ dealer_id: currentDealer.id });
        setMessages(messageData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      }

      setDeal(currentDeal);
      setVehicle(currentVehicle);
      setDealer(currentDealer);
    } catch (error) {
      console.error("Failed to fetch deal details:", error);
      navigate(createPageUrl("Dashboard"));
    } finally {
      setIsLoading(false);
    }
  }, [dealId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const handleDealCompleted = (updatedDeal) => {
    setDeal(updatedDeal);
    setShowCompleteModal(false); // Close the modal
    // Optionally refresh all data if deeper changes are expected
    // fetchData(); 
  };

  const handleDeleteDeal = async () => {
    setIsDeleting(true);
    try {
      // First, delete all messages associated with this deal
      const dealMessages = messages.filter(m => m.deal_id === deal.id);
      if (dealMessages.length > 0) {
        await Promise.all(dealMessages.map(m => Message.delete(m.id)));
      }

      // Delete the deal
      await Deal.delete(deal.id);

      // Check if this vehicle is used by any other deals
      if (vehicle) {
        const allDeals = await Deal.list();
        const vehicleInUse = allDeals.some(d => d.vehicle_id === vehicle.id && d.id !== deal.id);
        
        // If no other deals use this vehicle, delete it
        if (!vehicleInUse) {
          await Vehicle.delete(vehicle.id);
          console.log('Deleted unused vehicle:', vehicle.id);
        }
      }

      // Check if this dealer is used by any other deals
      if (dealer) {
        const allDeals = await Deal.list();
        const dealerInUse = allDeals.some(d => d.dealer_id === dealer.id && d.id !== deal.id);
        
        // If no other deals use this dealer, delete it
        if (!dealerInUse) {
          await Dealer.delete(dealer.id);
          console.log('Deleted unused dealer:', dealer.id);
        }
      }

      toast.success('Deal deleted successfully!');
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Failed to delete deal:', error);
      toast.error('Failed to delete deal. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  if (isLoading || !deal) {
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

  const isActiveStatus = ['quote_requested', 'negotiating', 'final_offer', 'accepted'].includes(deal.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6">
      <CompleteDealModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        deal={deal}
        vehicle={vehicle}
        onDealCompleted={handleDealCompleted}
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to={createPageUrl("Dashboard")} className="flex items-center text-sm text-slate-600 hover:text-brand-teal font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-2">
            {isActiveStatus && (
              <Button
                onClick={() => setShowCompleteModal(true)}
                className="bg-brand-lime hover:bg-brand-lime-dark text-brand-teal font-bold"
              >
                Complete Deal
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Deal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this deal for the{' '}
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'vehicle'}?
                    <br /><br />
                    This will also delete:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>All messages for this deal</li>
                      <li>The vehicle (if not used in other deals)</li>
                      <li>The dealer (if not used in other deals)</li>
                    </ul>
                    <br />
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteDeal}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Deal'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Vehicle and Messages */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {vehicle && <VehicleSummary vehicle={vehicle} deal={deal} />}
            
            {/* Mobile: Show Negotiation Coach right after vehicle */}
            <div className="block lg:hidden">
              <NegotiationCoach deal={deal} vehicle={vehicle} messages={messages} />
            </div>
            
            <MessageTimeline messages={messages} dealer={dealer} deal={deal} onMessageSent={fetchData} />
          </div>

          {/* Right Column - Pricing, Dealer, and Desktop Coach */}
          <div className="lg:col-span-1 space-y-6 lg:space-y-8">
            <PricingCard deal={deal} onUpdate={fetchData} />
            
            {/* Desktop: Show Negotiation Coach in sidebar */}
            <div className="hidden lg:block">
              <NegotiationCoach deal={deal} vehicle={vehicle} messages={messages} />
            </div>
            
            {dealer && <DealerInfoCard dealer={dealer} />}
          </div>
        </div>
      </div>
    </div>
  );
}
