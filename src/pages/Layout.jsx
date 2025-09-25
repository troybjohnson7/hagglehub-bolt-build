

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Message } from "@/api/entities";
import { getAccessToken } from "@base44/sdk/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  LogIn,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Bot,
  Target,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationCenter from "./components/notifications/NotificationCenter";

const navigationItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: createPageUrl('Dashboard') },
  { title: 'New Deal', icon: Plus, url: createPageUrl('AddVehicle') },
  { title: 'Messages', icon: MessageSquare, url: createPageUrl('Messages') },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0); // This state will still be updated, but not displayed on the bottom nav message icon
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let timeoutId = null;

    const checkUserAndMessages = async (isInitial = false) => {
      try {
        // Skip API calls on public pages when no access token is present
        if (isPublicPage && !getAccessToken()) {
          setUser(null);
          setUnreadCount(0);
          return;
        }

        const currentUser = await User.me();
        setUser(currentUser);
        setRetryCount(0);

        if (currentUser) {
          // This delay ensures messages are fetched after user is definitely set and available
          // in case of any async race conditions with downstream components using user.
          await new Promise(resolve => setTimeout(resolve, 200)); 
          const unreadMessages = await Message.filter({ is_read: false });
          setUnreadCount(unreadMessages.length);
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        if (isInitial || retryCount === 0) {
          console.error('Error checking user/messages:', error);
        }

        setRetryCount(prev => Math.min(prev + 1, 5));

        if (error.message?.includes('Rate limit') || (error instanceof Error && error.message.includes('Network Error'))) {
          setUser(null);
          setUnreadCount(0);
        } else {
          setUser(null);
          setUnreadCount(0);
        }
      }
    };

    checkUserAndMessages(true);

    const scheduleNextCheck = () => {
      const baseInterval = 180000; // 3 minutes
      const backoffMultiplier = Math.pow(2, Math.min(retryCount, 4)); // Exponential backoff up to 4 retries
      const interval = baseInterval * backoffMultiplier;

      timeoutId = setTimeout(() => {
        checkUserAndMessages()
          .finally(() => {
            scheduleNextCheck();
          });
      }, interval);
    };

    scheduleNextCheck();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [location.pathname, retryCount]);

  const handleLogin = async () => {
    await User.login();
  };

  const handleLogout = async () => {
    await User.logout();
    setUser(null);
    setUnreadCount(0);
    window.location.reload();
  };

  const publicPages = ['Index', 'About', 'PrivacyPolicy', 'TermsOfService'];
  const isPublicPage = publicPages.includes(currentPageName);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700;800;900&display=swap');

        :root {
          --brand-lime: #5EE83F;
          --brand-lime-light: #83f06f;
          --brand-lime-dark: #44c626;
          --brand-teal: #0f766e;
          --brand-teal-light: #14b8a6;
          --brand-teal-dark: #134e4a;
          --brand-white: #ffffff;
        }

        body, html, * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .font-brand {
          font-family: 'Inter Tight', 'Inter', sans-serif;
          font-weight: 700;
        }

        .text-brand-lime { color: var(--brand-lime); }
        .text-brand-teal { color: var(--brand-teal); }
        .bg-brand-lime { background-color: var(--brand-lime); }
        .bg-brand-teal { background-color: var(--brand-teal); }
        .border-brand-lime { border-color: var(--brand-lime); }
        .border-brand-teal { border-color: var(--brand-teal); }

        .hover\\:bg-brand-lime:hover { background-color: var(--brand-lime-dark); }
        .hover\\:bg-brand-teal:hover { background-color: var(--brand-teal-dark); }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="relative flex items-center justify-between">
          {/* Left side - invisible spacer for balance */}
          <div className="flex items-center gap-3 w-auto">
            {/* This space matches the right side for perfect centering */}
          </div>
          
          {/* Centered logo - positioned absolutely for perfect centering */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8d90724709eb4dfd9a6ab/e9e9b0fa8_HaggleHub.png"
              alt="HaggleHub Logo"
              className="h-10 object-contain"
            />
          </div>
          
          {/* Right side - notifications and user menu */}
          <div className="flex items-center gap-3">
            {user && <NotificationCenter />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Avatar className="cursor-pointer h-9 w-9 border-2 border-slate-200">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user.full_name || user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to={createPageUrl("Account")}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account & Subscription</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button onClick={handleLogin} variant="outline" size="sm" className="font-bold">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Simplified Logic */}
      <main className={`flex-1 overflow-auto bg-slate-50 ${user ? 'pb-32' : 'pb-4'}`}>
        {children}
      </main>

      {/* Footer - Positioned above bottom nav when authenticated */}
      <footer className={`bg-slate-100 border-t border-slate-200 text-center py-4 px-4 ${user ? 'mb-20' : 'mt-0'} z-10`}>
        <div className="text-xs text-slate-500">
          <Link to={createPageUrl("About")} className="hover:text-brand-teal px-2">About Us</Link>
          <span className="px-1">|</span>
          <Link to={createPageUrl("TermsOfService")} className="hover:text-brand-teal px-2">Terms of Service</Link>
          <span className="px-1">|</span>
          <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-brand-teal px-2">Privacy Policy</Link>
        </div>
        <p className="text-xs text-slate-400 mt-2">© {new Date().getFullYear()} HaggleHub. All rights reserved.</p>
      </footer>

      {/* Bottom Navigation - Only for authenticated users */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-brand-teal px-4 py-3 z-50 shadow-lg">
          <div className="flex justify-around items-center">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <motion.div
                  key={item.title}
                  whileTap={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="flex-1"
                >
                  <Link
                    to={item.url}
                    className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 font-brand ${
                      isActive
                        ? 'bg-brand-lime text-brand-teal shadow-md'
                        : 'text-white hover:text-brand-lime hover:bg-brand-teal-light'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-bold">{item.title}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

