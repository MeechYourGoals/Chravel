/// <reference types="vitest/globals" />
/**
 * Unit tests for invite link parsing utilities.
 *
 * Covers:
 * - extractInviteCodeFromLink: /j/ and /join/ formats, p.chravel.app links
 * - isDemoInviteLink / isDemoInviteCode: demo link detection
 * - Malformed link handling
 */

import { extractInviteCodeFromLink, isDemoInviteLink, isDemoInviteCode } from '../inviteLinkUtils';

describe('extractInviteCodeFromLink', () => {
  it('parses code from https://p.chravel.app/j/chravel7x9k2m', () => {
    expect(extractInviteCodeFromLink('https://p.chravel.app/j/chravel7x9k2m')).toBe(
      'chravel7x9k2m',
    );
  });

  it('parses code from demo link https://p.chravel.app/j/demo-{tripId}-{timestamp}', () => {
    const link = 'https://p.chravel.app/j/demo-abc123-xyz789';
    expect(extractInviteCodeFromLink(link)).toBe('demo-abc123-xyz789');
  });

  it('parses code from link with query params', () => {
    expect(extractInviteCodeFromLink('https://p.chravel.app/j/chravel7x9k2m?ref=share')).toBe(
      'chravel7x9k2m',
    );
  });

  it('parses code from legacy /join/ format', () => {
    expect(extractInviteCodeFromLink('https://chravel.app/join/chravel7x9k2m')).toBe(
      'chravel7x9k2m',
    );
  });

  it('parses code from relative /join/ path', () => {
    expect(extractInviteCodeFromLink('/join/chravel7x9k2m')).toBe('chravel7x9k2m');
  });

  it('returns null for malformed link', () => {
    expect(extractInviteCodeFromLink('https://p.chravel.app/t/123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractInviteCodeFromLink('')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(extractInviteCodeFromLink('not-a-url')).toBeNull();
  });

  it('handles link with fragment', () => {
    expect(extractInviteCodeFromLink('https://p.chravel.app/j/chravel7x9k2m#section')).toBe(
      'chravel7x9k2m',
    );
  });
});

describe('isDemoInviteLink', () => {
  it('identifies demo links correctly', () => {
    expect(isDemoInviteLink('https://p.chravel.app/j/demo-abc123-xyz')).toBe(true);
  });

  it('returns false for real invite links', () => {
    expect(isDemoInviteLink('https://p.chravel.app/j/chravel7x9k2m')).toBe(false);
  });

  it('returns false for empty or invalid', () => {
    expect(isDemoInviteLink('')).toBe(false);
    expect(isDemoInviteLink('https://example.com')).toBe(false);
  });
});

describe('isDemoInviteCode', () => {
  it('returns true for demo codes', () => {
    expect(isDemoInviteCode('demo-abc123-xyz')).toBe(true);
  });

  it('returns false for real codes', () => {
    expect(isDemoInviteCode('chravel7x9k2m')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDemoInviteCode('')).toBe(false);
  });
});
