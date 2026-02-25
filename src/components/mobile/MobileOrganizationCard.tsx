import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  subscription_tier: string;
  seat_limit: number;
  seats_used: number;
  subscription_status: string;
}

interface MobileOrganizationCardProps {
  organization: Organization;
}

export const MobileOrganizationCard = ({ organization }: MobileOrganizationCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'from-purple-500/20 to-pink-500/20';
      case 'pro':
        return 'from-blue-500/20 to-cyan-500/20';
      default:
        return 'from-gray-500/20 to-gray-600/20';
    }
  };

  const seatUsagePercent = (organization.seats_used / organization.seat_limit) * 100;

  return (
    <div
      onClick={() => navigate(`/organization/${organization.id}`)}
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 cursor-pointer',
        'bg-gradient-to-br',
        getTierColor(organization.subscription_tier),
        'border border-white/10 backdrop-blur-sm',
        'active:scale-98 transition-transform',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">{organization.name}</h3>
            <p className="text-sm text-muted-foreground uppercase">
              {organization.subscription_tier}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Seat Usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" />
            Team Members
          </span>
          <span className="font-medium text-foreground">
            {organization.seats_used} / {organization.seat_limit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              seatUsagePercent > 90 ? 'bg-red-500' : 'bg-primary',
            )}
            style={{ width: `${seatUsagePercent}%` }}
          />
        </div>
      </div>

      {/* Status Badge */}
      {organization.subscription_status === 'active' && (
        <div className="absolute top-4 right-4">
          <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            Active
          </div>
        </div>
      )}
    </div>
  );
};
