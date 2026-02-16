import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '../ui/button';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { useOrgChartData } from '../../hooks/useOrgChartData';
import { OrgChartNodeComponent } from './OrgChartNode';

interface TeamOrgChartProps {
  roster: ProParticipant[];
  category: ProTripCategory;
  onMemberClick?: (memberId: string) => void;
}

export const TeamOrgChart = ({
  roster,
  category,
  onMemberClick
}: TeamOrgChartProps) => {
  const [zoom, setZoom] = useState(100);
  const { rootNodes, totalLevels } = useOrgChartData(roster);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

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
          <h3 className="text-lg font-medium text-white mb-2">No Hierarchy Defined</h3>
          <p className="text-gray-400 text-sm mb-4">
            To create an org chart, team members need to be assigned reporting relationships.
            Use Grid View to manage your team in the meantime.
          </p>
          <p className="text-gray-500 text-xs">
            For now, use Grid View to see all team members and their roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white/5 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {totalLevels} Level{totalLevels !== 1 ? 's' : ''} • {roster.length} Member{roster.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleZoomOut}
            variant="outline"
            size="sm"
            disabled={zoom <= 50}
            className="border-gray-600"
          >
            <ZoomOut size={16} />
          </Button>
          <span className="text-sm text-gray-400 min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            onClick={handleZoomIn}
            variant="outline"
            size="sm"
            disabled={zoom >= 150}
            className="border-gray-600"
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            onClick={handleResetZoom}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Maximize2 size={16} />
          </Button>
          <Button
            onClick={handleExportChart}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Org Chart Container */}
      <div data-org-chart-container className="bg-white/5 border border-gray-700 rounded-lg p-8 overflow-auto min-h-[500px]">
        <div
          className="flex flex-col items-center justify-start transition-transform"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center'
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

      {/* Legend */}
      <div className="bg-white/5 border border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-400 mb-2">Tips:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Click on any member to view their details</li>
          <li>• Use zoom controls to adjust the view</li>
          <li>• Hierarchy levels are auto-calculated based on reporting structure</li>
          <li>• Use Grid View to manage member roles and reporting structure</li>
        </ul>
      </div>
    </div>
  );
};

