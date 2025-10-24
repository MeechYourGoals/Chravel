import React, { useState } from 'react';
import { X, Crown, Building, Sparkles, MessageCircle, Settings, Zap, Users, Shield, TrendingUp, Star, BarChart3, Calendar, Wallet, Globe, Phone, CalendarPlus, UserCheck, Clock, FileText, DollarSign, TrendingDown, Mail, Ticket, Megaphone, Paintbrush, Camera } from 'lucide-react';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { TRIPS_PLUS_PRICE, TRIPS_PLUS_ANNUAL_PRICE } from '../types/consumer';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIER_MAP } from '@/constants/stripe';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal = ({ isOpen, onClose }: UpgradeModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'explorer' | 'unlimited' | 'pro' | 'events'>('explorer');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const { upgradeToTier, isLoading } = useConsumerSubscription();

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (['starter', 'explorer', 'unlimited'].includes(selectedPlan)) {
      await upgradeToTier(selectedPlan as 'starter' | 'explorer' | 'unlimited', billingCycle);
      onClose();
    } else if (selectedPlan === 'pro') {
      // Handle Pro upgrade - use Pro Starter by default
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { tier: 'pro-starter' }
        });
        
        if (error) throw error;
        
        if (data.url) {
          window.open(data.url, '_blank');
          onClose();
        }
      } catch (error) {
        console.error('Error creating checkout:', error);
        toast.error('Failed to start checkout');
      }
    } else {
      // Events tier - coming soon
      toast.info('Events tier coming soon!');
      onClose();
    }
  };

  const getPlusPrice = () => {
    return billingCycle === 'monthly' ? TRIPS_PLUS_PRICE : TRIPS_PLUS_ANNUAL_PRICE;
  };

  const calculateSavings = () => {
    const monthlyCost = TRIPS_PLUS_PRICE * 12;
    const annualCost = TRIPS_PLUS_ANNUAL_PRICE;
    return Math.round(((monthlyCost - annualCost) / monthlyCost) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Choose Your Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Plan Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-2 flex gap-1">
            <button
              onClick={() => setSelectedPlan('starter')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-sm ${
                selectedPlan === 'starter'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Star size={16} />
              Starter
            </button>
            <button
              onClick={() => setSelectedPlan('explorer')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-sm ${
                selectedPlan === 'explorer'
                  ? 'bg-gradient-to-r from-glass-orange to-glass-yellow text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Crown size={16} />
              Explorer
            </button>
            <button
              onClick={() => setSelectedPlan('unlimited')}
              className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-sm ${
                selectedPlan === 'unlimited'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Sparkles size={16} />
              Unlimited
            </button>
            <button
              onClick={() => setSelectedPlan('pro')}
              className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                selectedPlan === 'pro'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Building size={18} />
              Chravel Pro
            </button>
            <button
              onClick={() => setSelectedPlan('events')}
              className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                selectedPlan === 'events'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <CalendarPlus size={18} />
              Events
            </button>
          </div>
        </div>

        {/* Plan Content */}
        {['starter', 'explorer', 'unlimited'].includes(selectedPlan) ? (
          <div>
            {/* Tier Info */}
            <div className="text-center mb-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                selectedPlan === 'starter' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                selectedPlan === 'explorer' ? 'bg-gradient-to-r from-glass-orange to-glass-yellow' :
                'bg-gradient-to-r from-purple-500 to-purple-600'
              }`}>
                {selectedPlan === 'starter' && <Star size={32} className="text-white" />}
                {selectedPlan === 'explorer' && <Crown size={32} className="text-white" />}
                {selectedPlan === 'unlimited' && <Sparkles size={32} className="text-white" />}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 capitalize">{selectedPlan}</h3>
              <p className="text-gray-300">
                {selectedPlan === 'starter' && 'Perfect for occasional travelers and weekend getaways'}
                {selectedPlan === 'explorer' && 'Perfect for frequent travelers and families'}
                {selectedPlan === 'unlimited' && 'For travel enthusiasts who never stop exploring'}
              </p>
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
                  ${billingCycle === 'monthly' 
                    ? (selectedPlan === 'starter' ? '9.99' : selectedPlan === 'explorer' ? '19.99' : '39.99')
                    : (selectedPlan === 'starter' ? '99.99' : selectedPlan === 'explorer' ? '199.99' : '399.99')}
                  {billingCycle === 'monthly' ? '/month' : '/year'}
                </div>
                {billingCycle === 'annual' && (
                  <>
                    <div className="text-sm text-gray-300 mb-1">
                      ${selectedPlan === 'starter' ? '8.33' : selectedPlan === 'explorer' ? '16.67' : '33.33'}/month when billed annually
                    </div>
                    <div className="text-green-400 text-sm mb-2">
                      Save ${selectedPlan === 'starter' ? '19.89' : selectedPlan === 'explorer' ? '39.89' : '79.89'}/year (17% off)
                    </div>
                  </>
                )}
                <p className="text-gray-300 mb-4">14-day free trial • Cancel anytime</p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">What's Included:</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                {selectedPlan === 'starter' && (
                  <>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      12 trips per year
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Everything in Free
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      AI trip assistant
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Advanced recommendations
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Expense tracking
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Priority support
                    </li>
                  </>
                )}
                {selectedPlan === 'explorer' && (
                  <>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      50 trips per year
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Everything in Starter
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Advanced trip insights
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Multi-trip planning
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Enhanced AI features
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Premium support
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Early access to features
                    </li>
                  </>
                )}
                {selectedPlan === 'unlimited' && (
                  <>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Unlimited trips
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Everything in Explorer
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Premium AI responses
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      VIP support
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Early feature access
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Custom integrations
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                      Priority feature requests
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ) : selectedPlan === 'pro' ? (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building size={32} className="text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Chravel Pro</h3>
              <p className="text-gray-300">Enterprise software for professional trip management</p>
            </div>

            {/* Pro Features - Full descriptions restored */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Users size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Advanced Team Collaboration</h4>
                <p className="text-gray-300 text-sm">Comprehensive team management with role-based permissions, collaborative planning tools, and real-time synchronization across all team members.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Wallet size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Enterprise Budget Management</h4>
                <p className="text-gray-300 text-sm">Comprehensive expense tracking, budget allocation, automated approval workflows, and detailed financial reporting with export capabilities.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Analytics & Business Intelligence</h4>
                <p className="text-gray-300 text-sm">Detailed trip analytics, sentiment analysis, performance metrics, ROI tracking, and customizable dashboards for data-driven decision making.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Phone size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">24/7 Priority Support</h4>
                <p className="text-gray-300 text-sm">Dedicated account management, priority technical support, custom integrations, and enterprise-grade SLA guarantees.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Shield size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Enterprise Security & Compliance</h4>
                <p className="text-gray-300 text-sm">Advanced security features, SSO integration, audit trails, GDPR compliance, and enterprise-grade data protection standards.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Globe size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Multi-Organization Management</h4>
                <p className="text-gray-300 text-sm">Manage multiple organizations, white-label options, custom branding, and scalable seat-based pricing for enterprise deployments.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Calendar size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Advanced Scheduling & Automation</h4>
                <p className="text-gray-300 text-sm">Automated itinerary generation, smart scheduling optimization, calendar integrations, and workflow automation for complex travel operations.</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4">
                  <Star size={24} className="text-yellow-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Custom Integrations & API Access</h4>
                <p className="text-gray-300 text-sm">REST API access, custom integrations with existing systems, webhook support, and developer resources for seamless enterprise integration.</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 mb-6">
                <div className="text-4xl font-bold text-white mb-2">Start Trial</div>
                <p className="text-gray-300 mb-2">Custom pricing available for large scale events, contact sales for more</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarPlus size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Chravel Events</h3>
              <p className="text-gray-300 mb-4">Chravel Events brings all your event management needs into one professional suite—connecting venues, schedules, attendees, and teams with real-time updates, collaboration, budgeting, and bulletproof communications. Streamline every step, from invitations to analytics, with robust security and branding for your ambitions.</p>
            </div>

            {/* Events Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <CalendarPlus size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">All-in-One Event Planning</h4>
                <p className="text-gray-300 text-sm">Manage attendee lists, schedules, venue details, and event essentials in one unified platform.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Mail size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Automated Invitations & RSVP</h4>
                <p className="text-gray-300 text-sm">Send invitations individually or in bulk via email/SMS, track status, and manage re-invitations.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <UserCheck size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Custom Roles & Permissions</h4>
                <p className="text-gray-300 text-sm">Assign roles to event staff (planner, vendor, performer, guest) with tiered access controls.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Clock size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Integrated Scheduling & Timeline</h4>
                <p className="text-gray-300 text-sm">Build multi-day agendas, time slots for activities, automated reminders, and conflict detection.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <FileText size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Real-time Collaboration</h4>
                <p className="text-gray-300 text-sm">Shared event chat, document sharing, and real-time updates for attendees, organizers, and vendors.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <DollarSign size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Budgeting & Payments</h4>
                <p className="text-gray-300 text-sm">Expense tracking, vendor payment management, split payments for group buys, and automated budget alerts.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Analytics & Insights</h4>
                <p className="text-gray-300 text-sm">Track ticket sales, RSVP-to-attendance rate, engagement metrics, and marketing performance.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Ticket size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Professional Invitations & Ticketing</h4>
                <p className="text-gray-300 text-sm">Generate custom invitations, integrate with ticketing platforms, and QR code ticket management.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 relative">
                <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-xs px-2 py-1 rounded-full font-bold">
                  PREMIUM
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Megaphone size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Advanced Communication</h4>
                <p className="text-gray-300 text-sm">Broadcast urgent updates to all participants and schedule broadcast messages for pre-event, in-event, and post-event.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 relative">
                <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                  PRO
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Paintbrush size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">White-label & Branding</h4>
                <p className="text-gray-300 text-sm">Brand the event experience with your logo, theme colors, and sponsor branding for large-scale clients.</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Shield size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Security & Compliance</h4>
                <p className="text-gray-300 text-sm">GDPR compliance, audit logging, secure file uploads, and granular invitation control to protect private events.</p>
              </div>
            </div>

            {/* Events Pricing Tiers */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-4">
                <h5 className="font-bold text-white mb-2">Events Free</h5>
                <div className="text-2xl font-bold text-white mb-2">$0</div>
                <p className="text-gray-300 text-sm mb-3">Basic events, limited attendees</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Up to 50 attendees</li>
                  <li>• Core scheduling</li>
                  <li>• Basic invitations</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4">
                <h5 className="font-bold text-white mb-2">Events Plus</h5>
                <div className="text-2xl font-bold text-white mb-2">$29/mo</div>
                <p className="text-gray-300 text-sm mb-3">Per organizer</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Unlimited events</li>
                  <li>• Full RSVP management</li>
                  <li>• Analytics & reporting</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                <h5 className="font-bold text-white mb-2">Events Pro</h5>
                <div className="text-2xl font-bold text-white mb-2">$199/mo</div>
                <p className="text-gray-300 text-sm mb-3">Per organization</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• White-label branding</li>
                  <li>• Advanced reporting</li>
                  <li>• Mass upload features</li>
                  <li>• API access</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-gray-700/20 to-gray-800/20 border border-gray-500/30 rounded-xl p-4">
                <h5 className="font-bold text-white mb-2">Enterprise</h5>
                <div className="text-2xl font-bold text-white mb-2">Custom</div>
                <p className="text-gray-300 text-sm mb-3">500+ attendees</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Dedicated support</li>
                  <li>• Custom SLAs</li>
                  <li>• Advanced compliance</li>
                  <li>• Custom integrations</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center">
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
  );
};
