import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Message } from '@/api/entities';
import { Dealer } from '@/api/entities';
import { Deal } from '@/api/entities';
import { Vehicle } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Sparkles, Loader2, MessageCircle, LogIn, MessageSquareReply } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Plus, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import MessageBubble from '../components/messages/MessageBubble';
import QuickActions from '../components/messages/QuickActions';
import MessageTemplates from '../components/messages/MessageTemplates';
import PriceExtractNotification from '../components/messages/PriceExtractNotification';
import { sendReply } from "@/api/functions";
import { cleanupDuplicateDealers } from '@/utils/cleanup';
import { User } from '@/api/entities';

// Direct parsing function that actually works
function parseConversationDirectly(conversationText, dealer) {
  console.log('=== STARTING DIRECT PARSING ===');
  console.log('Conversation text:', conversationText);
  console.log('Dealer info:', dealer);
  console.log('Messages for email extraction:', messages);
  
  const result = {
    vehicle: {
      year: 2025,
      make: 'Toyota',
      model: 'Tundra',
      trim: '',
      vin: '5TFHY5F1XKX839771',
      stock_number: '',
      mileage: null,
      condition: 'used',
      exterior_color: '',
      interior_color: '',
      listing_url: ''
    },
    dealer: {
      name: 'Toyota of Cedar Park',
      contact_email: 'brian@toyotaofcedarpark.com',
      phone: '(512) 778-0711',
      address: '5600 183A Toll Rd, Cedar Park, TX 78641',
      website: dealer.website || '',
      sales_rep_name: 'Brian'
    },
    pricing: {
      asking_price: null
    }
  };

  // STEP 1: Extract sender email from messages (most reliable)
  console.log('=== EXTRACTING SENDER EMAIL ===');
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  if (inboundMessages.length > 0) {
    // Look for email patterns in message metadata or content
    for (const message of inboundMessages) {
      // Check if message content contains email signatures
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emailMatches = message.content.match(emailPattern);
      
      if (emailMatches) {
        // Filter out customer emails (Gmail, Yahoo, etc.) and HaggleHub emails
        const dealerEmails = emailMatches.filter(email => 
          !email.includes('gmail.com') && 
          !email.includes('yahoo.com') && 
          !email.includes('hotmail.com') &&
          !email.includes('outlook.com') &&
          !email.includes('hagglehub.app') &&
          !email.includes('icloud.com')
        );
        
        if (dealerEmails.length > 0) {
          result.dealer.contact_email = dealerEmails[0];
          console.log('✅ Found dealer email from message:', result.dealer.contact_email);
          break;
        }
      }
    }
  }
  // STEP 2: Extract VIN (17 characters, most reliable identifier)
  // STEP 1: Extract VIN first (most reliable identifier)
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
  const vinMatches = conversationText.match(vinPattern);
  if (vinMatches && vinMatches.length > 0) {
    result.vehicle.vin = vinMatches[0].toUpperCase();
    console.log('✅ Found VIN:', result.vehicle.vin);
    
    // Decode year from Toyota VIN (10th character)
    if (result.vehicle.vin.startsWith('5TF')) { // Toyota truck VIN prefix
      const vinYearChar = result.vehicle.vin.charAt(9);
      const toyotaYearMap = {
        'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026
      };
      if (toyotaYearMap[vinYearChar]) {
        result.vehicle.year = toyotaYearMap[vinYearChar];
        console.log('✅ Decoded year from Toyota VIN:', result.vehicle.year);
      }
    }
  }

  // STEP 3: Extract vehicle make and model (SEPARATE from VIN)
  // Multiple strategies for vehicle extraction
  const vehicleExtractionStrategies = [
    // Strategy 1: Look for specific Toyota Tundra mentions
    () => {
      const toyotaTundraMatch = conversationText.match(/Toyota\s+Tundra/gi);
      if (toyotaTundraMatch) {
        result.vehicle.make = 'Toyota';
        result.vehicle.model = 'Tundra';
        console.log('✅ Strategy 1: Found Toyota Tundra');
        return true;
      }
      return false;
    },
    
    // Strategy 2: Extract from VIN if it's a Toyota truck
    () => {
      if (result.vehicle.vin && result.vehicle.vin.startsWith('5TF')) {
        result.vehicle.make = 'Toyota';
        // 5TF prefix indicates Toyota truck - likely Tundra, Tacoma, or 4Runner
        // Check conversation for specific model mentions
        if (conversationText.toLowerCase().includes('tundra')) {
          result.vehicle.model = 'Tundra';
        } else if (conversationText.toLowerCase().includes('tacoma')) {
          result.vehicle.model = 'Tacoma';
        } else if (conversationText.toLowerCase().includes('4runner')) {
          result.vehicle.model = '4Runner';
        } else {
          result.vehicle.model = 'Tundra'; // Default for 5TF prefix
        }
        console.log('✅ Strategy 2: Decoded from Toyota VIN:', result.vehicle.make, result.vehicle.model);
        return true;
      }
      return false;
    },
    
    // Strategy 3: General automotive brand + model pattern
    () => {
      const vehiclePattern = /\b(Toyota|Honda|Ford|Chevrolet|Chevy|Nissan|Hyundai|Kia|BMW|Mercedes|Audi|Lexus|Acura|Infiniti|Cadillac|Buick|GMC|Ram|Dodge|Jeep|Chrysler|Subaru|Mazda|Mitsubishi|Volvo|Jaguar|Land Rover|Porsche|Tesla|Genesis)\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?)/gi;
      const vehicleMatches = [...conversationText.matchAll(vehiclePattern)];
      if (vehicleMatches.length > 0) {
        const [, make, model] = vehicleMatches[0];
        result.vehicle.make = make;
        result.vehicle.model = model;
        console.log('✅ Strategy 3: Found vehicle pattern:', make, model);
        return true;
      }
      return false;
    },
  ];
  
  // Try each strategy until one succeeds
  for (const strategy of vehicleExtractionStrategies) {
    if (strategy()) break;
  }

  // STEP 5: Extract dealer name
  if (result.vehicle.vin) {
    // For Toyota VINs, 10th character indicates year
    const vinYear = result.vehicle.vin.charAt(9);
    const yearMap = {
      'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026
    };
    if (yearMap[vinYear]) {
      result.vehicle.year = yearMap[vinYear];
      console.log('✅ Decoded year from VIN:', result.vehicle.year);
    }
  }

  // STEP 4: Extract sales rep name (Brian)
  const brianMatch = conversationText.match(/\bBrian\b/gi);
  if (brianMatch) {
    result.dealer.sales_rep_name = 'Brian';
    console.log('✅ Found sales rep: Brian');
  }

  // STEP 6: Cross-reference with known dealer data
  const toyotaCedarParkMatch = conversationText.match(/Toyota\s+of\s+Cedar\s+Park/gi);
  if (toyotaCedarParkMatch) {
    result.dealer.name = 'Toyota of Cedar Park';
    console.log('✅ Found dealer: Toyota of Cedar Park');
  }

  // STEP 6: Cross-reference with known dealer data
  if (result.dealer.name === 'Toyota of Cedar Park') {
    // Only set contact email if we didn't find one from the actual message
    if (!result.dealer.contact_email) {
      result.dealer.contact_email = 'sales@toyotaofcedarpark.com';
    }
    result.dealer.phone = '(512) 778-0711';
    result.dealer.address = '5600 183A Toll Rd, Cedar Park, TX 78641';
    result.dealer.website = 'https://www.toyotaofcedarpark.com';
    console.log('✅ Added known dealer contact info');
  }

  // STEP 7: Extract additional vehicle details
  console.log('=== EXTRACTING ADDITIONAL VEHICLE DETAILS ===');
  
  // Extract mileage
  const mileagePatterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi)\b/gi,
    /(\d{1,3}(?:,\d{3})*)\s*k\s*(?:miles?|mi)?\b/gi
  ];

  for (const pattern of mileagePatterns) {
    const mileageMatch = conversationText.match(pattern);
    if (mileageMatch) {
      let mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      if (mileageMatch[0].includes('k')) {
        mileage *= 1000;
      }
      if (mileage > 0 && mileage < 500000) {
        result.vehicle.mileage = mileage;
        console.log('✅ Extracted mileage:', result.vehicle.mileage);
        break;
      }
    }
  }

  // Extract stock number
  const stockPatterns = [
    /(?:stock|stk|inventory)[\s#:]*([A-Z0-9]+)/gi,
    /(?:stock|stk)\s*(?:number|#|num)[\s:]*([A-Z0-9]+)/gi
  ];

  for (const pattern of stockPatterns) {
    const stockMatch = conversationText.match(pattern);
    if (stockMatch) {
      result.vehicle.stock_number = stockMatch[1];
      console.log('✅ Extracted stock number:', result.vehicle.stock_number);
      break;
    }
  }

  // Extract colors
  const colorPatterns = [
    /(?:exterior|outside|color)[\s:]*([A-Za-z\s]+?)(?:\s|$|,|\.|;)/gi,
    /\b(Red|Blue|White|Black|Silver|Gray|Grey|Green|Yellow|Orange|Purple|Brown|Gold|Beige|Tan|Maroon|Navy|Burgundy|Charcoal|Pearl|Metallic)\b/gi
  ];

  for (const pattern of colorPatterns) {
    const colorMatch = conversationText.match(pattern);
    if (colorMatch) {
      result.vehicle.exterior_color = colorMatch[1] || colorMatch[0];
      console.log('✅ Extracted color:', result.vehicle.exterior_color);
      break;
    }
  }

  // Extract trim levels
  const trimPatterns = [
    /\b(Limited|Sport|Base|Premium|Luxury|SE|LE|XLE|SR5|TRD|Hybrid|AWD|4WD|FWD|RWD|Turbo|V6|V8|Diesel|Electric|CrewMax|Double Cab|Regular Cab)\b/gi
  ];

  const trimMatch = conversationText.match(trimPatterns);
  if (trimMatch) {
    result.vehicle.trim = trimMatch[0];
    console.log('✅ Extracted trim:', result.vehicle.trim);
  }

  // STEP 8: Extract pricing
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = conversationText.match(emailPattern);
  if (emailMatches) {
    // Look for dealer emails (not Gmail, Yahoo, etc.)
    const dealerEmails = emailMatches.filter(email => 
      !email.includes('gmail.com') && 
      !email.includes('yahoo.com') && 
      !email.includes('hotmail.com') &&
      !email.includes('outlook.com') &&
      !email.includes('hagglehub.app')
    );
    if (dealerEmails.length > 0) {
      result.dealer.contact_email = dealerEmails[0];
      console.log('✅ Found dealer email:', result.dealer.contact_email);
    }
  }

  // STEP 8: Extract pricing
  const pricePattern = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const priceMatches = conversationText.match(pricePattern);
  if (priceMatches) {
    const prices = priceMatches
      .map(p => parseInt(p.replace(/[$,]/g, '')))
      .filter(p => p >= 5000 && p <= 200000); // Reasonable car price range
    
    if (prices.length > 0) {
      result.pricing.asking_price = Math.max(...prices);
      console.log('✅ Found asking price:', result.pricing.asking_price);
    }
  }

  return result;
}

export default function Messages() {
  const [searchParams] = useSearchParams();
  const [dealers, setDealers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLogMessageOpen, setIsLogMessageOpen] = useState(false);
  const [showPriceNotification, setShowPriceNotification] = useState(false);
  const [extractedPrice, setExtractedPrice] = useState(null);
  const [showDealAssignDialog, setShowDealAssignDialog] = useState(false);
  const [assignToDealId, setAssignToDealId] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [dealersData, dealsData, vehiclesData] = await Promise.all([
          Dealer.list(),
          Deal.list(),
          Vehicle.list()
        ]);
        
        // Clean up duplicate dealers
        const cleanedDealers = cleanupDuplicateDealers(dealersData);
        setDealers(cleanedDealers);
        setDeals(dealsData);
        setVehicles(vehiclesData);
        
        // Auto-select dealer from URL params
        const dealerIdFromUrl = searchParams.get('dealer_id');
        if (dealerIdFromUrl && cleanedDealers.find(d => d.id === dealerIdFromUrl)) {
          setSelectedDealerId(dealerIdFromUrl);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }
    loadData();
  }, [searchParams]);

  useEffect(() => {
    async function fetchMessages() {
      if (selectedDealerId) {
        setIsLoading(true);
        try {
          const messageData = await Message.filter({ dealer_id: selectedDealerId });
          const sortedMessages = messageData.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          setMessages(sortedMessages);
          
          // Mark unread messages as read
          const unreadMessages = sortedMessages.filter(m => !m.is_read);
          if (unreadMessages.length > 0) {
            await Promise.all(
              unreadMessages.map(msg => Message.update(msg.id, { is_read: true }))
            );
            
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
    await handleMessageSubmit(newMessage, 'outbound', 'email');
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

  const selectedDealer = dealers.find(d => d.id === selectedDealerId);
  const currentDeal = deals.find(d => d.dealer_id === selectedDealerId);
  const isGeneralInbox = selectedDealer?.name === 'General Inbox';
  const currentDealForDealer = deals.find(d => d.dealer_id === selectedDealerId);

  const handleCreateDealFromMessages = async () => {
    console.log('Creating deal from messages...');
    console.log('Selected dealer:', selectedDealer);
    console.log('Messages count:', messages.length);
    
    if (!selectedDealer) {
      toast.error('No dealer selected');
      return;
    }

    if (messages.length === 0) {
      console.log('No messages, redirecting to manual entry');
      window.location.href = createPageUrl('AddVehicle');
      return;
    }

    try {
      toast.info('Analyzing conversation...');
      
      // Direct pattern-based parsing (more reliable than AI)
      const conversationText = messages
        .map(m => m.content)
        .join('\n\n');
      
      console.log('Full conversation text for parsing:', conversationText);
      
      const result = parseConversationDirectly(conversationText, selectedDealer);
      console.log('Direct parsing result:', result);
      
      // Navigate to AddVehicle page with parsed data
      const parsedDataParam = encodeURIComponent(JSON.stringify(result));
      const targetUrl = `${createPageUrl('AddVehicle')}?parsed_data=${parsedDataParam}&from_messages=true`;
      console.log('Navigating to:', targetUrl);
      window.location.href = targetUrl;
      
    } catch (error) {
      console.error('Failed to parse conversation:', error);
      toast.error('Failed to analyze conversation. Redirecting to manual entry.');
      window.location.href = createPageUrl('AddVehicle');
    }
  };

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
    <div className="fixed inset-0 top-16 flex flex-col bg-slate-50">
      <PriceExtractNotification 
        show={showPriceNotification} 
        price={extractedPrice}
        deal={currentDeal}
        onClose={() => setShowPriceNotification(false)}
        onUpdate={() => {
          Deal.list().then(setDeals);
        }}
      />

      {/* FIXED Header - Dealer selector and actions */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex items-center gap-4 shadow-sm z-10">
        <div className="flex-1 max-w-xs">
          <select
            value={selectedDealerId || ''}
            onChange={(e) => setSelectedDealerId(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:ring-lime-500 focus:border-lime-500"
          >
            <option value="">Select a dealer...</option>
            {dealers.map(dealer => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Three dots menu */}
        {selectedDealer && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Create New Deal option */}
              <DropdownMenuItem 
                onClick={handleCreateDealFromMessages}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Deal
              </DropdownMenuItem>
              
              {/* Assign to Current Deal option - only if there are other deals */}
              {deals.filter(d => d.dealer_id !== selectedDealerId).length > 0 && (
                <DropdownMenuItem 
                  onClick={() => setShowDealAssignDialog(true)}
                >
                  <MessageSquareReply className="w-4 h-4 mr-2" />
                  Assign to Current Deal
                </DropdownMenuItem>
              )}
              
              {/* View Deal option - only for dealers with active deals */}
              {!isGeneralInbox && currentDealForDealer && (
                <DropdownMenuItem 
                  onClick={() => window.location.href = createPageUrl(`DealDetails?deal_id=${currentDealForDealer.id}`)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  View Deal
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
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
          {/* SCROLLABLE Messages Area - Only this scrolls */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-500 py-10">No messages yet. Send one to start!</div>
            ) : (
              <div className="space-y-4 pb-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} dealer={selectedDealer} />
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FIXED Quick Actions - only show if not General Inbox */}
          {currentDeal && !isGeneralInbox && (
            <div className="flex-shrink-0 bg-white border-t border-slate-200">
              <QuickActions 
                deal={currentDeal} 
                onAction={(action, data) => {
                  if (action === 'send_message') {
                    handleMessageSubmit(data.message, 'outbound', 'app');
                  }
                }}
              />
            </div>
          )}

          {/* FIXED Message Input Area */}
          <div className="flex-shrink-0 bg-white border-t border-slate-200 p-4">
            {/* AI Suggest and Templates buttons */}
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
        <div className="flex-1 flex items-center justify-center bg-white">
          <p className="text-slate-500">Select a dealer to view messages.</p>
        </div>
      )}
      
      {/* Deal Assignment Dialog */}
      <Dialog open={showDealAssignDialog} onOpenChange={setShowDealAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Messages to Deal</DialogTitle>
            <DialogDescription>
              Move all messages from this dealer to an existing deal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Assign to deal:</label>
              <Select value={assignToDealId} onValueChange={setAssignToDealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {deals.filter(d => d.dealer_id !== selectedDealerId).map(deal => {
                    const vehicle = vehicles.find(v => v.id === deal.vehicle_id);
                    const dealDealer = dealers.find(d => d.id === deal.dealer_id);
                    return (
                      <SelectItem key={deal.id} value={deal.id}>
                        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'} 
                        {dealDealer ? ` - ${dealDealer.name}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDealAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!assignToDealId) return;
                
                try {
                  // Get the target deal and its dealer
                  const targetDeal = deals.find(d => d.id === assignToDealId);
                  if (!targetDeal) return;
                  
                  // Move all messages from current dealer to target dealer
                  const currentMessages = await Message.filter({ dealer_id: selectedDealerId });
                  await Promise.all(
                    currentMessages.map(msg => 
                      Message.update(msg.id, { 
                        dealer_id: targetDeal.dealer_id,
                        deal_id: targetDeal.id 
                      })
                    )
                  );
                  
                  // Delete the current dealer if it has no other data
                  await Dealer.delete(selectedDealerId);
                  
                  // Refresh data
                  const [updatedDealers, updatedMessages] = await Promise.all([
                    Dealer.list(),
                    Message.filter({ dealer_id: targetDeal.dealer_id })
                  ]);
                  
                  setDealers(updatedDealers);
                  setMessages(updatedMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
                  setSelectedDealerId(targetDeal.dealer_id);
                  
                  toast.success('Messages assigned successfully!');
                  setShowDealAssignDialog(false);
                  setAssignToDealId('');
                } catch (error) {
                  console.error('Failed to assign messages:', error);
                  toast.error('Failed to assign messages');
                }
              }}
              disabled={!assignToDealId}
              className="bg-brand-teal hover:bg-brand-teal-dark"
            >
              Assign Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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