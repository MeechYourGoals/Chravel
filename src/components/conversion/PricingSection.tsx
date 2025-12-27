import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  Check, 
  Crown, 
  Building, 
  CalendarPlus, 
  Star,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Sparkles,
  Globe,
  Camera,
  MessageSquare,
  Heart,
  Calendar,
  FileText,
  MapPin,
  TrendingUp
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
    description: 'Perfect for trying ChravelApp with your crew',
    icon: <Users size={24} />,
    features: [
      'Core group chat',
      'Shared calendar (manual entry)',
      'Photo & video sharing',
      'Basic itinerary planning',
      'Payment tracking',
      'Polls & group decisions',
      'AI Trip Assistant (5 queries per user per trip)',
      '1 PDF export per trip (sample it!)',
      'ICS calendar export',
      'Save up to 3 active trips',
      '🎁 1 free Pro trip to try',
      '🎁 1 free Event to try'
    ],
    cta: 'Try It Free',
    category: 'consumer',
    limitation: 'Archive trips to make room for new ones. Upgrade to restore anytime!'
  },
  {
    id: 'explorer',
    name: 'Explorer',
    price: '$9.99',
    annualPrice: '$99',
    originalPrice: '$119.88',
    description: 'For people who travel often and want smarter planning',
    icon: <Globe size={24} />,
    features: [
      'Everything in Free',
      'Unlimited saved trips + restore archived',
      '10 AI queries per user per trip',
      'Unlimited PDF exports',
      'Location-aware AI recommendations',
      'Search past trips and memories'
    ],
    cta: 'Upgrade My Trips',
    popular: true,
    category: 'consumer',
    badge: 'Most Popular',
    savings: 'Save $20/year'
  },
  {
    id: 'frequent-chraveler',
    name: 'Frequent Chraveler',
    price: '$19.99',
    annualPrice: '$199',
    originalPrice: '$239.88',
    description: 'For power users, organizers, and travel pros',
    icon: <Sparkles size={24} />,
    features: [
      'Everything in Explorer',
      'Unlimited AI queries (24/7 concierge)',
      'Calendar sync (Google, Apple, Outlook)',
      'One-click PDF trip exports',
      'Role-based channels & Pro features',
      'Custom trip categories',
      'Early feature access'
    ],
    cta: 'Upgrade My Trips',
    category: 'consumer',
    savings: 'Save $40/year'
  }
];

// Pro/Enterprise Tiers - Chravel Pro (Starter, Growth, Enterprise)
const proTiers: PricingTier[] = [
  {
    id: 'starter-pro',
    name: 'Starter Pro',
    price: '$49',
    description: 'Perfect for small touring acts, AAU teams, local clubs',
    icon: <Building size={24} />,
    features: [
      'Up to 50 team members',
      'Advanced permissions',
      'Compliance features',
      'Team management dashboard',
      'Basic integrations',
      'Email support',
      '🎉 Unlimited Events for your team',
      '🎁 Your first Pro Trip + Event included free'
    ],
    cta: 'Start 14-Day Trial',
    category: 'pro',
    enterprise: true,
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Starter%20Pro%2014-Day%20Trial'
  },
  {
    id: 'growth-pro',
    name: 'Growth Pro',
    price: '$99',
    description: 'For college teams, mid-size productions, corporate groups',
    icon: <TrendingUp size={24} />,
    features: [
      'Up to 100 team members',
      'Multi-language support',
      'Priority support',
      'Advanced integrations',
      'Custom workflows',
      'Analytics dashboard',
      '🎉 Unlimited Events for your team',
      '🎁 Your first Pro Trip + Event included free'
    ],
    cta: 'Start 14-Day Trial',
    popular: true,
    category: 'pro',
    enterprise: true,
    badge: 'Most Popular',
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Growth%20Pro%2014-Day%20Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$199',
    description: 'For professional leagues, major tours, Fortune 500',
    icon: <Shield size={24} />,
    features: [
      'Up to 250 team members',
      'Custom integrations',
      'Dedicated success manager',
      'SLA guarantees',
      'White-label options',
      '24/7 premium support',
      '🎉 Unlimited Events for your team',
      '🎁 Your first Pro Trip + Event included free'
    ],
    cta: 'Contact Sales',
    category: 'pro',
    enterprise: true,
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Enterprise%20Inquiry'
  }
];

