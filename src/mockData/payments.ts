export const mockPayments = [
  {
    id: 'mock-payment-1',
    trip_id: '1',
    amount: 150,
    currency: 'USD',
    description: 'Dinner split',
    split_count: 4,
    split_participants: ['user-1', 'user-2', 'user-3', 'user-4'],
    payment_methods: ['venmo:@sarahchen'],
    created_by: 'mock-user-1',
    is_settled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
];
