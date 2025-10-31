export const mockPolls = [
  // Trip 1: Spring Break Cancun 2026
  {
    id: 'mock-poll-1-1',
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
    id: 'mock-poll-1-2',
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
  },

  // Trip 2: Tokyo Adventure
  {
    id: 'mock-poll-2-1',
    trip_id: '2',
    question: 'Which restaurant should we visit for dinner?',
    options: [
      { id: 'opt-1', text: 'Sushi Restaurant', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: 'Ramen Shop', voteCount: 5, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13'] },
      { id: 'opt-3', text: 'Izakaya Pub', voteCount: 3, voters: ['user-14', 'user-15', 'user-16'] }
    ],
    status: 'active' as const,
    total_votes: 16,
    created_by: 'mock-user-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-2-2',
    trip_id: '2',
    question: 'What time should we meet for the temple tour?',
    options: [
      { id: 'opt-1', text: '8:00 AM - Early start', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '10:00 AM - Mid-morning', voteCount: 9, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15'] },
      { id: 'opt-3', text: '2:00 PM - Afternoon', voteCount: 2, voters: ['user-16', 'user-17'] }
    ],
    status: 'active' as const,
    total_votes: 17,
    created_by: 'mock-user-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 3: Jack and Jill's destination wedding
  {
    id: 'mock-poll-3-1',
    trip_id: '3',
    question: 'Which restaurant for the rehearsal dinner?',
    options: [
      { id: 'opt-1', text: 'Beachside Italian', voteCount: 12, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-2', text: 'Balinese Traditional', voteCount: 8, voters: ['user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: 'Seafood Grill', voteCount: 5, voters: ['user-21', 'user-22', 'user-23', 'user-24', 'user-25'] }
    ],
    status: 'active' as const,
    total_votes: 25,
    created_by: 'mock-user-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-3-2',
    trip_id: '3',
    question: 'What time should we meet for the group excursion?',
    options: [
      { id: 'opt-1', text: '9:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '11:00 AM', voteCount: 13, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21'] },
      { id: 'opt-3', text: '2:00 PM', voteCount: 4, voters: ['user-22', 'user-23', 'user-24', 'user-25'] }
    ],
    status: 'active' as const,
    total_votes: 25,
    created_by: 'mock-user-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 4: Kristen's Bachelorette Party
  {
    id: 'mock-poll-4-1',
    trip_id: '4',
    question: 'Which honky-tonk bar should we hit first?',
    options: [
      { id: 'opt-1', text: "Tootsie's Orchid Lounge", voteCount: 4, voters: ['user-1', 'user-2', 'user-3', 'user-4'] },
      { id: 'opt-2', text: "Robert's Western World", voteCount: 8, voters: ['user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-3', text: 'The Stage on Broadway', voteCount: 3, voters: ['user-13', 'user-14', 'user-15'] }
    ],
    status: 'active' as const,
    total_votes: 15,
    created_by: 'mock-user-4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-4-2',
    trip_id: '4',
    question: 'What time should we meet for brunch?',
    options: [
      { id: 'opt-1', text: '10:00 AM', voteCount: 5, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'] },
      { id: 'opt-2', text: '11:30 AM', voteCount: 7, voters: ['user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-3', text: '1:00 PM', voteCount: 3, voters: ['user-13', 'user-14', 'user-15'] }
    ],
    status: 'active' as const,
    total_votes: 15,
    created_by: 'mock-user-4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 5: Coachella Squad 2026
  {
    id: 'mock-poll-5-1',
    trip_id: '5',
    question: 'Which headliner should we prioritize?',
    options: [
      { id: 'opt-1', text: 'Main Stage Closer', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Sahara Tent DJ', voteCount: 6, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'Outdoor Stage Artist', voteCount: 4, voters: ['user-17', 'user-18', 'user-19', 'user-20'] }
    ],
    status: 'active' as const,
    total_votes: 20,
    created_by: 'mock-user-5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-5-2',
    trip_id: '5',
    question: 'What time should we leave for the festival grounds?',
    options: [
      { id: 'opt-1', text: '2:00 PM - Catch opening acts', voteCount: 5, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'] },
      { id: 'opt-2', text: '4:00 PM - Mid-afternoon', voteCount: 11, voters: ['user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: '6:00 PM - Sunset sets', voteCount: 4, voters: ['user-17', 'user-18', 'user-19', 'user-20'] }
    ],
    status: 'active' as const,
    total_votes: 20,
    created_by: 'mock-user-5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 6: Johnson Family Summer Vacay
  {
    id: 'mock-poll-6-1',
    trip_id: '6',
    question: 'Which restaurant for our family dinner?',
    options: [
      { id: 'opt-1', text: 'Mountain View Steakhouse', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: 'Italian Family Style', voteCount: 9, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15'] },
      { id: 'opt-3', text: 'Asian Fusion', voteCount: 3, voters: ['user-16', 'user-17', 'user-18'] }
    ],
    status: 'active' as const,
    total_votes: 18,
    created_by: 'mock-user-6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-6-2',
    trip_id: '6',
    question: 'What time should we start the hiking trail?',
    options: [
      { id: 'opt-1', text: '7:00 AM - Beat the heat', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '9:00 AM - After breakfast', voteCount: 8, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15'] },
      { id: 'opt-3', text: '11:00 AM - Late morning', voteCount: 3, voters: ['user-16', 'user-17', 'user-18'] }
    ],
    status: 'active' as const,
    total_votes: 18,
    created_by: 'mock-user-6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 7: Fantasy Football Golf Outing
  {
    id: 'mock-poll-7-1',
    trip_id: '7',
    question: 'Which restaurant for the victory dinner?',
    options: [
      { id: 'opt-1', text: 'Clubhouse Steakhouse', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: 'BBQ Smokehouse', voteCount: 5, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13'] },
      { id: 'opt-3', text: 'Mexican Cantina', voteCount: 3, voters: ['user-14', 'user-15', 'user-16'] }
    ],
    status: 'active' as const,
    total_votes: 16,
    created_by: 'mock-user-7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-7-2',
    trip_id: '7',
    question: 'What time for our tee time?',
    options: [
      { id: 'opt-1', text: '7:30 AM - Early birds', voteCount: 4, voters: ['user-1', 'user-2', 'user-3', 'user-4'] },
      { id: 'opt-2', text: '9:00 AM - Mid-morning', voteCount: 10, voters: ['user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14'] },
      { id: 'opt-3', text: '11:00 AM - Late start', voteCount: 2, voters: ['user-15', 'user-16'] }
    ],
    status: 'active' as const,
    total_votes: 16,
    created_by: 'mock-user-7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 8: Tulum Wellness Retreat
  {
    id: 'mock-poll-8-1',
    trip_id: '8',
    question: 'Which wellness restaurant for lunch?',
    options: [
      { id: 'opt-1', text: 'Organic Vegan Cafe', voteCount: 12, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-2', text: 'Juice Bar & Smoothies', voteCount: 6, voters: ['user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: 'Raw Food Kitchen', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-8-2',
    trip_id: '8',
    question: 'What time for morning yoga session?',
    options: [
      { id: 'opt-1', text: '6:00 AM - Sunrise flow', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: '8:00 AM - After meditation', voteCount: 9, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: '10:00 AM - Mid-morning', voteCount: 3, voters: ['user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 9: Newly Divorced Wine-Tasting Getaway
  {
    id: 'mock-poll-9-1',
    trip_id: '9',
    question: 'Which winery restaurant for dinner?',
    options: [
      { id: 'opt-1', text: 'French Laundry', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: 'Bistro Jeanty', voteCount: 5, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-3', text: 'Farmstead at Long Meadow', voteCount: 3, voters: ['user-13', 'user-14', 'user-15'] }
    ],
    status: 'active' as const,
    total_votes: 15,
    created_by: 'mock-user-9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-9-2',
    trip_id: '9',
    question: 'What time for the wine tasting tour?',
    options: [
      { id: 'opt-1', text: '11:00 AM - Morning tour', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '2:00 PM - Afternoon session', voteCount: 8, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14'] },
      { id: 'opt-3', text: '4:00 PM - Sunset tasting', voteCount: 1, voters: ['user-15'] }
    ],
    status: 'active' as const,
    total_votes: 15,
    created_by: 'mock-user-9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 10: Corporate Holiday Ski Trip ? Aspen
  {
    id: 'mock-poll-10-1',
    trip_id: '10',
    question: 'Which restaurant for the team dinner?',
    options: [
      { id: 'opt-1', text: 'Mountain Steakhouse', voteCount: 15, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15'] },
      { id: 'opt-2', text: 'Alpine French Bistro', voteCount: 10, voters: ['user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22', 'user-23', 'user-24', 'user-25'] },
      { id: 'opt-3', text: 'Contemporary American', voteCount: 5, voters: ['user-26', 'user-27', 'user-28', 'user-29', 'user-30'] }
    ],
    status: 'active' as const,
    total_votes: 30,
    created_by: 'mock-user-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-10-2',
    trip_id: '10',
    question: 'What time for the team building activity?',
    options: [
      { id: 'opt-1', text: '9:00 AM - Morning session', voteCount: 12, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-2', text: '1:00 PM - After lunch', voteCount: 14, voters: ['user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22', 'user-23', 'user-24', 'user-25', 'user-26'] },
      { id: 'opt-3', text: '4:00 PM - Late afternoon', voteCount: 4, voters: ['user-27', 'user-28', 'user-29', 'user-30'] }
    ],
    status: 'active' as const,
    total_votes: 30,
    created_by: 'mock-user-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 11: Disney Cruise Family Vacation
  {
    id: 'mock-poll-11-1',
    trip_id: '11',
    question: 'Which dining option for tonight?',
    options: [
      { id: 'opt-1', text: 'Main Dining Room', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Buffet on Deck', voteCount: 5, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15'] },
      { id: 'opt-3', text: "Animator's Palate", voteCount: 7, voters: ['user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-11',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-11-2',
    trip_id: '11',
    question: 'What time for the character breakfast?',
    options: [
      { id: 'opt-1', text: '7:30 AM - Early seating', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '9:00 AM - Mid-morning', voteCount: 11, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: '10:30 AM - Late breakfast', voteCount: 3, voters: ['user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-11',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Trip 12: Yellowstone Hiking Adventure
  {
    id: 'mock-poll-12-1',
    trip_id: '12',
    question: 'Which trail restaurant for lunch?',
    options: [
      { id: 'opt-1', text: 'Old Faithful Inn Dining', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: 'Canyon Lodge Eatery', voteCount: 5, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-3', text: 'Lake Hotel Dining Room', voteCount: 3, voters: ['user-13', 'user-14', 'user-15'] }
    ],
    status: 'active' as const,
    total_votes: 15,
    created_by: 'mock-user-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-12-2',
    trip_id: '12',
    question: 'What time should we start the hike?',
    options: [
      { id: 'opt-1', text: '6:00 AM - Sunrise hike', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '8:00 AM - Morning start', voteCount: 8, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14'] },
      { id: 'opt-3', text: '10:00 AM - Mid-morning', voteCount: 1, voters: ['user-15'] }
    ],
    status: 'active' as const,
    total_votes: 15,
    created_by: 'mock-user-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  }
];
