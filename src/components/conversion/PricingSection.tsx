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
  BarChart3,
  Phone,
  Camera,
  ChevronDown,
  Sparkles,
  Globe,
  Headphones,
  Calculator,
  Quote,
  TrendingUp,
  Clock,
  MessageSquare,
  Heart,
  Calendar,
  FileText,
  Bell,
  Search,
  Briefcase,
  MapPin,
  Settings
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
  category: 'consumer' | 'pro' | 'events';
  badge?: string;
  savings?: string;
  ctaAction?: () => void;
  limitation?: string;
}

interface PricingSectionProps {
  onSignUp?: () => void;
}

// Consumer Pricing Tiers - NEW 3-TIER STRUCTURE
const consumerTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '$0',
    description: 'Perfect for trying Chravel with your crew',
    icon: <Users size={24} />,
    features: [
      'Create unlimited trip participants',
      'Core group chat & collaboration',
      'Shared calendar (manual entry)',
      'Photo & video sharing',
      'Basic itinerary planning',
      'Expense tracking',
      'Polls & decision making',
      'AI Trip Assistant (5 queries per user per trip)',
      'Save up to 3 active trips'
    ],
    cta: 'Get Started Free',
    category: 'consumer',
    limitation: 'To create a new trip after 3, you\'ll need to delete an old one'
  },
  {
    id: 'explorer',
    name: 'Explorer',
    price: '$9.99',
    annualPrice: '$99',
    originalPrice: '$119.88',
    description: 'Never lose a trip memory',
    icon: <Globe size={24} />,
    features: [
      'Unlimited saved trips - keep every memory forever',
      '10 AI queries per trip - double the free tier',
      'Location-aware AI suggestions - personalized recs based on where you are',
      'Smart notifications - never miss important updates',
      'Search past trips - find that perfect restaurant again',
      'Priority support - we\'ve got your back',
      'Custom trip categories - tag trips by type'
    ],
    cta: 'Start Free Trial',
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
    description: 'For travel pros and adventure enthusiasts',
    icon: <Sparkles size={24} />,
    features: [
      'Everything in Explorer',
      'Unlimited AI queries - your 24/7 concierge with no limits',
      'Calendar sync - Google, Apple, Outlook integration',
      'PDF trip export - one-click beautiful itineraries',
      'Create 1 Chravel Pro trip per month - invite up to 50 people',
      'Role-based channels & pro features on your Pro trip',
      'Custom trip categories - tag by type (work/leisure/family/etc.)',
      'Early feature access - shape the future of Chravel',
      'Multi-stop route optimization'
    ],
    cta: 'Start Free Trial',
    category: 'consumer',
    savings: 'Save $40/year'
  }
];

