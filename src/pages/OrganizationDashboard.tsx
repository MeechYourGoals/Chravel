import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, Users, Briefcase, Settings, UserPlus, ChevronLeft } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InviteMemberModal } from '@/components/enterprise/InviteMemberModal';
import { OrganizationSection } from '@/components/enterprise/OrganizationSection';
import { SeatManagement } from '@/components/enterprise/SeatManagement';
import { BillingSection } from '@/components/enterprise/BillingSection';
import { MobileTeamMemberCard } from '@/components/MobileTeamMemberCard';
import { SUBSCRIPTION_TIERS } from '@/types/pro';
import { useToast } from '@/hooks/use-toast';

export const OrganizationDashboard = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    organizations,
    currentOrg,
    members,
    loading,
    fetchOrgMembers,
    updateMemberRole,
    removeMember,
    setCurrentOrg,
    fetchUserOrganizations,
    updateOrganization,
  } = useOrganization();

  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [linkedTrips, setLinkedTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  useEffect(() => {
    fetchUserOrganizations();
  }, []);

  useEffect(() => {
    if (orgId) {
      fetchOrgMembers(orgId);
      fetchLinkedTrips(orgId);
      const org = organizations.find(o => o.id === orgId);
      if (org) {
        setCurrentOrg(org);
      }
    }
  }, [orgId, organizations]);

  const fetchLinkedTrips = async (organizationId: string) => {
    try {
      setLoadingTrips(true);
      const { data, error } = await supabase
        .from('pro_trip_organizations')
        .select(
          `
          trip_id,
          trips:trip_id (
            id,
            name,
            description,
            destination,
            start_date,
            end_date,
            trip_type,
            cover_image_url
          )
        `,
        )
        .eq('organization_id', organizationId);

      if (error) throw error;

      const trips = data?.map(item => item.trips).filter(Boolean) || [];
      setLinkedTrips(trips);
    } catch (error) {
      console.error('Error fetching linked trips:', error);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    const { error } = await updateMemberRole(memberId, newRole as 'admin' | 'member');
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member role updated',
      });
      if (orgId) fetchOrgMembers(orgId);
    }
  };

  const handleRemove = async (memberId: string) => {
    const { error } = await removeMember(memberId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member removed from organization',
      });
      if (orgId) fetchOrgMembers(orgId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-glass-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Building size={64} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Organization Not Found</h2>
          <p className="text-gray-400 mb-6">
            This organization doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate('/organizations')}>View My Organizations</Button>
        </div>
      </div>
    );
  }

  const userMember = members.find(m => m.user_id === user?.id);
  const isAdmin = userMember?.role === 'admin' || userMember?.role === 'owner';

  const tierInfo = SUBSCRIPTION_TIERS[currentOrg.subscription_tier];
  const seatUsage = (currentOrg.seats_used / currentOrg.seat_limit) * 100;

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        {/* Mobile Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/organizations')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ChevronLeft size={20} />
            Back to Organizations
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
              <Building size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{currentOrg.display_name}</h1>
              <p className="text-sm text-gray-400">{tierInfo.name}</p>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-white">{members.length}</div>
                <div className="text-xs text-gray-400">Team Members</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-400">
                  {currentOrg.seat_limit - currentOrg.seats_used}
                </div>
                <div className="text-xs text-gray-400">Available Seats</div>
              </CardContent>
            </Card>
          </div>

          {isAdmin && (
            <Button
              onClick={() => setShowInviteModal(true)}
              className="w-full bg-glass-orange hover:bg-glass-orange/80"
            >
              <UserPlus size={16} className="mr-2" />
              Invite Team Member
            </Button>
          )}
        </div>

        {/* Mobile Team List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Team Members</h3>
          {members.map(member => (
            <MobileTeamMemberCard
              key={member.id}
              member={{
                id: member.user_id || member.id,
                name: member.user_id || 'Pending',
                role: member.role.charAt(0).toUpperCase() + member.role.slice(1),
                avatar: '',
                status: member.status as 'active' | 'pending',
              }}
              onChangeRole={
                isAdmin ? newRole => handleChangeRole(member.id, newRole.toLowerCase()) : undefined
              }
              onRemove={isAdmin ? () => handleRemove(member.id) : undefined}
              isCurrentUser={member.user_id === user?.id}
            />
          ))}
        </div>

        <InviteMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          organizationId={orgId!}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Desktop Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/organizations')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ChevronLeft size={20} />
            Back to Organizations
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
                <Building size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{currentOrg.display_name}</h1>
                <p className="text-gray-400">{currentOrg.name}</p>
              </div>
            </div>

            {isAdmin && (
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-glass-orange hover:bg-glass-orange/80"
              >
                <UserPlus size={16} className="mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{tierInfo.name}</div>
              <div className="text-sm text-gray-400">${tierInfo.price}/month</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{members.length}</div>
              <div className="text-sm text-gray-400">Active members</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Seat Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {currentOrg.seats_used}/{currentOrg.seat_limit}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-glass-orange h-2 rounded-full transition-all"
                  style={{ width: `${seatUsage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-sm text-gray-400">Pro trips</div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-glass-orange">
              <Building size={16} className="mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-glass-orange">
              <Users size={16} className="mr-2" />
              Team ({members.length})
            </TabsTrigger>
            <TabsTrigger value="trips" className="data-[state=active]:bg-glass-orange">
              <Briefcase size={16} className="mr-2" />
              Trips
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="data-[state=active]:bg-glass-orange">
                <Settings size={16} className="mr-2" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OrganizationSection
                organizations={[
                  {
                    id: currentOrg.id,
                    name: currentOrg.name,
                    displayName: currentOrg.display_name,
                    billingEmail: currentOrg.billing_email || '',
                    contactName: (currentOrg as { contact_name?: string })?.contact_name || '',
                    contactEmail: (currentOrg as { contact_email?: string })?.contact_email || '',
                    contactPhone: (currentOrg as { contact_phone?: string })?.contact_phone || '',
                    contactJobTitle:
                      (currentOrg as { contact_job_title?: string })?.contact_job_title || '',
                  },
                ]}
                onSave={
                  updateOrganization
                    ? async (orgId, data) => {
                        const { error: err } = await updateOrganization(orgId, {
                          name: data.name,
                          display_name: data.displayName,
                          billing_email: data.billingEmail,
                          contact_name: data.contactName || null,
                          contact_email: data.contactEmail || null,
                          contact_phone: data.contactPhone || null,
                          contact_job_title: data.contactJobTitle || null,
                        });
                        if (!err)
                          toast({ title: 'Saved', description: 'Organization settings updated.' });
                      }
                    : undefined
                }
              />
              <BillingSection
                organization={{
                  subscriptionTier: currentOrg.subscription_tier,
                  subscriptionEndsAt: currentOrg.subscription_ends_at || 'N/A',
                  seatsUsed: currentOrg.seats_used,
                  seatLimit: currentOrg.seat_limit,
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <SeatManagement />
          </TabsContent>

          <TabsContent value="trips" className="mt-6">
            {loadingTrips ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-glass-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading trips...</p>
              </div>
            ) : linkedTrips.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Briefcase size={64} className="text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Pro Trips Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first Pro trip and link it to this organization
                  </p>
                  <Button onClick={() => navigate('/')}>Create Pro Trip</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {linkedTrips.map((trip: any) => (
                  <Card
                    key={trip.id}
                    className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => navigate(`/tour/pro/${trip.id}`)}
                  >
                    {trip.cover_image_url && (
                      <div
                        className="h-32 bg-cover bg-center rounded-t-lg"
                        style={{ backgroundImage: `url(${trip.cover_image_url})` }}
                      />
                    )}
                    <CardHeader>
                      <CardTitle className="text-white group-hover:text-glass-orange transition-colors">
                        {trip.name}
                      </CardTitle>
                      <p className="text-sm text-gray-400">{trip.destination}</p>
                    </CardHeader>
                    <CardContent>
                      {trip.start_date && trip.end_date && (
                        <p className="text-xs text-gray-500">
                          {new Date(trip.start_date).toLocaleDateString()} -{' '}
                          {new Date(trip.end_date).toLocaleDateString()}
                        </p>
                      )}
                      {trip.description && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                          {trip.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="mt-6">
              <div className="space-y-6">
                <OrganizationSection
                  organizations={[
                    {
                      id: currentOrg.id,
                      name: currentOrg.name,
                      displayName: currentOrg.display_name,
                      billingEmail: currentOrg.billing_email || '',
                      contactName: (currentOrg as { contact_name?: string })?.contact_name || '',
                      contactEmail: (currentOrg as { contact_email?: string })?.contact_email || '',
                      contactPhone: (currentOrg as { contact_phone?: string })?.contact_phone || '',
                      contactJobTitle:
                        (currentOrg as { contact_job_title?: string })?.contact_job_title || '',
                    },
                  ]}
                  onSave={
                    updateOrganization
                      ? async (orgId, data) => {
                          const { error: err } = await updateOrganization(orgId, {
                            name: data.name,
                            display_name: data.displayName,
                            billing_email: data.billingEmail,
                            contact_name: data.contactName || null,
                            contact_email: data.contactEmail || null,
                            contact_phone: data.contactPhone || null,
                            contact_job_title: data.contactJobTitle || null,
                          });
                          if (!err)
                            toast({
                              title: 'Saved',
                              description: 'Organization settings updated.',
                            });
                        }
                      : undefined
                  }
                />
                <BillingSection
                  organization={{
                    subscriptionTier: currentOrg.subscription_tier,
                    subscriptionEndsAt: currentOrg.subscription_ends_at || 'N/A',
                    seatsUsed: currentOrg.seats_used,
                    seatLimit: currentOrg.seat_limit,
                  }}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>

        <InviteMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          organizationId={orgId!}
        />
      </div>
    </div>
  );
};
