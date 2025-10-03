
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bot, Loader2, Sparkles, TrendingUp, TrendingDown, Hourglass } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import { MarketData } from '@/api/entities';

const InsightIcon = ({ type }) => {
  switch (type) {
    case 'positive': return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'negative': return <TrendingDown className="w-4 h-4 text-red-600" />;
    case 'neutral':
    default: return <Hourglass className="w-4 h-4 text-yellow-600" />;
  }
};

export default function SmartInsights({ deals, vehicles }) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const activeDeals = useMemo(() => {
    return deals.filter(deal => ['quote_requested', 'negotiating', 'final_offer'].includes(deal.status));
  }, [deals]);

  const getVehicleInfo = (vehicleId) => {
    const v = vehicles.find(v => v.id === vehicleId);
    if (!v) return "Unknown Vehicle";
    return `${v.year} ${v.make} ${v.model}`;
  };

  const handleAnalyzeDeals = async () => {
    setIsLoading(true);
    setAnalysis(null);
    try {
      // Get market data for context
      const marketData = await MarketData.list();
      
      const dealsForAnalysis = activeDeals.map(deal => {
        const vehicle = vehicles.find(v => v.id === deal.vehicle_id);
        return {
          vehicle: getVehicleInfo(deal.vehicle_id),
          vehicle_details: vehicle, // Include full vehicle object for market data matching
          status: deal.status,
          purchase_type: deal.purchase_type,
          asking_price: deal.asking_price,
          current_offer: deal.current_offer,
          target_price: deal.target_price,
          last_contact: deal.last_contact_date,
        };
      });

      // Find relevant market data for the user's deals
      const relevantMarketData = marketData.filter(data => 
        dealsForAnalysis.some(deal => 
          deal.vehicle_details && // Ensure vehicle details are present
          data.vehicle_make === deal.vehicle_details.make &&
          data.vehicle_model === deal.vehicle_details.model &&
          Math.abs(data.vehicle_year - deal.vehicle_details.year) <= 2
        )
      );

      const prompt = `
        You are "The HaggleHub Coach", an expert AI car negotiation assistant with access to real market data from completed deals.
        
        Analyze the following active car deals and provide strategic insights using both the deal context AND the real market data from the HaggleHub community.

        **Active Deals:**
        ${JSON.stringify(dealsForAnalysis, null, 2)}

        **Real Market Data from HaggleHub Community:**
        ${relevantMarketData.length > 0 ? JSON.stringify(relevantMarketData.slice(0, 10), null, 2) : 'No directly comparable deals in database yet.'}

        **Your Task:**
        Provide a concise, encouraging overall summary, then identify 2-3 critical insights. For each insight:
        1. A short, impactful title
        2. Analysis incorporating real market data when available
        3. Clear actionable next step
        4. Type: 'positive', 'negative', or 'neutral'

        Focus on:
        - How their current offers compare to actual completed deals
        - Market trends for their specific vehicles
        - Purchase type considerations (cash/finance/lease differences)
        - Timing and negotiation strategy based on community data
      `;

      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "A brief, encouraging overview of all deals." },
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  explanation: { type: "string" },
                  next_step: { type: "string" },
                  type: { type: "string", enum: ["positive", "negative", "neutral"] }
                },
                required: ["title", "explanation", "next_step", "type"]
              }
            }
          },
          required: ["summary", "insights"]
        }
      });
      setAnalysis(response);
    } catch (error) {
      console.error("Failed to analyze deals:", error);
      toast.error("Couldn't get insights from the coach. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (activeDeals.length === 0) {
    return null; // Don't show the card if there are no active deals
  }

  return (
    <Card className="shadow-sm md:shadow-lg border-brand-lime border-opacity-30 bg-lime-50/30">
      <CardHeader className="p-2 md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1 md:p-2 bg-brand-lime rounded-lg">
            <Bot className="w-3 h-3 md:w-5 md:h-5 text-brand-teal" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg font-bold text-slate-900">Smart Insights</CardTitle>
            <CardDescription className="text-xs md:text-sm hidden md:block">AI-powered analysis with real market data.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 md:p-6">
        {!analysis && (
          <div className="text-center">
            <p className="text-slate-600 mb-2 md:mb-4 text-xs md:text-sm leading-snug">Get instant analysis with real deal data.</p>
            <Button onClick={handleAnalyzeDeals} disabled={isLoading} className="text-xs md:text-sm py-1.5 h-8 md:h-10 md:py-2 w-full md:w-auto">
              {isLoading ? (
                <><Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Analyze My Deals</>
              )}
            </Button>
          </div>
        )}
        {analysis && (
          <div>
            <p className="text-xs md:text-sm text-slate-800 mb-2 md:mb-4 p-2 md:p-3 bg-white rounded-md border border-slate-200 leading-snug">{analysis.summary}</p>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
              {analysis.insights.map((insight, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="bg-white/80 border-slate-200 rounded-lg mb-1.5 md:mb-2 px-2 md:px-4">
                  <AccordionTrigger className="text-xs md:text-sm font-semibold hover:no-underline py-2 md:py-4">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <InsightIcon type={insight.type} />
                      <span className="text-left">{insight.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 md:space-y-3 pt-1">
                    <p className="text-xs md:text-sm text-slate-600 leading-snug">{insight.explanation}</p>
                    <div>
                      <h4 className="text-xs font-bold text-brand-teal mb-1">Next Step:</h4>
                      <p className="text-xs md:text-sm text-slate-800 font-medium bg-slate-100 p-1.5 md:p-2 rounded-md leading-snug">{insight.next_step}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
