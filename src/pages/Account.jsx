import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Deal } from '@/api/entities';
import { Vehicle } from '@/api/entities';
import { Dealer } from '@/api/entities';
import { Message } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Loader2, Trash2, Settings } from 'lucide-react';
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

const plans = {
  free: { name: 'Free', price: '$0', deal_limit: 1, features: ['1 Active Deal'] },
  haggler: { name: 'Haggler', price: '$15/mo', deal_limit: 3, features: ['Up to 3 Active Deals', 'Email Integration', 'AI Reply Suggestions'] },
  negotiator: { name: 'Negotiator', price: '$25/mo', deal_limit: 10, features: ['Up to 10 Active Deals', 'All Haggler Features', 'Advanced Analytics (Coming Soon)'] },
  closer_annual: { name: 'Closer (Annual)', price: '$50/yr', deal_limit: Infinity, features: ['Unlimited Active Deals', 'All Negotiator Features', 'Priority Support'] },
};

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [activeDeals, setActiveDeals] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const deals = await Deal.list();
        const active = deals.filter(d => ['quote_requested', 'negotiating', 'final_offer'].includes(d.status));
        setActiveDeals(active.length);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  const handleSelectPlan = async (planKey) => {
    // In a real app, this would redirect to a Stripe checkout link.
    // For now, we'll just update the user's subscription status.
    toast.info(`Upgrading to ${plans[planKey].name}...`);
    try {
      await User.updateMyUserData({ subscription_tier: planKey });
      const updatedUser = await User.me();
      setUser(updatedUser);
      toast.success(`Successfully subscribed to the ${plans[planKey].name} plan!`);
    } catch (error) {
      toast.error('Failed to update subscription.');
    }
  };
  
  const handleCancelSubscription = async () => {
    toast.info("Cancelling subscription...");
    try {
      await User.updateMyUserData({ subscription_tier: 'free' });
      const updatedUser = await User.me();
      setUser(updatedUser);
      toast.success("Your subscription has been cancelled.");
    } catch (error) {
      toast.error("Failed to cancel subscription.");
    }
  }

  const handleDeleteAccount = async () => {
    toast.info("Deleting all your data... This may take a moment.");
    try {
      // This is a simplified deletion process. 
      // A more robust solution might use a backend function.
      const [deals, vehicles, dealers, messages] = await Promise.all([
        Deal.list(), Vehicle.list(), Dealer.list(), Message.list()
      ]);

      const deletePromises = [
        ...deals.map(d => Deal.delete(d.id)),
        ...vehicles.map(v => Vehicle.delete(v.id)),
        ...dealers.map(dl => Dealer.delete(dl.id)),
        ...messages.map(m => Message.delete(m.id)),
      ];

      await Promise.all(deletePromises);
      
      // Note: This doesn't delete the user from the auth system. 
      // That must be done by a project admin.
      // We will log the user out and they will have a clean slate if they log back in.
      toast.success("Account data deleted successfully.");
      await User.logout();
      window.location.href = '/';

    } catch (error) {
      console.error("Deletion error:", error);
      toast.error("Failed to delete account data. Please contact support.");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-green-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  const currentPlan = plans[user.subscription_tier || 'free'];
  const dealLimit = currentPlan.deal_limit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Account & Subscription</h1>
          <p className="text-slate-600 mt-1">Manage your plan and account settings.</p>
        </div>

        <Card className="mb-8 shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-900">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Badge className="bg-brand-lime text-brand-teal border-transparent text-base py-1 px-3 mb-2 font-bold">
                {currentPlan.name}
              </Badge>
              <p className="text-slate-600">
                You have <span className="font-semibold text-slate-900">{activeDeals}</span> out of{' '}
                <span className="font-semibold text-slate-900">
                  {dealLimit === Infinity ? 'Unlimited' : dealLimit}
                </span>{' '}
                active deals.
              </p>
              {user.subscription_tier === 'free' && (
                <p className="text-sm text-slate-500 mt-1">
                  💡 All users start with the Free plan. Upgrade to track more deals!
                </p>
              )}
            </div>
            {user.subscription_tier !== 'free' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will downgrade you to the Free plan at the end of your current billing cycle. You will lose access to premium features.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription} className="bg-red-600 hover:bg-red-700">
                      Confirm Cancellation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(plans).filter(([key]) => key !== 'free').map(([key, plan]) => (
              <Card 
                key={key} 
                className={`flex flex-col shadow-sm transition-all bg-white ${
                  user.subscription_tier === key 
                    ? 'border-2 border-brand-lime shadow-lg ring-2 ring-brand-lime ring-opacity-20' 
                    : 'border-slate-200 hover:shadow-md hover:border-brand-lime hover:border-opacity-30'
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-slate-900">{plan.name}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-brand-teal">
                    {plan.price}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {plan.features.map(feature => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-brand-lime" />
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <div className="p-6 pt-0">
                  {user.subscription_tier === key ? (
                    <Button disabled className="w-full bg-slate-200 text-slate-600 cursor-not-allowed">
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSelectPlan(key)} 
                      className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold"
                    >
                      Upgrade <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Note: Payment processing is not enabled. Selecting a plan will update your account status for demonstration purposes.
          </p>
        </div>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-red-700 font-medium">Permanently delete all your account data</p>
              <p className="text-sm text-red-600 mt-1">
                This will delete all your deals, vehicles, dealers, and messages. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 shrink-0">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your deals, vehicles, and messages will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}