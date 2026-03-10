import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { TripPassModal } from './TripPassModal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Check,
  Building,
  Users,
  Shield,
  Zap,
  Sparkles,
  Globe,
  Camera,
  MessageSquare,
  Heart,
  Calendar,
  FileText,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  annualPrice?: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  popular?: boolean;
  recommended?: boolean;
  enterprise?: boolean;
  category: 'consumer' | 'pro';
  badge?: string;
  savings?: string;
  ctaAction?: () => void;
  limitation?: string;
}

interface PricingSectionProps {
  onSignUp?: () => void;
}

// Consumer Pricing Tiers - Chravel Plus (Free, Explorer, Frequent Chraveler)
const consumerTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '$0',
    description: 'Perfect for trying ChravelApp with your Crew',
    icon: <Users size={24} />,
    features: [
      'Core group chat',
      'Shared calendar',
      'Photo & video sharing',
      'Shared Group Calendar Sync',
      'Payment tracking',
      'Polls & group decisions',
      'AI Trip Assistant (5 queries per user per trip)',
      '1 PDF export per trip (sample it!)',
      'Save up to 3 active trips',
      '🎁 1 free Pro trip to try',
      '🎁 1 free Event to try',
    ],
    cta: 'Start First Trip Free',
    category: 'consumer',
    limitation: 'Archive trips to make room for new ones. Upgrade to restore anytime!',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    price: '$9.99',
    annualPrice: '$99',
    originalPrice: '$119.88',
    description:
      'For people who travel regularly and want smarter planning. Or grab a Trip Pass for $39.99 (45 days).',
    icon: <Globe size={24} />,
    features: [
      'Everything in Free',
      'Unlimited saved trips + restore archived',
      '10 AI queries per user per trip',
      'Unlimited PDF exports',
      'ICS calendar export',
      'Smart Import (Calendar, Agenda, Line-up from URL)',
      'Location-aware AI recommendations',
      'Search past trips and memories',
    ],
    cta: 'Upgrade to Explorer',
    popular: true,
    category: 'consumer',
    badge: 'Most Popular',
    savings: 'Save $20/year',
  },
  {
    id: 'frequent-chraveler',
    name: 'Frequent Chraveler',
    price: '$19.99',
    annualPrice: '$199',
    originalPrice: '$239.88',
    description: 'For Frequent Flyers, Teams, and Tours. Or grab a Trip Pass for $74.99 (90 days).',
    icon: <Sparkles size={24} />,
    features: [
      'Everything in Explorer',
      'Unlimited AI queries (24/7 concierge)',
      'Smart Import (Calendar, Agenda, Line-up from URL, paste, or file)',
      'One-click PDF trip exports',
      'Role-based channels & Pro features',
      'Custom trip categories',
      'Early feature access',
    ],
    cta: 'Upgrade to Frequent',
    category: 'consumer',
    savings: 'Save $40/year',
  },
];

// Pro/Enterprise Tiers - Chravel Pro (Starter, Growth, Enterprise)
// Import from central source of truth
import { SUBSCRIPTION_TIERS } from '@/types/pro';

const proTiers: PricingTier[] = [
  {
    id: 'starter-pro',
    name: SUBSCRIPTION_TIERS.starter.name,
    price: `$${SUBSCRIPTION_TIERS.starter.price}`,
    description: 'Perfect for small touring acts, AAU teams, local clubs',
    icon: <Building size={24} />,
    features: SUBSCRIPTION_TIERS.starter.features.map(f =>
      f.includes('Events') ? `🎉 ${f}` : f.includes('free') ? `🎁 ${f}` : f,
    ),
    cta: 'Start 14-Day Trial',
    category: 'pro',
    enterprise: true,
    ctaAction: () =>
      (window.location.href =
        'mailto:support@chravelapp.com?subject=Starter%20Pro%2014-Day%20Trial'),
  },
  {
    id: 'growth-pro',
    name: SUBSCRIPTION_TIERS.growing.name,
    price: `$${SUBSCRIPTION_TIERS.growing.price}`,
    description: 'For college teams, mid-size productions, corporate groups',
    icon: <TrendingUp size={24} />,
    features: SUBSCRIPTION_TIERS.growing.features.map(f =>
      f.includes('Events') ? `🎉 ${f}` : f.includes('free') ? `🎁 ${f}` : f,
    ),
    cta: 'Start 14-Day Trial',
    popular: true,
    category: 'pro',
    enterprise: true,
    badge: 'Most Popular',
    ctaAction: () =>
      (window.location.href =
        'mailto:support@chravelapp.com?subject=Growth%20Pro%2014-Day%20Trial'),
  },
  {
    id: 'enterprise',
    name: SUBSCRIPTION_TIERS.enterprise.name,
    price: 'Custom Pricing',
    description: 'For professional leagues, major tours, Fortune 500',
    icon: <Shield size={24} />,
    features: SUBSCRIPTION_TIERS.enterprise.features.map(f =>
      f.includes('Events') ? `🎉 ${f}` : f.includes('free') ? `🎁 ${f}` : f,
    ),
    cta: 'Contact Sales',
    category: 'pro',
    enterprise: true,
    ctaAction: () =>
      (window.location.href = 'mailto:billing@chravelapp.com?subject=Enterprise%20Inquiry'),
  },
];

