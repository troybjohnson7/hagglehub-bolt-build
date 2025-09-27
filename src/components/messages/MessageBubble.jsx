import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Mail, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MessageBubble({ message, dealer }) {
  const isUser = message.direction === 'outbound';

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <Mail className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getChannelColor = (channel) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-slate-300 text-slate-700 text-sm">
            {dealer?.name?.charAt(0) || 'D'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-xs ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-2xl px-4 py-2.5 ${
          isUser 
            ? 'bg-teal-700 text-white rounded-br-none' 
            : 'bg-slate-200 text-slate-800 rounded-bl-none'
        }`}>
          <p className="text-sm leading-relaxed">{message.content}</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              <p className={`text-xs opacity-70 ${
                isUser ? 'text-teal-100' : 'text-slate-500'
              }`}>
                {new Date(message.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              {message.channel && (
                <Badge className={`${getChannelColor(message.channel)} text-xs h-auto py-0.5 px-1.5 flex items-center gap-1`}>
                  {getChannelIcon(message.channel)}
                  <span className="capitalize">{message.channel}</span>
                </Badge>
              )}
            </div>
            {message.contains_offer && message.extracted_price && (
              <Badge className="bg-lime-500 text-lime-900 text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                ${message.extracted_price.toLocaleString()}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}