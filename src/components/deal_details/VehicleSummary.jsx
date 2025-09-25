
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Tag, Gauge, PaintBucket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VehicleSummary({ vehicle }) {
  const details = [
    { label: 'VIN', value: vehicle.vin, icon: Tag },
    { label: 'Mileage', value: vehicle.mileage?.toLocaleString(), icon: Gauge },
    { label: 'Exterior', value: vehicle.exterior_color, icon: PaintBucket },
  ];

  return (
    <Card className="shadow-lg border-slate-200 overflow-hidden">
      {vehicle.image_url && (
        <img src={vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-40 sm:h-48 object-cover" />
      )}
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{`${vehicle.year} ${vehicle.make} ${vehicle.model}`}</h2>
            {vehicle.trim && <p className="text-sm text-slate-600">{vehicle.trim}</p>}
          </div>
          {vehicle.listing_url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(vehicle.listing_url, '_blank')}
            >
              <ExternalLink className="w-5 h-5 text-slate-500" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4 text-center border-t border-slate-100 pt-3 sm:pt-4">
          {details.map(detail => detail.value && (
            <div key={detail.label} className="min-w-0">
              <detail.icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mx-auto mb-1" />
              <p className="text-xs text-slate-500">{detail.label}</p>
              <p className="text-sm font-semibold text-slate-800 break-all">{detail.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
