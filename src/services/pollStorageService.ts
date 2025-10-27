import { getStorageItem, setStorageItem, removeStorageItem } from '@/platform/storage';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface TripPoll {
  id: string;
  trip_id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  status: 'active' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreatePollRequest {
  question: string;
  options: string[];
}

class PollStorageService {
  private getStorageKey(tripId: string): string {
    return `polls_${tripId}`;
  }

  // Get all polls for a trip
  async getPolls(tripId: string): Promise<TripPoll[]> {
    try {
      return await getStorageItem<TripPoll[]>(this.getStorageKey(tripId), []);
    } catch (error) {
      console.error('Error loading polls from storage:', error);
      return [];
    }
  }

  // Save polls for a trip
  private async savePolls(tripId: string, polls: TripPoll[]): Promise<void> {
    try {
      await setStorageItem(this.getStorageKey(tripId), polls);
    } catch (error) {
      console.error('Error saving polls to storage:', error);
    }
  }

  // Create a new poll
  async createPoll(tripId: string, pollData: CreatePollRequest): Promise<TripPoll> {
    const polls = await this.getPolls(tripId);

    const pollOptions: PollOption[] = pollData.options.map((text, index) => ({
      id: `option_${index}`,
      text,
      votes: 0,
      voters: []
    }));

    const newPoll: TripPoll = {
      id: `demo-poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trip_id: tripId,
      question: pollData.question,
      options: pollOptions,
      total_votes: 0,
      status: 'active',
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    polls.unshift(newPoll);
    await this.savePolls(tripId, polls);
    return newPoll;
  }

  // Vote on a poll
  async voteOnPoll(tripId: string, pollId: string, optionId: string, userId: string = 'demo-user'): Promise<TripPoll | null> {
    const polls = await this.getPolls(tripId);
    const pollIndex = polls.findIndex(p => p.id === pollId);

    if (pollIndex === -1) return null;

    const poll = polls[pollIndex];
    const optionIndex = poll.options.findIndex(o => o.id === optionId);

    if (optionIndex === -1) return null;

    // Remove previous vote if exists
    poll.options.forEach(option => {
      const voterIndex = option.voters.indexOf(userId);
      if (voterIndex !== -1) {
        option.voters.splice(voterIndex, 1);
        option.votes = Math.max(0, option.votes - 1);
        poll.total_votes = Math.max(0, poll.total_votes - 1);
      }
    });

    // Add new vote
    if (!poll.options[optionIndex].voters.includes(userId)) {
      poll.options[optionIndex].voters.push(userId);
      poll.options[optionIndex].votes += 1;
      poll.total_votes += 1;
    }

    poll.updated_at = new Date().toISOString();
    await this.savePolls(tripId, polls);
    return poll;
  }

  // Close a poll
  async closePoll(tripId: string, pollId: string): Promise<TripPoll | null> {
    const polls = await this.getPolls(tripId);
    const pollIndex = polls.findIndex(p => p.id === pollId);

    if (pollIndex === -1) return null;

    polls[pollIndex].status = 'closed';
    polls[pollIndex].updated_at = new Date().toISOString();

    await this.savePolls(tripId, polls);
    return polls[pollIndex];
  }

  // Delete a poll
  async deletePoll(tripId: string, pollId: string): Promise<boolean> {
    const polls = await this.getPolls(tripId);
    const filteredPolls = polls.filter(p => p.id !== pollId);

    if (filteredPolls.length !== polls.length) {
      await this.savePolls(tripId, filteredPolls);
      return true;
    }

    return false;
  }

  // Clear all polls for a trip (useful for demo reset)
  async clearPolls(tripId: string): Promise<void> {
    await removeStorageItem(this.getStorageKey(tripId));
  }

  // Clear all demo data
  async clearAllDemoPolls(): Promise<void> {
    // Note: platformStorage doesn't expose Object.keys() like localStorage
    // This will be handled by individual clearPolls calls per trip
    console.warn('Clear all demo polls not fully supported with platformStorage');
  }
}

export const pollStorageService = new PollStorageService();
