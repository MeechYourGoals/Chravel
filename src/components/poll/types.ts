export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters?: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVote?: string | string[]; // Can be array for multiple choice
  status?: 'active' | 'closed';
  createdAt?: string;
  createdBy?: string;
  allow_multiple?: boolean;
  is_anonymous?: boolean;
  allow_vote_change?: boolean;
  deadline_at?: string;
  closed_at?: string;
  closed_by?: string;
}
