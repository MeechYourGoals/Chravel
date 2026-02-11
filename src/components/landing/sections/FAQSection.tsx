import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronDown } from 'lucide-react';

const faqItems = [
  {
    question: 'Who is ChravelApp for?',
    answer:
      'Anybody organizing a group that wants to simplify sharing information: Work, Personal, Sports, Tours, Conferences, Vacations, Travel, or even local events.',
  },
  {
    question: 'Why not just use the apps I already have?',
    answer:
      "Unlike your current stack where texts don't know what's in your emails, and your spreadsheet doesn't know what's in your group chat—ChravelApp's 8 tabs are fully interconnected. Your AI concierge can search your calendar, polls, and outstanding tasks, and more. One context-aware trip brain instead of 8 disconnected apps.",
  },
  {
    question: 'What happens when I hit my 3-trip limit?',
    answer:
      "You'll need to delete an old trip to create a new one. Or upgrade to Explorer to keep unlimited trips!",
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
      'Trips are free with limited features. Or upgrade to Explorer or Pro to keep unlimited trips and more features. For ChravelApp Pro, only the admin pays and can assign a set number of seats to team members — ideal for organizations, sports teams, and tour management.',
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
];
export const FAQSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="container mx-auto px-4 py-8 tablet:py-16 flex flex-col items-center justify-start tablet:justify-center min-h-0 tablet:min-h-screen space-y-8 tablet:space-y-12">
      {/* Header with bold white text and shadow for contrast */}
      <div className="text-center space-y-4 max-w-4xl">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Frequently Asked Questions
        </h2>
        <p
          className="text-xl sm:text-2xl md:text-3xl text-white font-bold"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          Everything you need to know about ChravelApp
        </p>
      </div>

      {/* FAQ Items */}
      <div className="w-full max-w-3xl space-y-4">
        {faqItems.map((item, index) => (
          <Collapsible
            key={index}
            open={openFaq === index}
            onOpenChange={open => setOpenFaq(open ? index : null)}
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300">
              <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-card/30 transition-colors">
                <span className="font-semibold text-lg tablet:text-xl text-foreground pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-primary transition-transform duration-200 flex-shrink-0 ${
                    openFaq === index ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-4 pt-2 text-base tablet:text-lg text-foreground leading-relaxed">
                  {item.answer}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};
