import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function MessageTimeline({ messages, dealer }) {
  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-slate-700" />
          Recent Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`flex items-start gap-3 ${message.direction === 'outbound' ? 'justify-end' : ''}`}>
            {message.direction === 'inbound' && (
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-slate-300 text-slate-700 text-sm">
                  {dealer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className={`flex flex-col ${message.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-xs p-3 rounded-2xl text-sm ${
                message.direction === 'outbound' 
                  ? 'bg-teal-700 text-white rounded-br-none' 
                  : 'bg-slate-200 text-slate-800 rounded-bl-none'
              }`}>
                {message.content}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(message.created_date).toLocaleDateString()}
              </p>
            </div>
            {message.direction === 'outbound' && (
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-teal-700 text-white text-sm">
                  Y
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}