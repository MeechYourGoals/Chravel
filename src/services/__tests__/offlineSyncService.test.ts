/**
 * Tests for offlineSyncService
 *
 * Critical test: Verify operations without handlers are NOT deleted
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineSyncService } from '../offlineSyncService';

describe('offlineSyncService - Data Loss Prevention', () => {
  beforeEach(async () => {
    // Clear queue before each test
    const operations = await offlineSyncService.getQueuedOperations();
    for (const op of operations) {
      await offlineSyncService.removeOperation(op.id);
    }
  });

  it('should NOT delete operations without handlers', async () => {
    // Queue a task operation
    const taskQueueId = await offlineSyncService.queueOperation('task', 'create', 'trip-123', {
      title: 'Test Task',
      description: 'Test',
    });

    // Queue a calendar event operation
    const eventQueueId = await offlineSyncService.queueOperation(
      'calendar_event',
      'create',
      'trip-123',
      { title: 'Test Event', start_time: new Date().toISOString() },
    );

    // Process queue with ONLY chat message handler
    const result = await offlineSyncService.processSyncQueue({
      onChatMessageCreate: async () => ({ id: 'msg-123' }),
      // NO handlers for tasks or calendar events
    });

    // Verify operations were NOT processed (no handlers)
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);

    // CRITICAL: Verify operations still exist in queue (NOT deleted)
    const remainingOps = await offlineSyncService.getQueuedOperations();
    const remainingIds = remainingOps.map(op => op.id);

    expect(remainingIds).toContain(taskQueueId);
    expect(remainingIds).toContain(eventQueueId);
    expect(remainingOps.length).toBe(2);

    // Verify operations are back to 'pending' status
    const taskOp = remainingOps.find(op => op.id === taskQueueId);
    const eventOp = remainingOps.find(op => op.id === eventQueueId);

    expect(taskOp?.status).toBe('pending');
    expect(eventOp?.status).toBe('pending');
  });

  it('should delete operations WITH handlers', async () => {
    // Queue a chat message operation
    const chatQueueId = await offlineSyncService.queueOperation(
      'chat_message',
      'create',
      'trip-123',
      { content: 'Test message', author_name: 'Test User' },
    );

    // Process queue WITH chat message handler
    const mockHandler = vi.fn().mockResolvedValue({ id: 'msg-123' });
    const result = await offlineSyncService.processSyncQueue({
      onChatMessageCreate: mockHandler,
    });

    // Verify operation WAS processed
    expect(result.processed).toBe(1);
    expect(mockHandler).toHaveBeenCalledTimes(1);

    // CRITICAL: Verify operation was REMOVED from queue
    const remainingOps = await offlineSyncService.getQueuedOperations();
    const remainingIds = remainingOps.map(op => op.id);

    expect(remainingIds).not.toContain(chatQueueId);
  });

  it('should process operations with matching handlers and preserve others', async () => {
    // Queue multiple operations
    const chatQueueId = await offlineSyncService.queueOperation(
      'chat_message',
      'create',
      'trip-123',
      { content: 'Test', author_name: 'User' },
    );

    const taskQueueId = await offlineSyncService.queueOperation('task', 'create', 'trip-123', {
      title: 'Test Task',
    });

    // Process with only chat handler
    const mockChatHandler = vi.fn().mockResolvedValue({ id: 'msg-123' });
    const result = await offlineSyncService.processSyncQueue({
      onChatMessageCreate: mockChatHandler,
      // NO task handler
    });

    // Verify chat was processed
    expect(result.processed).toBe(1);
    expect(mockChatHandler).toHaveBeenCalledTimes(1);

    // Verify chat was removed
    const remainingOps = await offlineSyncService.getQueuedOperations();
    const remainingIds = remainingOps.map(op => op.id);

    expect(remainingIds).not.toContain(chatQueueId);

    // CRITICAL: Verify task was NOT removed (no handler)
    expect(remainingIds).toContain(taskQueueId);
    expect(remainingOps.length).toBe(1);
  });

  it('should handle errors without deleting operations', async () => {
    // Queue a chat message
    const chatQueueId = await offlineSyncService.queueOperation(
      'chat_message',
      'create',
      'trip-123',
      { content: 'Test', author_name: 'User' },
    );

    // Process with handler that throws error
    const mockHandler = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await offlineSyncService.processSyncQueue({
      onChatMessageCreate: mockHandler,
    });

    // Verify operation was NOT processed
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0); // Not failed yet, just retried

    // CRITICAL: Verify operation still exists (not deleted on error)
    const remainingOps = await offlineSyncService.getQueuedOperations();
    const remainingIds = remainingOps.map(op => op.id);

    expect(remainingIds).toContain(chatQueueId);

    // Verify retry count was incremented
    const op = remainingOps.find(o => o.id === chatQueueId);
    expect(op?.retryCount).toBe(1);
  });

  it('should process poll votes when handler provided', async () => {
    const voteQueueId = await offlineSyncService.queueOperation(
      'poll_vote',
      'create',
      'trip-123',
      { optionIds: ['option_1'] },
      'poll-1',
    );

    const mockVoteHandler = vi.fn().mockResolvedValue({ pollId: 'poll-1' });
    const result = await offlineSyncService.processSyncQueue({
      onPollVote: mockVoteHandler,
    });

    expect(result.processed).toBe(1);
    expect(mockVoteHandler).toHaveBeenCalledTimes(1);

    const remainingOps = await offlineSyncService.getQueuedOperations();
    expect(remainingOps.map(op => op.id)).not.toContain(voteQueueId);
  });

  it('should route task completion updates to onTaskToggle (even if onTaskUpdate exists)', async () => {
    const taskQueueId = await offlineSyncService.queueOperation(
      'task',
      'update',
      'trip-123',
      { completed: true },
      'task-1',
    );

    const onTaskUpdate = vi.fn().mockResolvedValue({ id: 'task-1' });
    const onTaskToggle = vi.fn().mockResolvedValue({ taskId: 'task-1', completed: true });

    const result = await offlineSyncService.processSyncQueue({
      onTaskUpdate,
      onTaskToggle,
    });

    expect(result.processed).toBe(1);
    expect(onTaskToggle).toHaveBeenCalledTimes(1);
    expect(onTaskUpdate).not.toHaveBeenCalled();

    const remainingOps = await offlineSyncService.getQueuedOperations();
    expect(remainingOps.map(op => op.id)).not.toContain(taskQueueId);
  });

  it('should reject basecamp operations (guardrail)', async () => {
    await expect(
      offlineSyncService.queueOperation('basecamp' as any, 'update', 'trip-123', { address: 'X' }),
    ).rejects.toThrow('Basecamp');
  });
});
