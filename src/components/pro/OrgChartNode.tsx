import React from 'react';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { OrgChartNode as OrgChartNodeType } from '../../hooks/useOrgChartData';
import { getRoleColorClass } from '../../utils/roleUtils';
import { ProTripCategory } from '../../types/proCategories';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '../../utils/avatarUtils';

interface OrgChartNodeProps {
  node: OrgChartNodeType;
  category: ProTripCategory;
  onNodeClick?: (nodeId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const OrgChartNodeComponent = ({
  node,
  category,
  onNodeClick,
  isExpanded = true,
  onToggleExpand
}: OrgChartNodeProps) => {
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className="bg-white/5 border border-gray-700 rounded-lg p-3 min-w-[200px] hover:bg-white/10 transition-colors cursor-pointer"
        onClick={() => onNodeClick?.(node.id)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-gray-600 flex-shrink-0">
            <AvatarImage src={node.avatar} alt={node.name} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
              {getInitials(node.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm truncate">{node.name}</h3>
            <span className={`${getRoleColorClass(node.role, category)} px-2 py-0.5 rounded text-xs font-medium inline-block mt-1`}>
              {node.role}
            </span>
          </div>
          {hasChildren && onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
          )}
        </div>
        {hasChildren && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={12} />
              <span>{node.directReportCount} direct report{node.directReportCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="relative mt-4">
          {/* Vertical line from parent */}
          <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-gray-600 -translate-x-1/2 -translate-y-4" />
          
          <div className="flex gap-4 relative">
            {/* Horizontal line connecting children */}
            {node.children.length > 1 && (
              <div
                className="absolute top-0 left-0 right-0 h-0.5 bg-gray-600"
                style={{
                  top: '-16px',
                  left: 'calc(50% - ' + (node.children.length * 100) + 'px)',
                  right: 'calc(50% - ' + (node.children.length * 100) + 'px)'
                }}
              />
            )}
            
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line to child */}
                <div className="w-0.5 h-4 bg-gray-600 mb-0" />
                <OrgChartNodeComponent
                  node={child}
                  category={category}
                  onNodeClick={onNodeClick}
                  isExpanded={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

