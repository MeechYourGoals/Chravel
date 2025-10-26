import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
    enterprise: true
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
    badge: 'Most Popular'
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

// Events Tiers
const eventsTiers: PricingTier[] = [
  {
    id: 'basic-events',
    name: 'Basic Events',
    price: '$2.99',
    description: 'One-time events: weddings, conferences, festivals',
    icon: <CalendarPlus size={24} />,
    features: [
      'Per attendee pricing',
      'All core event features',
      'RSVP management',
      'Basic customization',
      'Event check-in',
      'Email support'
    ],
    cta: 'Start Planning Event',
    category: 'events'
  },
  {
    id: 'premium-events',
    name: 'Premium Events',
    price: '$5.99',
    description: 'Advanced features for professional events',
    icon: <Star size={24} />,
    features: [
      'Per attendee pricing',
      'Advanced sponsorship tools',
      'Custom branding',
      'Detailed analytics',
      'VIP management',
      'Priority support'
    ],
    cta: 'Start Planning Event',
    popular: true,
    category: 'events',
    badge: 'Recommended'
  },
  {
    id: 'annual-license',
    name: 'Annual License',
    price: '$19,999',
    description: 'Unlimited attendees across multiple events',
    icon: <Crown size={24} />,
    features: [
      'Unlimited attendees',
      'Multiple events',
      'White-label option (+$20k)',
      'Custom development',
      'Dedicated account manager',
      '24/7 support'
    ],
    cta: 'Contact Sales',
    category: 'events',
    enterprise: true,
    ctaAction: () => window.location.href = 'mailto:christian@chravelapp.com?subject=Events%20Annual%20License'
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
    question: "What's an AI query?",
    answer: "Any question you ask the AI Trip Assistant (\"Find restaurants near our hotel\", \"Plan our day in Rome\", etc.)"
  },
  {
    question: "Is my data safe?",
    answer: "Bank-level encryption. Your trips are private unless you choose to share them."
  },
  {
    question: "Do all trip members need to pay?",
    answer: "Nope! Only one person needs Explorer/Pro to unlock premium features for the whole trip."
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

export const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeTab, setActiveTab] = useState<'consumer' | 'pro' | 'events'>('consumer');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handlePlanSelect = (planId: string) => {
    console.log(`Selected plan: ${planId}`);
    // Handle plan selection logic
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
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Start planning better trips today
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Your crew is waiting. <span className="text-accent font-semibold">Save 23 hours per trip</span> with the world's first AI-native travel collaboration platform.
          </p>
        </div>

        {/* Why Upgrade Section */}
        {activeTab === 'consumer' && (
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-6">Why Upgrade?</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {valuePropItems.map((item, index) => (
                <div key={index} className="text-left">
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-0.5">{item.icon}</div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
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
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Toggle for applicable plans */}
        {activeTab === 'consumer' && (
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
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
            <span className={`text-sm ${billingCycle === 'annual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {billingCycle === 'annual' && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                Save 17%
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className={`grid gap-8 max-w-7xl mx-auto ${activeTab === 'consumer' ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {getCurrentTiers().map((tier) => (
          <Card 
            key={tier.id} 
            className={`relative bg-card/80 backdrop-blur-sm border transition-all hover:scale-105 hover:shadow-lg ${
              tier.popular || tier.recommended
                ? 'border-primary/50 shadow-lg ring-1 ring-primary/20' 
                : tier.enterprise 
                ? 'border-accent/50' 
                : 'border-border/50'
            }`}
          >
            {(tier.popular || tier.recommended) && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-2 font-medium">
                  {tier.badge || 'Most Popular'}
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                tier.popular || tier.recommended
                  ? 'bg-primary/20 text-primary' 
                  : tier.enterprise 
                  ? 'bg-accent/20 text-accent' 
                  : 'bg-muted/50 text-muted-foreground'
              }`}>
                {tier.icon}
              </div>
              <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
              <div className="space-y-3">
                <div className="text-4xl font-bold text-foreground">
                  {getPrice(tier)}
                  {tier.category === 'events' && tier.price.includes('$') && !tier.price.includes('999') && (
                    <span className="text-lg text-muted-foreground font-normal">/attendee</span>
                  )}
                  {tier.category === 'pro' && tier.price.includes('$') && !tier.price.includes('Starting') && (
                    <span className="text-lg text-muted-foreground font-normal">/month</span>
                  )}
                  {tier.category === 'consumer' && tier.annualPrice && billingCycle === 'monthly' && (
                    <span className="text-lg text-muted-foreground font-normal">/month</span>
                  )}
                  {tier.category === 'consumer' && tier.annualPrice && billingCycle === 'annual' && (
                    <span className="text-lg text-muted-foreground font-normal">/year</span>
                  )}
                </div>
                
                {/* Show monthly equivalent for annual plans */}
                {billingCycle === 'annual' && tier.annualPrice && tier.category === 'consumer' && getAnnualMonthlyEquivalent(tier) && (
                  <div className="text-sm text-muted-foreground">
                    {getAnnualMonthlyEquivalent(tier)} when billed annually
                  </div>
                )}
                
                {/* Show original price and savings */}
                {tier.originalPrice && billingCycle === 'annual' && (
                  <div className="text-sm text-muted-foreground line-through">
                    Originally {tier.originalPrice}/year
                  </div>
                )}
                
                {tier.savings && billingCycle === 'annual' && (
                  <div className="text-sm text-green-400 font-medium">
                    {tier.savings}
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {tier.limitation && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                  {tier.limitation}
                </div>
              )}
              
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={tier.ctaAction || (() => handlePlanSelect(tier.id))}
                className={`w-full h-12 font-medium ${
                  tier.popular || tier.recommended
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : tier.enterprise 
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h3 className="text-3xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <Collapsible key={index} open={openFaq === index} onOpenChange={() => setOpenFaq(openFaq === index ? null : index)}>
              <CollapsibleTrigger className="w-full">
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:bg-card/70 transition-colors">
                  <div className="flex items-center justify-between">
                    <h4 className="text-left font-semibold text-foreground">{item.question}</h4>
                    <ChevronDown className={`text-muted-foreground transition-transform ${openFaq === index ? 'rotate-180' : ''}`} size={20} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-card/30 border border-border/30 border-t-0 rounded-b-lg p-4 -mt-1">
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center space-y-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-12 max-w-4xl mx-auto">
        <h3 className="text-3xl font-bold text-foreground">Start planning better trips today. Your crew is waiting.</h3>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
            Get Started Free
          </Button>
          <Button size="lg" variant="outline" className="px-8">
            See Plans
          </Button>
        </div>
      </div>
    </div>
  );
};
