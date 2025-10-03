import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MessageBubble({ message, dealer }) {
  const isUser = message.direction === 'outbound';


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
        <Avatar className="w-6 h-6 sm:w-8 sm:h-8 shrink-0">
          <AvatarFallback className="bg-slate-300 text-slate-700 text-sm">
            {dealer?.name?.charAt(0) || 'D'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[75%] sm:max-w-xs ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 ${
          isUser 
            ? 'bg-teal-700 text-white rounded-br-none' 
            : 'bg-slate-200 text-slate-800 rounded-bl-none'
        }`}>
          <p className="text-sm sm:text-sm leading-relaxed break-words">{message.content}</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              <p className={`text-xs opacity-70 ${
                isUser ? 'text-teal-100' : 'text-slate-500'
              }`}>
                {new Date(message.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            {message.contains_offer && message.extracted_price && (
              <Badge className="bg-lime-500 text-lime-900 text-xs shrink-0">
                <DollarSign className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                ${message.extracted_price.toLocaleString()}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}