const valuePropItems = [
  {
    icon: <Heart size={20} />,
    title: 'The average trip costs $2,000+',
    description: 'Your memories are worth more than $9.99/month'
  },
  {
    icon: <Camera size={20} />,
    title: 'Never delete another trip',
    description: 'That sunset in Santorini? Keep it forever.'
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Unlimited AI assistance',
    description: 'From "what\'s near me?" to complex itinerary planning'
  },
  {
    icon: <MapPin size={20} />,
    title: 'Location-aware suggestions',
    description: '"Find coffee shops within walking distance" - your AI knows where you are'
  },
  {
    icon: <Calendar size={20} />,
    title: 'Seamless calendar sync',
    description: 'Your trips, automatically in your calendar'
  },
  {
    icon: <Users size={20} />,
    title: 'Pro Trips with Role-Based Channels',
    description: 'Filter chat convos to just who needs to be involved'
  },
  {
    icon: <FileText size={20} />,
    title: 'Professional PDF exports',
    description: 'Share beautiful itineraries with one click'
  },
  {
    icon: <Zap size={20} />,
    title: 'Early Access Features',
    description: 'Get early access to our latest features and updates before they roll wide'
  },
  {
    icon: <Users size={20} />,
    title: 'Plan your next trip, season, or wedding',
    description: 'Plan your next family trip, sports season, or wedding weekend without ever leaving one app.'
  }
];

const faqItems = [
  {
    question: "What happens when I hit my 3-trip limit?",
    answer: "Your trips are never deleted! Just archive a trip to make room for new ones. Archived trips are safely stored and can be restored anytime after upgrading to Explorer or Frequent Chraveler."
  },
  {
    question: "How do AI queries work on each plan?",
    answer: "Free users get 5 AI queries per user per trip. Explorer gets 10 AI queries per user per trip. Frequent Chraveler gets unlimited AI queries. A counter shows how many you have left. Each new trip starts fresh with your full query limit."
  },
  {
    question: "Can I change plans anytime?",
    answer: "Yes! Upgrade, downgrade, or cancel anytime. No contracts, no hassles."
  },
  {
    question: "Is my data safe?",
    answer: "Bank-level encryption. Your trips are private unless you choose to share them."
  },
  {
    question: "Do all trip members need to pay?",
    answer: "No! Only the trip creator or organization admin pays. All invited members join for free. For ChravelApp Pro, the admin pays and can assign seats to team members — ideal for organizations, sports teams, and tour management."
  },
  {
    question: "What's included with the free Pro Trip and Event?",
    answer: "Every account gets 1 free ChravelApp Pro trip and 1 free Event to experience all premium features. It's our way of letting you try before you buy — no commitment required!"
  },
  {
    question: "Are Events included in my subscription?",
    answer: "Yes! Events are bundled into all paid plans. Explorer includes unlimited Events with up to 100 guests each. Frequent Chraveler includes Events with up to 200 guests. All Pro tiers include unlimited Events for your entire team."
  }
];

const testimonials = [
  {
    quote: "ChravelApp replaced 8 different apps we were using. Our team coordination improved by 300% and we save 15 hours per tour.",
    author: "Sarah Chen",
    role: "Tour Manager, Rising Stars Band",
    avatar: "SC"
  },
  {
    quote: "The ROI was immediate. We cut our travel planning time by 70% and reduced coordination errors to zero.",
    author: "Marcus Rodriguez", 
    role: "Operations Director, Global Corp",
    avatar: "MR"
  },
  {
    quote: "Our family trips went from chaotic group chats to seamless experiences. Everyone knows what's happening when.",
    author: "Jennifer Kim",
    role: "Family Travel Coordinator",
    avatar: "JK"
  }
];

