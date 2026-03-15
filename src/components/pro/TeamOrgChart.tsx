import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '../ui/button';
import { ZoomIn, ZoomOut, Maximize2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { useOrgChartData } from '../../hooks/useOrgChartData';
import { OrgChartNodeComponent } from './OrgChartNode';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '../../utils/avatarUtils';
import { getRoleColorClass } from '../../utils/roleUtils';

interface TeamOrgChartProps {
  roster: ProParticipant[];
  category: ProTripCategory;
  onMemberClick?: (memberId: string) => void;
}

const ITEMS_PER_PAGE = 20;

export const TeamOrgChart = ({ roster, category, onMemberClick }: TeamOrgChartProps) => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const { rootNodes, totalLevels } = useOrgChartData(roster);

  // Flat layout when all members are root nodes (no reporting relationships)
  const isFlat = rootNodes.length === roster.length && totalLevels <= 1;

  // Reset pagination when roster changes (e.g., filter applied, members removed)
  useEffect(() => {
    setCurrentPage(0);
  }, [roster.length]);

  const totalPages = Math.ceil(roster.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    if (!isFlat) return [];
    const start = currentPage * ITEMS_PER_PAGE;
    return roster.slice(start, start + ITEMS_PER_PAGE);
  }, [isFlat, roster, currentPage]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const handleExportChart = () => {
    const chartEl = document.querySelector('[data-org-chart-container]');
    if (chartEl) {
      html2canvas(chartEl as HTMLElement)
        .then(canvas => {
          const link = document.createElement('a');
          link.download = 'org-chart.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        })
        .catch(() => window.print());
    } else {
      window.print();
    }
  };

  if (rootNodes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white/5 rounded-lg p-8 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-white mb-2">No Members</h3>
          <p className="text-muted-foreground text-sm">
            Team members will appear here once added to the trip.
          </p>
        </div>
      </div>
    );
  }

  // Flat layout — horizontal wrapped cards, no tree connectors
  if (isFlat) {
    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
          <span className="text-sm text-muted-foreground">
            {roster.length} Member{roster.length !== 1 ? 's' : ''}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                className="border-white/10 h-8 w-8 p-0"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                className="border-white/10 h-8 w-8 p-0"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Flat card grid */}
        <div data-org-chart-container className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {paginatedMembers.map(member => (
              <div
                key={member.id}
                className="bg-white/5 border border-white/10 rounded-lg p-3 min-w-[200px] max-w-[240px] hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => onMemberClick?.(member.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-white/10 flex-shrink-0">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm truncate">{member.name}</h3>
                    {member.role && member.role !== 'Member' && member.role !== 'Participant' && (
                      <span
                        className={`${getRoleColorClass(member.role, category)} px-2 py-0.5 rounded text-xs font-medium inline-block mt-1`}
                      >
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Hierarchical layout — tree with connectors
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
        <span className="text-sm text-muted-foreground">
          {totalLevels} Level{totalLevels !== 1 ? 's' : ''} &bull; {roster.length} Member
          {roster.length !== 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleZoomOut}
            variant="outline"
            size="sm"
            disabled={zoom <= 50}
            className="border-white/10"
          >
            <ZoomOut size={16} />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">{zoom}%</span>
          <Button
            onClick={handleZoomIn}
            variant="outline"
            size="sm"
            disabled={zoom >= 150}
            className="border-white/10"
          >
            <ZoomIn size={16} />
          </Button>
          <Button onClick={handleResetZoom} variant="outline" size="sm" className="border-white/10">
            <Maximize2 size={16} />
          </Button>
          <Button
            onClick={handleExportChart}
            variant="outline"
            size="sm"
            className="border-white/10"
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Org Chart Container */}
      <div
        data-org-chart-container
        className="bg-white/5 border border-white/10 rounded-lg p-8 overflow-auto"
      >
        <div
          className="flex flex-col items-center justify-start transition-transform"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {rootNodes.map((node, index) => (
            <div key={node.id} className={index > 0 ? 'mt-8' : ''}>
              <OrgChartNodeComponent
                node={node}
                category={category}
                onNodeClick={onMemberClick}
                isExpanded={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
