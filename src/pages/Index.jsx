import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Target, Bot, Users, TrendingUp, Database } from 'lucide-react';
import { User } from '@/api/entities'; // Import the User entity

const features = [
  {
    icon: Bot,
    title: "AI-Powered Communication",
    description: "Let our AI contact dealers, get quotes, and even suggest negotiation responses based on proven tactics.",
  },
  {
    icon: Target,
    title: "Centralized Deal Tracking",
    description: "Manage all your negotiations, offers, and messages from multiple dealers in one clean dashboard.",
  },
  {
    icon: Users,
    title: "Community Market Intelligence",
    description: "Get insights from real deals completed by other HaggleHub users. Know exactly what cars are selling for.",
  },
  {
    icon: ShieldCheck,
    title: "Stay Private & In Control",
    description: "Use your unique HaggleHub email to keep your personal inbox clean and all communications organized automatically.",
  },
];

export default function IndexPage() {
  
  // This function will be called when the "Get Started" button is clicked
  const handleLogin = async () => {
    try {
      console.log('Index: Starting login process...');
      const result = await User.login();
      console.log('Index: Login result:', result);
      if (result.isTestUserFallback) {
        console.log('Index: Test user fallback activated');
      }
      console.log('Index: Reloading page...');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#5EE83F] to-[#0f766e] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>
        <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl font-brand">
              Buy Your Next Car, Smarter.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              HaggleHub is your personal AI negotiation assistant powered by real market data from thousands of completed deals.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {/* The Link component is removed and replaced with a Button with an onClick handler */}
              <Button onClick={handleLogin} className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ... keep existing code (How it Works, Community Intelligence, etc.) ... */}
      <div className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-brand-teal">How It Works</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to outsmart the dealership
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              From initial contact to final offer, HaggleHub streamlines the entire car buying process with AI and community intelligence.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.title} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-slate-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-teal">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.title}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-slate-600">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      <div className="py-24 sm:py-32 bg-lime-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-brand-teal">Community Powered</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Real Market Data from Real Deals
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              When HaggleHub users complete their deals, they can anonymously share their results to help everyone negotiate better.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <Card className="text-center p-6 bg-white border-brand-lime border-opacity-30">
                <CardContent className="pt-6">
                  <Database className="w-12 h-12 text-brand-teal mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Anonymized Data</h3>
                  <p className="text-sm text-slate-600">All shared deal data is completely anonymous and aggregated to protect user privacy.</p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 bg-white border-brand-lime border-opacity-30">
                <CardContent className="pt-6">
                  <TrendingUp className="w-12 h-12 text-brand-teal mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Market Insights</h3>
                  <p className="text-sm text-slate-600">See what similar cars are actually selling for, broken down by purchase type, region, and more.</p>
                </CardContent>
              </Card>
              <Card className="text-center p-6 bg-white border-brand-lime border-opacity-30">
                <CardContent className="pt-6">
                  <Users className="w-12 h-12 text-brand-teal mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Community Impact</h3>
                  <p className="text-sm text-slate-600">Every shared deal makes the platform smarter and helps other users save more money.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <div className="py-24 sm:py-32">
         <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">See It In Action</h2>
            <p className="mt-4 text-lg text-slate-600">Watch our quick tutorial to see how you can save time and money on your next car.</p>
            <div className="mt-10">
                <Card className="max-w-3xl mx-auto bg-slate-100 border-slate-200 shadow-lg">
                    <CardContent className="p-4">
                        <div className="aspect-video w-full bg-slate-300 rounded-lg flex items-center justify-center">
                            <p className="text-slate-500 font-medium">Video Coming Soon</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
         </div>
      </div>
    </div>
  );
}