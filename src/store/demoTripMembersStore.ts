import { create } from 'zustand';

interface TripParticipant {
  id: number | string;
  name: string;
  avatar?: string;
  role?: string;
  email?: string;
}

interface DemoTripMembersState {
  // Map of tripId -> additional members added at runtime
  addedMembers: Record<string, TripParticipant[]>;
  
  // Add a member to a trip (when approved)
  addMember: (tripId: string, member: TripParticipant) => void;
  
  // Remove a member from a trip
  removeMember: (tripId: string, memberId: string | number) => void;
  
  // Get added members for a trip
  getAddedMembers: (tripId: string) => TripParticipant[];
  
  // Clear all added members (on logout/mode change)
  clearAll: () => void;
}

export const useDemoTripMembersStore = create<DemoTripMembersState>((set, get) => ({
  addedMembers: {},
  
  addMember: (tripId: string, member: TripParticipant) => {
    set((state) => {
      const currentMembers = state.addedMembers[tripId] || [];
      // Avoid duplicates
      if (currentMembers.some(m => m.id === member.id)) {
        return state;
      }
      return {
        addedMembers: {
          ...state.addedMembers,
          [tripId]: [...currentMembers, member]
        }
      };
    });
  },
  
  removeMember: (tripId: string, memberId: string | number) => {
    set((state) => {
      const currentMembers = state.addedMembers[tripId] || [];
      return {
        addedMembers: {
          ...state.addedMembers,
          [tripId]: currentMembers.filter(m => m.id !== memberId)
        }
      };
    });
  },
  
  getAddedMembers: (tripId: string) => {
    return get().addedMembers[tripId] || [];
  },
  
  clearAll: () => {
    set({ addedMembers: {} });
  }
}));
