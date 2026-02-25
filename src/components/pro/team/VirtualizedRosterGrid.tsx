import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ProParticipant } from '../../../types/pro';
import { ProTripCategory } from '../../../types/proCategories';
import { AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { getInitials } from '../../../utils/avatarUtils';
import { getRoleColorClass } from '../../../utils/roleUtils';
import { QuickContactMenu } from '../QuickContactMenu';

const ROW_HEIGHT = 120;
const COLS_DESKTOP = 4;
const COLS_TABLET = 3;
const COLS_MOBILE = 1;

interface VirtualizedRosterGridProps {
  members: ProParticipant[];
  category: ProTripCategory;
  memberRolesMap: Map<string, string[]>;
  adminUserIds: Set<string>;
  isMobile: boolean;
}

export const VirtualizedRosterGrid: React.FC<VirtualizedRosterGridProps> = ({
  members,
  category,
  memberRolesMap,
  adminUserIds,
  isMobile,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const cols = isMobile ? COLS_MOBILE : COLS_DESKTOP;
  const rowCount = Math.ceil(members.length / cols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 2,
  });

  const getRolePills = (member: ProParticipant) => {
    const memberUserId = member.userId ?? member.id;
    const isAdminMember = memberUserId ? adminUserIds.has(memberUserId) : false;
    const assignedRoles = memberUserId ? memberRolesMap.get(memberUserId) || [] : [];
    const allRolePills: { name: string; isAdmin: boolean }[] = [];
    if (isAdminMember) allRolePills.push({ name: 'admin', isAdmin: true });
    const sortedRoles = [...assignedRoles].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    sortedRoles.forEach(roleName => {
      if (roleName.toLowerCase() !== 'admin') {
        allRolePills.push({ name: roleName, isAdmin: false });
      }
    });
    const showFallbackRole =
      assignedRoles.length === 0 &&
      member.role &&
      member.role !== '' &&
      member.role !== 'Member' &&
      member.role !== 'Participant' &&
      member.role.toLowerCase() !== 'admin';
    return { allRolePills, showFallbackRole };
  };

  return (
    <div ref={parentRef} className="h-[500px] overflow-auto" style={{ contain: 'strict' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const startIdx = virtualRow.index * cols;
          const rowMembers = members.slice(startIdx, startIdx + cols);
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            >
              {rowMembers.map(member => {
                const { allRolePills, showFallbackRole } = getRolePills(member);
                return (
                  <div
                    key={member.id}
                    className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="w-10 h-10 border-2 border-gray-600 flex-shrink-0">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <QuickContactMenu member={member}>
                          <h3 className="text-white text-sm font-medium truncate cursor-pointer hover:text-blue-400 transition-colors leading-tight">
                            {member.name}
                          </h3>
                        </QuickContactMenu>
                        <p className="text-gray-400 text-xs truncate leading-tight">
                          {member.email}
                        </p>
                        {member.phone && (
                          <p className="text-gray-500 text-xs truncate leading-tight">
                            {member.phone}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {allRolePills.map((pill, index) => (
                            <span
                              key={`${pill.name}-${index}`}
                              className={`${
                                pill.isAdmin
                                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                                  : getRoleColorClass(pill.name, category)
                              } px-1.5 py-0.5 rounded text-xs font-medium`}
                            >
                              {pill.name}
                            </span>
                          ))}
                          {showFallbackRole && (
                            <span
                              className={`${getRoleColorClass(member.role, category)} px-1.5 py-0.5 rounded text-xs font-medium`}
                            >
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {member.medicalNotes && (
                      <div className="mt-2 p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-400 text-xs font-medium">Medical Alert</span>
                      </div>
                    )}
                    {member.dietaryRestrictions && member.dietaryRestrictions.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-gray-400 text-xs leading-tight">
                          Dietary: {member.dietaryRestrictions.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
