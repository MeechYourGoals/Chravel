import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, Users, ChevronRight } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateOrganizationModal } from '@/components/enterprise/CreateOrganizationModal';
import { SUBSCRIPTION_TIERS } from '@/types/pro';

export const OrganizationsHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, loading, fetchUserOrganizations } = useOrganization();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUserOrganizations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-glass-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">My Organizations</h1>
              <p className="text-gray-400 mt-1">Manage your teams and Pro subscriptions</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-glass-orange hover:bg-glass-orange/80"
            >
              <Plus size={16} className="mr-2" />
              Create Organization
            </Button>
          </div>
        </div>

        {/* Organizations Grid */}
        {organizations.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Building size={64} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Organizations Yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first organization to start collaborating with your team
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-glass-orange hover:bg-glass-orange/80"
              >
                <Plus size={16} className="mr-2" />
                Create Your First Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(org => {
              const tierInfo = SUBSCRIPTION_TIERS[org.subscription_tier];
              const seatUsage = (org.seats_used / org.seat_limit) * 100;

              return (
                <Card
                  key={org.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={() => navigate(`/organization/${org.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
                          <Building size={24} className="text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white group-hover:text-glass-orange transition-colors">
                            {org.display_name}
                          </CardTitle>
                          <p className="text-sm text-gray-400">{org.name}</p>
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-gray-500 group-hover:text-glass-orange transition-colors"
                      />
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Subscription Tier */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="text-sm text-gray-400">Subscription</div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {tierInfo.name}
                          {org.subscription_tier === 'enterprise-plus' && (
                            <span className="sr-only">Enterprise Plus</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Status</div>
                        <div
                          className={`text-sm font-medium ${
                            org.subscription_status === 'active'
                              ? 'text-green-400'
                              : org.subscription_status === 'trial'
                                ? 'text-blue-400'
                                : 'text-yellow-400'
                          }`}
                        >
                          {org.subscription_status.charAt(0).toUpperCase() +
                            org.subscription_status.slice(1)}
                        </div>
                      </div>
                    </div>

                    {/* Seat Usage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Seat Usage</span>
                        <span className="text-white font-medium">
                          {org.seats_used}/{org.seat_limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-glass-orange h-2 rounded-full transition-all"
                          style={{ width: `${seatUsage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users size={12} />
                        <span>{org.seat_limit - org.seats_used} seats available</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/10"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/organization/${org.id}`);
                        }}
                      >
                        <Users size={14} className="mr-1" />
                        Team
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/10"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/organization/${org.id}?tab=settings`);
                        }}
                      >
                        Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CreateOrganizationModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      </div>
    </div>
  );
};
