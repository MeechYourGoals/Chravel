import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, Users, Shield, Zap, BarChart3, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import channelsPro from '@/assets/app-screenshots/channels-pro.png';

export const ForTeams = () => {
  const benefits = [
    {
      icon: <Shield size={32} className="text-primary" />,
      title: "Reduce Operational Costs",
      description: "Cut coordination time by 70% and eliminate tool sprawl across your organization"
    },
    {
      icon: <Users size={32} className="text-accent" />,
      title: "Scale Team Coordination",
      description: "From 10 to 500+ team members, Chravel handles complex logistics seamlessly"
    },
    {
      icon: <BarChart3 size={32} className="text-primary" />,
      title: "Compliance & Reporting",
      description: "Built-in audit trails, compliance features, and real-time analytics for your operations"
    },
    {
      icon: <Zap size={32} className="text-accent" />,
      title: "Advanced Integrations",
      description: "Connect with Slack, QuickBooks, Google Workspace, and your existing tool stack"
    }
  ];

  const useCases = [
    {
      icon: "🏆",
      title: "Sports Teams",
      description: "College athletics, youth leagues, and professional teams managing travel, schedules, and rosters"
    },
    {
      icon: "🎤",
      title: "Touring Artists",
      description: "Bands, performers, and production crews coordinating multi-city tours and logistics"
    },
    {
      icon: "🏢",
      title: "Corporate Travel",
      description: "Companies managing team offsites, conferences, and business travel programs"
    },
    {
      icon: "🎪",
      title: "Event Organizers",
      description: "Professional event planners running conferences, festivals, and large-scale gatherings"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Building size={20} className="text-primary" />
            <span className="text-sm font-semibold text-primary">CHRAVEL PRO & EVENTS</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground">
            Built for Teams That Move
          </h1>
          
          <p className="text-xl sm:text-2xl md:text-3xl text-foreground max-w-3xl mx-auto">
            From touring artists to college athletics, Chravel Pro reduces operational costs and eliminates coordination chaos for teams of 10 to 500+
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=Chravel%20Pro%20Inquiry'}
              className="text-lg px-8"
            >
              Schedule a Demo →
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=14-Day%20Trial'}
              className="text-lg px-8"
            >
              Start 14-Day Trial
            </Button>
          </div>
        </div>
      </div>

      {/* Pro Features Screenshot */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-foreground">
            Role-Based Channels for Team Collaboration
          </h2>
          <p className="text-xl text-center text-foreground max-w-3xl mx-auto">
            Keep coaches, players, and parents organized with dedicated channels
          </p>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:border-primary/30 transition-all duration-300">
            <img 
              src={channelsPro} 
              alt="Role-based channels for team organization" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
            Enterprise-Grade Coordination
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8 hover:border-primary/50 transition-all duration-300"
              >
                <div className="bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="font-bold text-xl md:text-2xl mb-3 text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-base md:text-lg text-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
            Trusted By
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <div 
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="font-bold text-lg md:text-xl mb-2 text-foreground">
                  {useCase.title}
                </h3>
                <p className="text-sm md:text-base text-foreground">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Tiers Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Choose Your Plan
          </h2>
          <p className="text-xl text-center text-foreground mb-12">
            From startups to enterprises, we have a plan that scales with you
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Starter Pro */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">Starter Pro</h3>
                <div className="text-4xl font-bold text-foreground mb-2">$49<span className="text-xl text-muted-foreground">/mo</span></div>
                <p className="text-foreground">Up to 50 team members</p>
              </div>
              <Button 
                className="w-full mb-6"
                onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=Starter%20Pro%2014-Day%20Trial'}
              >
                Start 14-Day Trial
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Advanced permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Team management dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Basic integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Email support</span>
                </li>
              </ul>
            </div>

            {/* Growth Pro */}
            <div className="bg-card/50 backdrop-blur-sm border-2 border-primary rounded-2xl p-6 md:p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">Growth Pro</h3>
                <div className="text-4xl font-bold text-foreground mb-2">$199<span className="text-xl text-muted-foreground">/mo</span></div>
                <p className="text-foreground">Up to 100 team members</p>
              </div>
              <Button 
                className="w-full mb-6"
                onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=Growth%20Pro%2014-Day%20Trial'}
              >
                Start 14-Day Trial
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Multi-language support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Advanced integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Analytics dashboard</span>
                </li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-foreground mb-2">$199<span className="text-xl text-muted-foreground">/mo</span></div>
                <p className="text-foreground">Up to 250 team members</p>
              </div>
              <Button 
                className="w-full mb-6"
                onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=Enterprise%20Inquiry'}
              >
                Contact Sales
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Everything in Growth</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Dedicated success manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>SLA guarantees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>White-label options</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Ready to Transform Your Team Coordination?
          </h2>
          <p className="text-xl text-foreground mb-8">
            Schedule a demo to see how Chravel Pro can reduce your operational costs
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = 'mailto:christian@chravelapp.com?subject=Schedule%20Demo'}
              className="text-lg px-8"
            >
              <Phone size={20} className="mr-2" />
              Schedule a Demo
            </Button>
            <Button 
              size="lg"
              variant="outline"
              asChild
            >
              <Link to="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
