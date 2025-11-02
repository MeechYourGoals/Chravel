import { demoModeService } from './demoModeService';
import { SearchResult } from './universalConciergeService';

export class MockKnowledgeService {
  static async searchMockData(query: string, tripId: string): Promise<SearchResult[]> {
    const lowercaseQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Get mock messages from demo service
    const mockMessages = await demoModeService.getMockMessages('demo');
    
    // Search through mock messages
    for (const message of mockMessages) {
      if (
        message.message_content.toLowerCase().includes(lowercaseQuery) ||
        message.sender_name.toLowerCase().includes(lowercaseQuery) ||
        (message.tags && message.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
      ) {
        results.push({
          id: `mock_msg_${message.id}`,
          objectType: 'message',
          objectId: message.id,
          tripId,
          tripName: 'Demo Trip',
          content: message.message_content,
          snippet: `${message.sender_name}: ${message.message_content.substring(0, 100)}...`,
          score: 0.9,
          deepLink: '#chat',
          matchReason: 'Message content match',
          metadata: {
            date: this.getDateFromOffset(message.timestamp_offset_days || 0),
            participants: [message.sender_name]
          }
        });
      }
    }

    // Mock poll data
    if (lowercaseQuery.includes('poll') || lowercaseQuery.includes('restaurant') || lowercaseQuery.includes('vote')) {
      results.push({
        id: 'mock_poll_1',
        objectType: 'message',
        objectId: 'poll_1',
        tripId,
        tripName: 'Demo Trip',
        content: 'Restaurant poll: Where should we eat tonight?',
        snippet: 'Poll about restaurant options: Italian Bistro, Sushi Palace, Local BBQ',
        score: 0.95,
        deepLink: '#chat',
        matchReason: 'Poll content match',
        metadata: {
          date: this.getDateFromOffset(1)
        }
      });
    }

    // Mock task data
    if (lowercaseQuery.includes('task') || lowercaseQuery.includes('list')) {
      results.push({
        id: 'mock_task_1',
        objectType: 'message',
        objectId: 'task_1',
        tripId,
        tripName: 'Demo Trip',
        content: 'Outstanding tasks: Pack snorkeling gear, Confirm dinner reservations, Buy sunscreen',
        snippet: 'Task items still pending completion',
        score: 0.9,
        deepLink: '#tasks',
        matchReason: 'Task list match',
        metadata: {
          date: this.getDateFromOffset(0)
        }
      });
    }

    // Mock file data
    if (lowercaseQuery.includes('file') || lowercaseQuery.includes('document') || lowercaseQuery.includes('itinerary')) {
      results.push({
        id: 'mock_file_1',
        objectType: 'file',
        objectId: 'file_1',
        tripId,
        tripName: 'Demo Trip',
        content: 'Trip itinerary and hotel confirmations uploaded',
        snippet: 'Complete trip itinerary with flight details and hotel bookings',
        score: 0.85,
        deepLink: '#files',
        matchReason: 'File content match',
        metadata: {
          fileName: 'trip_itinerary.pdf',
          fileType: 'pdf',
          date: this.getDateFromOffset(3)
        }
      });
    }

    return results.slice(0, 10); // Limit to 10 results
  }

  static async generateMockAnswer(query: string, tripId: string): Promise<string> {
    const lowercaseQuery = query.toLowerCase();
    
    // Fetch actual mock data for context
    const mockMessages = await demoModeService.getMockMessages('consumer-trip', false);
    const mockBroadcasts = await demoModeService.getMockBroadcasts('consumer-trip');
    const mockPolls = await demoModeService.getMockPolls(tripId);
    const mockPayments = await demoModeService.getMockPayments(tripId);
    const mockMembers = await demoModeService.getMockMembers(tripId);
    
    // Broadcast summary
    if (lowercaseQuery.includes('broadcast') || lowercaseQuery.includes('announcement')) {
      const broadcasts = mockBroadcasts;
      return `📢 **Broadcast Messages** (${broadcasts.length} total)\n\n` +
        broadcasts.map((b, i) => 
          `${i + 1}. **${b.sender_name}** ${b.tag === 'urgent' || b.tag === 'emergency' ? '🚨' : ''}\n   "${b.content}"\n   _${Math.round((b.timestamp_offset_hours || 0))} hours ago_`
        ).join('\n\n');
    }
    
    // Trip participants/who's coming
    if (lowercaseQuery.includes('who') && (lowercaseQuery.includes('trip') || lowercaseQuery.includes('coming') || lowercaseQuery.includes('going'))) {
      const memberList = mockMembers.map((m, i) => 
        `- **${m.display_name}**${i === 0 ? ' (Organizer)' : ''}`
      ).join('\n');
      return `🎿 **Trip Participants**\n\nYou'll be traveling with:\n${memberList}\n\nThat's ${mockMembers.length} people total heading to Aspen for this corporate ski trip!`;
    }

    // Agenda/schedule questions
    if (lowercaseQuery.includes('agenda') || lowercaseQuery.includes('schedule') || lowercaseQuery.includes('today') || lowercaseQuery.includes('tomorrow')) {
      return "📅 **Upcoming Schedule**\n\n**Tomorrow:**\n- **3:30 PM** - Airport Pickup at Aspen Airport\n- **7:00 PM** - Welcome Dinner at The Little Nell Restaurant\n\n**Next Few Days:**\n- Skiing at Aspen Mountain\n- Group activities TBA\n\nThe trip runs from January 15-20, 2025.";
    }

    // Poll/voting questions
    if (lowercaseQuery.includes('poll') || lowercaseQuery.includes('vote') || lowercaseQuery.includes('restaurant')) {
      return "🍽️ **Restaurant Poll Results**\n\nPriya Patel created a poll asking \"Where should we eat tonight?\"\n\n**Current votes:**\n- Italian Bistro: 3 votes 🏆\n- Sushi Palace: 2 votes\n- Local BBQ: 1 vote\n\nLooks like Italian Bistro is winning! The poll is still active if you want to add your vote.";
    }

    // Payment/money questions
    if (lowercaseQuery.includes('owe') || lowercaseQuery.includes('payment') || lowercaseQuery.includes('money') || lowercaseQuery.includes('pay')) {
      const paymentList = mockPayments.map(p => {
        const splitAmount = p.amount / p.split_count;
        const payer = mockMembers.find(m => m.user_id === p.created_by)?.display_name || 'Unknown';
        const status = p.is_settled ? '✅ Settled' : '⏳ Pending';
        return `- **${p.description}**: $${p.amount.toFixed(2)} paid by ${payer}\n  Split ${p.split_count} ways = $${splitAmount.toFixed(2)} per person ${status}`;
      }).join('\n\n');
      
      return `💰 **Payment Summary**\n\n**All Payments:**\n${paymentList}\n\nCheck the Payments tab to settle up!`;
    }

    // Task questions
    if (lowercaseQuery.includes('task') || lowercaseQuery.includes('to-do') || lowercaseQuery.includes('need to do')) {
      return "✅ **Outstanding Tasks**\n\n**Group Tasks:**\n1. Pack snorkeling gear (assigned to Sarah Chen)\n2. Confirm dinner reservations (assigned to Priya Patel)\n3. Buy sunscreen (unassigned)\n\nLooks like there are a few things still pending before the trip!";
    }

    // Flight information
    if (lowercaseQuery.includes('flight') || lowercaseQuery.includes('landing') || lowercaseQuery.includes('arrival')) {
      return "✈️ **Flight Information**\n\nMarcus Johnson mentioned he booked his flight and will be landing at **3:30 PM on Friday** at Aspen Airport.\n\nDavid Thompson also sent an urgent message about a gate change to **B12**.\n\nMake sure to coordinate pickup times with the group!";
    }

    // Weather information
    if (lowercaseQuery.includes('weather') || lowercaseQuery.includes('forecast') || lowercaseQuery.includes('temperature')) {
      return "⛅ **Weather Updates**\n\nSarah Chen asked about the weather forecast for Aspen.\n\nAlex Kim sent an alert that **rain is expected in the afternoon** - recommending everyone bring umbrellas or jackets.\n\nThere was also an emergency broadcast about severe weather, advising everyone to stay indoors temporarily.\n\nCheck the weather links in Files for the full forecast!";
    }

    // Hotel/accommodation info
    if (lowercaseQuery.includes('hotel') || lowercaseQuery.includes('room') || lowercaseQuery.includes('accommodation') || lowercaseQuery.includes('stay')) {
      return "🏨 **Hotel Information**\n\nYou're staying at **The Little Nell** (675 E Durant Ave, Aspen, CO 81611).\n\nChris Anderson checked into **room 502** and offered help if anyone needs anything. Maya Williams mentioned incredible sunset views from their hotel room!\n\n📢 Reminder: Luggage must be outside rooms by 8 AM for pickup.";
    }

    // Location/directions questions
    if (lowercaseQuery.includes('where') || lowercaseQuery.includes('location') || lowercaseQuery.includes('address') || lowercaseQuery.includes('directions')) {
      return "📍 **Key Locations**\n\n**Home Base:** The Little Nell (675 E Durant Ave, Aspen, CO 81611)\n\n**Activities:**\n- Aspen Mountain (skiing)\n- The Little Nell Restaurant (welcome dinner)\n\n**Airport:** Aspen Airport (for arrivals/departures)\n\nCheck the Maps tab for directions and saved places!";
    }

    // Catch missed messages
    if (lowercaseQuery.includes('catch') || lowercaseQuery.includes('miss') || lowercaseQuery.includes('update') || lowercaseQuery.includes('summarize')) {
      const recentBroadcasts = mockBroadcasts.slice(0, 5);
      const recentMessages = mockMessages.filter(m => !m.tags?.includes('payment')).slice(0, 5);
      
      return `💬 **Recent Activity**\n\n**Recent Broadcasts:**\n` +
        recentBroadcasts.map(b => `- **${b.sender_name}**: ${b.content}`).join('\n') +
        `\n\n**Recent Messages:**\n` +
        recentMessages.map(m => `- **${m.sender_name}**: ${m.message_content}`).join('\n') +
        `\n\n**Payments:** ${mockPayments.length} pending\n**Polls:** ${mockPolls.length} active\n\nThe group chat has been pretty active with trip planning!`;
    }

    // Generic fallback with trip awareness
    return `🌟 I have full context about your **Corporate Holiday Ski Trip to Aspen**!\n\nHere's what I know:\n- 5 participants including Sarah Chen, Marcus Johnson, Priya Patel, Alex Kim, and David Thompson\n- Dates: January 15-20, 2025\n- Staying at The Little Nell\n- Active restaurant poll and pending tasks\n- Recent messages about flights and weather\n\nWhat would you like to know? I can help with schedules, payments, tasks, or any trip details!`;
  }

  private static getDateFromOffset(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() - offsetDays);
    return date.toISOString().split('T')[0];
  }

  static formatMockCitations(results: SearchResult[]): any[] {
    return results.map(result => ({
      id: result.id,
      content: result.content,
      source: result.objectType,
      trip_id: result.tripId,
      metadata: result.metadata
    }));
  }
}