import { ProTripData } from '../types/pro';

export interface ProcessedTeamMembers {
  visible: ProTripData['participants'];
  overflow: number;
}

export interface ProcessedRoles {
  visible: string[];
  overflow: number;
}

export const processTeamMembers = (
  participants: ProTripData['participants'],
  maxVisible: number = 5,
): ProcessedTeamMembers => {
  return {
    visible: participants.slice(0, maxVisible),
    overflow: Math.max(0, participants.length - maxVisible),
  };
};

export const processRoles = (
  participants: ProTripData['participants'],
  maxVisible: number = 5,
): ProcessedRoles => {
  const uniqueRoles = [...new Set(participants.map(p => p.role))];
  return {
    visible: uniqueRoles.slice(0, maxVisible),
    overflow: Math.max(0, uniqueRoles.length - maxVisible),
  };
};