const valuePropItems = [
  {
    icon: <Heart size={20} />,
    title: 'Trips can easily exceed $1,000',
    description: 'Your memories are worth more than a Trip Pass',
  },
  {
    icon: <Camera size={20} />,
    title: 'Never delete another trip',
    description: 'That sunset in Santorini? Keep it forever.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Unlimited AI assistance',
    description: 'From "what\'s near me?" to complex itinerary planning',
  },
  {
    icon: <MapPin size={20} />,
    title: 'Location-aware suggestions',
    description: '"Find coffee shops within walking distance" - your AI knows where you are',
  },
  {
    icon: <Calendar size={20} />,
    title: 'Seamless calendar sync',
    description: 'Your trips, automatically in your calendar',
  },
  {
    icon: <Users size={20} />,
    title: 'Pro Trips with Role-Based Channels',
    description: 'Filter chat convos to just who needs to be involved',
  },
  {
    icon: <FileText size={20} />,
    title: 'Professional PDF exports',
    description: 'Share beautiful itineraries with one click',
  },
  {
    icon: <Zap size={20} />,
    title: 'Early Access Features',
    description: 'Get early access to our latest features and updates before they roll wide',
  },
  {
    icon: <Users size={20} />,
    title: 'Plan your next trip, season, or wedding',
    description:
      'Plan your next family trip, sports season, or wedding weekend without ever leaving one app.',
  },
];

const _faqItems = [
  {
    question: 'What happens when I hit my 3-trip limit?',
    answer:
      'Your trips are never deleted! Just archive a trip to make room for new ones. Archived trips are safely stored and can be restored anytime after upgrading to Explorer or Frequent Chraveler.',
  },
  {
    question: 'How do AI queries work on each plan?',
    answer:
      'Free users get 5 AI queries per user per trip. Explorer gets 10 AI queries per user per trip. Frequent Chraveler gets unlimited AI queries. A counter shows how many you have left. Each new trip starts fresh with your full query limit.',
  },
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes! Upgrade, downgrade, or cancel anytime. No contracts, no hassles.',
  },
  {
    question: 'Is my data safe?',
    answer: 'Bank-level encryption. Your trips are private unless you choose to share them.',
  },
  {
    question: 'Do all trip members need to pay?',
    answer:
      'No! Only the trip creator or organization admin pays. All invited members join for free. For ChravelApp Pro, the admin pays and can assign seats to team members — ideal for organizations, sports teams, and tour management.',
  },
  {
    question: "What's included with the free Pro Trip and Event?",
    answer:
      "Every account gets 1 free ChravelApp Pro trip and 1 free Event to experience all premium features. It's our way of letting you try before you buy — no commitment required!",
  },
  {
    question: 'Are Events included in my subscription?',
    answer:
      'Yes! Events are bundled into all paid plans. Explorer includes unlimited Events with up to 50 guests each. Frequent Chraveler includes Events with up to 100 guests. All Pro tiers include unlimited Events for your entire team.',
  },
  {
    question: 'Why not just use the apps I already have?',
    answer:
      "Unlike your current stack where texts don't know what's in your emails, and your spreadsheet doesn't know what's in your group chat—ChravelApp's 8 tabs are fully interconnected. Your AI concierge can search your calendar, polls, and outstanding tasks, and more. One context-aware trip brain instead of 8 disconnected apps.",
  },
  {
    question: 'What is a Trip Pass?',
    answer:
      'A Trip Pass gives you full premium access for a fixed window — 45 days (Explorer) or 90 days (Frequent Chraveler). Perfect for one-off trips without a monthly commitment. Your exports and trip data stay forever, even after the pass expires. If you travel often, Annual is the better deal.',
  },
];

