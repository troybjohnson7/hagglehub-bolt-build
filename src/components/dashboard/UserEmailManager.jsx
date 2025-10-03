
import { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const generateShortId = (length = 7) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export default function UserEmailManager() {
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchUserAndEmail() {
      try {
        let currentUser = await User.me();
        
        if (!currentUser) {
          setIsLoading(false);
          return;
        }
        
        if (!currentUser.email_identifier) {
          const newIdentifier = generateShortId();
          currentUser = await User.updateMyUserData({ email_identifier: newIdentifier });
          // Re-fetch the user to ensure we have the latest data
        }
        
        setUser(currentUser);
        setUserEmail(`deals-${currentUser.email_identifier}@hagglehub.app`);

      } catch (error) {
        console.error("Could not fetch user", error);
        setUser(null);
        setUserEmail('');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserAndEmail();
  }, []);
  
  const copyToClipboard = async () => {
    if (!userEmail) return;
    try {
      await navigator.clipboard.writeText(userEmail);
      setCopied(true);
      toast.success('Email address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy email address');
    }
  };

  if (isLoading) {
    return (
        <Card className="shadow-sm border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Your Universal Deal Inbox
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
            </CardContent>
        </Card>
    )
  }
  
  if (!user) {
    return null; // Don't show the component if user is not authenticated
  }

  return (
    <Card className="shadow-sm border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs md:text-sm font-semibold text-blue-900 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Your Universal Deal Inbox
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 p-3 md:p-6">
        <p className="text-xs text-blue-700">Give this single email to all dealers for all communications. Our AI will automatically organize the messages for you.</p>
        <div className="flex items-center gap-2">
          <Input 
            value={userEmail}
            readOnly
            className="text-xs bg-white border-blue-200 h-8 md:h-9"
          />
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="shrink-0 border-blue-300 hover:bg-blue-100 h-8 w-8 md:h-9 md:w-9"
            >
              {copied ? (
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
              )}
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
