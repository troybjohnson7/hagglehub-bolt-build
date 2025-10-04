
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bot, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils';

export default function NegotiationCoach({ deal, vehicle, messages }) {
  const [isLoading, setIsLoading] = useState(false);
  const [advice, setAdvice] = useState(null);

  const handleGetAdvice = async () => {
    setIsLoading(true);
    setAdvice(null);
    try {
      const conversationHistory = messages
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .map(m => `${m.direction === 'inbound' ? 'Dealer' : 'You'}: ${m.content}`)
        .slice(0, 10) // Get last 10 messages
        .join('\n');

      const prompt = `
        You are an expert car negotiation coach, "The HaggleHub Coach", trained in Chris Voss's FBI negotiation techniques. Your goal is to provide strategic, high-level advice to the user, not just write a reply for them. Help them understand *why* they should take a certain action.

        Given the following deal context and conversation history, provide 2-3 distinct, actionable negotiation strategies the user can employ as their next move.

        For each strategy, provide:
        1. A clear name for the strategy (e.g., "Calibrated Question to Uncover Constraints").
        2. A detailed explanation of *why* this strategy is effective in this specific situation.
        3. A concrete example of how they could phrase their next message to implement this strategy.

        **Deal Context:**
        - Vehicle: ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}
        - Dealer's Asking Price: ${formatCurrency(deal?.asking_price)}
        - Your Target Price: ${deal?.target_price ? formatCurrency(deal.target_price) : 'Not set'}
        - Current Dealer Offer: ${deal?.current_offer ? formatCurrency(deal.current_offer) : 'None yet'}
        - Current Deal Status: ${deal?.status}

        **Recent Conversation History (most recent first):**
        ${conversationHistory}

        **Your Task:**
        Analyze everything and provide your top 2-3 strategic recommendations. Focus on building long-term leverage, uncovering dealer motivations (like quotas, inventory age), and moving the price closer to the user's target without creating animosity. Keep the tone encouraging and expert.
      `;

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
                  strategy_name: { type: "string", description: "The name of the negotiation strategy." },
                  explanation: { type: "string", description: "Why this strategy is effective in this specific context." },
                  example_message: { type: "string", description: "An example message the user can send." }
                },
                required: ["strategy_name", "explanation", "example_message"]
              }
            }
          },
          required: ["suggestions"]
        }
      });

      setAdvice(response);

    } catch (error) {
      console.error("Failed to get coach advice:", error);
      toast.error("Couldn't get advice from the coach. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-3">
          <div className="p-1.5 sm:p-2 bg-brand-teal rounded-lg">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900">Negotiation Coach</CardTitle>
            <CardDescription className="text-sm">Get expert AI advice on your next move</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {advice?.suggestions ? (
          <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
            {advice.suggestions.map((suggestion, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-brand-teal hover:no-underline text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    {suggestion.strategy_name}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-slate-600">{suggestion.explanation}</p>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Example Message:</p>
                    <p className="text-sm p-3 bg-slate-100 rounded-md border border-slate-200 italic">
                      "{suggestion.example_message}"
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-slate-500 text-sm py-3 sm:py-4">
            Click the button to get personalized negotiation strategies.
          </div>
        )}

        <Button
          onClick={handleGetAdvice}
          disabled={isLoading}
          className="w-full mt-3 sm:mt-4 bg-brand-teal hover:bg-brand-teal-dark text-white"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {advice ? 'Get New Advice' : "Get Coach's Advice"}
        </Button>
      </CardContent>
    </Card>
  );
}
