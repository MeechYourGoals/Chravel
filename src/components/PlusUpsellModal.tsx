import React, { useState } from 'react';
import { X, Sparkles, MessageCircle, Settings, Zap, Camera, Globe } from 'lucide-react';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { CONSUMER_PRICING } from '../types/consumer';

interface PlusUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlusUpsellModal = ({ isOpen, onClose }: PlusUpsellModalProps) => {
  const { upgradeToTier, isLoading } = useConsumerSubscription();
  const [selectedTier, setSelectedTier] = useState<'explorer' | 'frequent-chraveler'>('explorer');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    await upgradeToTier(selectedTier, billingCycle);
    onClose();
  };

  const getPrice = () => {
    const pricing = CONSUMER_PRICING[selectedTier];
    return billingCycle === 'monthly' ? pricing.monthly : pricing.annual;
  };

  const getSavings = () => {
    return CONSUMER_PRICING[selectedTier].savings;
  };

  const getMonthlyEquivalent = () => {
    return (CONSUMER_PRICING[selectedTier].annual / 12).toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              selectedTier === 'explorer' ? 'bg-gradient-to-r from-glass-orange to-glass-yellow' :
              'bg-gradient-to-r from-purple-500 to-purple-600'
            }`}>
              {selectedTier === 'explorer' && <Globe size={24} className="text-white" />}
              {selectedTier === 'frequent-chraveler' && <Sparkles size={24} className="text-white" />}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white capitalize">Upgrade to {selectedTier}</h2>
              <p className="text-gray-400">
                {selectedTier === 'explorer' && 'Never lose a trip memory'}
                {selectedTier === 'frequent-chraveler' && 'For travel pros and adventure enthusiasts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tier Selector */}
        <div className="flex justify-center gap-2 mb-6">
          {(['explorer', 'frequent-chraveler'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
                selectedTier === tier
                  ? 'bg-gradient-to-r from-glass-orange to-glass-yellow text-white'
                  : 'text-gray-300 hover:text-white bg-white/5'
              }`}
            >
              {tier === 'frequent-chraveler' ? 'Frequent Chraveler' : tier}
            </button>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Concierge</h3>
            <p className="text-gray-300 text-sm">Chat with AI for personalized recommendations based on your location and preferences.</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
              <Settings size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Preferences</h3>
            <p className="text-gray-300 text-sm">Set dietary, vibe, budget, and time preferences to get tailored suggestions for your entire group.</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
              <Zap size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Basecamp Intelligence</h3>
            <p className="text-gray-300 text-sm">Get location-aware recommendations within walking distance or perfect travel time from your basecamp.</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Contextual Chat</h3>
            <p className="text-gray-300 text-sm">Real-time assistance for planning activities, finding restaurants, and making the most of your trip.</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
              <Camera size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Photo Sharing</h3>
            <p className="text-gray-300 text-sm">Share and organize trip photos with your group in beautiful albums and memories.</p>
          </div>
        </div>

        {/* Comparison */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Free vs. {selectedTier === 'explorer' ? 'Explorer' : 'Frequent Chraveler'}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-3">Free Plan</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Up to 3 active trips</li>
                <li>• Basic group chat</li>
                <li>• Shared calendar (manual)</li>
                <li>• Photo & video sharing</li>
                <li>• 5 AI queries per user per trip</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">{selectedTier === 'explorer' ? 'Explorer' : 'Frequent Chraveler'}</h4>
              {selectedTier === 'explorer' ? (
                <ul className="space-y-2 text-sm text-green-300">
                  <li>• Unlimited saved trips</li>
                  <li>• 10 AI queries per trip</li>
                  <li>• Location-aware AI</li>
                  <li>• Custom trip categories</li>
                  <li>• Smart notifications</li>
                  <li>• Priority support</li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-purple-300">
                  <li>• Everything in Explorer</li>
                  <li>• Unlimited AI queries</li>
                  <li>• Calendar sync & PDF export</li>
                  <li>• 1 Chravel Pro trip/month</li>
                  <li>• Role-based channels</li>
                  <li>• Route optimization</li>
                  <li>• Early feature access</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white font-medium' : 'text-gray-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-12 h-6 bg-gray-700 rounded-full transition-colors"
          >
            <div className={`absolute top-1 w-4 h-4 bg-glass-orange rounded-full transition-transform ${
              billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
          <span className={`text-sm ${billingCycle === 'annual' ? 'text-white font-medium' : 'text-gray-400'}`}>
            Annual
          </span>
          {billingCycle === 'annual' && (
            <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-medium">
              Save 17%
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-glass-orange/20 to-glass-yellow/20 backdrop-blur-sm border border-glass-orange/30 rounded-2xl p-6 mb-6">
            <div className="text-4xl font-bold text-white mb-2">
              ${getPrice()}{billingCycle === 'monthly' ? '/month' : '/year'}
            </div>
            {billingCycle === 'annual' && (
              <>
                <div className="text-sm text-gray-300 mb-1">
                  ${getMonthlyEquivalent()}/month when billed annually
                </div>
                <div className="text-green-400 text-sm mb-2">Save ${getSavings()}/year (17% off)</div>
              </>
            )}
            <p className="text-gray-300 mb-4">14-day free trial • Cancel anytime</p>
            <div className="text-sm text-glass-yellow">
              No credit card required for trial
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white rounded-2xl transition-all duration-200 font-medium"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-glass-orange to-glass-yellow hover:from-glass-orange/80 hover:to-glass-yellow/80 text-white font-medium rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};