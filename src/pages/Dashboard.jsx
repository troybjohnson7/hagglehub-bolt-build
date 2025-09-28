
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Deal } from "@/api/entities";
import { Vehicle } from "@/api/entities";
import { Dealer } from "@/api/entities";
import { Message } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Handshake, Plus, Car, Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import SmartInsights from '../components/dashboard/SmartInsights';
import DealCard from '../components/dashboard/DealCard';
import DealFilters from '../components/dashboard/DealFilters';
import RecentMessages from '../components/dashboard/RecentMessages';
import UserEmailManager from '../components/dashboard/UserEmailManager';
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [deals, setDeals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({ status: 'active', priority: 'all' });
  const [sortBy, setSortBy] = useState('recent');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    console.log('Dashboard: Fetching data...');
    console.log('Dashboard: Current pathname:', location.pathname);
    try {
      const currentUser = await User.me();
      if (!currentUser) {
        console.log('Dashboard: No user found, redirecting to home');
        navigate('/', { replace: true });
        return;
      }
      
      setUser(currentUser);
      console.log('Dashboard: User found:', currentUser.email);

      // Check if user needs onboarding
      if (!currentUser.has_completed_onboarding) {
        console.log('Dashboard: User needs onboarding, redirecting');
        navigate('/onboarding', { replace: true });
        return;
      }

      // Fetch data with error handling for each call
      try {
        const dealData = await Deal.list('-created_date');
        console.log('Dashboard: Fetched deals:', dealData.length);
        setDeals(dealData || []);
      } catch (dealError) {
        console.error('Dashboard: Deal fetch error:', dealError);
        setDeals([]);
      }
      
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        const vehicleData = await Vehicle.list();
        console.log('Dashboard: Fetched vehicles:', vehicleData.length);
        setVehicles(vehicleData || []);
      } catch (vehicleError) {
        console.error('Dashboard: Vehicle fetch error:', vehicleError);
        setVehicles([]);
      }
      
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        const dealerData = await Dealer.list();
        console.log('Dashboard: Fetched dealers:', dealerData.length);
        setDealers(dealerData || []);
      } catch (dealerError) {
        console.error('Dashboard: Dealer fetch error:', dealerError);
        setDealers([]);
      }
      
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        const messageData = await Message.list('-created_date');
        console.log('Dashboard: Fetched messages:', messageData.length);
        setMessages(messageData || []);
      } catch (messageError) {
        console.error('Dashboard: Message fetch error:', messageError);
        setMessages([]);
      }
      
      console.log('Dashboard: All data set successfully');

    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      
      // Only redirect on auth errors, not data fetch errors
      if (error.message?.includes('Not authenticated') || error.message?.includes('JWT')) {
        navigate('/', { replace: true });
      } else {
        // Set empty arrays so dashboard can still render
        setDeals([]);
        setVehicles([]);
        setDealers([]);
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
      console.log('Dashboard: Loading complete');
    }
  };

  useEffect(() => {
    console.log('Dashboard: useEffect triggered, pathname:', location.pathname);
    fetchData();
    
    // Listen for localStorage changes (when new deals are created)
    const handleStorageChange = (e) => {
      console.log('Dashboard: Storage change event:', e.key, e.newValue);
      if (e.key && e.key.startsWith('mock_')) {
        console.log('Dashboard: Storage change detected, refreshing data');
        fetchData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  // Add a manual refresh function that can be called when needed
  const refreshData = () => {
    fetchData();
  };

  const getVehicleById = (id) => vehicles.find(v => v.id === id);
  const getDealerById = (id) => dealers.find(d => d.id === id);

  // The 'stats' useMemo has been removed as SmartInsights will handle its own data processing.

  const filteredAndSortedDeals = useMemo(() => {
    let filtered = deals;

    // Filter logic
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(deal => ['quote_requested', 'negotiating', 'final_offer'].includes(deal.status));
      } else {
        filtered = filtered.filter(deal => deal.status === filters.status);
      }
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(deal => deal.priority === filters.priority);
    }

    // Sorting logic
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'highest_offer':
          return (b.current_offer || 0) - (a.current_offer || 0);
        case 'biggest_savings':
          const savingsA = (a.asking_price || 0) - (a.current_offer || 0);
          const savingsB = (b.asking_price || 0) - (b.current_offer || 0);
          return savingsB - savingsA;
        case 'expiring_soon':
          if (!a.quote_expires) return 1;
          if (!b.quote_expires) return -1;
          return new Date(a.quote_expires) - new Date(b.quote_expires);
        case 'recent':
        default:
          return new Date(b.created_date) - new Date(a.created_date);
      }
    });

    return sorted;
  }, [deals, filters, sortBy]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-green-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  // If no deals, show empty state dashboard
  if (deals.length === 0) {
    return (
       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome, {user?.full_name?.split(' ')[0] || 'Haggler'}!
              </h1>
              <p className="text-slate-600 mt-1">Your command center for car deals.</p>
            </div>
            <Link to={createPageUrl("AddVehicle")} className="w-full md:w-auto">
              <Button className="bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl font-medium w-full">
                <Plus className="w-5 h-5 mr-2" />
                Add New Deal
              </Button>
            </Link>
          </div>
          <div className="text-center py-20 px-6 bg-white rounded-xl shadow-sm border">
              <Handshake className="w-16 h-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-slate-800">You're All Set!</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                You have no active deals right now. Click "Add New Deal" to start tracking your next vehicle negotiation.
              </p>
             
             {/* Show Universal Deal Email even when no deals */}
             <div className="mt-8 max-w-md mx-auto">
               <UserEmailManager user={user} />
             </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show full dashboard for users with deals
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome, {user?.full_name?.split(' ')[0] || 'Haggler'}!
            </h1>
            <p className="text-slate-600 mt-1">Your command center for car deals.</p>
          </div>
          <Link to={createPageUrl("AddVehicle")} className="w-full md:w-auto">
            <Button className="bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl font-medium w-full">
              <Plus className="w-5 h-5 mr-2" />
              Add New Deal
            </Button>
          </Link>
        </div>
        
        <div className="mb-8">
          <SmartInsights deals={deals} vehicles={vehicles} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="md:hidden mb-4">
              <Button 
                variant="outline" 
                className="w-full justify-start text-left font-normal bg-white"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {showMobileFilters ? 'Hide Filters' : 'Show Filters & Sort'}
              </Button>
            </div>
            
            <div className="md:hidden mb-4">
              {/* Pass the user prop to UserEmailManager for potential fallback email logic */}
              <UserEmailManager user={user} />
            </div>
            
            <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block`}>
              <DealFilters filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} />
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {filteredAndSortedDeals.length > 0 ? (
                  filteredAndSortedDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      vehicle={getVehicleById(deal.vehicle_id)}
                      dealer={getDealerById(deal.dealer_id)}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 px-6 bg-white rounded-xl shadow-sm border"
                  >
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800">No Deals Found</h3>
                    <p className="text-slate-500 mt-1">
                      Your filters didn't match any deals. Try adjusting your filter settings.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="hidden lg:block lg:col-span-1 space-y-8">
            {/* Pass the user prop to UserEmailManager for potential fallback email logic */}
            <UserEmailManager user={user} />
            <RecentMessages messages={messages} dealers={dealers} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
