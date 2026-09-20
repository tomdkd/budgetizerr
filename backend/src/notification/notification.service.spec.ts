import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';

vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

import * as webpush from 'web-push';

describe('NotificationService', () => {
  let subscriptionRepository: { findOne: ReturnType<typeof vi.fn>; find: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let userRepository: { findOne: ReturnType<typeof vi.fn> };
  let configService: { getOrThrow: ReturnType<typeof vi.fn> };
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn(),
      delete: vi.fn(),
    };
    userRepository = { findOne: vi.fn() };
    configService = {
      getOrThrow: vi.fn((key: string) => `value-${key}`),
    };
    service = new NotificationService(
      subscriptionRepository as any,
      userRepository as any,
      configService as any,
    );
  });

  it('configures web-push with the VAPID settings on construction', () => {
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'value-VAPID_SUBJECT',
      'value-VAPID_PUBLIC_KEY',
      'value-VAPID_PRIVATE_KEY',
    );
  });

  it('returns the public VAPID key', () => {
    expect(service.getPublicKey()).toBe('value-VAPID_PUBLIC_KEY');
  });

  describe('saveSubscription', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.saveSubscription('user-1', 'endpoint', 'p256dh', 'auth'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a new subscription when none exists for the endpoint', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-1' });
      subscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.saveSubscription('user-1', 'endpoint', 'p256dh', 'auth');

      expect(subscriptionRepository.create).toHaveBeenCalledWith({
        endpoint: 'endpoint',
        p256dh: 'p256dh',
        auth: 'auth',
        user: { id: 'user-1' },
      });
      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('updates the existing subscription for the endpoint', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-1' });
      const existing = { endpoint: 'endpoint', p256dh: 'old', auth: 'old' };
      subscriptionRepository.findOne.mockResolvedValue(existing);

      await service.saveSubscription('user-1', 'endpoint', 'new-p256dh', 'new-auth');

      expect(existing).toMatchObject({ p256dh: 'new-p256dh', auth: 'new-auth', user: { id: 'user-1' } });
      expect(subscriptionRepository.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('sendNotificationToUser', () => {
    it('sends a push notification to every subscription of the user', async () => {
      subscriptionRepository.find.mockResolvedValue([
        { id: 'sub-1', endpoint: 'endpoint-1', p256dh: 'p1', auth: 'a1' },
      ]);

      await service.sendNotificationToUser('user-1', { title: 'Hello', body: 'World' });

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        { endpoint: 'endpoint-1', keys: { p256dh: 'p1', auth: 'a1' } },
        JSON.stringify({ title: 'Hello', body: 'World' }),
      );
    });

    it('deletes the subscription when web-push reports it is gone (410)', async () => {
      subscriptionRepository.find.mockResolvedValue([
        { id: 'sub-1', endpoint: 'endpoint-1', p256dh: 'p1', auth: 'a1' },
      ]);
      (webpush.sendNotification as any).mockRejectedValueOnce({ statusCode: 410 });

      await service.sendNotificationToUser('user-1', { title: 'Hello', body: 'World' });

      expect(subscriptionRepository.delete).toHaveBeenCalledWith('sub-1');
    });

    it('keeps the subscription when the error is not a 404/410', async () => {
      subscriptionRepository.find.mockResolvedValue([
        { id: 'sub-1', endpoint: 'endpoint-1', p256dh: 'p1', auth: 'a1' },
      ]);
      (webpush.sendNotification as any).mockRejectedValueOnce({ statusCode: 500 });

      await service.sendNotificationToUser('user-1', { title: 'Hello', body: 'World' });

      expect(subscriptionRepository.delete).not.toHaveBeenCalled();
    });
  });
});
