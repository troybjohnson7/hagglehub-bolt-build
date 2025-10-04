import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Clock,
  DollarSign,
  Percent,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PersonalAnalytics({ deals, vehicles }) {
  const completedDeals = deals.filter(d => ['deal_won', 'deal_lost'].includes(d.status));
  const wonDeals = deals.filter(d => d.status === 'deal_won');
  const lostDeals = deals.filter(d => d.status === 'deal_lost');

  const totalSavings = wonDeals.reduce((sum, deal) => {
    const savings = (deal.asking_price || 0) - (deal.final_price || 0);
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const avgSavings = wonDeals.length > 0 ? totalSavings / wonDeals.length : 0;
  const avgSavingsPercent = wonDeals.length > 0
    ? wonDeals.reduce((sum, deal) => {
        const savings = (deal.asking_price || 0) - (deal.final_price || 0);
        const percent = deal.asking_price ? (savings / deal.asking_price) * 100 : 0;
        return sum + percent;
      }, 0) / wonDeals.length
    : 0;

  const avgNegotiationDays = completedDeals.length > 0
    ? completedDeals.reduce((sum, deal) => sum + (deal.negotiation_duration_days || 0), 0) / completedDeals.length
    : 0;

  const successRate = completedDeals.length > 0
    ? (wonDeals.length / completedDeals.length) * 100
    : 0;

  const savingsByMonth = wonDeals.reduce((acc, deal) => {
    if (!deal.created_date) return acc;
    const month = new Date(deal.created_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const savings = (deal.asking_price || 0) - (deal.final_price || 0);

    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.savings += savings;
      existing.count += 1;
    } else {
      acc.push({ month, savings, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA - dateB;
  });

  const dealsByOutcome = [
    { name: 'Won', value: wonDeals.length, color: '#22c55e' },
    { name: 'Lost', value: lostDeals.length, color: '#94a3b8' }
  ];

  const bestDeal = wonDeals.length > 0
    ? wonDeals.reduce((best, deal) => {
        const savings = (deal.asking_price || 0) - (deal.final_price || 0);
        const bestSavings = (best.asking_price || 0) - (best.final_price || 0);
        return savings > bestSavings ? deal : best;
      })
    : null;

  const bestDealVehicle = bestDeal ? vehicles.find(v => v.id === bestDeal.vehicle_id) : null;
  const bestDealSavings = bestDeal ? (bestDeal.asking_price || 0) - (bestDeal.final_price || 0) : 0;

  if (completedDeals.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Your Negotiation Analytics</CardTitle>
          <CardDescription>Complete your first deal to see insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              No completed deals yet. Keep negotiating to unlock your personal analytics!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <Badge className="bg-green-100 text-green-800">{wonDeals.length} deals</Badge>
            </div>
            <p className="text-2xl font-bold text-green-900">${totalSavings.toLocaleString()}</p>
            <p className="text-xs text-green-700 mt-1">Total Savings</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Percent className="w-8 h-8 text-blue-600" />
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{avgSavingsPercent.toFixed(1)}%</p>
            <p className="text-xs text-blue-700 mt-1">Avg Savings Rate</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-teal-600" />
              <Badge className="bg-teal-100 text-teal-800">{completedDeals.length} total</Badge>
            </div>
            <p className="text-2xl font-bold text-teal-900">{successRate.toFixed(0)}%</p>
            <p className="text-xs text-teal-700 mt-1">Success Rate</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">{avgNegotiationDays.toFixed(1)}</p>
            <p className="text-xs text-purple-700 mt-1">Avg Days to Close</p>
          </CardContent>
        </Card>
      </div>

      {bestDeal && (
        <Card className="border-lime-200 bg-lime-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-lime-600" />
              <CardTitle className="text-slate-900">Best Deal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {bestDealVehicle ? `${bestDealVehicle.year} ${bestDealVehicle.make} ${bestDealVehicle.model}` : 'Vehicle'}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Saved <span className="font-bold text-green-600">${bestDealSavings.toLocaleString()}</span> off asking price
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Final Price</p>
                <p className="text-2xl font-bold text-slate-900">${bestDeal.final_price?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {savingsByMonth.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Savings Over Time</CardTitle>
              <CardDescription>Your negotiation success by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={savingsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    formatter={(value) => `$${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ fill: '#5EE83F', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Deal Outcomes</CardTitle>
            <CardDescription>Won vs Lost negotiations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dealsByOutcome}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {dealsByOutcome.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{wonDeals.length}</p>
                <p className="text-xs text-green-700">Deals Won</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-600">{lostDeals.length}</p>
                <p className="text-xs text-slate-700">Deals Lost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
