import { supabase } from '../integrations/supabase/client';

export class KnowledgeGraphService {
  /**
   * Ingests a message into the knowledge graph
   */
  static async ingestMessage(messageId: string, tripId: string, content: string) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-ingest', {
        body: {
          source: 'message',
          sourceId: messageId,
          tripId,
          content
        }
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Error ingesting message:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to ingest message:', error);
      return false;
    }
  }

  /**
   * Ingests a poll into the knowledge graph
   */
  static async ingestPoll(pollId: string, tripId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-ingest', {
        body: {
          source: 'poll',
          sourceId: pollId,
          tripId
        }
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Error ingesting poll:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to ingest poll:', error);
      return false;
    }
  }

  /**
   * Ingests a file into the knowledge graph
   */
  static async ingestFile(fileId: string, tripId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-ingest', {
        body: {
          source: 'file',
          sourceId: fileId,
          tripId
        }
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Error ingesting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to ingest file:', error);
      return false;
    }
  }

  /**
   * Ingests a link into the knowledge graph
   */
  static async ingestLink(linkId: string, tripId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-ingest', {
        body: {
          source: 'link',
          sourceId: linkId,
          tripId
        }
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Error ingesting link:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to ingest link:', error);
      return false;
    }
  }

  /**
   * Batch ingest existing trip data
   */
  static async batchIngestTripData(tripId: string) {
    try {
      // Ingest existing messages
      const { data: messages } = await supabase
        .from('trip_chat_messages')
        .select('id, content, author_name')
        .eq('trip_id', tripId)
        .limit(50); // Limit to recent messages

      if (messages && messages.length > 0) {
        for (const message of messages) {
          await this.ingestMessage(
            message.id,
            tripId,
            `${message.author_name}: ${message.content}`
          );
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Ingest existing polls
      const { data: polls } = await supabase
        .from('trip_polls')
        .select('id')
        .eq('trip_id', tripId);

      if (polls && polls.length > 0) {
        for (const poll of polls) {
          await this.ingestPoll(poll.id, tripId);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Ingest existing files
      const { data: files } = await supabase
        .from('trip_files')
        .select('id')
        .eq('trip_id', tripId);

      if (files && files.length > 0) {
        for (const file of files) {
          await this.ingestFile(file.id, tripId);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Ingest existing links
      const { data: links } = await supabase
        .from('trip_links')
        .select('id')
        .eq('trip_id', tripId);

      if (links && links.length > 0) {
        for (const link of links) {
          await this.ingestLink(link.id, tripId);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to batch ingest trip data:', error);
      return false;
    }
  }

  /**
   * Get knowledge graph statistics for a trip
   */
  static async getTripKnowledgeStats(tripId: string) {
    try {
      const { data: docs } = await supabase
        .from('kb_documents')
        .select('source, created_at')
        .eq('trip_id', tripId);

      if (!docs) return null;

      const stats = docs.reduce((acc: any, doc) => {
        acc[doc.source] = (acc[doc.source] || 0) + 1;
        return acc;
      }, {});

      return {
        totalDocuments: docs.length,
        sourceBreakdown: stats,
        lastIngested: docs.length > 0 ? Math.max(...docs.map(d => new Date(d.created_at).getTime())) : null
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to get knowledge graph stats:', error);
      return null;
    }
  }
}