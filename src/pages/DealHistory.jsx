import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deal, Vehicle, Dealer, User } from '@/api/entities';
import { formatCurrency } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  History,
  BarChart3,
  Search,
  Filter,
  Download,
  Trophy,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import ArchivedDealCard from '../components/dashboard/ArchivedDealCard';
import PersonalAnalytics from '../components/dashboard/PersonalAnalytics';

export default function DealHistoryPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    async function fetchData() {
      try {
        const currentUser = await User.me();
        if (!currentUser) {
          navigate('/');
          return;
        }
        setUser(currentUser);

        const [dealData, vehicleData, dealerData] = await Promise.all([
          Deal.list('-created_date'),
          Vehicle.list(),
          Dealer.list()
        ]);

        setDeals(dealData || []);
        setVehicles(vehicleData || []);
        setDealers(dealerData || []);
      } catch (error) {
        console.error('Failed to fetch deal history:', error);
        toast.error('Failed to load deal history');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [navigate]);

  const completedDeals = deals.filter(d => ['deal_won', 'deal_lost'].includes(d.status));
  const wonDeals = completedDeals.filter(d => d.status === 'deal_won');
  const lostDeals = completedDeals.filter(d => d.status === 'deal_lost');

  const totalSavings = wonDeals.reduce((sum, deal) => {
    const savings = (deal.asking_price || 0) - (deal.final_price || 0);
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const filteredAndSortedDeals = useMemo(() => {
    let filtered = completedDeals;

    if (filterOutcome !== 'all') {
      filtered = filtered.filter(d => d.status === filterOutcome);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => {
        const vehicle = vehicles.find(v => v.id === deal.vehicle_id);
        const dealer = dealers.find(d => d.id === deal.dealer_id);
        const vehicleString = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.toLowerCase() : '';
        const dealerString = dealer ? dealer.name.toLowerCase() : '';
        return vehicleString.includes(query) || dealerString.includes(query);
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'biggest_savings': {
          const savingsA = (a.asking_price || 0) - (a.final_price || 0);
          const savingsB = (b.asking_price || 0) - (b.final_price || 0);
          return savingsB - savingsA;
        }
        case 'oldest':
          return new Date(a.created_date) - new Date(b.created_date);
        case 'recent':
        default:
          return new Date(b.created_date) - new Date(a.created_date);
      }
    });

    return sorted;
  }, [completedDeals, vehicles, dealers, filterOutcome, searchQuery, sortBy]);

  const getVehicleById = (id) => vehicles.find(v => v.id === id);
  const getDealerById = (id) => dealers.find(d => d.id === id);

  const handleExport = () => {
    toast.info('Export feature coming soon!');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-green-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <History className="w-8 h-8 text-brand-teal" />
            Deal History
          </h1>
          <p className="text-slate-600 mt-1">Track your negotiation success over time</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-teal-200 bg-teal-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-teal-900">{completedDeals.length}</p>
                  <p className="text-sm text-teal-700">Total Completed</p>
                </div>
                <Trophy className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-900">{wonDeals.length}</p>
                  <p className="text-sm text-green-700">Deals Won</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-lime-200 bg-lime-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-lime-900">{formatCurrency(totalSavings)}</p>
                  <p className="text-sm text-lime-700">Total Savings</p>
                </div>
                <BarChart3 className="w-8 h-8 text-lime-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200">
            <TabsTrigger value="history" className="data-[state=active]:bg-brand-lime data-[state=active]:text-brand-teal">
              <History className="w-4 h-4 mr-2" />
              Deal History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-brand-lime data-[state=active]:text-brand-teal">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-900">All Completed Deals</CardTitle>
                    <CardDescription>Browse and filter your negotiation history</CardDescription>
                  </div>
                  <Button onClick={handleExport} variant="outline" className="text-brand-teal">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by vehicle or dealer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterOutcome} onValueChange={setFilterOutcome}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Outcomes</SelectItem>
                      <SelectItem value="deal_won">Won Only</SelectItem>
                      <SelectItem value="deal_lost">Lost Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="biggest_savings">Biggest Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedDeals.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">
                        {completedDeals.length === 0
                          ? 'No completed deals yet. Keep negotiating!'
                          : 'No deals match your filters.'}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredAndSortedDeals.map((deal) => (
                        <motion.div
                          key={deal.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArchivedDealCard
                            deal={deal}
                            vehicle={getVehicleById(deal.vehicle_id)}
                            dealer={getDealerById(deal.dealer_id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <PersonalAnalytics deals={deals} vehicles={vehicles} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
