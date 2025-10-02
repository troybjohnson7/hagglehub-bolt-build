import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Link,
  useSearchParams,
  useNavigate
} from 'react-router-dom';
import {
  createPageUrl
} from '@/utils';
import {
  Deal
} from '@/api/entities';
import {
  Vehicle
} from '@/api/entities';
import {
  Dealer
} from '@/api/entities';
import {
  Message
} from '@/api/entities';
import {
  InvokeLLM
} from '@/api/integrations';
import {
  Button
} from '@/components/ui/button';
import {
  Textarea
} from '@/components/ui/textarea';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  MessageSquareReply
} from 'lucide-react';
import {
  motion,
  AnimatePresence
} from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { sendReply } from "@/api/functions";

import VehicleSummary from '../components/deal_details/VehicleSummary';
import PricingCard from '../components/deal_details/PricingCard';
import DealerInfoCard from '../components/deal_details/DealerInfoCard';
import MessageTimeline from '../components/deal_details/MessageTimeline';
import NegotiationCoach from '../components/deal_details/NegotiationCoach';
import CompleteDealModal from '../components/deal_details/CompleteDealModal';
import MessageTemplates from '../components/messages/MessageTemplates';
import QuickActions from '../components/messages/QuickActions';
import PriceExtractNotification from '../components/messages/PriceExtractNotification';
import MessageBubble from '../components/messages/MessageBubble';