// Pro/Enterprise Tiers
const proTiers: PricingTier[] = [
  {
    id: 'starter-pro',
    name: 'Starter Pro',
    price: '$49',
    description: 'Perfect for small touring acts, AAU teams, local clubs',
    icon: <Building size={24} />,
    features: [
      'Up to 25 team members',
      'Advanced permissions',
      'Compliance features',
      'Team management dashboard',
      'Basic integrations',
      'Email support'
    ],
    cta: 'Start 14-Day Trial',
    category: 'pro',
    enterprise: true,
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Starter%20Pro%2014-Day%20Trial'
  },
  {
    id: 'growth-pro',
    name: 'Growth Pro',
    price: '$199',
    description: 'For college teams, mid-size productions, corporate groups',
    icon: <TrendingUp size={24} />,
    features: [
      'Up to 100 team members',
      'Multi-language support',
      'Priority support',
      'Advanced integrations',
      'Custom workflows',
      'Analytics dashboard'
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
    price: '$499',
    description: 'For professional leagues, major tours, Fortune 500',
    icon: <Shield size={24} />,
    features: [
      'Up to 500 team members',
      'Custom integrations',
      'Dedicated success manager',
      'SLA guarantees',
      'White-label options',
      '24/7 premium support'
    ],
    cta: 'Contact Sales',
    category: 'pro',
    enterprise: true,
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Enterprise%20Inquiry'
  }
];

// Events Tiers - NEW STRUCTURE
const eventsTiers: PricingTier[] = [
  {
    id: 'basic-events',
    name: 'Basic Events',
    price: '$0',
    description: 'For 3–50 attendees per event',
    icon: <CalendarPlus size={24} />,
    features: [
      'Event page & RSVP management',
      'Shared group chat',
      'Photo & media sharing',
      'Polls & simple itinerary',
      'Basic customization',
      '"Made with Chravel" footer',
      'Email support'
    ],
    cta: 'Start Free',
    category: 'events'
  },
  {
    id: 'premium-events',
    name: 'Premium Events',
    price: '$0.99',
    description: 'For 51–149 attendees • hard cap $150',
    icon: <Star size={24} />,
    features: [
      'Everything in Basic',
      'Custom branding (remove footer, theme colors)',
      'Higher media limits',
      'Advanced polls (ranked choice)',
      'CSV export (guest list & RSVPs)',
      'VIP tags (e.g., staff, speakers)'
    ],
    cta: 'Upgrade This Event',
    category: 'events'
  },
  {
    id: 'premium-plus',
    name: 'Premium Plus',
    price: '$0.49',
    description: 'For 150–500 attendees',
    icon: <Zap size={24} />,
    features: [
      'Everything in Premium',
      'Optimized for larger crowds',
      'No per-attendee charge for Host Pass events'
    ],
    cta: 'Upgrade This Event',
    category: 'events'
  },
  {
    id: 'host-pass',
    name: 'Host Pass',
    price: '$9.99',
    description: '2 events/month • up to 149 attendees each • no per-attendee fees',
    icon: <Crown size={24} />,
    features: [
      'All Premium features on covered events',
      'Ideal for monthly shows & series',
      '3 organizer seats included',
      'Priority email support',
      'Add another Host Pass for more covered events'
    ],
    cta: 'Get Host Pass',
    popular: true,
    category: 'events',
    badge: 'Recommended'
  },
  {
    id: 'enterprise-events',
    name: 'Enterprise',
    price: 'Custom',
    description: '501+ attendees per event or higher-volume organizers',
    icon: <Shield size={24} />,
    features: [
      'Larger attendee caps & advanced permissions',
      'Security reviews & DPA/SOC2 roadmap',
      'Onboarding & support aligned to your scale',
      'Annual contract'
    ],
    cta: 'Contact Sales',
    category: 'events',
    enterprise: true,
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Enterprise%20Events%20Inquiry'
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
    icon: <FileText size={20} />,
    title: 'Professional PDF exports',
    description: 'Share beautiful itineraries with one click'
  }
];

const faqItems = [
  {
    question: "What happens when I hit my 3-trip limit?",
    answer: "You'll need to delete an old trip to create a new one. Or upgrade to Explorer to keep unlimited trips!"
  },
  {
    question: "How do AI queries work on the free plan?",
    answer: "Each user gets 5 AI queries per trip. A counter shows how many you have left. Resets with each new trip."
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
    answer: "Trips are free with limited features. Or upgrade to Explorer or Pro to keep unlimited trips and more features. For Chravel Pro, only the admin pays and can assign a set number of seats to team members — ideal for organizations, sports teams, and tour management."
  }
];

const testimonials = [
  {
    quote: "Chravel replaced 8 different apps we were using. Our team coordination improved by 300% and we save 15 hours per tour.",
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeTab, setActiveTab] = useState<'consumer' | 'pro' | 'events'>('consumer');
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
    } else if (activeTab === 'events') {
      // For basic events, trigger sign-up
      if (planId === 'basic-events' && onSignUp) {
        onSignUp();
      } else {
        // For paid events, open email
        window.location.href = 'mailto:christian@chravelapp.com?subject=Event%20Planning%20Inquiry';
      }
    }
  };

  const getCurrentTiers = () => {
    switch (activeTab) {
      case 'consumer': return consumerTiers;
      case 'pro': return proTiers;
      case 'events': return eventsTiers;
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
      {/* Header with Value Prop */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Start planning better trips today
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground max-w-3xl mx-auto leading-relaxed break-words">
            Ensuring the next trip makes it out of the group chat. <span className="text-accent font-semibold">Save 23 hours per trip</span> with the world's first AI-native travel collaboration platform.
          </p>
        </div>

        {/* Why Upgrade Section */}
        {activeTab === 'consumer' && (
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 md:p-8 max-w-5xl mx-auto">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-6">Why Upgrade?</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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

        {/* Category Tabs */}
        <div className="flex justify-center">
          <div className="bg-card/50 rounded-lg p-1 flex gap-1">
            {[
              { id: 'consumer', label: 'My Trips', icon: <Users size={16} /> },
              { id: 'pro', label: 'Chravel Pro', icon: <Building size={16} /> },
              { id: 'events', label: 'Chravel Events', icon: <CalendarPlus size={16} /> }
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
      <div className={`grid gap-4 md:gap-6 max-w-7xl mx-auto ${
        activeTab === 'consumer' 
          ? 'md:grid-cols-3' 
          : activeTab === 'events'
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
          : 'md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {getCurrentTiers().map((tier) => (
          <div 
            key={tier.id}
            className={activeTab === 'events' && tier.enterprise ? 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1' : ''}
          >
            <Card 
              className={`relative backdrop-blur-sm border transition-all hover:scale-105 hover:shadow-lg min-h-[480px] flex flex-col ${
                activeTab === 'events' 
                  ? tier.popular || tier.recommended
                    ? 'bg-blue-950/40 border-blue-500/40 shadow-lg ring-1 ring-blue-500/40'
                    : tier.enterprise
                    ? 'bg-gray-900/80 border-amber-500/30'
                    : 'bg-gray-900/80 border-gray-700/50'
                  : tier.popular || tier.recommended
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
                activeTab === 'events'
                  ? tier.popular || tier.recommended
                    ? 'bg-blue-600/30 text-blue-400'
                    : tier.enterprise
                    ? 'bg-amber-600/20 text-amber-500'
                    : 'bg-gray-700/50 text-gray-300'
                  : tier.popular || tier.recommended
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
                  {/* Events per-attendee pricing */}
                  {tier.category === 'events' && ['premium-events', 'premium-plus'].includes(tier.id) && (
                    <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                      /attendee
                    </div>
                  )}
                  {/* Events Host Pass monthly pricing */}
                  {tier.category === 'events' && tier.id === 'host-pass' && (
                    <div className="text-sm sm:text-base md:text-lg text-foreground font-normal mt-1">
                      /month
                    </div>
                  )}
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
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 md:p-3 text-xs sm:text-sm text-yellow-400 break-words">
                  {tier.limitation}
                </div>
              )}
              
              <ul className="space-y-2 md:space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter className="px-4 md:px-6 pb-4 md:pb-6 pt-0 mt-auto">
              <Button
                onClick={tier.ctaAction || (() => handlePlanSelect(tier.id))}
                className={`w-full h-10 md:h-12 font-medium text-sm sm:text-base ${
                  activeTab === 'events'
                    ? tier.popular || tier.recommended
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : tier.enterprise
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    : tier.popular || tier.recommended
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

      {/* How Billing Works (Events only) */}
      {activeTab === 'events' && (
        <div className="max-w-4xl mx-auto rounded-xl border border-border/40 bg-card/20 backdrop-blur-sm p-4 md:p-6">
          <div className="text-base sm:text-lg font-semibold mb-3 text-foreground">How billing works</div>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground list-disc pl-5">
            <li>
              "Joiner" = attendee who accepts the invite and enters the event space. Unopened/declined invites aren't billed.
            </li>
            <li>
              <strong>Premium</strong>: $0.99 per joiner for 51–149 attendees, <strong>capped at $150 per event</strong>.
            </li>
            <li>
              <strong>Premium Plus</strong>: $0.49 per joiner for 150–500 attendees.
            </li>
            <li>
              <strong>Host Pass</strong>: covers <strong>2 events/month</strong> up to <strong>149 attendees each</strong> with <strong>no per-attendee fees</strong>. Extra events that month use Premium pricing or you can add another Host Pass.
            </li>
            <li>
              Final charge occurs when you lock the event or 24h after the end date (whichever comes first).
            </li>
          </ul>
          <p className="mt-3 text-[10px] sm:text-[11px] text-muted-foreground/60">
            Prices USD. Features subject to fair-use. See Terms.
          </p>
        </div>
      )}

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-6 md:mb-8">Frequently Asked Questions</h3>
        <div className="space-y-2 md:space-y-3">
          {faqItems.map((item, index) => (
            <Collapsible key={index} open={openFaq === index} onOpenChange={() => setOpenFaq(openFaq === index ? null : index)}>
              <CollapsibleTrigger className="w-full">
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 md:p-4 hover:bg-card/70 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-left font-semibold text-foreground text-sm sm:text-base md:text-lg break-words">{item.question}</h4>
                    <ChevronDown className={`text-foreground transition-transform flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`} size={18} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-card/30 border border-border/30 border-t-0 rounded-b-lg p-3 md:p-4 -mt-1">
                  <p className="text-foreground text-xs sm:text-sm md:text-base break-words">{item.answer}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

    </div>
  );
};