const _testimonials = [
  {
    quote:
      'ChravelApp replaced 8 different apps we were using. Our team coordination improved by 300% and we save 15 hours per tour.',
    author: 'Sarah Chen',
    role: 'Tour Manager, Rising Stars Band',
    avatar: 'SC',
  },
  {
    quote:
      'The ROI was immediate. We cut our travel planning time by 70% and reduced coordination errors to zero.',
    author: 'Marcus Rodriguez',
    role: 'Operations Director, Global Corp',
    avatar: 'MR',
  },
  {
    quote:
      "Our family trips went from chaotic group chats to seamless experiences. Everyone knows what's happening when.",
    author: 'Jennifer Kim',
    role: 'Family Travel Coordinator',
    avatar: 'JK',
  },
];

export const PricingSection = ({ onSignUp }: PricingSectionProps = {}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activeTab, setActiveTab] = useState<'consumer' | 'pro'>('consumer');
  const [_openFaq, _setOpenFaq] = useState<number | null>(null);
  const [tripPassOpen, setTripPassOpen] = useState(false);

  const handlePlanSelect = (planId: string, tier?: PricingTier) => {
    // If tier has custom action, use it
    if (tier?.ctaAction) {
      tier.ctaAction();
      return;
    }

    // For consumer plans, trigger sign-up modal
    if (activeTab === 'consumer' && onSignUp) {
      onSignUp();
    }
  };

  const getCurrentTiers = () => {
    switch (activeTab) {
      case 'consumer':
        return consumerTiers;
      case 'pro':
        return proTiers;
      default:
        return consumerTiers;
    }
  };

  const getPrice = (tier: PricingTier) => {
    if (tier.annualPrice && billingCycle === 'annual') {
      return tier.annualPrice;
    }
    return tier.price;
  };

  const getAnnualMonthlyEquivalent = (tier: PricingTier) => {
    if (!tier.annualPrice || billingCycle !== 'annual') return null;
    const annual = parseFloat(tier.annualPrice.replace('$', ''));
    return `$${(annual / 12).toFixed(2)}/month`;
  };

  return (
    <div className="w-full space-y-16">
      {/* Header with Value Prop - High contrast with background */}
      <div className="text-center space-y-6">
        <div className="inline-block accent-fill-gold px-6 py-4 rounded-lg max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-2">
            Start free. Upgrade when your trip gets serious.
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-black font-bold leading-relaxed break-words">
            Don't lose receipts, links, or the final plan.{' '}
            <span className="text-black/80 font-bold">
              Free works forever—upgrade only when you need more.
            </span>
          </p>
        </div>

        {/* Why Upgrade Section */}
        {activeTab === 'consumer' && (
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 tablet:p-8 max-w-5xl mx-auto">
            <h3 className="text-xl sm:text-2xl tablet:text-3xl font-bold text-foreground mb-4 tablet:mb-6">
              Why Upgrade?
            </h3>
            <div className="grid grid-cols-1 tablet:grid-cols-2 lg:grid-cols-3 gap-3 tablet:gap-4">
              {valuePropItems.map((item, index) => (
                <div key={index} className="text-left">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="text-primary mt-0.5">
                      {React.cloneElement(item.icon as React.ReactElement, {
                        size: 16,
                      })}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm sm:text-base md:text-lg mb-1 break-words">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm md:text-base text-foreground break-words">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs - Only 2 tabs now: Chravel Plus and Chravel Pro */}
        <div className="flex justify-center">
          <div className="bg-card/50 rounded-lg p-1 flex gap-1">
            {[
              { id: 'consumer', label: 'ChravelApp Plus', icon: <Users size={16} /> },
              { id: 'pro', label: 'ChravelApp Pro', icon: <Building size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 tablet:px-6 tablet:py-3 rounded-md text-sm sm:text-base tablet:text-lg font-medium transition-all flex items-center gap-1.5 tablet:gap-2 ${
                  activeTab === tab.id
                    ? 'accent-fill-gold font-semibold shadow-sm'
                    : 'text-foreground hover:text-foreground'
                }`}
              >
                {React.cloneElement(tab.icon as React.ReactElement, {
                  size: 14,
                })}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Toggle for applicable plans */}
        {activeTab === 'consumer' && (
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <span
              className={`text-sm sm:text-base ${billingCycle === 'monthly' ? 'text-foreground font-medium' : 'text-foreground'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 bg-muted rounded-full transition-colors"
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-gold-primary rounded-full transition-transform shadow-ring-glow ${
                  billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm sm:text-base ${billingCycle === 'annual' ? 'text-foreground font-medium' : 'text-foreground'}`}
            >
              Annual
            </span>
            {billingCycle === 'annual' && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                Save 17%
              </Badge>
            )}
          </div>
        )}

        {/* Trip Pass CTA */}
        {activeTab === 'consumer' && (
          <div className="text-center">
            <button
              onClick={() => setTripPassOpen(true)}
              className="text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              🎫 Only need ChravelApp for a trip or two? Get a Trip Pass.
            </button>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div
        className={`grid gap-4 tablet:gap-6 max-w-7xl mx-auto px-2 ${
          activeTab === 'consumer'
            ? 'grid-cols-1 lg:grid-cols-3'
            : 'grid-cols-1 tablet:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {getCurrentTiers().map(tier => (
          <div key={tier.id}>
            <Card
              className={`relative backdrop-blur-sm border transition-all hover:scale-105 hover:shadow-lg min-h-[480px] flex flex-col ${
                tier.popular || tier.recommended
                  ? 'bg-card/80 border-gold-primary/50 shadow-lg ring-1 ring-gold-primary/20'
                  : tier.enterprise
                    ? 'bg-card/80 border-gold-primary/30'
                    : 'bg-card/80 border-border/50'
              }`}
            >
              {(tier.popular || tier.recommended) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="accent-fill-gold px-4 py-2 font-semibold">
                    {tier.badge || 'Most Popular'}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 tablet:pb-6 p-4 tablet:p-6">
                <div
                  className={`w-12 h-12 tablet:w-16 tablet:h-16 mx-auto rounded-full flex items-center justify-center mb-3 tablet:mb-4 ${
                    tier.popular || tier.recommended
                      ? 'bg-primary/20 text-primary'
                      : tier.enterprise
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {React.cloneElement(tier.icon as React.ReactElement, {
                    size: 20,
                  })}
                </div>
                <CardTitle className="text-xl md:text-2xl mb-2 font-bold break-words whitespace-normal">
                  {tier.name}
                </CardTitle>
                <div className="space-y-2">
                  <div className="break-words whitespace-normal overflow-hidden text-center">
                    <div className="text-3xl md:text-4xl font-bold text-foreground">
                      {getPrice(tier)}
                    </div>
                    {/* Pro monthly pricing */}
                    {tier.category === 'pro' &&
                      tier.price.includes('$') &&
                      !tier.price.includes('Starting') && (
                        <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                          /month
                        </div>
                      )}
                    {/* Consumer monthly/annual pricing */}
                    {tier.category === 'consumer' &&
                      tier.annualPrice &&
                      billingCycle === 'monthly' && (
                        <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                          /month
                        </div>
                      )}
                    {tier.category === 'consumer' &&
                      tier.annualPrice &&
                      billingCycle === 'annual' && (
                        <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                          /year
                        </div>
                      )}
                  </div>

                  {/* Show monthly equivalent for annual plans */}
                  {billingCycle === 'annual' &&
                    tier.annualPrice &&
                    tier.category === 'consumer' &&
                    getAnnualMonthlyEquivalent(tier) && (
                      <div className="text-sm text-muted-foreground break-words whitespace-normal text-center px-2">
                        {getAnnualMonthlyEquivalent(tier)} when billed annually
                      </div>
                    )}

                  {/* Show original price and savings */}
                  {tier.originalPrice && billingCycle === 'annual' && (
                    <div className="text-sm text-muted-foreground line-through break-words whitespace-normal text-center">
                      Originally {tier.originalPrice}/year
                    </div>
                  )}

                  {tier.savings && billingCycle === 'annual' && (
                    <div className="text-sm text-green-400 font-medium break-words whitespace-normal text-center">
                      {tier.savings}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground min-h-[2.5rem] flex items-center justify-center break-words whitespace-normal overflow-hidden text-center px-2">
                    {tier.description}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 tablet:space-y-4 px-4 tablet:px-6 pb-4 tablet:pb-6 flex-1">
                {tier.limitation && (
                  <div className="bg-gold-primary/10 border border-gold-primary/20 rounded-lg p-2.5 tablet:p-3 text-sm text-gold-primary break-words font-medium">
                    {tier.limitation}
                  </div>
                )}

                <ul className="space-y-2.5 tablet:space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-base font-semibold text-foreground break-words">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="px-4 tablet:px-6 pb-4 tablet:pb-6 pt-0 mt-auto">
                <Button
                  onClick={tier.ctaAction || (() => handlePlanSelect(tier.id))}
                  className={`w-full h-10 tablet:h-12 font-semibold text-sm sm:text-base ${
                    tier.category === 'consumer'
                      ? 'accent-fill-gold'
                      : tier.enterprise
                        ? 'accent-fill-gold'
                        : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>

      {/* Trip Pass Modal */}
      <TripPassModal open={tripPassOpen} onOpenChange={setTripPassOpen} />
    </div>
  );
};
