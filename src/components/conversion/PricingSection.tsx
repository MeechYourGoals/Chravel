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
  MessageSquare
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
}

// Consumer Pricing Tiers
const consumerTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '$0',
    description: 'Perfect for trying Chravel with your first few trips',
    icon: <Users size={24} />,
    features: [
      '3 trips per year',
      'Core group chat',
      'Shared calendar',
      'Basic itinerary planning',
      'Photo sharing',
      'All trip invitees join free'
    ],
    cta: 'Get Started Free',
    category: 'consumer'
  },
  {
    id: 'starter-bundle',
    name: 'Starter Bundle',
    price: '$19.99',
    description: 'One-time yearly purchase for occasional travelers',
    icon: <Star size={24} />,
    features: [
      '10 trips per year',
      'AI trip assistant',
      'Advanced recommendations',
      'Expense tracking',
      'Priority support',
      'All bundle features'
    ],
    cta: 'Buy Starter Bundle',
    category: 'consumer'
  },
  {
    id: 'explorer-bundle',
    name: 'Explorer Bundle',
    price: '$39.99',
    description: 'Perfect for frequent travelers and families',
    icon: <Globe size={24} />,
    features: [
      '25 trips per year',
      'Everything in Starter',
      'Advanced trip insights',
      'Multi-trip planning',
      'Enhanced AI features',
      'Premium support'
    ],
    cta: 'Buy Explorer Bundle',
    popular: true,
    category: 'consumer',
    badge: 'Most Popular'
  },
  {
    id: 'unlimited-bundle',
    name: 'Unlimited Bundle',
    price: '$79.99',
    description: 'For travel enthusiasts who never stop exploring',
    icon: <Sparkles size={24} />,
    features: [
      'Unlimited trips',
      'Everything in Explorer',
      'Premium AI responses',
      'Advanced analytics',
      'VIP support',
      'Early feature access'
    ],
    cta: 'Buy Unlimited Bundle',
    category: 'consumer'
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    price: '$9.99',
    annualPrice: '$99',
    originalPrice: '$119.88',
    description: 'Ultimate flexibility with monthly billing',
    icon: <Crown size={24} />,
    features: [
      'Everything in Unlimited',
      'Priority AI responses',
      'Auto-itinerary generation',
      'Advanced analytics',
      'Trip insights dashboard',
      'Early access to features'
    ],
    cta: 'Start Free Trial',
    category: 'consumer',
    savings: 'Save 17% annually'
  },
  {
    id: 'family-plan',
    name: 'Family Plan',
    price: '$119',
    description: 'Perfect for families traveling together',
    icon: <Users size={24} />,
    features: [
      '4 linked accounts',
      'Unlimited trips for all',
      'Shared family trip history',
      'Parental controls',
      'Teen account management',
      'Family dashboard'
    ],
    cta: 'Start Family Plan',
    category: 'consumer'
  }
];

