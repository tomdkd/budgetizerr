import { MonthlyReminderService } from './monthly-reminder.service';

describe('MonthlyReminderService', () => {
  let householdRepository: { find: ReturnType<typeof vi.fn>; findOne: ReturnType<typeof vi.fn> };
  let notificationService: { sendNotificationToUser: ReturnType<typeof vi.fn> };
  let service: MonthlyReminderService;

  beforeEach(() => {
    householdRepository = { find: vi.fn(), findOne: vi.fn() };
    notificationService = { sendNotificationToUser: vi.fn() };
    service = new MonthlyReminderService(householdRepository as any, notificationService as any);
  });

  describe('sendMonthlyReminders', () => {
    it('sends a reminder only for households whose reminderDay matches today', async () => {
      const today = new Date().getDate();
      const matchingHousehold = {
        id: 'household-1',
        reminderDay: today,
        members: [
          { user: { id: 'user-1' }, contributionRate: 50 },
          { user: { id: 'user-2' }, contributionRate: 50 },
        ],
        subscriptions: [{ isActive: true, amount: 100 }],
      };
      const otherHousehold = {
        id: 'household-2',
        reminderDay: today === 1 ? 2 : 1,
        members: [],
        subscriptions: [],
      };
      householdRepository.find.mockResolvedValue([matchingHousehold, otherHousehold]);

      await service.sendMonthlyReminders();

      expect(notificationService.sendNotificationToUser).toHaveBeenCalledTimes(2);
      expect(notificationService.sendNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ title: expect.stringContaining('Virement') }),
      );
    });
  });

  describe('sendReminderForHousehold', () => {
    it('returns zeroed stats when the household has fewer than two members', async () => {
      householdRepository.findOne.mockResolvedValue({
        id: 'household-1',
        members: [{ user: { id: 'user-1' } }],
        subscriptions: [],
      });

      const result = await service.sendReminderForHousehold('household-1');

      expect(result).toEqual({ householdId: 'household-1', notifiedMembers: 0, totalSubscriptions: 0 });
      expect(notificationService.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('returns zeroed stats when the household cannot be found', async () => {
      householdRepository.findOne.mockResolvedValue(null);

      const result = await service.sendReminderForHousehold('missing-household');

      expect(result).toEqual({ householdId: 'missing-household', notifiedMembers: 0, totalSubscriptions: 0 });
    });

    it('notifies every member with their share of the active subscriptions', async () => {
      householdRepository.findOne.mockResolvedValue({
        id: 'household-1',
        members: [
          { user: { id: 'user-1' }, contributionRate: 60 },
          { user: { id: 'user-2' }, contributionRate: 40 },
        ],
        subscriptions: [
          { isActive: true, amount: 100 },
          { isActive: false, amount: 999 },
        ],
      });

      const result = await service.sendReminderForHousehold('household-1');

      expect(notificationService.sendNotificationToUser).toHaveBeenCalledTimes(2);
      expect(notificationService.sendNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ body: expect.stringContaining('60.00 €') }),
      );
      expect(notificationService.sendNotificationToUser).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ body: expect.stringContaining('40.00 €') }),
      );
      expect(result).toEqual({ householdId: 'household-1', notifiedMembers: 2, totalSubscriptions: 100 });
    });

    it('reuses a preloaded household instead of querying the repository', async () => {
      const preloaded = {
        id: 'household-1',
        members: [
          { user: { id: 'user-1' }, contributionRate: 50 },
          { user: { id: 'user-2' }, contributionRate: 50 },
        ],
        subscriptions: [],
      };

      await service.sendReminderForHousehold('household-1', [preloaded as any]);

      expect(householdRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
