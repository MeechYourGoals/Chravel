export type TripCategory =
  | 'Sports – Pro, Collegiate, Youth'
  | 'Tour – Music, Comedy, etc.'
  | 'Business Travel'
  | 'School Trip'
  | 'Content'
  | 'Other';

export interface EnterpriseSettingsState {
  tripCategory: TripCategory;
  organizationId: string;
  userId: string;
}

export interface GameScheduleItem {
  id: string;
  opponent: string;
  venue: string;
  venueAddress: string;
  gameDate: string;
  gameTime: string;
  loadInTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  isHome: boolean;
}

export interface ShowScheduleItem {
  id: string;
  title: string;
  venue: string;
  venueAddress: string;
  showDate: string;
  showTime: string;
  soundCheckTime: string;
  loadInTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

export interface CredentialZone {
  id: string;
  name: string;
  description: string;
  accessLevel: 'public' | 'restricted' | 'vip' | 'staff-only';
}

export interface SettlementData {
  guaranteeFee: number;
  backendPercentage: number;
  merchandiseRevenue: number;
  ticketRevenue: number;
  expenses: number;
  finalPayout: number;
}

export interface SponsorDeliverable {
  id: string;
  sponsorName: string;
  deliverable: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  assignedTo: string;
}

export interface ComplianceRule {
  id: string;
  category: 'NCAA' | 'Union' | 'Safety' | 'Legal' | 'Insurance';
  title: string;
  description: string;
  deadline?: string;
  status: 'compliant' | 'warning' | 'violation';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ScoutingProspect {
  id: string;
  name: string;
  position: string;
  school: string;
  grade: string;
  contactInfo: string;
  notes: string;
  rating: number;
}

export interface WellnessEntry {
  id: string;
  participantId: string;
  date: string;
  type: 'injury' | 'illness' | 'treatment' | 'checkup';
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'active' | 'resolved';
  private: boolean;
}

export interface RosterMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: 'invited' | 'pending' | 'active' | 'declined';
  invitationSent: boolean;
  invitedAt?: string;
  joinedAt?: string;
  contactMethod: 'email' | 'phone' | 'both';
}

export interface BulkUploadData {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  contactMethod: 'email' | 'phone' | 'both';
}

export interface InvitationBatch {
  members: string[];
  message?: string;
  priority: 'normal' | 'urgent';
}
