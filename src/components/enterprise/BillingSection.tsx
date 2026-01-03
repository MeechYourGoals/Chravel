import React, { useState } from 'react';
import { Crown, Building, Plus, AlertCircle } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '../../types/pro';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface OrganizationData {
  subscriptionTier: 'starter' | 'growing' | 'enterprise' | 'enterprise-plus';
  seatLimit: number;
  seatsUsed: number;
  subscriptionEndsAt?: string;
}

interface BillingSectionProps {
  organization: OrganizationData | null;
  onCreateOrganization?: () => void;
}

export const BillingSection = ({ organization, onCreateOrganization }: BillingSectionProps) => {
  const [expandedPlan, setExpandedPlan] = useState<string | null>('growing');

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Subscriptions</h3>

      {/* CTA Banner when no organization */}
      {!organization && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-base font-semibold text-white mb-1">No Organization Found</h4>
              <p className="text-sm text-gray-300 mb-3">
                Create an organization to subscribe to one of the plans below and unlock Enterprise
                features like team management, subscription billing, and advanced seat controls.
              </p>
              {onCreateOrganization && (
                <button
                  onClick={onCreateOrganization}
                  className="inline-flex items-center gap-2 bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus size={16} />
                  Create Organization
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Plan - Only show if organization exists */}
      {organization && (
        <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Crown size={24} className="text-green-400" />
              <div>
                <h4 className="text-xl font-bold text-white">
                  {SUBSCRIPTION_TIERS[organization.subscriptionTier].name}
                </h4>
                <p className="text-green-400">Active Subscription</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                ${SUBSCRIPTION_TIERS[organization.subscriptionTier].price}/month
              </div>
              {organization.subscriptionEndsAt && (
                <div className="text-sm text-gray-400">
                  Renews {organization.subscriptionEndsAt}
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h5 className="font-semibold text-white mb-2">Current Plan Features</h5>
              <ul className="space-y-1.5 text-sm text-gray-300">
                {SUBSCRIPTION_TIERS[organization.subscriptionTier].features.map(
                  (feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      {feature}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-2">Usage Statistics</h5>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Seats Used</span>
                    <span className="text-white">
                      {organization.seatsUsed}/{organization.seatLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{
                        width: `${Math.min((organization.seatsUsed / organization.seatLimit) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {organization.seatLimit - organization.seatsUsed} seats available
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Manage Billing
            </button>
            <button className="bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Plan Comparison - Always visible */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Available Plans</h4>
        <div className="space-y-3">
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
            const isCurrentPlan = organization?.subscriptionTier === key;
            return (
              <Collapsible
                key={key}
                open={expandedPlan === key}
                onOpenChange={() => setExpandedPlan(expandedPlan === key ? null : key)}
              >
                <CollapsibleTrigger className="w-full">
                  <div
                    className={`border rounded-lg p-3 transition-colors hover:bg-white/5 ${
                      isCurrentPlan
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h5 className="font-semibold text-white">{tier.name}</h5>
                        <div className="text-xl font-bold text-white">${tier.price}/month</div>
                        <div className="text-sm text-gray-400">Up to {tier.seatLimit} seats</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentPlan && (
                          <div className="text-sm text-green-400 font-medium">Current Plan</div>
                        )}
                        <div className="text-gray-400">{expandedPlan === key ? '−' : '+'}</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-white/5 rounded-lg p-3 ml-4">
                    <h6 className="font-medium text-white mb-2">Features Included:</h6>
                    <ul className="space-y-1.5 text-sm text-gray-300">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {!organization ? (
                      <button
                        onClick={onCreateOrganization}
                        className="mt-4 bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Create Organization to Subscribe
                      </button>
                    ) : !isCurrentPlan ? (
                      <button className="mt-4 bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        Upgrade to {tier.name}
                      </button>
                    ) : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
};
