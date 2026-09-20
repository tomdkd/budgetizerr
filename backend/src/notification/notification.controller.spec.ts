import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: {
    getPublicKey: ReturnType<typeof vi.fn>;
    saveSubscription: ReturnType<typeof vi.fn>;
    sendNotificationToUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    notificationService = {
      getPublicKey: vi.fn(),
      saveSubscription: vi.fn(),
      sendNotificationToUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: notificationService },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('returns the VAPID public key', () => {
    notificationService.getPublicKey.mockReturnValue('public-key');

    expect(controller.getVapidPublicKey()).toEqual({ publicKey: 'public-key' });
  });

  it('delegates subscription persistence to the service', async () => {
    const req: any = { user: { id: 'user-1' } };
    const dto = { endpoint: 'endpoint', keys: { p256dh: 'p256dh', auth: 'auth' } };
    notificationService.saveSubscription.mockResolvedValue({ success: true });

    const result = await controller.subscribe(req, dto);

    expect(notificationService.saveSubscription).toHaveBeenCalledWith(
      'user-1',
      'endpoint',
      'p256dh',
      'auth',
    );
    expect(result).toEqual({ success: true });
  });

  it('sends a test notification to the current user', async () => {
    const req: any = { user: { id: 'user-1' } };

    const result = await controller.sendTestNotification(req);

    expect(notificationService.sendNotificationToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: expect.any(String), body: expect.any(String) }),
    );
    expect(result).toEqual({ success: true });
  });
});
