import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Handshake, Phone, Mail, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function DealerInfoCard({ dealer }) {
  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-slate-700" />
            Dealer Information
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Link to={createPageUrl(`EditDealer?dealer_id=${dealer.id}`)}>
              <Button variant="ghost" size="icon">
                <Edit className="w-4 h-4 text-slate-500" />
              </Button>
            </Link>
          </motion.div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xl font-bold text-slate-900">{dealer.name}</p>
        {dealer.sales_rep_name && (
          <p className="text-sm text-slate-600">Sales Rep: {dealer.sales_rep_name}</p>
        )}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {dealer.phone && (
            <a href={`tel:${dealer.phone}`} className="flex items-center gap-3 group">
              <Phone className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-800 group-hover:text-blue-600">{dealer.phone}</span>
            </a>
          )}
          {dealer.contact_email && (
            <a href={`mailto:${dealer.contact_email}`} className="flex items-center gap-3 group">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-800 group-hover:text-blue-600">{dealer.contact_email}</span>
            </a>
          )}
        </div>
        <div className="pt-2">
          <Link to={createPageUrl(`Messages?dealer_id=${dealer.id}`)}>
            <Button variant="outline" className="w-full">
              View Full Conversation
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}