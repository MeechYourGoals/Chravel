import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganization } from '@/hooks/useOrganization';
import { MobileOrganizationCard } from '@/components/mobile/MobileOrganizationCard';
import { CreateOrganizationModal } from '@/components/enterprise/CreateOrganizationModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const MobileEnterpriseHub = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { organizations, loading, fetchUserOrganizations } = useOrganization();

  React.useEffect(() => {
    fetchUserOrganizations();
  }, []);

  if (!isMobile) {
    navigate('/organizations');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Organizations</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Create Organization Button */}
        <Button onClick={() => setShowCreateModal(true)} className="w-full h-14 gap-2 text-base">
          <Plus className="w-5 h-5" />
          Create Organization
        </Button>

        {/* Organizations List */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Organizations</h3>
            <p className="text-muted-foreground">Create your first organization to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map(org => (
              <MobileOrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateOrganizationModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
};
