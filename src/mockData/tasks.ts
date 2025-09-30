export const mockTasks = [
  {
    id: 'mock-task-1',
    trip_id: '1',
    title: 'Book flights',
    description: 'Find the best deals on flights to Cancun',
    creator_id: 'mock-user-1',
    completed: false,
    is_poll: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-task-2',
    trip_id: '1',
    title: 'Reserve hotel rooms',
    description: 'Contact the resort for group booking',
    creator_id: 'mock-user-1',
    completed: true,
    completed_at: new Date().toISOString(),
    is_poll: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  }
];