// Pro/Enterprise Tiers
const proTiers: PricingTier[] = [
  {
    id: 'starter-pro',
    name: 'Starter Pro',
    price: '$149',
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
    price: '$399',
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
    price: 'Starting at $999',
    description: 'For professional leagues, major tours, Fortune 500',
    icon: <Shield size={24} />,
    features: [
      'Unlimited users',
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

const faqItems = [
  {
    question: "Do all trip members need to pay?",
    answer: "No! Only the trip organizer pays. All invited members join completely free and get access to all features."
  },
  {
    question: "Can I switch between plans?",
    answer: "Yes, you can upgrade or downgrade at any time. Pro plans include 14-day free trials."
  },
  {
    question: "What happens if I exceed my trip limit?",
    answer: "You can archive old trips or upgrade to a higher tier. We'll never delete your data."
  },
  {
    question: "Is there a cancellation fee?",
    answer: "No cancellation fees ever. You can cancel anytime and keep access until your billing period ends."
  },
  {
    question: "Do you offer enterprise discounts?",
    answer: "Yes! Enterprise plans start at $999/month with volume discounts available. Contact sales for custom pricing."
  }
];


export const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeTab, setActiveTab] = useState<'consumer' | 'pro' | 'events'>('consumer');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [roiCalculator, setRoiCalculator] = useState({
    teamSize: 10,
    tripsPerYear: 12,
    hoursSavedPerTrip: 8,
    hourlyRate: 75
  });

  const handlePlanSelect = (planId: string) => {
    console.log(`Selected plan: ${planId}`);
    // Handle plan selection logic
  };

  const calculateROI = () => {
    const timeSaved = roiCalculator.teamSize * roiCalculator.tripsPerYear * roiCalculator.hoursSavedPerTrip;
    const annualSavings = timeSaved * roiCalculator.hourlyRate;
    const chravaelCost = activeTab === 'pro' ? 4788 : 999; // Rough annual costs
    const roi = ((annualSavings - chravaelCost) / chravaelCost) * 100;
    return { timeSaved, annualSavings, roi };
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

  const { timeSaved, annualSavings, roi } = calculateROI();

  return (
    <div className="w-full space-y-16">
      {/* Header with Value Prop */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <Badge className="bg-accent/20 text-accent px-4 py-2 text-sm font-medium">
            🚀 Trusted by 10,000+ teams and 50,000+ events worldwide
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Replace 8-10 travel apps with one powerful solution
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Save 70% of trip planning time with enterprise-grade security and consumer-friendly design. 
            <span className="text-accent font-semibold"> Only the organizer pays — everyone else joins free.</span>
          </p>
        </div>

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
                Save 20%
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
                  {tier.category === 'consumer' && !tier.price.includes('$0') && billingCycle === 'annual' && !tier.annualPrice && (
                    <span className="text-lg text-muted-foreground font-normal">/year</span>
                  )}
                </div>
                
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
              <ul className="space-y-3">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full h-12 font-medium ${
                  tier.popular || tier.recommended
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : tier.enterprise 
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={tier.ctaAction || (() => handlePlanSelect(tier.id))}
              >
                {tier.cta}
                {(tier.cta.includes('Trial') || tier.cta.includes('Free')) && (
                  <Badge variant="outline" className="ml-2 bg-background/50">
                    14-day trial
                  </Badge>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-card/30 rounded-2xl p-8 border border-border/50">
        <h3 className="text-2xl font-bold text-center mb-8">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-4 font-medium">Features</th>
                <th className="text-center py-4 font-medium">Free</th>
                <th className="text-center py-4 font-medium">Bundles</th>
                <th className="text-center py-4 font-medium">Pro Monthly</th>
                <th className="text-center py-4 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { feature: 'Trip Limit', free: '3/year', bundles: '10-∞', pro: 'Unlimited', enterprise: 'Unlimited' },
                { feature: 'AI Assistant', free: '✗', bundles: '✓', pro: '✓ Priority', enterprise: '✓ Custom' },
                { feature: 'Team Management', free: '✗', bundles: '✗', pro: '✗', enterprise: '✓' },
                { feature: 'Analytics', free: '✗', bundles: 'Basic', pro: '✓', enterprise: 'Advanced' },
                { feature: 'Support', free: 'Community', bundles: 'Email', pro: 'Priority', enterprise: '24/7 + CSM' }
              ].map((row, index) => (
                <tr key={index} className="border-b border-border/20">
                  <td className="py-4 font-medium">{row.feature}</td>
                  <td className="py-4 text-center text-muted-foreground">{row.free}</td>
                  <td className="py-4 text-center text-muted-foreground">{row.bundles}</td>
                  <td className="py-4 text-center text-muted-foreground">{row.pro}</td>
                  <td className="py-4 text-center text-muted-foreground">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI Calculator */}
      {activeTab === 'pro' && (
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 border border-primary/20">
          <div className="text-center mb-8">
            <Calculator className="w-12 h-12 mx-auto text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-2">ROI Calculator</h3>
            <p className="text-muted-foreground">See how much Chravel Pro can save your organization</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team Size</label>
                <input
                  type="number"
                  value={roiCalculator.teamSize}
                  onChange={(e) => setRoiCalculator(prev => ({ ...prev, teamSize: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Trips Per Year</label>
                <input
                  type="number"
                  value={roiCalculator.tripsPerYear}
                  onChange={(e) => setRoiCalculator(prev => ({ ...prev, tripsPerYear: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hours Saved Per Trip</label>
                <input
                  type="number"
                  value={roiCalculator.hoursSavedPerTrip}
                  onChange={(e) => setRoiCalculator(prev => ({ ...prev, hoursSavedPerTrip: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Average Hourly Rate ($)</label>
                <input
                  type="number"
                  value={roiCalculator.hourlyRate}
                  onChange={(e) => setRoiCalculator(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
            </div>
            
            <div className="bg-card/50 rounded-xl p-6 space-y-4">
              <h4 className="text-lg font-bold">Your Annual Savings</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Time Saved:</span>
                  <span className="font-bold text-primary">{timeSaved.toLocaleString()} hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost Savings:</span>
                  <span className="font-bold text-green-400">${annualSavings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border/50">
                  <span>ROI:</span>
                  <span className="text-accent">{Math.round(roi)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Testimonials */}
      <div className="text-center space-y-8">
        <h3 className="text-2xl font-bold">Trusted by industry leaders</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-card/50 border-border/50">
              <CardContent className="p-6 text-center space-y-4">
                <Quote className="w-8 h-8 mx-auto text-primary/50" />
                <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Frequently Asked Questions</h3>
          <p className="text-muted-foreground">Get answers to common questions about our pricing</p>
        </div>
        
        <div className="space-y-4">
          {faqItems.map((faq, index) => (
            <Collapsible key={index} open={openFaq === index} onOpenChange={() => setOpenFaq(openFaq === index ? null : index)}>
              <CollapsibleTrigger className="w-full text-left">
                <Card className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{faq.question}</h4>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-4 text-muted-foreground">
                  {faq.answer}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center space-y-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-12 border border-primary/20">
        <h3 className="text-3xl font-bold">Ready to transform your travel planning?</h3>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join thousands of teams already saving time and reducing stress with Chravel
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Start Free Trial
            <Clock className="w-4 h-4 ml-2" />
          </Button>
          <Button size="lg" variant="outline">
            Schedule Demo
            <MessageSquare className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          ✓ 14-day free trial ✓ No credit card required ✓ Cancel anytime
        </p>
      </div>
    </div>
  );
};