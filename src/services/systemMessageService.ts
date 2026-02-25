// System message service for consumer trips only

import { supabase } from '@/integrations/supabase/client';
import { isConsumerTrip } from '@/utils/tripTierDetector';
import { SystemEventType, SystemMessagePayload } from '@/types/systemMessages';

class SystemMessageService {
  private uploadBatchQueue: Map<string, { count: number; timer: NodeJS.Timeout }> = new Map();
  private BATCH_DELAY_MS = 30000; // 30 second batching window for uploads

  /**
   * Create a system message in the trip chat
   * Only works for consumer trips (IDs 1-12)
   */
  async createSystemMessage(
    tripId: string,
    eventType: SystemEventType,
    body: string,
    payload?: SystemMessagePayload,
  ): Promise<boolean> {
    // GUARD: Only create system messages for consumer trips
    if (!isConsumerTrip(tripId)) {
      console.log('[SystemMessage] Skipping for non-consumer trip:', tripId);
      return false;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const authorName = payload?.actorName || user?.email?.split('@')[0] || 'System';

      const { error } = await supabase.from('trip_chat_messages').insert({
        trip_id: tripId,
        content: body,
        author_name: authorName,
        user_id: user?.id || null,
        message_type: 'system',
        system_event_type: eventType,
        payload: payload as any,
      });

      if (error) {
        console.error('[SystemMessage] Failed to create:', error);
        return false;
      }

      console.log('[SystemMessage] Created:', eventType, body);
      return true;
    } catch (error) {
      console.error('[SystemMessage] Error:', error);
      return false;
    }
  }

  /**
   * Create a batched upload system message
   * Collects multiple uploads within 30 seconds and creates a single message
   */
  async createBatchedUploadMessage(
    tripId: string,
    uploaderId: string,
    uploaderName: string,
    mediaType: 'photo' | 'file',
  ): Promise<void> {
    // GUARD: Only for consumer trips
    if (!isConsumerTrip(tripId)) {
      return;
    }

    const batchKey = `${tripId}-${uploaderId}-${mediaType}`;
    const existing = this.uploadBatchQueue.get(batchKey);

    if (existing) {
      // Increment count and reset timer
      clearTimeout(existing.timer);
      existing.count += 1;
      existing.timer = setTimeout(
        () => this.flushUploadBatch(batchKey, tripId, uploaderName, mediaType),
        this.BATCH_DELAY_MS,
      );
    } else {
      // Start new batch
      const timer = setTimeout(
        () => this.flushUploadBatch(batchKey, tripId, uploaderName, mediaType),
        this.BATCH_DELAY_MS,
      );
      this.uploadBatchQueue.set(batchKey, { count: 1, timer });
    }
  }

  private async flushUploadBatch(
    batchKey: string,
    tripId: string,
    uploaderName: string,
    mediaType: 'photo' | 'file',
  ): Promise<void> {
    const batch = this.uploadBatchQueue.get(batchKey);
    if (!batch) return;

    this.uploadBatchQueue.delete(batchKey);

    const count = batch.count;
    const eventType = mediaType === 'photo' ? 'photos_uploaded' : 'files_uploaded';
    const itemType = mediaType === 'photo' ? 'photo' : 'file';
    const body = `${uploaderName} uploaded ${count} ${itemType}${count > 1 ? 's' : ''}`;

    await this.createSystemMessage(tripId, eventType, body, {
      actorName: uploaderName,
      mediaCount: count,
      mediaType,
    });
  }

  // Convenience methods for specific event types

  async memberJoined(tripId: string, memberName: string, memberId?: string): Promise<boolean> {
    return this.createSystemMessage(tripId, 'member_joined', `${memberName} joined the trip`, {
      memberName,
      memberId,
      actorName: memberName,
    });
  }

  async memberLeft(tripId: string, memberName: string, memberId?: string): Promise<boolean> {
    return this.createSystemMessage(tripId, 'member_left', `${memberName} left the trip`, {
      memberName,
      memberId,
      actorName: memberName,
    });
  }

  async tripBaseCampUpdated(
    tripId: string,
    actorName: string,
    previousAddress?: string,
    newAddress?: string,
  ): Promise<boolean> {
    let body: string;
    if (previousAddress && newAddress) {
      body = `Base camp changed from ${previousAddress} → ${newAddress}`;
    } else if (newAddress) {
      body = `Base camp set to ${newAddress}`;
    } else {
      body = `Base camp was updated`;
    }

    return this.createSystemMessage(tripId, 'trip_base_camp_updated', body, {
      actorName,
      previousAddress,
      newAddress,
    });
  }

  async personalBaseCampUpdated(
    tripId: string,
    actorName: string,
    newAddress?: string,
  ): Promise<boolean> {
    const body = newAddress
      ? `${actorName} set their personal base camp to ${newAddress}`
      : `${actorName} updated their personal base camp`;

    return this.createSystemMessage(tripId, 'personal_base_camp_updated', body, {
      actorName,
      newAddress,
    });
  }

  async pollCreated(
    tripId: string,
    actorName: string,
    pollId: string,
    question: string,
  ): Promise<boolean> {
    return this.createSystemMessage(
      tripId,
      'poll_created',
      `${actorName} created a poll: "${question}"`,
      {
        actorName,
        pollId,
        pollQuestion: question,
      },
    );
  }

  async pollClosed(
    tripId: string,
    actorName: string,
    pollId: string,
    winningOption?: string,
  ): Promise<boolean> {
    const body = winningOption ? `Poll closed - "${winningOption}" won` : `A poll was closed`;

    return this.createSystemMessage(tripId, 'poll_closed', body, {
      actorName,
      pollId,
      winningOption,
    });
  }

  async taskCreated(
    tripId: string,
    actorName: string,
    taskId: string,
    taskTitle: string,
  ): Promise<boolean> {
    return this.createSystemMessage(
      tripId,
      'task_created',
      `${actorName} added a task: "${taskTitle}"`,
      {
        actorName,
        taskId,
        taskTitle,
      },
    );
  }

  async taskCompleted(
    tripId: string,
    actorName: string,
    taskId: string,
    taskTitle: string,
  ): Promise<boolean> {
    return this.createSystemMessage(
      tripId,
      'task_completed',
      `${actorName} completed: "${taskTitle}"`,
      {
        actorName,
        taskId,
        taskTitle,
      },
    );
  }

  async calendarItemAdded(
    tripId: string,
    actorName: string,
    eventId: string,
    eventTitle: string,
  ): Promise<boolean> {
    return this.createSystemMessage(
      tripId,
      'calendar_item_added',
      `${actorName} added "${eventTitle}" to the calendar`,
      {
        actorName,
        eventId,
        eventTitle,
      },
    );
  }

  async paymentRecorded(
    tripId: string,
    actorName: string,
    paymentId: string,
    amount: number,
    currency: string,
    description: string,
  ): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);

    return this.createSystemMessage(
      tripId,
      'payment_recorded',
      `${actorName} added an expense: ${description} (${formattedAmount})`,
      {
        actorName,
        paymentId,
        amount,
        currency,
        description,
      },
    );
  }

  async paymentSettled(
    tripId: string,
    actorName: string,
    paymentId: string,
    description: string,
  ): Promise<boolean> {
    return this.createSystemMessage(
      tripId,
      'payment_settled',
      `${description} was marked as settled`,
      {
        actorName,
        paymentId,
        description,
      },
    );
  }
}

export const systemMessageService = new SystemMessageService();
