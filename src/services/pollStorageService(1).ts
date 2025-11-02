import { platformStorage } from '@/platform/storage';

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

class PollStorageService {
  private getStorageKey(tripId: string): string {
    return `polls_${tripId}`;
  }

  // Get all polls for a trip
  async getPolls(tripId: string): Promise<TripPoll[]> {
    try {
      const data = await platformStorage.getItem(this.getStorageKey(tripId));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading polls from storage:', error);
      return [];
    }
  }

  // Save polls to storage
  private async savePolls(tripId: string, polls: TripPoll[]): Promise<void> {
    try {
      await platformStorage.setItem(this.getStorageKey(tripId), JSON.stringify(polls));
    } catch (error) {
      console.error('Error saving polls to storage:', error);
    }
  }

  // Create a new poll
  async createPoll(tripId: string, question: string, options: string[]): Promise<TripPoll> {
    const polls = await this.getPolls(tripId);
    
    const newPoll: TripPoll = {
      id: `demo-poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trip_id: tripId,
      question: question.trim(),
      options: options.map((text, index) => ({
        id: `option_${index}`,
        text: text.trim(),
        votes: 0,
        voters: []
      })),
      total_votes: 0,
      status: 'active',
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    polls.unshift(newPoll); // Add to beginning
    await this.savePolls(tripId, polls);
    return newPoll;
  }

  // Vote on a poll
  async votePoll(tripId: string, pollId: string, optionId: string, userId: string = 'demo-user'): Promise<TripPoll | null> {
    const polls = await this.getPolls(tripId);
    const pollIndex = polls.findIndex(p => p.id === pollId);
    
    if (pollIndex === -1) {
      console.error('Poll not found:', pollId);
      return null;
    }

    const poll = polls[pollIndex];
    
    // Check if user already voted
    const hasVoted = poll.options.some(option => option.voters.includes(userId));
    if (hasVoted) {
      // Remove previous vote
      poll.options.forEach(option => {
        option.voters = option.voters.filter(v => v !== userId);
        if (option.voters.length < option.votes) {
          option.votes = option.voters.length;
        }
      });
      poll.total_votes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    }

    // Add new vote
    const optionIndex = poll.options.findIndex(o => o.id === optionId);
    if (optionIndex !== -1) {
      poll.options[optionIndex].votes++;
      poll.options[optionIndex].voters.push(userId);
      poll.total_votes++;
      poll.updated_at = new Date().toISOString();
    }

    polls[pollIndex] = poll;
    await this.savePolls(tripId, polls);
    return poll;
  }

  // Close a poll
  async closePoll(tripId: string, pollId: string): Promise<TripPoll | null> {
    const polls = await this.getPolls(tripId);
    const pollIndex = polls.findIndex(p => p.id === pollId);
    
    if (pollIndex === -1) {
      console.error('Poll not found:', pollId);
      return null;
    }

    polls[pollIndex].status = 'closed';
    polls[pollIndex].updated_at = new Date().toISOString();
    
    await this.savePolls(tripId, polls);
    return polls[pollIndex];
  }

  // Delete a poll
  async deletePoll(tripId: string, pollId: string): Promise<boolean> {
    const polls = await this.getPolls(tripId);
    const filtered = polls.filter(p => p.id !== pollId);
    
    if (filtered.length === polls.length) {
      return false; // Poll not found
    }
    
    await this.savePolls(tripId, filtered);
    return true;
  }

  // Clear all polls for a trip
  async clearPolls(tripId: string): Promise<void> {
    await platformStorage.removeItem(this.getStorageKey(tripId));
  }
}

export const pollStorageService = new PollStorageService();


