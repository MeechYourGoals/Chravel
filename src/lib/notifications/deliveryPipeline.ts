export type DeliveryChannel = 'push' | 'email' | 'sms';
export type DeliveryStatus = 'queued' | 'sent' | 'failed' | 'skipped';

export interface DeliveryRecord {
  notificationId: string;
  recipientUserId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  reason?: string;
  providerMessageId?: string;
}

export interface ChannelEligibilityInput {
  channel: DeliveryChannel;
  channelEnabled: boolean;
  categoryEnabled: boolean;
  inQuietHours: boolean;
  smsEligibleCategory?: boolean;
  smsEntitled?: boolean;
  hasSmsPhone?: boolean;
}

export interface ProviderAttemptResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export function createQueuedDeliveries(
  notificationId: string,
  recipientUserId: string,
  channels: DeliveryChannel[] = ['push', 'email', 'sms'],
): DeliveryRecord[] {
  return channels.map(channel => ({
    notificationId,
    recipientUserId,
    channel,
    status: 'queued',
  }));
}

export function evaluateChannelEligibility(input: ChannelEligibilityInput): {
  status: DeliveryStatus;
  reason?: string;
} {
  if (!input.categoryEnabled) {
    return { status: 'skipped', reason: 'category_disabled' };
  }

  if (!input.channelEnabled) {
    return { status: 'skipped', reason: `${input.channel}_disabled` };
  }

  if (input.channel === 'sms') {
    if (!input.smsEligibleCategory) {
      return { status: 'skipped', reason: 'sms_category_ineligible' };
    }

    if (!input.smsEntitled) {
      return { status: 'skipped', reason: 'sms_not_entitled' };
    }

    if (!input.hasSmsPhone) {
      return { status: 'skipped', reason: 'sms_missing_phone' };
    }

    if (input.inQuietHours) {
      // Deferred SMS stays queued until quiet hours end.
      return { status: 'queued', reason: 'quiet_hours_deferred' };
    }
  }

  return { status: 'queued' };
}

export function applyProviderAttempt(
  delivery: DeliveryRecord,
  attempt: ProviderAttemptResult,
): DeliveryRecord {
  if (delivery.status !== 'queued') {
    return delivery;
  }

  if (attempt.success) {
    return {
      ...delivery,
      status: 'sent',
      providerMessageId: attempt.providerMessageId,
      reason: undefined,
    };
  }

  return {
    ...delivery,
    status: 'failed',
    reason: attempt.error || 'provider_failure',
  };
}
