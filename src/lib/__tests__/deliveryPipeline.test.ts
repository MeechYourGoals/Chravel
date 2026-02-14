import {
  applyProviderAttempt,
  createQueuedDeliveries,
  evaluateChannelEligibility,
} from '../notifications/deliveryPipeline';

describe('notification delivery pipeline', () => {
  it('creates queued rows for all channels', () => {
    const queued = createQueuedDeliveries('notif-1', 'user-1');
    expect(queued).toHaveLength(3);
    expect(queued.map(row => row.channel)).toEqual(['push', 'email', 'sms']);
    expect(queued.every(row => row.status === 'queued')).toBe(true);
  });

  it('supports queued -> sent transition for integration-ish flow', () => {
    const [smsQueued] = createQueuedDeliveries('notif-2', 'user-2', ['sms']);

    const eligibility = evaluateChannelEligibility({
      channel: 'sms',
      channelEnabled: true,
      categoryEnabled: true,
      inQuietHours: false,
      smsEligibleCategory: true,
      smsEntitled: true,
      hasSmsPhone: true,
    });

    expect(eligibility.status).toBe('queued');

    const sent = applyProviderAttempt(
      { ...smsQueued, status: eligibility.status, reason: eligibility.reason },
      { success: true, providerMessageId: 'SM123' },
    );

    expect(sent.status).toBe('sent');
    expect(sent.providerMessageId).toBe('SM123');
  });

  it('defers sms during quiet hours without marking failed', () => {
    const decision = evaluateChannelEligibility({
      channel: 'sms',
      channelEnabled: true,
      categoryEnabled: true,
      inQuietHours: true,
      smsEligibleCategory: true,
      smsEntitled: true,
      hasSmsPhone: true,
    });

    expect(decision.status).toBe('queued');
    expect(decision.reason).toBe('quiet_hours_deferred');
  });
});
