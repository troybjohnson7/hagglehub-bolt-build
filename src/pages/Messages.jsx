
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Message } from '@/api/entities';
import { Dealer } from '@/api/entities';
import { Deal } from '@/api/entities';
import { Vehicle } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Sparkles, Loader2, MessageCircle, LogIn, Zap, DollarSign, CheckCircle2, Clock, MessageSquareReply } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from 'sonner';

import MessageBubble from '../components/messages/MessageBubble';
import QuickActions from '../components/messages/QuickActions';
import MessageTemplates from '../components/messages/MessageTemplates';
import PriceExtractNotification from '../components/messages/PriceExtractNotification';
import { sendReply } from "@/api/functions"; // Fixed import extension
import { cleanupDuplicateDealers } from '@/utils/cleanup';

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(searchParams.get('dealer_id') || null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isLogMessageOpen, setIsLogMessageOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [extractedPrice, setExtractedPrice] = useState(null);
  const [showPriceNotification, setShowPriceNotification] = useState(false);
  
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Run cleanup on first load to remove any duplicate dealers
        try {
          const cleanupResult = await cleanupDuplicateDealers();
          if (cleanupResult.cleaned > 0) {
            console.log(`Cleaned up ${cleanupResult.cleaned} duplicate dealers`);
          }
        } catch (cleanupError) {
          console.log('Cleanup failed, continuing anyway:', cleanupError);
        }
        
        const [dealerData] = await Promise.all([Dealer.list()]);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const [dealData] = await Promise.all([Deal.list()]);
        
        setDealers(dealerData);
        setDeals(dealData);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast.error("Failed to load initial data. Please try again.");
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (dealers.length > 0 && !selectedDealerId) {
      setSelectedDealerId(dealers[0].id);
    }
  }, [dealers, selectedDealerId]);

  useEffect(() => {
    async function fetchMessages() {
      if (selectedDealerId) {
        setIsLoading(true);
        try {
          const messageData = await Message.filter({ dealer_id: selectedDealerId });
          setMessages(messageData.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
          
          // Mark all unread messages from this dealer as read
          const unreadMessages = messageData.filter(m => !m.is_read && m.direction === 'inbound');
          if (unreadMessages.length > 0) {
            console.log(`Marking ${unreadMessages.length} messages as read for dealer ${selectedDealerId}`);
            await Promise.all(unreadMessages.map(m => Message.update(m.id, { is_read: true })));
            
            // Trigger a custom event to notify other components (like notifications)
            const event = new CustomEvent('messagesRead', { 
              detail: { dealerId: selectedDealerId, count: unreadMessages.length }
            });
            window.dispatchEvent(event);
            console.log('Dispatched messagesRead event for dealer:', selectedDealerId);
          }

        } catch (error) {
          console.error("Failed to fetch messages:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMessages([]);
        setIsLoading(false);
      }
    }
    fetchMessages();
  }, [selectedDealerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const extractPriceFromMessage = (content) => {
    const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const prices = content.match(priceRegex);
    if (prices && prices.length > 0) {
      const numericPrice = parseFloat(prices[0].replace(/[$,]/g, ''));
      if (numericPrice > 1000) {
        return numericPrice;
      }
    }
    return null;
  };

  const handleMessageSubmit = async (content, direction, channel = 'app') => {
    if (!content.trim() || !selectedDealerId) return;
    setIsSending(true);

    try {
      const currentDeal = deals.find(d => d.dealer_id === selectedDealerId);
      if (!currentDeal) {
        toast.error('No deal found for this dealer. Please create a deal first.');
        setIsSending(false);
        return;
      }

      let createdMessage;

      if (direction === 'outbound' && channel === 'email') {
        try {
          // Use the backend function to send email and save message
          const response = await sendReply({
            message_content: content,
            dealer_id: selectedDealerId,
            deal_id: currentDeal.id
          });
          
          if (response.data.success) {
            // Refresh messages to show the new outbound message
            const messageData = await Message.filter({ dealer_id: selectedDealerId });
            setMessages(messageData.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
            toast.success('Email sent successfully!');
            setIsSending(false);
            return; // Exit early since message was created by Edge Function
          } else {
            throw new Error('Failed to send email');
          }
        } catch (emailError) {
          console.error('Email sending failed, falling back to app message:', emailError);
          toast.error('Email sending failed, saved as app message instead');
          // Fallback to creating an app message if email fails
          channel = 'app';
        }
      }
      
      // Create app message if not email or if email failed
      if (channel === 'app') {
        // Extract price if it's an inbound message
        let extractedPrice = null;
        if (direction === 'inbound') {
          extractedPrice = extractPriceFromMessage(content);
        }

        const messageData = {
          content,
          deal_id: currentDeal.id,
          dealer_id: selectedDealerId,
          direction,
          channel,
          is_read: true,
          contains_offer: !!extractedPrice,
          extracted_price: extractedPrice
        };

        createdMessage = await Message.create(messageData);
        setMessages(prev => [...prev, createdMessage]);

        // Show price extraction notification if price found
        if (extractedPrice) {
          setExtractedPrice(extractedPrice);
          setShowPriceNotification(true);
        }
      }

      setIsSending(false);
      return createdMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    await handleMessageSubmit(newMessage, 'outbound', 'email'); // Changed to 'email' so it actually sends
    setNewMessage('');
  };
  
  const handleLogMessage = async (logContent) => {
    await handleMessageSubmit(logContent, 'inbound');
    setIsLogMessageOpen(false);
  };

  const handleTemplateSelect = (template) => {
    setNewMessage(template);
    setShowTemplates(false);
  };

  const handleAISuggestion = async () => {
    if (!selectedDealerId) return;
    setIsSuggesting(true);
    setAiSuggestions([]);

    const currentDeal = deals.find(d => d.dealer_id === selectedDealerId);
    if (!currentDeal) {
      toast.error('No deal found for this dealer. Cannot generate AI suggestions.');
      setIsSuggesting(false);
      return;
    }

    const vehicle = currentDeal ? await Vehicle.filter({id: currentDeal.vehicle_id}).then(res => res[0]) : null;

    const conversationHistory = messages
      .slice(-10)
      .map(m => `${m.direction === 'inbound' ? 'Dealer' : 'You'}: ${m.content}`)
      .join('\n');
      
    const prompt = `
      You are an expert car negotiation coach, "The HaggleHub Coach", trained in Chris Voss's FBI negotiation techniques. Your goal is to provide strategic, high-level advice.

      Given the following deal context and conversation history, provide 2-3 distinct, actionable negotiation strategies.

      For each strategy, provide:
      1. A clear name for the strategy (e.g., "Calibrated Question to Uncover Constraints").
      2. A detailed explanation of *why* this strategy is effective in this specific situation.
      3. A concrete example of how they could phrase their next message to implement this strategy.

      **Deal Context:**
      - Vehicle: ${vehicle?.year || 'N/A'} ${vehicle?.make || 'N/A'} ${vehicle?.model || 'N/A'}
      - Dealer's Asking Price: $${currentDeal?.asking_price?.toLocaleString() || 'N/A'}
      - Your Target Price: $${currentDeal?.target_price?.toLocaleString() || 'Not set'}
      - Current Dealer Offer: $${currentDeal?.current_offer?.toLocaleString() || 'None yet'}
      - Purchase Type: ${currentDeal?.purchase_type || 'N/A'}
      - Current Deal Status: ${currentDeal?.status || 'N/A'}

      **Recent Conversation History:**
      ${conversationHistory || 'No recent conversation.'}

      **Your Task:**
      Analyze everything and provide your top 2-3 strategic recommendations. Focus on building long-term leverage, uncovering dealer motivations, and moving the price closer to the user's target without creating animosity.
    `;
    
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      direction: 'outbound',
      created_date: new Date().toISOString(),
      is_read: true,
      contains_offer: false
    };
    
    // Add message to UI immediately
    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage;
    setNewMessage('');
    
    try {
      await handleMessageSubmit(messageToSend, 'outbound', 'app');
      // Refresh messages to get the real message from database
      const messageData = await Message.filter({ dealer_id: selectedDealerId });
      setMessages(messageData.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      
      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  strategy_name: { type: "string" },
                  explanation: { type: "string" },
                  example_message: { type: "string" }
                },
                required: ["strategy_name", "explanation", "example_message"]
              }
            }
          },
          required: ["suggestions"]
        }
      });
      setAiSuggestions(response.suggestions);
      setIsSuggestionModalOpen(true);
    } catch(e) {
      console.error(e);
      toast.error('Failed to generate AI suggestions.');
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageToSend);
    } finally {
      setIsSuggesting(false);
    }
  };

  const selectedDealer = dealers.find(d => d.id === selectedDealerId);
  const currentDeal = deals.find(d => d.dealer_id === selectedDealerId);

  if (dealers.length === 0 && !isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center h-full text-center p-8"
      >
        <MessageCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">No Conversations</h2>
        <p className="text-slate-500">You haven't started any conversations yet. Add a new deal to begin.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-50 flex flex-col"
    >
      <PriceExtractNotification 
        show={showPriceNotification} 
        price={extractedPrice}
        deal={currentDeal}
        onClose={() => setShowPriceNotification(false)}
        onUpdate={() => {
          Deal.list().then(setDeals);
        }}
      />

      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-4">
        <select
          value={selectedDealerId || ''}
          onChange={(e) => setSelectedDealerId(e.target.value)}
          className="flex-1 p-3 border border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:ring-lime-500 focus:border-lime-500"
        >
          <option value="">Select a dealer...</option>
          {dealers.map(dealer => (
            <option key={dealer.id} value={dealer.id}>
              {dealer.name}
            </option>
          ))}
        </select>
        <Dialog open={isLogMessageOpen} onOpenChange={setIsLogMessageOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0" disabled={!selectedDealerId}>
              <LogIn className="w-4 h-4"/>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Incoming Message</DialogTitle>
            </DialogHeader>
            <LogMessageForm onSubmit={handleLogMessage} />
          </DialogContent>
        </Dialog>
      </div>

      {selectedDealer ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-500 py-10">No messages yet. Send one to start!</div>
            ) : (
              <AnimatePresence>
                {messages.map((message, index) => (
                  <MessageBubble key={message.id} message={message} dealer={selectedDealer} />
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {currentDeal && (
            <QuickActions 
              deal={currentDeal} 
              onAction={(action, data) => {
                if (action === 'send_message') {
                  handleMessageSubmit(data.message, 'outbound', 'app');
                }
              }}
            />
          )}

          <div className="bg-white border-t border-slate-200 p-4">
            <div className="flex gap-2 mb-2">
              <Dialog open={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAISuggestion}
                    disabled={isSuggesting || !currentDeal}
                    className="text-xs border-lime-300 text-lime-700 hover:bg-lime-50"
                  >
                    {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Suggest
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>AI Negotiation Strategies</DialogTitle>
                    <DialogDescription>Here are a few strategic options for your next move. Choose one to use it.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {aiSuggestions.length > 0 ? (
                      aiSuggestions.map((suggestion, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-slate-50">
                          <h4 className="font-semibold text-sm text-slate-800">{suggestion.strategy_name}</h4>
                          <p className="text-xs text-slate-600 mt-1 mb-2">{suggestion.explanation}</p>
                          <blockquote className="border-l-2 border-lime-400 pl-3 text-sm text-slate-700 font-medium bg-white p-2 rounded-r-md">
                            {suggestion.example_message}
                          </blockquote>
                          <Button
                            size="sm"
                            className="mt-3 text-xs"
                            onClick={() => {
                              setNewMessage(suggestion.example_message);
                              setIsSuggestionModalOpen(false);
                            }}
                          >
                            Use this message
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-500">No suggestions generated yet, or an error occurred.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Sheet open={showTemplates} onOpenChange={setShowTemplates}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs">
                    <MessageSquareReply className="w-3 h-3 mr-1" />
                    Templates
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>Message Templates</SheetTitle>
                    <SheetDescription>Choose a professional template to get started</SheetDescription>
                  </SheetHeader>
                  <MessageTemplates onSelect={handleTemplateSelect} deal={currentDeal} />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Type your reply..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                className="flex-1 min-h-[44px] text-sm focus:ring-lime-500 focus:border-lime-500"
                rows={2}
              />
              <div className="flex flex-col gap-2">
                <Button 
                  size="icon" 
                  onClick={handleSendMessage} 
                  disabled={isSending || !newMessage.trim()}
                  className="bg-teal-700 hover:bg-teal-800 shrink-0"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-500">Select a dealer to view messages.</p>
        </div>
      )}
    </motion.div>
  );
}

function LogMessageForm({ onSubmit }) {
  const [content, setContent] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(content);
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea 
        placeholder="Paste the dealer's email or text message here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[120px]"
        required
      />
      <Button type="submit" className="w-full bg-lime-600 hover:bg-lime-700">
        Log Message
      </Button>
    </form>
  );
}
