
import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingDown,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Debug function to log navigation
const handleCardClick = (dealId) => {
  const url = createPageUrl(`DealDetails?deal_id=${dealId}`);
  console.log('Navigating to:', url);
};

const statusColors = {
  quote_requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
  negotiating: "bg-brand-lime bg-opacity-20 text-brand-teal border-brand-lime",
  final_offer: "bg-orange-100 text-orange-800 border-orange-200",
  accepted: "bg-brand-teal bg-opacity-10 text-brand-teal border-brand-teal",
  declined: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-gray-100 text-gray-800 border-gray-200"
};

const statusLabels = {
  quote_requested: "Quote Requested",
  negotiating: "Negotiating",
  final_offer: "Final Offer",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired"
};

export default function DealCard({ deal, vehicle, dealer }) {
  const savings = deal.asking_price && deal.current_offer 
    ? deal.asking_price - deal.current_offer 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <Link 
        to={createPageUrl(`DealDetails?deal_id=${deal.id}`)} 
        className="block"
        onClick={() => handleCardClick(deal.id)}
      >
        <Card className="shadow-sm border-slate-200 hover:shadow-lg hover:border-brand-lime transition-all duration-200 overflow-hidden">
          <CardHeader className="p-3 md:p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-slate-900 truncate">
                  {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle Info Missing'}
                </h3>
                <p className="text-slate-500 text-sm mt-1 truncate">
                  {dealer ? dealer.name : 'Dealer Info Missing'}
                </p>
              </div>
              <Badge className={`${statusColors[deal.status]} border font-medium text-xs ml-2 shrink-0`}>
                {statusLabels[deal.status]}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <div>
                  <p className="text-xs text-slate-500">Offer</p>
                  <p className="text-sm font-bold text-slate-900">
                    {deal.current_offer ? `$${Number(deal.current_offer).toLocaleString()}` : 'Pending'}
                  </p>
                </div>
                {savings > 0 && (
                  <div className="flex items-center gap-1.5 text-brand-teal">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-bold">
                      ${savings.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
