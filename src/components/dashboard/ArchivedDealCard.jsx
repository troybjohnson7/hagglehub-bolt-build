import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Eye,
  Users,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function ArchivedDealCard({ deal, vehicle, dealer }) {
  const isWon = deal.status === 'deal_won';
  const savings = deal.asking_price && deal.final_price ? deal.asking_price - deal.final_price : 0;
  const savingsPercentage = deal.asking_price && savings ? ((savings / deal.asking_price) * 100).toFixed(1) : 0;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md border-l-4 ${
      isWon ? 'border-l-green-500 bg-green-50/30' : 'border-l-slate-400 bg-slate-50/30'
    }`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left side - Vehicle & Dealer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-1">
                {isWon ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-slate-600" />
                  </div>
                )}
              </div>

              {/* Vehicle Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle Details'}
                  </h3>
                  <Badge className={isWon ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}>
                    {isWon ? 'Won' : 'Lost'}
                  </Badge>
                  {deal.shared_anonymously && (
                    <Badge variant="outline" className="bg-lime-50 text-lime-700 border-lime-300">
                      <Users className="w-3 h-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>

                {vehicle?.trim && (
                  <p className="text-sm text-slate-600 mb-2">{vehicle.trim}</p>
                )}

                {dealer && (
                  <p className="text-sm text-slate-500">
                    Dealer: <span className="font-medium text-slate-700">{dealer.name}</span>
                  </p>
                )}

                {/* Deal Timeline */}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Completed {deal.created_date ? format(new Date(deal.created_date), 'MMM d, yyyy') : 'N/A'}</span>
                  </div>
                  {deal.negotiation_duration_days && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{deal.negotiation_duration_days} days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Pricing Summary */}
          <div className="flex flex-col sm:items-end gap-2 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 border-slate-200">
            {isWon ? (
              <>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Final Price</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${deal.final_price?.toLocaleString() || 'N/A'}
                  </p>
                </div>

                {savings > 0 && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                    <div className="text-right">
                      <p className="text-sm font-bold">${savings.toLocaleString()} saved</p>
                      <p className="text-xs">({savingsPercentage}% off)</p>
                    </div>
                  </div>
                )}

                <div className="text-right text-xs text-slate-500 mt-1">
                  <p>Original: ${deal.asking_price?.toLocaleString() || 'N/A'}</p>
                </div>
              </>
            ) : (
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Last Offer</p>
                <p className="text-xl font-bold text-slate-700">
                  ${deal.current_offer?.toLocaleString() || deal.asking_price?.toLocaleString() || 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Target: ${deal.target_price?.toLocaleString() || 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* View Details Button */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
          <Link to={createPageUrl(`DealDetails?deal_id=${deal.id}`)}>
            <Button variant="outline" size="sm" className="text-brand-teal hover:bg-teal-50">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