export const PricingSection = ({ onSignUp }: PricingSectionProps = {}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activeTab, setActiveTab] = useState<'consumer' | 'pro'>('consumer');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      case 'consumer': return consumerTiers;
      case 'pro': return proTiers;
      default: return consumerTiers;
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
        <div className="space-y-4">
          <div className="inline-block bg-primary px-6 py-3 rounded-lg">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Upgrade your travel experience today
            </h2>
          </div>
          <div className="bg-primary backdrop-blur-sm px-4 py-3 rounded-lg max-w-3xl mx-auto">
            <p className="text-sm sm:text-base md:text-lg text-white font-bold leading-relaxed break-words">
              Make sure your next trip makes it out of the group chat. <span className="text-white font-bold">Save more time, money, and headaches with ChravelApp.</span>
            </p>
          </div>
        </div>

        {/* Why Upgrade Section */}
        {activeTab === 'consumer' && (
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 md:p-8 max-w-5xl mx-auto">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-6">Why Upgrade?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {valuePropItems.map((item, index) => (
                <div key={index} className="text-left">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="text-primary mt-0.5">
                      {React.cloneElement(item.icon as React.ReactElement, { 
                        size: 16
                      })}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm sm:text-base md:text-lg mb-1 break-words">{item.title}</h4>
                      <p className="text-xs sm:text-sm md:text-base text-foreground break-words">{item.description}</p>
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
              { id: 'pro', label: 'ChravelApp Pro', icon: <Building size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 md:px-6 md:py-3 rounded-md text-sm sm:text-base md:text-lg font-medium transition-all flex items-center gap-1.5 md:gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:text-foreground'
                }`}
              >
                {React.cloneElement(tab.icon as React.ReactElement, { 
                  size: 14
                })}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Toggle for applicable plans */}
        {activeTab === 'consumer' && (
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <span className={`text-sm sm:text-base ${billingCycle === 'monthly' ? 'text-foreground font-medium' : 'text-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 bg-muted rounded-full transition-colors"
            >
              <div className={`absolute top-1 w-4 h-4 bg-primary rounded-full transition-transform ${
                billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
            <span className={`text-sm sm:text-base ${billingCycle === 'annual' ? 'text-foreground font-medium' : 'text-foreground'}`}>
              Annual
            </span>
            {billingCycle === 'annual' && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                Save 17%
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className={`grid gap-4 md:gap-6 max-w-7xl mx-auto px-2 ${
        activeTab === 'consumer' 
          ? 'grid-cols-1 lg:grid-cols-3' 
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {getCurrentTiers().map((tier) => (
          <div key={tier.id}>
            <Card 
              className={`relative backdrop-blur-sm border transition-all hover:scale-105 hover:shadow-lg min-h-[480px] flex flex-col ${
                tier.popular || tier.recommended
                  ? 'bg-card/80 border-primary/50 shadow-lg ring-1 ring-primary/20' 
                  : tier.enterprise 
                  ? 'bg-card/80 border-accent/50' 
                  : 'bg-card/80 border-border/50'
              }`}
            >
            {(tier.popular || tier.recommended) && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-2 font-medium">
                  {tier.badge || 'Most Popular'}
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4 md:pb-6 p-4 md:p-6">
              <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto rounded-full flex items-center justify-center mb-3 md:mb-4 ${
                tier.popular || tier.recommended
                  ? 'bg-primary/20 text-primary' 
                  : tier.enterprise 
                  ? 'bg-accent/20 text-accent' 
                  : 'bg-muted/50 text-muted-foreground'
              }`}>
                {React.cloneElement(tier.icon as React.ReactElement, { 
                  size: 20
                })}
              </div>
              <CardTitle className="text-xl md:text-2xl mb-2 font-bold break-words whitespace-normal">{tier.name}</CardTitle>
              <div className="space-y-2">
                <div className="break-words whitespace-normal overflow-hidden text-center">
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {getPrice(tier)}
                  </div>
                  {/* Pro monthly pricing */}
                  {tier.category === 'pro' && tier.price.includes('$') && !tier.price.includes('Starting') && (
                    <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                      /month
                    </div>
                  )}
                  {/* Consumer monthly/annual pricing */}
                  {tier.category === 'consumer' && tier.annualPrice && billingCycle === 'monthly' && (
                    <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                      /month
                    </div>
                  )}
                  {tier.category === 'consumer' && tier.annualPrice && billingCycle === 'annual' && (
                    <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                      /year
                    </div>
                  )}
                </div>
                
                {/* Show monthly equivalent for annual plans */}
                {billingCycle === 'annual' && tier.annualPrice && tier.category === 'consumer' && getAnnualMonthlyEquivalent(tier) && (
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

            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6 flex-1">
              {tier.limitation && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 md:p-3 text-sm text-yellow-400 break-words font-medium">
                  {tier.limitation}
                </div>
              )}
              
              <ul className="space-y-2.5 md:space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-base font-semibold text-foreground break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter className="px-4 md:px-6 pb-4 md:pb-6 pt-0 mt-auto">
              <Button
                onClick={tier.ctaAction || (() => handlePlanSelect(tier.id))}
                className={`w-full h-10 md:h-12 font-medium text-sm sm:text-base ${
                  tier.popular || tier.recommended
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : tier.enterprise 
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
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
    </div>
  );
};
