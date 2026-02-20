/**
 * Tests for Chat Search Service - Message/Broadcast search with filters
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveSenderNameToIds,
  searchChatContentWithFilters,
  searchChatContent,
} from '../chatSearchService';
import { supabase } from '@/integrations/supabase/client';

const createChainMock = (resolvedValue: { data: unknown; error: unknown }) => {
  const promise = Promise.resolve(resolvedValue);
  const chain: Record<string, unknown> = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    ilike: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (v: unknown) => unknown) => promise.then(onFulfilled),
    catch: (onRejected: (e: unknown) => unknown) => promise.catch(onRejected),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.ilike.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('chatSearchService', () => {
  const tripId = 'trip-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveSenderNameToIds', () => {
    it('returns matching user_ids for partial name match', async () => {
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          createChainMock({
            data: [{ user_id: 'u1' }, { user_id: 'u2' }],
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createChainMock({
            data: [
              { user_id: 'u1', resolved_display_name: 'Coach Mike', display_name: 'Coach' },
              { user_id: 'u2', resolved_display_name: 'Alice', display_name: 'Alice' },
            ],
            error: null,
          }),
        );

      const ids = await resolveSenderNameToIds(tripId, 'Coach');
      expect(ids).toContain('u1');
      expect(ids).not.toContain('u2');
    });

    it('returns empty when no match', async () => {
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(createChainMock({ data: [{ user_id: 'u1' }], error: null }))
        .mockReturnValueOnce(
          createChainMock({
            data: [{ user_id: 'u1', resolved_display_name: 'Alice' }],
            error: null,
          }),
        );

      const ids = await resolveSenderNameToIds(tripId, 'UnknownPerson');
      expect(ids).toEqual([]);
    });

    it('returns empty for empty sender name', async () => {
      const ids = await resolveSenderNameToIds(tripId, '');
      expect(ids).toEqual([]);
    });
  });

  describe('searchChatContentWithFilters', () => {
    it('delegates to searchChatContent for plain text (backward compat)', async () => {
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                id: 'm1',
                content: 'hello',
                author_name: 'A',
                user_id: 'u1',
                created_at: '2026-01-01',
              },
            ],
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createChainMock({
            data: [],
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                user_id: 'u1',
                resolved_display_name: 'A',
                display_name: null,
                first_name: null,
                last_name: null,
              },
            ],
            error: null,
          }),
        );

      const result = await searchChatContentWithFilters(tripId, {
        text: 'hello',
      });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('hello');
    });

    it('returns only broadcasts when isBroadcastOnly', async () => {
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                id: 'b1',
                message: 'Announcement',
                created_by: 'u1',
                priority: 'normal',
                created_at: '2026-01-15',
              },
            ],
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                user_id: 'u1',
                resolved_display_name: 'Coach',
                display_name: null,
                first_name: null,
                last_name: null,
              },
            ],
            error: null,
          }),
        );

      const result = await searchChatContentWithFilters(tripId, {
        text: '',
        isBroadcastOnly: true,
      });
      expect(result.messages).toHaveLength(0);
      expect(result.broadcasts).toHaveLength(1);
      expect(result.broadcasts[0].message).toBe('Announcement');
    });
  });

  describe('searchChatContent (legacy)', () => {
    it('searches messages and broadcasts by text', async () => {
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                id: 'm1',
                content: 'test',
                author_name: 'A',
                user_id: 'u1',
                created_at: '2026-01-01',
              },
            ],
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                id: 'b1',
                message: 'test',
                created_by: 'u1',
                priority: null,
                created_at: '2026-01-01',
              },
            ],
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createChainMock({
            data: [
              {
                user_id: 'u1',
                resolved_display_name: 'A',
                display_name: null,
                first_name: null,
                last_name: null,
              },
            ],
            error: null,
          }),
        );

      const result = await searchChatContent(tripId, 'test');
      expect(result.messages).toHaveLength(1);
      expect(result.broadcasts).toHaveLength(1);
    });
  });
});
