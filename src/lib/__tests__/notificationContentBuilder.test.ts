import {
  buildNotificationContent,
  buildAllChannelContent,
  isPushContent,
  isEmailContent,
  isSmsContent,
  type NotificationContentType,
  type TripContext,
} from '../notifications/contentBuilder';

const sampleTrip: TripContext = {
  tripName: 'Japan Trip',
  location: ['Tokyo', 'Kyoto', 'Osaka'],
  startDate: '2026-06-10',
  endDate: '2026-06-25',
};

describe('buildNotificationContent', () => {
  describe('push notifications', () => {
    it('builds broadcast push content', () => {
      const content = buildNotificationContent({
        type: 'broadcast_posted',
        channel: 'push',
        tripContext: sampleTrip,
        actorName: 'Tour Manager',
      });

      expect(isPushContent(content)).toBe(true);
      if (isPushContent(content)) {
        expect(content.title).toContain('Broadcast');
        expect(content.title).toContain('Japan Trip');
        expect(content.body).toContain('Tour Manager');
        expect(content.body).toContain('Open Chravel');
      }
    });

    it('builds calendar bulk import push content', () => {
      const content = buildNotificationContent({
        type: 'calendar_bulk_import',
        channel: 'push',
        tripContext: {
          tripName: 'Cat Williams Tour Nationwide',
          startDate: '2026-02-18',
          endDate: '2026-09-26',
        },
        count: 22,
      });

      if (isPushContent(content)) {
        expect(content.title).toContain('22');
        expect(content.title).toContain('Calendar Events');
        expect(content.body).toContain('Smart Import');
        expect(content.body).toContain('Cat Williams Tour Nationwide');
      }
    });

    it('builds poll push content with location context', () => {
      const content = buildNotificationContent({
        type: 'poll_created',
        channel: 'push',
        tripContext: sampleTrip,
        actorName: 'Alex',
      });

      if (isPushContent(content)) {
        expect(content.title).toContain('Poll');
        expect(content.title).toContain('Japan Trip');
        expect(content.body).toContain('Tokyo');
        expect(content.body).toContain('vote');
      }
    });

    it('builds join request push content', () => {
      const content = buildNotificationContent({
        type: 'join_request',
        channel: 'push',
        tripContext: {
          tripName: 'Becky Robinson Tour of North America',
          startDate: '2026-02-15',
          endDate: '2026-12-31',
        },
        actorName: 'Emily',
      });

      if (isPushContent(content)) {
        expect(content.title).toContain('Join Request');
        expect(content.body).toContain('Emily');
        expect(content.body).toContain('review');
      }
    });

    it('builds payment request push content', () => {
      const content = buildNotificationContent({
        type: 'payment_request',
        channel: 'push',
        tripContext: sampleTrip,
        actorName: 'Tom',
      });

      if (isPushContent(content)) {
        expect(content.title).toContain('Payment');
        expect(content.body).toContain('Tom');
        expect(content.body).toContain('review');
      }
    });
  });

  describe('email notifications', () => {
    it('builds email with subject, CTA, and footer', () => {
      const content = buildNotificationContent({
        type: 'poll_created',
        channel: 'email',
        tripContext: sampleTrip,
        actorName: 'Alex',
        extra: { tripId: 'trip-123' },
      });

      expect(isEmailContent(content)).toBe(true);
      if (isEmailContent(content)) {
        expect(content.subject).toContain('Poll');
        expect(content.ctaLabel).toBe('Open in Chravel');
        expect(content.ctaUrl).toContain('trip-123');
        expect(content.footerText).toContain('notifications enabled');
      }
    });
  });

  describe('SMS notifications', () => {
    it('builds SMS with Chravel prefix', () => {
      const content = buildNotificationContent({
        type: 'broadcast_posted',
        channel: 'sms',
        tripContext: sampleTrip,
        actorName: 'Manager',
      });

      expect(isSmsContent(content)).toBe(true);
      if (isSmsContent(content)) {
        expect(content.message).toMatch(/^Chravel:/);
        expect(content.message.length).toBeLessThanOrEqual(160);
      }
    });

    it('truncates long SMS messages', () => {
      const content = buildNotificationContent({
        type: 'broadcast_posted',
        channel: 'sms',
        tripContext: {
          tripName: 'A Very Long Trip Name That Goes On And On',
          location: ['Los Angeles', 'San Francisco', 'Seattle', 'Portland', 'Vancouver'],
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
        actorName: 'Tour Manager With A Very Long Name',
      });

      if (isSmsContent(content)) {
        expect(content.message.length).toBeLessThanOrEqual(160);
      }
    });
  });

  describe('buildAllChannelContent', () => {
    it('returns content for all three channels', () => {
      const result = buildAllChannelContent('task_assigned', sampleTrip, 'Alex');

      expect(result.push.title).toContain('Task');
      expect(result.email.subject).toContain('Task');
      expect(result.sms.message).toMatch(/^Chravel:/);
    });
  });

  describe('all notification types generate content', () => {
    const types: NotificationContentType[] = [
      'broadcast_posted',
      'calendar_event_added',
      'calendar_event_updated',
      'calendar_bulk_import',
      'payment_request',
      'payment_settled',
      'task_assigned',
      'task_completed',
      'poll_created',
      'join_request',
      'join_request_approved',
      'basecamp_updated',
      'trip_invite',
      'trip_reminder',
      'rsvp_update',
    ];

    types.forEach(type => {
      it(`generates push content for ${type}`, () => {
        const content = buildNotificationContent({
          type,
          channel: 'push',
          tripContext: sampleTrip,
          actorName: 'TestActor',
          count: 5,
        });
        if (isPushContent(content)) {
          expect(content.title.length).toBeGreaterThan(0);
          expect(content.body.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
