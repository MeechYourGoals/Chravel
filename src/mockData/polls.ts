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

  // Trip 3: The Tyler's Tie The Knot
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
  },

  // ========== PRO TRIP POLLS ==========

  // Pro Trip 1: Lakers Road Trip
  {
    id: 'mock-poll-pro-1-1',
    trip_id: 'lakers-road-trip',
    question: 'Which restaurant for post-game dinner?',
    options: [
      { id: 'opt-1', text: 'Nobu Malibu', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: 'BOA Steakhouse', voteCount: 6, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14'] },
      { id: 'opt-3', text: 'Craig\'s West Hollywood', voteCount: 4, voters: ['user-15', 'user-16', 'user-17', 'user-18'] }
    ],
    status: 'active' as const,
    total_votes: 18,
    created_by: 'mock-user-pro-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-1-2',
    trip_id: 'lakers-road-trip',
    question: 'What time to leave for the arena?',
    options: [
      { id: 'opt-1', text: '5:00 PM', voteCount: 5, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'] },
      { id: 'opt-2', text: '5:30 PM', voteCount: 9, voters: ['user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14'] },
      { id: 'opt-3', text: '6:00 PM', voteCount: 4, voters: ['user-15', 'user-16', 'user-17', 'user-18'] }
    ],
    status: 'active' as const,
    total_votes: 18,
    created_by: 'mock-user-pro-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 2: Beyoncé Cowboy Carter Tour
  {
    id: 'mock-poll-pro-2-1',
    trip_id: 'beyonce-cowboy-carter-tour',
    question: 'Where should we eat before the concert?',
    options: [
      { id: 'opt-1', text: 'The Capital Grille', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: 'Knife Steakhouse', voteCount: 9, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'Uchi Dallas', voteCount: 5, voters: ['user-17', 'user-18', 'user-19', 'user-20', 'user-21'] }
    ],
    status: 'active' as const,
    total_votes: 21,
    created_by: 'mock-user-pro-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-2-2',
    trip_id: 'beyonce-cowboy-carter-tour',
    question: 'What time to meet at the venue?',
    options: [
      { id: 'opt-1', text: '6:00 PM', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '6:30 PM', voteCount: 11, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: '7:00 PM', voteCount: 4, voters: ['user-18', 'user-19', 'user-20', 'user-21'] }
    ],
    status: 'active' as const,
    total_votes: 21,
    created_by: 'mock-user-pro-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 3: Eli Lilly C-Suite Retreat
  {
    id: 'mock-poll-pro-3-1',
    trip_id: 'eli-lilly-c-suite-retreat-2026',
    question: 'Which restaurant for the executive dinner?',
    options: [
      { id: 'opt-1', text: 'St. Elmo Steak House', voteCount: 12, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-2', text: 'Bluebeard', voteCount: 6, voters: ['user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: 'Vida', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-3-2',
    trip_id: 'eli-lilly-c-suite-retreat-2026',
    question: 'What time for the morning strategy session?',
    options: [
      { id: 'opt-1', text: '8:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '9:00 AM', voteCount: 10, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: '10:00 AM', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 4: Paul George Elite AAU Nationals
  {
    id: 'mock-poll-pro-4-1',
    trip_id: 'paul-george-elite-aau-nationals-2025',
    question: 'Where should we have the team dinner?',
    options: [
      { id: 'opt-1', text: 'Yardbird Southern Table', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'The Capital Grille', voteCount: 7, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'Hard Rock Cafe', voteCount: 5, voters: ['user-17', 'user-18', 'user-19', 'user-20', 'user-21'] }
    ],
    status: 'active' as const,
    total_votes: 21,
    created_by: 'mock-user-pro-4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-4-2',
    trip_id: 'paul-george-elite-aau-nationals-2025',
    question: 'What time for the pre-game walkthrough?',
    options: [
      { id: 'opt-1', text: '7:30 AM', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '8:30 AM', voteCount: 11, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: '9:00 AM', voteCount: 4, voters: ['user-18', 'user-19', 'user-20', 'user-21'] }
    ],
    status: 'active' as const,
    total_votes: 21,
    created_by: 'mock-user-pro-4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 5: OSU vs Notre Dame 2025
  {
    id: 'mock-poll-pro-5-1',
    trip_id: 'osu-notredame-2025',
    question: 'Which tailgate spot should we reserve?',
    options: [
      { id: 'opt-1', text: 'South Quad Area', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Hind\'s Plaza', voteCount: 7, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: 'Mirror Lake', voteCount: 5, voters: ['user-18', 'user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-5-2',
    trip_id: 'osu-notredame-2025',
    question: 'What time to start tailgating?',
    options: [
      { id: 'opt-1', text: '9:00 AM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '10:00 AM', voteCount: 12, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: '11:00 AM', voteCount: 3, voters: ['user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 6: UNC Men's Lacrosse 2025
  {
    id: 'mock-poll-pro-6-1',
    trip_id: 'unc-lax-2025',
    question: 'Where should we eat post-game?',
    options: [
      { id: 'opt-1', text: 'Sutton\'s Drug Store', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: 'Kipos Greek Taverna', voteCount: 6, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14'] },
      { id: 'opt-3', text: 'Al\'s Burger Shack', voteCount: 4, voters: ['user-15', 'user-16', 'user-17', 'user-18'] }
    ],
    status: 'active' as const,
    total_votes: 18,
    created_by: 'mock-user-pro-6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-6-2',
    trip_id: 'unc-lax-2025',
    question: 'What time to meet for the game?',
    options: [
      { id: 'opt-1', text: '5:00 PM', voteCount: 5, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'] },
      { id: 'opt-2', text: '5:30 PM', voteCount: 10, voters: ['user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15'] },
      { id: 'opt-3', text: '6:00 PM', voteCount: 3, voters: ['user-16', 'user-17', 'user-18'] }
    ],
    status: 'active' as const,
    total_votes: 18,
    created_by: 'mock-user-pro-6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 7: A16z Speedrun 2026
  {
    id: 'mock-poll-pro-7-1',
    trip_id: 'a16z-speedrun-2026',
    question: 'Which restaurant for the investor dinner?',
    options: [
      { id: 'opt-1', text: 'Boulevard Restaurant', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'Quince', voteCount: 7, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'Gary Danko', voteCount: 5, voters: ['user-17', 'user-18', 'user-19', 'user-20', 'user-21'] }
    ],
    status: 'active' as const,
    total_votes: 21,
    created_by: 'mock-user-pro-7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-7-2',
    trip_id: 'a16z-speedrun-2026',
    question: 'What time for the pitch practice session?',
    options: [
      { id: 'opt-1', text: '9:00 AM', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '10:00 AM', voteCount: 11, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: '11:00 AM', voteCount: 4, voters: ['user-18', 'user-19', 'user-20', 'user-21'] }
    ],
    status: 'active' as const,
    total_votes: 21,
    created_by: 'mock-user-pro-7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 8: Kai Cenat, Druski, Jake & Adin 24HR ATL Stream
  {
    id: 'mock-poll-pro-8-1',
    trip_id: 'kai-druski-jake-adin-24hr-atl',
    question: 'Where should we order food from?',
    options: [
      { id: 'opt-1', text: 'The Varsity', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Busy Bee Cafe', voteCount: 6, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'JR Crickets', voteCount: 8, voters: ['user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-pro-8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-8-2',
    trip_id: 'kai-druski-jake-adin-24hr-atl',
    question: 'What time to start the stream?',
    options: [
      { id: 'opt-1', text: '6:00 PM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '7:00 PM', voteCount: 12, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: '8:00 PM', voteCount: 5, voters: ['user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-pro-8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 9: Tesla Cybertruck Roadshow
  {
    id: 'mock-poll-pro-9-1',
    trip_id: 'tesla-cybertruck-roadshow-2025',
    question: 'Which venue for the reveal event?',
    options: [
      { id: 'opt-1', text: 'Fremont Factory', voteCount: 11, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11'] },
      { id: 'opt-2', text: 'Gigafactory Texas', voteCount: 8, voters: ['user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: 'Hawthorne Design Studio', voteCount: 6, voters: ['user-20', 'user-21', 'user-22', 'user-23', 'user-24', 'user-25'] }
    ],
    status: 'active' as const,
    total_votes: 25,
    created_by: 'mock-user-pro-9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-9-2',
    trip_id: 'tesla-cybertruck-roadshow-2025',
    question: 'What time should the presentation start?',
    options: [
      { id: 'opt-1', text: '10:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '11:00 AM', voteCount: 13, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21'] },
      { id: 'opt-3', text: '12:00 PM', voteCount: 4, voters: ['user-22', 'user-23', 'user-24', 'user-25'] }
    ],
    status: 'active' as const,
    total_votes: 25,
    created_by: 'mock-user-pro-9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 10: Post Malone & Jelly Roll Tour
  {
    id: 'mock-poll-pro-10-1',
    trip_id: 'postmalone-jellyroll-tour-2026',
    question: 'Where to eat before the show?',
    options: [
      { id: 'opt-1', text: 'Broadway Brewhouse', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'Acme Feed & Seed', voteCount: 7, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'The Southern Steak & Oyster', voteCount: 6, voters: ['user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-10-2',
    trip_id: 'postmalone-jellyroll-tour-2026',
    question: 'What time to arrive at the venue?',
    options: [
      { id: 'opt-1', text: '6:00 PM', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '6:30 PM', voteCount: 12, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: '7:00 PM', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 11: Goldman Sachs Campus Recruiting
  {
    id: 'mock-poll-pro-11-1',
    trip_id: 'gs-campus-gt-2025',
    question: 'Which restaurant for the networking dinner?',
    options: [
      { id: 'opt-1', text: 'South City Kitchen', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'The Sun Dial', voteCount: 7, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: 'Canoe', voteCount: 5, voters: ['user-18', 'user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-11',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-11-2',
    trip_id: 'gs-campus-gt-2025',
    question: 'What time for the career fair?',
    options: [
      { id: 'opt-1', text: '9:00 AM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '10:00 AM', voteCount: 11, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: '11:00 AM', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-11',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Pro Trip 12: NVIDIA Team Bowling Night
  {
    id: 'mock-poll-pro-12-1',
    trip_id: 'nvidia-bowling-2025',
    question: 'Where should we grab food after bowling?',
    options: [
      { id: 'opt-1', text: 'The Cheesecake Factory', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'BJ\'s Restaurant & Brewhouse', voteCount: 7, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16'] },
      { id: 'opt-3', text: 'P.F. Chang\'s', voteCount: 6, voters: ['user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-pro-12-2',
    trip_id: 'nvidia-bowling-2025',
    question: 'What time to start bowling?',
    options: [
      { id: 'opt-1', text: '6:00 PM', voteCount: 6, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'] },
      { id: 'opt-2', text: '7:00 PM', voteCount: 12, voters: ['user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: '8:00 PM', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-pro-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // ========== EVENT TRIP POLLS ==========

  // Event Trip 1: SXSW 2025
  {
    id: 'mock-poll-event-1-1',
    trip_id: 'sxsw-2025',
    question: 'Which food truck area for lunch?',
    options: [
      { id: 'opt-1', text: 'Rainey Street', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: '6th Street', voteCount: 8, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: 'Convention Center Plaza', voteCount: 6, voters: ['user-19', 'user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-1-2',
    trip_id: 'sxsw-2025',
    question: 'What time to meet for the keynote?',
    options: [
      { id: 'opt-1', text: '9:30 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '10:00 AM', voteCount: 13, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21'] },
      { id: 'opt-3', text: '10:30 AM', voteCount: 3, voters: ['user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 2: World Economic Forum 2025
  {
    id: 'mock-poll-event-2-1',
    trip_id: 'wef-2025',
    question: 'Which restaurant for the delegate dinner?',
    options: [
      { id: 'opt-1', text: 'Restaurant Cantinetta Antinori', voteCount: 12, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11', 'user-12'] },
      { id: 'opt-2', text: 'Chesa Grischuna', voteCount: 7, voters: ['user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: 'Kaffee Klatsch', voteCount: 5, voters: ['user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-2-2',
    trip_id: 'wef-2025',
    question: 'What time for the morning forum session?',
    options: [
      { id: 'opt-1', text: '7:00 AM', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: '8:00 AM', voteCount: 11, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: '9:00 AM', voteCount: 4, voters: ['user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 3: Money20/20 Las Vegas 2025
  {
    id: 'mock-poll-event-3-1',
    trip_id: 'money2020-2025',
    question: 'Where should we dine during the conference?',
    options: [
      { id: 'opt-1', text: 'SW Steakhouse', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'Carbone', voteCount: 11, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: 'Catch Las Vegas', voteCount: 6, voters: ['user-21', 'user-22', 'user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-3-2',
    trip_id: 'money2020-2025',
    question: 'What time to meet for the expo hall?',
    options: [
      { id: 'opt-1', text: '9:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '10:00 AM', voteCount: 14, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] },
      { id: 'opt-3', text: '11:00 AM', voteCount: 4, voters: ['user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 4: Bloomberg Screentime 2025
  {
    id: 'mock-poll-event-4-1',
    trip_id: 'bloomberg-screentime-2025',
    question: 'Which restaurant for the media dinner?',
    options: [
      { id: 'opt-1', text: 'Spago Beverly Hills', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Polo Lounge', voteCount: 8, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: 'Catch LA', voteCount: 6, voters: ['user-19', 'user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-4-2',
    trip_id: 'bloomberg-screentime-2025',
    question: 'What time for the panel discussions?',
    options: [
      { id: 'opt-1', text: '10:00 AM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '11:00 AM', voteCount: 13, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: '12:00 PM', voteCount: 4, voters: ['user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 5: INBOUND by HubSpot 2025
  {
    id: 'mock-poll-event-5-1',
    trip_id: 'inbound-2025',
    question: 'Where should we have lunch?',
    options: [
      { id: 'opt-1', text: 'Waterbar', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'Ozumo', voteCount: 11, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: 'Boulevard', voteCount: 6, voters: ['user-21', 'user-22', 'user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-5-2',
    trip_id: 'inbound-2025',
    question: 'What time to attend the marketing workshop?',
    options: [
      { id: 'opt-1', text: '9:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '10:00 AM', voteCount: 14, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] },
      { id: 'opt-3', text: '11:00 AM', voteCount: 4, voters: ['user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 6: Invest Fest 2025
  {
    id: 'mock-poll-event-6-1',
    trip_id: 'invest-fest-2025',
    question: 'Which food court for lunch?',
    options: [
      { id: 'opt-1', text: 'CNN Center', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Mercedes-Benz Stadium Plaza', voteCount: 9, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: 'Underground Atlanta', voteCount: 7, voters: ['user-20', 'user-21', 'user-22', 'user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-6-2',
    trip_id: 'invest-fest-2025',
    question: 'What time for the investing panel?',
    options: [
      { id: 'opt-1', text: '10:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '11:00 AM', voteCount: 14, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] },
      { id: 'opt-3', text: '12:00 PM', voteCount: 4, voters: ['user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 7: The 67th Grammy Awards
  {
    id: 'mock-poll-event-7-1',
    trip_id: 'grammys-2025',
    question: 'Where to eat before the ceremony?',
    options: [
      { id: 'opt-1', text: 'Spago', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'Matsuhisa', voteCount: 8, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: 'The Ivy', voteCount: 6, voters: ['user-18', 'user-19', 'user-20', 'user-21', 'user-22', 'user-23'] }
    ],
    status: 'active' as const,
    total_votes: 23,
    created_by: 'mock-user-event-7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-7-2',
    trip_id: 'grammys-2025',
    question: 'What time to arrive for red carpet?',
    options: [
      { id: 'opt-1', text: '4:00 PM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '5:00 PM', voteCount: 12, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: '6:00 PM', voteCount: 4, voters: ['user-20', 'user-21', 'user-22', 'user-23'] }
    ],
    status: 'active' as const,
    total_votes: 23,
    created_by: 'mock-user-event-7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 8: Y Combinator W25 Demo Day
  {
    id: 'mock-poll-event-8-1',
    trip_id: 'yc-demo-day-2025',
    question: 'Which restaurant for the startup dinner?',
    options: [
      { id: 'opt-1', text: 'Evvia', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Mayfield Bakery & Cafe', voteCount: 7, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: 'Village Pub', voteCount: 5, voters: ['user-18', 'user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-event-8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-8-2',
    trip_id: 'yc-demo-day-2025',
    question: 'What time for the pitch rehearsal?',
    options: [
      { id: 'opt-1', text: '8:00 AM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '9:00 AM', voteCount: 11, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: '10:00 AM', voteCount: 4, voters: ['user-19', 'user-20', 'user-21', 'user-22'] }
    ],
    status: 'active' as const,
    total_votes: 22,
    created_by: 'mock-user-event-8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 9: TikTok Creator Accelerator Summit
  {
    id: 'mock-poll-event-9-1',
    trip_id: 'tiktok-summit-2025',
    question: 'Where should we grab lunch?',
    options: [
      { id: 'opt-1', text: 'Catch LA', voteCount: 11, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10', 'user-11'] },
      { id: 'opt-2', text: 'Urth Caffe', voteCount: 8, voters: ['user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: 'Sweetgreen', voteCount: 5, voters: ['user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-9-2',
    trip_id: 'tiktok-summit-2025',
    question: 'What time to film the collab content?',
    options: [
      { id: 'opt-1', text: '2:00 PM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '3:00 PM', voteCount: 12, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: '4:00 PM', voteCount: 4, voters: ['user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-9',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 10: The 97th Academy Awards
  {
    id: 'mock-poll-event-10-1',
    trip_id: 'oscars-2025',
    question: 'Which restaurant for pre-show dining?',
    options: [
      { id: 'opt-1', text: 'Wolfgang Puck Bar & Grill', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Mastro\'s Steakhouse', voteCount: 8, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18'] },
      { id: 'opt-3', text: 'BOA Steakhouse', voteCount: 6, voters: ['user-19', 'user-20', 'user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-10-2',
    trip_id: 'oscars-2025',
    question: 'What time to arrive at the Dolby Theatre?',
    options: [
      { id: 'opt-1', text: '3:00 PM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '4:00 PM', voteCount: 13, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20'] },
      { id: 'opt-3', text: '5:00 PM', voteCount: 4, voters: ['user-21', 'user-22', 'user-23', 'user-24'] }
    ],
    status: 'active' as const,
    total_votes: 24,
    created_by: 'mock-user-event-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 11: NBA Hall of Fame Induction 2025
  {
    id: 'mock-poll-event-11-1',
    trip_id: 'nba-hof-2025',
    question: 'Where to dine during the ceremony weekend?',
    options: [
      { id: 'opt-1', text: 'Student Prince', voteCount: 9, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9'] },
      { id: 'opt-2', text: 'Theodores\'', voteCount: 8, voters: ['user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17'] },
      { id: 'opt-3', text: 'Fort Restaurant', voteCount: 6, voters: ['user-18', 'user-19', 'user-20', 'user-21', 'user-22', 'user-23'] }
    ],
    status: 'active' as const,
    total_votes: 23,
    created_by: 'mock-user-event-11',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-11-2',
    trip_id: 'nba-hof-2025',
    question: 'What time for the pre-ceremony reception?',
    options: [
      { id: 'opt-1', text: '5:00 PM', voteCount: 7, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'] },
      { id: 'opt-2', text: '6:00 PM', voteCount: 12, voters: ['user-8', 'user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: '7:00 PM', voteCount: 4, voters: ['user-20', 'user-21', 'user-22', 'user-23'] }
    ],
    status: 'active' as const,
    total_votes: 23,
    created_by: 'mock-user-event-11',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },

  // Event Trip 12: Google I/O 2026
  {
    id: 'mock-poll-event-12-1',
    trip_id: 'google-io-2026',
    question: 'Which food station for lunch?',
    options: [
      { id: 'opt-1', text: 'Global Eats', voteCount: 10, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8', 'user-9', 'user-10'] },
      { id: 'opt-2', text: 'Tech Bites', voteCount: 9, voters: ['user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19'] },
      { id: 'opt-3', text: 'Innovation Cafe', voteCount: 7, voters: ['user-20', 'user-21', 'user-22', 'user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  },
  {
    id: 'mock-poll-event-12-2',
    trip_id: 'google-io-2026',
    question: 'What time for the developer workshop?',
    options: [
      { id: 'opt-1', text: '10:00 AM', voteCount: 8, voters: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'] },
      { id: 'opt-2', text: '11:00 AM', voteCount: 14, voters: ['user-9', 'user-10', 'user-11', 'user-12', 'user-13', 'user-14', 'user-15', 'user-16', 'user-17', 'user-18', 'user-19', 'user-20', 'user-21', 'user-22'] },
      { id: 'opt-3', text: '1:00 PM', voteCount: 4, voters: ['user-23', 'user-24', 'user-25', 'user-26'] }
    ],
    status: 'active' as const,
    total_votes: 26,
    created_by: 'mock-user-event-12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1
  }
];
