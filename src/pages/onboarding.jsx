import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Deal } from '@/api/entities';
import { Dealer } from '@/api/entities';
import { Loader2 } from 'lucide-react';

// This page runs a one-time setup for the user and then redirects.
export default function OnboardingPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Starting onboarding...');

    useEffect(() => {
        async function runOnboarding() {
            try {
                const currentUser = await User.me();

                if (currentUser.has_completed_onboarding) {
                    navigate('/');
                    return;
                }

                // Step 1: Create a fallback "Uncategorized" dealer for the user
                setStatus('Creating fallback records...');
                const fallbackDealer = await Dealer.create({
                    name: `Uncategorized (${currentUser.email_identifier})`,
                    notes: "This is a system-generated dealer for uncategorized messages."
                });
                
                // Step 2: Create a fallback "Uncategorized" deal associated with that dealer
                const fallbackDeal = await Deal.create({
                    dealer_id: fallbackDealer.id,
                    vehicle_id: null, // No vehicle for this special deal
                    status: 'negotiating', // Keep it active
                    notes: "This is a system-generated deal for uncategorized messages."
                });

                // Step 3: Update the user record with the new fallback ID and mark onboarding as complete
                setStatus('Finalizing account setup...');
                await User.updateMyUserData({
                    fallback_deal_id: fallbackDeal.id,
                    has_completed_onboarding: true
                });

                setStatus('Onboarding complete! Redirecting...');
                navigate('/');

            } catch (error) {
                console.error('Onboarding failed:', error);
                setStatus('An error occurred during setup. Please try refreshing the page.');
            }
        }

        runOnboarding();
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-green-50">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-4" />
            <p className="text-slate-700 font-medium">{status}</p>
        </div>
    );
}