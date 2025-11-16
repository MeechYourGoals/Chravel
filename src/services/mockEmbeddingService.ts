/**
 * Mock Embedding Service for Demo Mode
 * Provides pre-generated mock embeddings and in-memory vector similarity search
 * to simulate RAG functionality without requiring actual API calls
 */

interface MockEmbedding {
  content_text: string;
  source_type: 'chat' | 'task' | 'poll' | 'payment' | 'broadcast' | 'calendar' | 'link' | 'file';
  source_id: string;
  embedding: number[];
  metadata: any;
  similarity?: number;
}

interface RAGResult {
  content_text: string;
  source_type: string;
  similarity: number;
  metadata: any;
}

export class MockEmbeddingService {
  /**
   * Pre-generated mock embeddings for demo trips
   * In production, these would be 768-dimensional vectors from google/text-embedding-004
   * For demo purposes, we use simplified 8-dimensional vectors
   */
  private static getMockEmbeddings(tripId: string): MockEmbedding[] {
    return [
      // Chat messages
      {
        content_text: 'Sarah Chen: Super excited for this trip! Has everyone seen the weather forecast?',
        source_type: 'chat',
        source_id: 'msg_1',
        embedding: [0.8, 0.2, 0.5, 0.1, 0.3, 0.7, 0.4, 0.6],
        metadata: { author: 'Sarah Chen', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
      },
      {
        content_text: 'Marcus Johnson: Just booked my flight! Landing at 3:30 PM on Friday 🛬',
        source_type: 'chat',
        source_id: 'msg_2',
        embedding: [0.1, 0.9, 0.3, 0.7, 0.2, 0.5, 0.8, 0.4],
        metadata: { author: 'Marcus Johnson', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
      },
      {
        content_text: 'Priya Patel: Found an amazing restaurant for dinner - sending the link now!',
        source_type: 'chat',
        source_id: 'msg_3',
        embedding: [0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.9, 0.1],
        metadata: { author: 'Priya Patel', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
      },
      
      // Payments
      {
        content_text: 'Payment: Dinner at Sakura Restaurant. Amount: USD 240.00',
        source_type: 'payment',
        source_id: 'payment_1',
        embedding: [0.9, 0.1, 0.4, 0.6, 0.8, 0.2, 0.3, 0.7],
        metadata: { amount: 240.00, currency: 'USD', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
      },
      {
        content_text: 'Payment: Taxi to airport. Amount: USD 65.00',
        source_type: 'payment',
        source_id: 'payment_2',
        embedding: [0.2, 0.8, 0.6, 0.4, 0.1, 0.9, 0.5, 0.3],
        metadata: { amount: 65.00, currency: 'USD', created_at: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString() }
      },
      {
        content_text: 'Payment: Concert tickets. Amount: USD 180.00',
        source_type: 'payment',
        source_id: 'payment_3',
        embedding: [0.5, 0.7, 0.2, 0.9, 0.3, 0.6, 0.8, 0.1],
        metadata: { amount: 180.00, currency: 'USD', created_at: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString() }
      },
      
      // Calendar events
      {
        content_text: 'Event: Airport Pickup at Aspen Airport',
        source_type: 'calendar',
        source_id: 'event_1',
        embedding: [0.3, 0.6, 0.9, 0.1, 0.7, 0.2, 0.4, 0.8],
        metadata: { location: 'Aspen Airport', start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() }
      },
      {
        content_text: 'Event: Welcome Dinner at The Little Nell Restaurant. Group dinner at 7 PM',
        source_type: 'calendar',
        source_id: 'event_2',
        embedding: [0.8, 0.4, 0.1, 0.7, 0.5, 0.9, 0.2, 0.6],
        metadata: { location: 'The Little Nell Restaurant', start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString() }
      },
      
      // Tasks
      {
        content_text: 'Task: Pack snorkeling gear',
        source_type: 'task',
        source_id: 'task_1',
        embedding: [0.6, 0.2, 0.5, 0.8, 0.4, 0.7, 0.1, 0.9],
        metadata: { assignee: 'Sarah Chen', is_complete: false }
      },
      {
        content_text: 'Task: Confirm dinner reservations',
        source_type: 'task',
        source_id: 'task_2',
        embedding: [0.4, 0.9, 0.3, 0.6, 0.8, 0.1, 0.7, 0.2],
        metadata: { assignee: 'Priya Patel', is_complete: false }
      },
      
      // Polls
      {
        content_text: 'Poll: Where should we have dinner tonight?. Options: Italian Restaurant, Sushi Place, Steakhouse, Thai Food',
        source_type: 'poll',
        source_id: 'poll_1',
        embedding: [0.7, 0.5, 0.8, 0.3, 0.9, 0.2, 0.6, 0.4],
        metadata: { total_votes: 8, status: 'active' }
      },
      
      // Broadcasts
      {
        content_text: 'Broadcast [logistics]: All luggage must be outside rooms by 8 AM for pickup tomorrow!',
        source_type: 'broadcast',
        source_id: 'broadcast_1',
        embedding: [0.9, 0.7, 0.2, 0.5, 0.6, 0.8, 0.3, 0.1],
        metadata: { priority: 'logistics', created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() }
      },
      {
        content_text: 'Broadcast [emergency]: EMERGENCY: Severe weather warning in effect. Stay indoors until further notice!',
        source_type: 'broadcast',
        source_id: 'broadcast_2',
        embedding: [0.1, 0.3, 0.9, 0.8, 0.2, 0.4, 0.7, 0.5],
        metadata: { priority: 'emergency', created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() }
      },
      
      // Links
      {
        content_text: 'Link: Aspen Weather Forecast',
        source_type: 'link',
        source_id: 'link_1',
        embedding: [0.5, 0.8, 0.4, 0.2, 0.7, 0.3, 0.9, 0.6],
        metadata: { url: 'https://weather.com/aspen', category: 'weather' }
      },
      
      // Files
      {
        content_text: 'File: trip_itinerary.pdf',
        source_type: 'file',
        source_id: 'file_1',
        embedding: [0.3, 0.5, 0.7, 0.9, 0.1, 0.6, 0.4, 0.8],
        metadata: { file_name: 'trip_itinerary.pdf', uploaded_by: 'Sarah Chen' }
      }
    ];
  }

  /**
   * Cosine similarity calculation for vector comparison
   * Returns a value between -1 (opposite) and 1 (identical)
   */
  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Generate a mock query embedding based on keywords in the query
   * This creates a deterministic embedding that will match relevant content
   */
  private static generateQueryEmbedding(query: string): number[] {
    const lowercaseQuery = query.toLowerCase();
    
    // Base embedding - neutral
    const embedding = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    
    // Adjust based on keywords to favor certain types of content
    if (lowercaseQuery.includes('payment') || lowercaseQuery.includes('money') || lowercaseQuery.includes('owe')) {
      embedding[0] = 0.9; // Favor payment embeddings
      embedding[1] = 0.1;
    }
    
    if (lowercaseQuery.includes('dinner') || lowercaseQuery.includes('restaurant') || lowercaseQuery.includes('food')) {
      embedding[2] = 0.8; // Favor dinner/restaurant content
      embedding[3] = 0.2;
    }
    
    if (lowercaseQuery.includes('flight') || lowercaseQuery.includes('airport') || lowercaseQuery.includes('travel')) {
      embedding[1] = 0.9; // Favor travel content
      embedding[4] = 0.7;
    }
    
    if (lowercaseQuery.includes('weather') || lowercaseQuery.includes('forecast')) {
      embedding[4] = 0.9; // Favor weather content
      embedding[5] = 0.1;
    }
    
    if (lowercaseQuery.includes('task') || lowercaseQuery.includes('todo') || lowercaseQuery.includes('complete')) {
      embedding[5] = 0.9; // Favor task content
      embedding[6] = 0.2;
    }
    
    if (lowercaseQuery.includes('poll') || lowercaseQuery.includes('vote') || lowercaseQuery.includes('decide')) {
      embedding[6] = 0.9; // Favor poll content
      embedding[7] = 0.3;
    }
    
    if (lowercaseQuery.includes('urgent') || lowercaseQuery.includes('emergency') || lowercaseQuery.includes('important')) {
      embedding[2] = 0.9; // Favor broadcast/urgent content
      embedding[7] = 0.8;
    }
    
    return embedding;
  }

  /**
   * Perform mock RAG retrieval using in-memory similarity search
   * Mimics the behavior of Supabase's match_trip_embeddings RPC function
   */
  static async searchMockEmbeddings(
    query: string,
    tripId: string,
    matchThreshold: number = 0.6,
    matchCount: number = 15
  ): Promise<RAGResult[]> {
    // Simulate slight API latency for realism
    await new Promise(resolve => setTimeout(resolve, 100));
    
    
    // Generate query embedding
    const queryEmbedding = this.generateQueryEmbedding(query);
    
    // Get all mock embeddings for this trip
    const mockEmbeddings = this.getMockEmbeddings(tripId);
    
    // Calculate similarity scores
    const results = mockEmbeddings.map(embedding => ({
      ...embedding,
      similarity: this.cosineSimilarity(queryEmbedding, embedding.embedding)
    }));
    
    // Filter by threshold and sort by similarity
    const filteredResults = results
      .filter(r => r.similarity >= matchThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);
    
    
    // Return in same format as Supabase RPC
    return filteredResults.map(r => ({
      content_text: r.content_text,
      source_type: r.source_type,
      similarity: r.similarity,
      metadata: r.metadata
    }));
  }
}
