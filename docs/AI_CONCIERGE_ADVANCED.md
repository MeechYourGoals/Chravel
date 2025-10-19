# AI Concierge Advanced Features Guide

## Future Enhancements

This document outlines advanced features and optimizations for the AI Concierge system that can be implemented as the platform scales.

## 1. Dedicated Gemini Edge Function

### Overview
Create a dedicated edge function specifically for Google Gemini integration, separate from the current `lovable-concierge` function.

### Implementation Steps

#### Step 1: Create New Edge Function

```bash
# Create new edge function
supabase functions new gemini-concierge
```

#### Step 2: Implement Function (`supabase/functions/gemini-concierge/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"
import { TripContextBuilder } from "../_shared/contextBuilder.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

interface GeminiConciergeRequest {
  message: string
  tripId: string
  chatHistory?: Array<{ role: string; content: string }>
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, tripId, chatHistory = [], config = {} }: GeminiConciergeRequest = await req.json()
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Get comprehensive context
    const context = await TripContextBuilder.buildContext(tripId)
    
    // Build system prompt with context
    const systemPrompt = buildGeminiSystemPrompt(context)
    
    // Call Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser: ${message}`
          }]
        }],
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 2048,
        }
      })
    })

    const data = await response.json()
    
    // Track usage
    await supabase.from('concierge_usage').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      trip_id: tripId,
      query_text: message,
      response_tokens: data.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0,
      model_used: 'gemini-1.5-pro'
    })

    return new Response(JSON.stringify({
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
      usage: { total_tokens: data.usageMetadata?.totalTokenCount || 0 },
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

function buildGeminiSystemPrompt(context: any): string {
  // Enhanced system prompt for Gemini
  return `You are Chravel Concierge, an AI travel assistant with complete trip context awareness.
  
  Trip Context:
  - Destination: ${context.tripMetadata?.destination}
  - Dates: ${context.tripMetadata?.startDate} to ${context.tripMetadata?.endDate}
  - Participants: ${context.collaborators?.length || 0} people
  - Recent Messages: ${context.messages?.slice(-3).map(m => `${m.authorName}: ${m.content}`).join('\n')}
  - Upcoming Events: ${context.calendar?.slice(0, 3).map(e => `${e.title} at ${e.startTime}`).join('\n')}
  - Active Tasks: ${context.tasks?.filter(t => !t.isComplete).slice(0, 3).map(t => t.content).join('\n')}
  
  Provide helpful, contextual responses based on this trip data.`
}
```

#### Step 3: Update Frontend Service

```typescript
// In src/services/universalConciergeService.ts
const { data, error } = await supabase.functions.invoke('gemini-concierge', {
  body: {
    message: message,
    tripId: tripContext.tripId,
    chatHistory: comprehensiveContext.messages?.slice(-10) || []
  }
});
```

### Benefits
- Direct Gemini API integration
- Better performance and reliability
- Custom model configuration
- Advanced features like function calling

## 2. Full Supabase Realtime Subscriptions

### Overview
Replace polling-based updates with real-time WebSocket subscriptions for instant context updates.

### Implementation Steps

#### Step 1: Create Realtime Service

```typescript
// src/services/realtimeContextService.ts
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../integrations/supabase/client'
import { ContextCacheService } from './contextCacheService'

export class RealtimeContextService {
  private channels: Map<string, RealtimeChannel> = new Map()

  subscribeToTripUpdates(tripId: string, onUpdate: () => void): RealtimeChannel {
    const channel = supabase
      .channel(`trip-context-${tripId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `trip_id=eq.${tripId}`
      }, () => {
        ContextCacheService.invalidate(tripId)
        onUpdate()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trip_events',
        filter: `trip_id=eq.${tripId}`
      }, () => {
        ContextCacheService.invalidate(tripId)
        onUpdate()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trip_tasks',
        filter: `trip_id=eq.${tripId}`
      }, () => {
        ContextCacheService.invalidate(tripId)
        onUpdate()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trip_payment_messages',
        filter: `trip_id=eq.${tripId}`
      }, () => {
        ContextCacheService.invalidate(tripId)
        onUpdate()
      })
      .subscribe()

    this.channels.set(tripId, channel)
    return channel
  }

  unsubscribeFromTrip(tripId: string): void {
    const channel = this.channels.get(tripId)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(tripId)
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

export const realtimeContextService = new RealtimeContextService()
```

#### Step 2: Update AI Concierge Chat Component

```typescript
// In src/components/AIConciergeChat.tsx
import { realtimeContextService } from '../services/realtimeContextService'

export const AIConciergeChat = ({ tripId, ...props }) => {
  useEffect(() => {
    // Subscribe to real-time updates
    const channel = realtimeContextService.subscribeToTripUpdates(tripId, () => {
      // Context will be automatically refreshed on next AI query
      console.log('Trip context updated in real-time')
    })

    return () => {
      realtimeContextService.unsubscribeFromTrip(tripId)
    }
  }, [tripId])

  // ... rest of component
}
```

### Benefits
- Instant context updates
- Reduced server load
- Better user experience
- Real-time collaboration

## 3. Complete Media Processing Pipeline

### Overview
Implement full media processing for PDFs, images, and documents to extract meaningful content for AI context.

### Implementation Steps

#### Step 1: Create Media Processing Service

```typescript
// src/services/mediaProcessingService.ts
import { supabase } from '../integrations/supabase/client'

export class MediaProcessingService {
  async processFile(fileId: string, fileType: string, fileUrl: string): Promise<{
    extractedText?: string
    metadata?: any
    summary?: string
  }> {
    switch (fileType) {
      case 'application/pdf':
        return await this.processPDF(fileUrl)
      case 'image/jpeg':
      case 'image/png':
        return await this.processImage(fileUrl)
      case 'text/plain':
        return await this.processText(fileUrl)
      default:
        return {}
    }
  }

  private async processPDF(fileUrl: string): Promise<any> {
    // Use PDF parsing library or API
    const response = await fetch('/api/process-pdf', {
      method: 'POST',
      body: JSON.stringify({ url: fileUrl })
    })
    return await response.json()
  }

  private async processImage(fileUrl: string): Promise<any> {
    // Use OCR service
    const response = await fetch('/api/process-image', {
      method: 'POST',
      body: JSON.stringify({ url: fileUrl })
    })
    return await response.json()
  }

  private async processText(fileUrl: string): Promise<any> {
    // Direct text extraction
    const response = await fetch(fileUrl)
    const text = await response.text()
    return { extractedText: text }
  }
}
```

#### Step 2: Create Processing Edge Function

```typescript
// supabase/functions/process-media/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { fileUrl, fileType } = await req.json()
  
  let result = {}
  
  if (fileType === 'application/pdf') {
    // Use PDF parsing library
    result = await parsePDF(fileUrl)
  } else if (fileType.startsWith('image/')) {
    // Use OCR service
    result = await extractTextFromImage(fileUrl)
  }
  
  return new Response(JSON.stringify(result))
})
```

#### Step 3: Update Context Aggregator

```typescript
// In src/services/tripContextAggregator.ts
private static async fetchFiles(tripId: string) {
  const { data } = await supabase
    .from('trip_files')
    .select(`
      id, file_name, file_type, file_url, uploaded_by, created_at,
      extracted_text, ai_summary, metadata,
      profiles:uploaded_by(full_name)
    `)
    .eq('trip_id', tripId)

  return data?.map(f => ({
    id: f.id,
    name: f.file_name,
    type: f.file_type,
    url: f.file_url,
    uploadedBy: f.profiles?.full_name || 'Unknown',
    uploadedAt: f.created_at,
    extractedText: f.extracted_text,
    aiSummary: f.ai_summary,
    metadata: f.metadata
  })) || []
}
```

### Benefits
- Rich content extraction
- Better AI context
- Searchable documents
- Automated processing

## 4. Vector Database for Semantic Search

### Overview
Implement vector embeddings for semantic search across all trip content.

### Implementation Steps

#### Step 1: Create Embeddings Service

```typescript
// src/services/embeddingsService.ts
export class EmbeddingsService {
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('/api/generate-embedding', {
      method: 'POST',
      body: JSON.stringify({ text })
    })
    return await response.json()
  }

  async searchSimilar(content: string, tripId: string): Promise<any[]> {
    const embedding = await this.generateEmbedding(content)
    
    const { data } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
      trip_id: tripId
    })
    
    return data || []
  }
}
```

#### Step 2: Create Vector Search Function

```sql
-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  trip_id text
)
RETURNS TABLE (
  id text,
  content text,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  FROM trip_content_embeddings
  WHERE trip_id = $4
  AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Benefits
- Semantic search capabilities
- Better content discovery
- Contextual recommendations
- Advanced AI features

## 5. Performance Optimization

### Caching Strategy
- Redis for distributed caching
- CDN for static assets
- Edge caching for API responses

### Database Optimization
- Connection pooling
- Query optimization
- Indexing strategies
- Partitioning for large datasets

### Monitoring
- Performance metrics
- Error tracking
- Usage analytics
- Cost optimization

## 6. Security Enhancements

### Data Encryption
- End-to-end encryption
- Field-level encryption
- Key management
- Audit logging

### Access Control
- Fine-grained permissions
- Role-based access
- API rate limiting
- DDoS protection

## 7. Scaling Considerations

### Infrastructure
- Auto-scaling
- Load balancing
- Database sharding
- Microservices architecture

### Cost Optimization
- Resource monitoring
- Usage-based pricing
- Efficient algorithms
- Caching strategies

## Implementation Priority

1. **High Priority**
   - Dedicated Gemini edge function
   - Realtime subscriptions
   - Basic media processing

2. **Medium Priority**
   - Advanced media processing
   - Vector database
   - Performance optimization

3. **Low Priority**
   - Advanced security features
   - Scaling optimizations
   - Cost management

## Conclusion

These advanced features will transform the AI Concierge into a world-class travel assistant that provides unprecedented value to users. The modular approach allows for incremental implementation based on user needs and platform growth.
