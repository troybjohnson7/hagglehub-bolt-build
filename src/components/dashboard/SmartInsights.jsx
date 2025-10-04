
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bot, Loader2, Sparkles, TrendingUp, TrendingDown, Hourglass, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [cacheInfo, setCacheInfo] = useState(null);
  const [urgentDealsCount, setUrgentDealsCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const activeDeals = useMemo(() => {
    return deals.filter(deal => ['quote_requested', 'negotiating', 'final_offer'].includes(deal.status));
  }, [deals]);

  useEffect(() => {
    const checkUrgentDeals = () => {
      const urgent = activeDeals.filter(deal => {
        const daysSinceContact = deal.last_contact_date
          ? Math.floor((Date.now() - new Date(deal.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysUntilExpiry = deal.quote_expires
          ? Math.floor((new Date(deal.quote_expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        return (daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry >= 0) ||
               (daysSinceContact !== null && daysSinceContact >= 7);
      });
      setUrgentDealsCount(urgent.length);
    };

    checkUrgentDeals();
  }, [activeDeals]);

  useEffect(() => {
    if (activeDeals.length > 0) {
      loadCachedInsights();
    }
  }, [activeDeals.length]);

  const loadCachedInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cachedInsight } = await supabase
        .from('insights_cache')
        .select('*')
        .eq('user_id', user.id)
        .gte('cache_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedInsight) {
        setAnalysis(cachedInsight.analysis_data);
        setCacheInfo({
          cached: true,
          expires_at: cachedInsight.cache_expires_at
        });
      }
    } catch (error) {
      console.error('Failed to load cached insights:', error);
    }
  };

  const getVehicleInfo = (vehicleId) => {
    const v = vehicles.find(v => v.id === vehicleId);
    if (!v) return "Unknown Vehicle";
    return `${v.year} ${v.make} ${v.model}`;
  };

  const handleAnalyzeDeals = async (forceRefresh = false) => {
    setIsLoading(true);
    if (forceRefresh) {
      setAnalysis(null);
      setCacheInfo(null);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to analyze deals');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-deals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deals: activeDeals,
            vehicles: vehicles,
            force_refresh: forceRefresh,
            trigger_events: forceRefresh ? ['manual_refresh'] : ['manual_trigger']
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error('OpenAI rate limit reached. Please wait a moment and try again. If this persists, check your OpenAI billing at platform.openai.com');
        }
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result);
      setCacheInfo({
        cached: result.cached,
        expires_at: result.cache_expires_at,
        market_data_points: result.market_data_points,
        urgent_deals_count: result.urgent_deals_count
      });

      if (result.urgent_deals_count > 0) {
        toast.warning(`${result.urgent_deals_count} deal(s) need immediate attention!`);
      } else {
        toast.success('Analysis complete!');
      }
    } catch (error) {
      console.error("Failed to analyze deals:", error);
      if (error.message.includes('AI service not configured')) {
        toast.error('AI insights are not configured yet. Contact support to enable this feature.');
      } else {
        toast.error(error.message || "Couldn't get insights from the coach. Please try again.");
      }
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 flex-1">
            <div className="p-1 md:p-2 bg-brand-lime rounded-lg">
              <Bot className="w-3 h-3 md:w-5 md:h-5 text-brand-teal" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm md:text-lg font-bold text-slate-900">Smart Insights</CardTitle>
                {!isExpanded && urgentDealsCount > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5">
                    {urgentDealsCount}
                  </Badge>
                )}
                {!isExpanded && analysis && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {analysis.insights.length} insights
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs md:text-sm hidden md:block">AI-powered analysis with real market data from GPT-4o.</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0 hover:bg-brand-lime/20"
            aria-label={isExpanded ? "Collapse insights" : "Expand insights"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-brand-teal" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brand-teal" />
            )}
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <CardContent className="p-2 pt-0 md:p-6">
        {urgentDealsCount > 0 && (
          <div className="mb-2 md:mb-4 p-2 md:p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <p className="text-xs md:text-sm text-orange-800 font-medium">
              {urgentDealsCount} deal{urgentDealsCount > 1 ? 's' : ''} need{urgentDealsCount === 1 ? 's' : ''} attention
            </p>
          </div>
        )}
        {!analysis && (
          <div className="text-center">
            <p className="text-slate-600 mb-2 md:mb-4 text-xs md:text-sm leading-snug">Get AI-powered analysis with real market data from ChatGPT.</p>
            <Button onClick={() => handleAnalyzeDeals(false)} disabled={isLoading} className="text-xs md:text-sm py-1.5 h-8 md:h-10 md:py-2 w-full md:w-auto">
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
            <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
              <p className="text-xs md:text-sm text-slate-800 p-2 md:p-3 bg-white rounded-md border border-slate-200 leading-snug flex-1">{analysis.summary}</p>
            </div>
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {cacheInfo?.cached && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Cached
                  </Badge>
                )}
                {cacheInfo?.market_data_points > 0 && (
                  <span>{cacheInfo.market_data_points} market data points</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAnalyzeDeals(true)}
                disabled={isLoading}
                className="text-xs h-7"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