export default function DealDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dealId = searchParams.get('deal_id');

  const [deal, setDeal] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPriceNotification, setShowPriceNotification] = useState(false);
  const [extractedPrice, setExtractedPrice] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!dealId) {
      navigate(createPageUrl("Dashboard"));
      return;
    }
    
    // Validate that dealId is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dealId)) {
      console.error("Invalid deal ID format:", dealId);
      navigate(createPageUrl("Dashboard"));
      return;
    }
    
    try {
      setIsLoading(true);
      const [dealData, vehicles, dealers] = await Promise.all([
        Deal.filter({ id: dealId }),
        Vehicle.list(),
        Dealer.list(),
      ]);

      if (!dealData || dealData.length === 0) {
        navigate(createPageUrl("Dashboard"));
        return;
      }

      const currentDeal = dealData[0];
      const currentVehicle = vehicles.find(v => v.id === currentDeal.vehicle_id);
      const currentDealer = dealers.find(d => d.id === currentDeal.dealer_id);
      
      if(currentDealer) {
        const messageData = await Message.filter({ dealer_id: currentDealer.id });
        setMessages(messageData.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      }

      setDeal(currentDeal);
      setVehicle(currentVehicle);
      setDealer(currentDealer);
    } catch (error) {
      console.error("Failed to fetch deal details:", error);
      navigate(createPageUrl("Dashboard"));
    } finally {
      setIsLoading(false);
    }
  }, [dealId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll to bottom when new messages are added
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
    if (!content.trim() || !dealer) return;
    setIsSending(true);

    try {
      let createdMessage;

      if (direction === 'outbound' && channel === 'email') {
        try {
          // Use the backend function to send email and save message
          const response = await sendReply({
            message_content: content,
            dealer_id: dealer.id,
            deal_id: deal.id
          });
          
          if (response.data.success) {
            // Refresh messages to show the new outbound message
            const messageData = await Message.filter({ dealer_id: dealer.id });
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
          deal_id: deal.id,
          dealer_id: dealer.id,
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
    await handleMessageSubmit(newMessage, 'outbound', 'email');
    setNewMessage('');
  };

  const handleTemplateSelect = (template) => {
    setNewMessage(template);
    setShowTemplates(false);
  };

  const handleAISuggestion = async () => {
    if (!deal) return;
    setIsSuggesting(true);
    setAiSuggestions([]);

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
      - Dealer's Asking Price: $${deal?.asking_price?.toLocaleString() || 'N/A'}
      - Your Target Price: $${deal?.target_price?.toLocaleString() || 'Not set'}
      - Current Dealer Offer: $${deal?.current_offer?.toLocaleString() || 'None yet'}
      - Purchase Type: ${deal?.purchase_type || 'N/A'}
      - Current Deal Status: ${deal?.status || 'N/A'}

      **Recent Conversation History:**
      ${conversationHistory || 'No recent conversation.'}

      **Your Task:**
      Analyze everything and provide your top 2-3 strategic recommendations. Focus on building long-term leverage, uncovering dealer motivations, and moving the price closer to the user's target without creating animosity.
    `;
    
    try {
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
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const handleDealCompleted = (updatedDeal) => {
    setDeal(updatedDeal);
    setShowCompleteModal(false);
  };

  const handleDeleteDeal = async () => {
    setIsDeleting(true);
    try {
      // First, delete all messages associated with this deal
      const dealMessages = messages.filter(m => m.deal_id === deal.id);
      if (dealMessages.length > 0) {
        await Promise.all(dealMessages.map(m => Message.delete(m.id)));
      }

      // Delete the deal
      await Deal.delete(deal.id);

      // Check if this vehicle is used by any other deals
      if (vehicle) {
        const allDeals = await Deal.list();
        const vehicleInUse = allDeals.some(d => d.vehicle_id === vehicle.id && d.id !== deal.id);
        
        // If no other deals use this vehicle, delete it
        if (!vehicleInUse) {
          await Vehicle.delete(vehicle.id);
          console.log('Deleted unused vehicle:', vehicle.id);
        }
      }

      // Check if this dealer is used by any other deals
      if (dealer) {
        const allDeals = await Deal.list();
        const dealerInUse = allDeals.some(d => d.dealer_id === dealer.id && d.id !== deal.id);
        
        // If no other deals use this dealer, delete it
        if (!dealerInUse) {
          await Dealer.delete(dealer.id);
          console.log('Deleted unused dealer:', dealer.id);
        }
      }

      toast.success('Deal deleted successfully!');
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Failed to delete deal:', error);
      toast.error('Failed to delete deal. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !deal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-lime-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const isActiveStatus = ['quote_requested', 'negotiating', 'final_offer', 'accepted'].includes(deal.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 py-6">
      <PriceExtractNotification 
        show={showPriceNotification} 
        price={extractedPrice}
        deal={deal}
        onClose={() => setShowPriceNotification(false)}
        onUpdate={fetchData}
      />

      <CompleteDealModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        deal={deal}
        vehicle={vehicle}
        onDealCompleted={handleDealCompleted}
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to={createPageUrl("Dashboard")} className="flex items-center text-sm text-slate-600 hover:text-brand-teal font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-2">
            {isActiveStatus && (
              <Button
                onClick={() => setShowCompleteModal(true)}
                className="bg-brand-lime hover:bg-brand-lime-dark text-brand-teal font-bold"
              >
                Complete Deal
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Deal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this deal for the{' '}
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'vehicle'}?
                    <br /><br />
                    This will also delete:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>All messages for this deal</li>
                      <li>The vehicle (if not used in other deals)</li>
                      <li>The dealer (if not used in other deals)</li>
                    </ul>
                    <br />
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteDeal}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Deal'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Vehicle and Messages */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {vehicle && <VehicleSummary vehicle={vehicle} deal={deal} />}
            
            {/* Mobile: Show Negotiation Coach right after vehicle */}
            <div className="block lg:hidden">
              <NegotiationCoach deal={deal} vehicle={vehicle} messages={messages} />
            </div>
            
            {/* Messages Section with Input */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200">
              {/* Messages Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-slate-700" />
                    Conversation
                  </h3>
                  <Link to={createPageUrl(`Messages?dealer_id=${dealer?.id}`)}>
                    <Button variant="ghost" size="sm" className="text-brand-teal hover:text-brand-teal-dark hover:bg-teal-50">
                      View Full Messages
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Messages Display */}
              <div className="p-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>No messages yet. Send one to start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} dealer={dealer} />
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {deal && (
                <QuickActions 
                  deal={deal} 
                  onAction={(action, data) => {
                    if (action === 'send_message') {
                      handleMessageSubmit(data.message, 'outbound', 'app');
                    }
                  }}
                />
              )}

              {/* Message Input Area */}
              <div className="p-4 border-t border-slate-200">
                {/* AI Suggest and Templates buttons */}
                <div className="flex gap-2 mb-3">
                  <Dialog open={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAISuggestion}
                      disabled={isSuggesting}
                      className="text-xs border-lime-300 text-lime-700 hover:bg-lime-50"
                    >
                      {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      AI Suggest
                    </Button>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>AI Negotiation Strategies</DialogTitle>
                        <DialogDescription>Here are strategic options for your next move. Choose one to use it.</DialogDescription>
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
                          <p className="text-center text-slate-500">No suggestions generated yet.</p>
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
                      <MessageTemplates onSelect={handleTemplateSelect} deal={deal} />
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Text input and Send button */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    className="flex-1 min-h-[44px] text-sm focus:ring-lime-500 focus:border-lime-500"
                    rows={2}
                  />
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
          </div>

          {/* Right Column - Pricing, Dealer, and Desktop Coach */}
          <div className="lg:col-span-1 space-y-6 lg:space-y-8">
            <PricingCard deal={deal} onDealUpdate={setDeal} />
            
            {/* Desktop: Show Negotiation Coach in sidebar */}
            <div className="hidden lg:block">
              <NegotiationCoach deal={deal} vehicle={vehicle} messages={messages} />
            </div>
            
            {dealer && <DealerInfoCard dealer={dealer} />}
          </div>
        </div>
      </div>
    </div>
  );
}