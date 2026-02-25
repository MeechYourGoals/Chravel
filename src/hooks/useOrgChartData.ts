import { useMemo } from 'react';
import { ProParticipant } from '../types/pro';

export interface OrgChartNode {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
  level: number;
  children: OrgChartNode[];
  parent?: string;
  directReportCount: number;
}

export const useOrgChartData = (roster: ProParticipant[]) => {
  const orgChartData = useMemo(() => {
    // Build hierarchy tree
    const nodeMap = new Map<string, OrgChartNode>();
    const rootNodes: OrgChartNode[] = [];

    // First pass: Create all nodes
    roster.forEach(member => {
      nodeMap.set(member.id, {
        id: member.id,
        name: member.name,
        role: member.role,
        avatar: member.avatar,
        email: member.email,
        level: member.hierarchyLevel || 0,
        children: [],
        parent: member.reportsTo,
        directReportCount: member.directReports?.length || 0,
      });
    });

    // Second pass: Build tree structure
    nodeMap.forEach(node => {
      if (node.parent && nodeMap.has(node.parent)) {
        const parentNode = nodeMap.get(node.parent)!;
        parentNode.children.push(node);
      } else {
        // No parent = root node
        rootNodes.push(node);
      }
    });

    // Sort children by role alphabetically
    const sortChildren = (nodes: OrgChartNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          node.children.sort((a, b) => a.role.localeCompare(b.role));
          sortChildren(node.children);
        }
      });
    };
    sortChildren(rootNodes);

    return {
      nodes: Array.from(nodeMap.values()),
      rootNodes: rootNodes.sort((a, b) => a.level - b.level),
      totalLevels: Math.max(...Array.from(nodeMap.values()).map(n => n.level), 0) + 1,
    };
  }, [roster]);

  const updateHierarchy = (nodeId: string, newParentId: string | null) => {
    // This would trigger a Supabase update
    // Implementation would update the pro_participants table
  };

  const getNodePath = (nodeId: string): OrgChartNode[] => {
    const path: OrgChartNode[] = [];
    let current = orgChartData.nodes.find(n => n.id === nodeId);

    while (current) {
      path.unshift(current);
      current = current.parent ? orgChartData.nodes.find(n => n.id === current!.parent) : undefined;
    }

    return path;
  };

  return {
    ...orgChartData,
    updateHierarchy,
    getNodePath,
  };
};
