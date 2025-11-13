
import React from 'react';
import { CalendarIcon, DollarSign, Shield, FileCheck, Award } from 'lucide-react';
import { TripTabs } from '../TripTabs';
import { PlacesSection } from '../PlacesSection';
import { CommentsWall } from '../CommentsWall';
import { TripChat } from '../TripChat';
import { AIConciergeChat } from '../AIConciergeChat';
import { GroupCalendar } from '../GroupCalendar';
import { UnifiedMediaHub } from '../UnifiedMediaHub';
import { PaymentsTab } from '../payments/PaymentsTab';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';

import { TeamTab } from './TeamTab';
import { TripTasksTab } from '../todo/TripTasksTab';

import { ProTripData } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { isReadOnlyTab, hasTabAccess } from './ProTabsConfig';
import { useAuth } from '../../hooks/useAuth';

interface ProTabContentProps {
  activeTab: string;
  tripId: string;
  basecamp: { name: string; address: string };
  tripData: ProTripData;
  category: ProTripCategory;
  onUpdateRoomAssignments: (assignments: any[]) => void;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
}

export const ProTabContent = ({
  activeTab,
  tripId,
  basecamp,
  tripData,
  category,
  onUpdateRoomAssignments,
  onUpdateMemberRole
}: ProTabContentProps) => {
  const { user } = useAuth();
  
  const userRole = user?.proRole || 'staff';
  const userPermissions = user?.permissions || ['read'];
  
  // Check if user has access to the current tab
  if (!hasTabAccess(activeTab, userRole, userPermissions)) {
    return (
      <div className="space-y-6">
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-400 mb-2">Access Denied</h3>
          <p className="text-red-300">You don't have permission to access this section.</p>
          <p className="text-red-300/80 text-sm mt-2">Current role: {userRole}</p>
        </div>
      </div>
    );
  }

  const isReadOnly = isReadOnlyTab(activeTab, userRole, userPermissions);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <FeatureErrorBoundary featureName="Trip Chat">
            <TripChat
              enableGroupChat={true}
              showBroadcasts={true}
              tripId={tripId}
              isPro={true}
              userRole={userRole}
              participants={(tripData.participants || []).map(p => ({
                id: String(p.id),
                name: p.name,
                role: p.role
              }))}
            />
          </FeatureErrorBoundary>
        );
      case 'calendar':
        return (
          <FeatureErrorBoundary featureName="Calendar & Events">
            <GroupCalendar tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'tasks':
        return (
          <FeatureErrorBoundary featureName="Tasks & Todo">
            <TripTasksTab tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'polls':
        return (
          <FeatureErrorBoundary featureName="Polls & Comments">
            <CommentsWall tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'media':
        return (
          <FeatureErrorBoundary featureName="Media Hub">
            <UnifiedMediaHub tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'payments':
        return (
          <FeatureErrorBoundary featureName="Payments & Expenses">
            <PaymentsTab tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'places':
        return (
          <FeatureErrorBoundary featureName="Places & Map">
            <PlacesSection />
          </FeatureErrorBoundary>
        );
      case 'team':
        return (
          <FeatureErrorBoundary featureName="Team Management">
            <TeamTab
              roster={tripData.roster || []}
              userRole={userRole}
              isReadOnly={isReadOnly}
              category={category}
              tripId={tripId}
              onUpdateMemberRole={onUpdateMemberRole}
            />
          </FeatureErrorBoundary>
        );
      case 'finance':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Financial Management</h3>
              {isReadOnly && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm">Read-only access for your role</p>
                </div>
              )}
              <div className="text-center py-12">
                <DollarSign size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Per-diem & Settlement</h3>
                <p className="text-gray-500 text-sm">Per-diem automation and settlement tracking coming soon</p>
              </div>
            </div>
          </div>
        );
      case 'medical':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Medical & Wellness</h3>
              {isReadOnly && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm">Read-only access for your role</p>
                </div>
              )}
              <div className="text-center py-12">
                <Shield size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Health Monitoring</h3>
                <p className="text-gray-500 text-sm">Injury status tracking and compliance monitoring coming soon</p>
              </div>
            </div>
          </div>
        );
      case 'compliance':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Compliance Management</h3>
              {isReadOnly && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm">Read-only access for your role</p>
                </div>
              )}
              <div className="text-center py-12">
                <FileCheck size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Regulatory Compliance</h3>
                <p className="text-gray-500 text-sm">Visa, union, and safety compliance tracking coming soon</p>
              </div>
            </div>
          </div>
        );
      case 'sponsors':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Sponsor Management</h3>
              {isReadOnly && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm">Read-only access for your role</p>
                </div>
              )}
              <div className="text-center py-12">
                <Award size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Partnership Tracking</h3>
                <p className="text-gray-500 text-sm">Activation checklists and deliverable tracking coming soon</p>
              </div>
            </div>
          </div>
        );
      case 'ai-chat':
        return (
          <AIConciergeChat 
            tripId={tripId}
            basecamp={basecamp}
          />
        );
      default:
        return <TripTabs activeTab="chat" onTabChange={() => {}} tripId={tripId} />;
    }
  };

  return (
    <div className="h-[calc(100vh-320px)] max-h-[1000px] min-h-[500px] overflow-y-auto flex flex-col">
      {renderTabContent()}
    </div>
  );
};
