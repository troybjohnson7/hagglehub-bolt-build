import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl, formatCurrency } from '@/utils';
import {
  History,
  Trophy,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export default function DealHistoryWidget({ deals }) {
  const completedDeals = deals.filter(d => ['deal_won', 'deal_lost'].includes(d.status));
  const wonDeals = completedDeals.filter(d => d.status === 'deal_won');

  const totalSavings = wonDeals.reduce((sum, deal) => {
    const savings = (deal.asking_price || 0) - (deal.final_price || 0);
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const currentYear = new Date().getFullYear();
  const dealsThisYear = completedDeals.filter(d => {
    const dealYear = new Date(d.created_date).getFullYear();
    return dealYear === currentYear;
  });

  if (completedDeals.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-brand-teal" />
          Deal History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-teal-50 rounded-lg p-3 text-center">
            <Trophy className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-teal-900">{completedDeals.length}</p>
            <p className="text-xs text-teal-700">Total Deals</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-900">{wonDeals.length}</p>
            <p className="text-xs text-green-700">Won</p>
          </div>
        </div>

        {totalSavings > 0 && (
          <div className="bg-lime-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-lime-700 font-medium">Total Savings</span>
              <DollarSign className="w-4 h-4 text-lime-600" />
            </div>
            <p className="text-xl font-bold text-lime-900">{formatCurrency(totalSavings)}</p>
          </div>
        )}

        {dealsThisYear.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
            <TrendingUp className="w-4 h-4 text-brand-teal" />
            <span>
              <span className="font-bold text-brand-teal">{dealsThisYear.length}</span> completed this year
            </span>
          </div>
        )}

        <Link to={createPageUrl('DealHistory')} className="block">
          <Button className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white">
            View Full History
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
