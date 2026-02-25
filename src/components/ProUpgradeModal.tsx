import React, { useState } from 'react';
import { X, Crown, Users, Shield, Zap, TrendingUp, Building, Star } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '../types/pro';
import { useIsMobile } from '../hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIER_MAP } from '@/constants/stripe';
import { toast } from 'sonner';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal = ({ isOpen, onClose }: ProUpgradeModalProps) => {
  const [selectedTier, setSelectedTier] = useState<
    'starter' | 'growing' | 'enterprise' | 'enterprise-plus'
  >('growing');
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handleStartFreeTrial = async (tier: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: SUBSCRIPTION_TIER_MAP[tier as keyof typeof SUBSCRIPTION_TIER_MAP] },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const tierIcons = {
    starter: <Zap size={isMobile ? 20 : 24} className="text-blue-400" />,
    growing: <TrendingUp size={isMobile ? 20 : 24} className="text-green-400" />,
    enterprise: <Building size={isMobile ? 20 : 24} className="text-purple-400" />,
    'enterprise-plus': <Star size={isMobile ? 20 : 24} className="text-yellow-400" />,
  };

  const tierColors = {
    starter: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    growing: 'from-green-500/20 to-green-600/20 border-green-500/30',
    enterprise: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    'enterprise-plus': 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl ${
          isMobile
            ? 'w-full h-full overflow-y-auto p-4'
            : 'p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`bg-gradient-to-r from-glass-orange to-glass-yellow rounded-2xl flex items-center justify-center ${
                isMobile ? 'w-10 h-10' : 'w-12 h-12'
              }`}
            >
              <Crown size={isMobile ? 20 : 24} className="text-white" />
            </div>
            <div>
              <h2 className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                Upgrade to Chravel Pro
              </h2>
              <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
                Enterprise software for professional trip management
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Enterprise SaaS Benefits */}
        <div className="bg-gradient-to-r from-glass-orange/10 to-glass-yellow/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 sm:p-6 mb-6">
          <h3
            className={`font-bold text-white mb-4 flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}
          >
            <Building size={isMobile ? 20 : 24} className="text-glass-orange" />
            Enterprise Software as a Service
          </h3>
          <div
            className={`grid gap-4 sm:gap-6 text-gray-300 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}
          >
            <div>
              <h4 className="font-semibold text-white mb-2">Organization-Based Subscriptions</h4>
              <p className="text-sm">
                Your organization pays once and invites team members to seats. Individual users
                don't need separate subscriptions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Seat-Based Pricing</h4>
              <p className="text-sm">
                Pay only for the seats you need. Easily invite drivers, crew, players, or staff
                without additional per-user costs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Flexible Team Management</h4>
              <p className="text-sm">
                Add or remove team members as needed. Perfect for tours, sports teams, conferences,
                and corporate travel.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Enterprise Features</h4>
              <p className="text-sm">
                Advanced permissions, travel wallet integration, broadcast messaging, and dedicated
                support.
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Tiers */}
        <div
          className={`grid gap-4 sm:gap-6 mb-6 ${
            isMobile ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-4'
          }`}
        >
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
            <div
              key={key}
              className={`relative bg-gradient-to-br ${tierColors[key as keyof typeof tierColors]} backdrop-blur-sm border rounded-2xl p-4 sm:p-6 cursor-pointer transition-all hover:scale-105 ${
                selectedTier === key ? 'ring-2 ring-white/40' : ''
              }`}
              onClick={() => setSelectedTier(key as any)}
            >
              <div className="flex items-center justify-between mb-4">
                {tierIcons[key as keyof typeof tierIcons]}
                {selectedTier === key && <div className="w-3 h-3 bg-white rounded-full"></div>}
              </div>
              <h3 className={`font-bold text-white mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                {tier.name}
              </h3>
              <div className={`font-bold text-white mb-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                ${tier.price}/month
              </div>
              <div className="text-sm text-gray-400 mb-4">Up to {tier.seatLimit} seats</div>
              <ul className="space-y-2 text-sm text-gray-300">
                {tier.features.slice(0, isMobile ? 3 : 4).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                    {feature}
                  </li>
                ))}
                {tier.features.length > (isMobile ? 3 : 4) && (
                  <li className="text-xs text-gray-400 italic">
                    +{tier.features.length - (isMobile ? 3 : 4)} more features
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Selected Tier Details - Collapsible on mobile */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6 mb-6">
          <h3 className={`font-bold text-white mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}>
            {SUBSCRIPTION_TIERS[selectedTier].name} - Complete Feature List
          </h3>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {SUBSCRIPTION_TIERS[selectedTier].features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Shield size={16} className="text-glass-orange mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="text-sm text-glass-yellow mb-4">
            14-day free trial • No credit card required • Cancel anytime
          </div>
          <div className={`flex justify-center ${isMobile ? '' : ''}`}>
            <button
              onClick={() => handleStartFreeTrial(selectedTier)}
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-glass-orange to-glass-yellow hover:from-glass-orange/80 hover:to-glass-yellow/80 text-white font-medium rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Processing...'
                : `Start Free Trial - ${SUBSCRIPTION_TIERS[selectedTier].name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
