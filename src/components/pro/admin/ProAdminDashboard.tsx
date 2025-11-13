import React, { useState } from 'react';
import { AdminManager } from './AdminManager';
import { RoleManager } from './RoleManager';
import { RoleAssignmentPanel } from './RoleAssignmentPanel';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, UserCheck, Clock } from 'lucide-react';

interface ProAdminDashboardProps {
  tripId: string;
  tripCreatorId: string;
  isAdmin: boolean;
}

export const ProAdminDashboard: React.FC<ProAdminDashboardProps> = ({
  tripId,
  tripCreatorId,
  isAdmin
}) => {
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Admin Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage admins, roles, permissions, and join requests for this Pro trip
          </p>
        </div>

        <Tabs defaultValue="admins" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-full bg-white/5 p-1">
            <TabsTrigger 
              value="admins" 
              className="rounded-full data-[state=active]:bg-blue-600"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admins
            </TabsTrigger>
            <TabsTrigger 
              value="roles"
              className="rounded-full data-[state=active]:bg-purple-600"
            >
              <Users className="w-4 h-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger 
              value="assignments"
              className="rounded-full data-[state=active]:bg-green-600"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="rounded-full data-[state=active]:bg-orange-600"
            >
              <Clock className="w-4 h-4 mr-2" />
              Requests
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="admins" className="mt-0">
              <AdminManager tripId={tripId} tripCreatorId={tripCreatorId} />
            </TabsContent>

            <TabsContent value="roles" className="mt-0">
              <RoleManager tripId={tripId} />
            </TabsContent>

            <TabsContent value="assignments" className="mt-0">
              <RoleAssignmentPanel tripId={tripId} />
            </TabsContent>

            <TabsContent value="requests" className="mt-0">
              <JoinRequestsPanel tripId={tripId} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};
