export const mockPolls = [
  {
    id: 'mock-poll-1',
    trip_id: '1',
    question: 'Which restaurant should we visit first?',
    options: [
      { id: 'opt-1', text: 'Sushi Place', voteCount: 3, voters: ['user-1', 'user-2', 'user-3'] },
      { id: 'opt-2', text: 'Taco Stand', voteCount: 5, voters: ['user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-3', text: 'Pizza Joint', voteCount: 2, voters: ['user-9', 'user-10'] }
    ],
    status: 'active' as const,
    total_votes: 10,
    created_by: 'mock-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-2',
    trip_id: '1',
    question: 'What time works for everybody to go to the beach?',
    options: [
      { id: 'opt-1', text: '10 AM', voteCount: 3, voters: ['user-1', 'user-2', 'user-3'] },
      { id: 'opt-2', text: '11 AM', voteCount: 4, voters: ['user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-3', text: '4 PM', voteCount: 2, voters: ['user-8', 'user-9'] }
    ],
    status: 'active' as const,
    total_votes: 9,
    created_by: 'mock-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  }
];
