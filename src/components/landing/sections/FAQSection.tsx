import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';

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

export const FAQSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col items-center justify-center min-h-screen space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl text-foreground">
          Everything you need to know about Chravel
        </p>
      </div>

      {/* FAQ Items */}
      <div className="w-full max-w-3xl space-y-4">
        {faqItems.map((item, index) => (
          <Collapsible
            key={index}
            open={openFaq === index}
            onOpenChange={(open) => setOpenFaq(open ? index : null)}
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300">
              <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-card/30 transition-colors">
                <span className="font-semibold text-lg md:text-xl text-foreground pr-4">
                  {item.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-primary transition-transform duration-200 flex-shrink-0 ${
                    openFaq === index ? 'rotate-180' : ''
                  }`} 
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-4 pt-2 text-base md:text-lg text-foreground leading-relaxed">
                  {item.answer}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Bottom CTA */}
      <p className="text-lg sm:text-xl text-foreground text-center max-w-2xl">
        Still have questions? <a href="mailto:support@chravelapp.com" className="text-primary hover:text-primary/80 underline">Contact us</a>
      </p>
    </div>
  );
};
