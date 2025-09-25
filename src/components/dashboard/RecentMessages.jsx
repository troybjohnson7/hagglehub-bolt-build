import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentMessages({ messages, dealers, isLoading }) {
  const getDealerName = (dealerId) => {
    const dealer = dealers.find(d => d.id === dealerId);
    return dealer ? dealer.name : 'Unknown Dealer';
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-200 hover:border-brand-lime hover:border-opacity-20 transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-slate-900">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200 hover:border-brand-lime hover:border-opacity-20 transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-900">Recent Messages</CardTitle>
          <Link to={createPageUrl("Messages")}>
            <Button variant="ghost" size="sm" className="text-brand-teal hover:text-brand-teal-dark hover:bg-teal-50">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 ? (
          messages.slice(0, 5).map((message) => (
            <Link 
              key={message.id} 
              to={createPageUrl(`Messages?dealer_id=${message.dealer_id}`)}
              className="block border-b border-slate-100 last:border-0 pb-3 last:pb-0 hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {getDealerName(message.dealer_id)}
                    </p>
                    {!message.is_read && (
                      <Badge variant="secondary" className="bg-brand-lime bg-opacity-20 text-brand-teal border-brand-lime text-xs font-bold">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm truncate mt-1">
                    {message.content}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {new Date(message.created_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs shrink-0 ${
                    message.direction === 'inbound' 
                      ? 'border-brand-lime text-brand-teal bg-lime-50' 
                      : 'border-brand-teal text-brand-teal bg-teal-50'
                  }`}
                >
                  {message.direction === 'inbound' ? '→' : '←'}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-4">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No messages yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}