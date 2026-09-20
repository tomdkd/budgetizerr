import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { MonthlyReminderService } from './monthly-reminder.service';

describe('HouseholdController', () => {
  let controller: HouseholdController;
  let householdService: Record<string, ReturnType<typeof vi.fn>>;
  let monthlyReminderService: Record<string, ReturnType<typeof vi.fn>>;
  const req: any = { user: { id: 'user-1' } };

  beforeEach(async () => {
    householdService = {
      getUserHouseholds: vi.fn(),
      updateHouseholdSettings: vi.fn(),
      searchUsers: vi.fn(),
      createHousehold: vi.fn(),
      getMonthOperations: vi.fn(),
      updateContributionRate: vi.fn(),
      assertHouseholdMembership: vi.fn(),
      createOperation: vi.fn(),
      getHouseholdSubscriptions: vi.fn(),
      createSubscription: vi.fn(),
      deleteSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      getHouseholdActivities: vi.fn(),
      updateInitialBalance: vi.fn(),
      setDefaultHousehold: vi.fn(),
      deleteHousehold: vi.fn(),
    };
    monthlyReminderService = {
      sendReminderForHousehold: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HouseholdController],
      providers: [
        { provide: HouseholdService, useValue: householdService },
        { provide: MonthlyReminderService, useValue: monthlyReminderService },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    controller = module.get<HouseholdController>(HouseholdController);
  });

  it('getMyHouseholds delegates to the service', async () => {
    householdService.getUserHouseholds.mockResolvedValue(['household']);

    const result = await controller.getMyHouseholds(req);

    expect(householdService.getUserHouseholds).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(['household']);
  });

  it('updateHouseholdSettings delegates to the service', async () => {
    const dto = { reminderDay: 5 };
    householdService.updateHouseholdSettings.mockResolvedValue({ householdId: 'h1', reminderDay: 5 });

    const result = await controller.updateHouseholdSettings(req, 'h1', dto);

    expect(householdService.updateHouseholdSettings).toHaveBeenCalledWith('user-1', 'h1', dto);
    expect(result).toEqual({ householdId: 'h1', reminderDay: 5 });
  });

  it('searchUsers delegates to the service', async () => {
    householdService.searchUsers.mockResolvedValue([]);

    await controller.searchUsers(req, 'john');

    expect(householdService.searchUsers).toHaveBeenCalledWith('user-1', 'john');
  });

  it('createHousehold delegates to the service', async () => {
    const dto = { name: 'Foyer' } as any;
    householdService.createHousehold.mockResolvedValue({ id: 'h1' });

    const result = await controller.createHousehold(req, dto);

    expect(householdService.createHousehold).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ id: 'h1' });
  });

  it('getMonthlyOperations forwards numeric year/month to the service', async () => {
    householdService.getMonthOperations.mockResolvedValue({ year: 2026, month: 9 });

    const result = await controller.getMonthlyOperations(req, 'h1', '2026', '9');

    expect(householdService.getMonthOperations).toHaveBeenCalledWith('user-1', 'h1', 2026, 9);
    expect(result).toEqual({ year: 2026, month: 9 });
  });

  it('updateContributionRate delegates to the service', async () => {
    const dto = { rate: 60 };
    householdService.updateContributionRate.mockResolvedValue({ memberId: 'm1', rate: 60 });

    const result = await controller.updateContributionRate(req, 'h1', 'm1', dto);

    expect(householdService.updateContributionRate).toHaveBeenCalledWith('user-1', 'h1', 'm1', 60);
    expect(result).toEqual({ memberId: 'm1', rate: 60 });
  });

  it('testMonthlyReminder asserts membership before sending a reminder', async () => {
    monthlyReminderService.sendReminderForHousehold.mockResolvedValue({ householdId: 'h1' });

    const result = await controller.testMonthlyReminder(req, 'h1');

    expect(householdService.assertHouseholdMembership).toHaveBeenCalledWith('user-1', 'h1');
    expect(monthlyReminderService.sendReminderForHousehold).toHaveBeenCalledWith('h1');
    expect(result).toEqual({ householdId: 'h1' });
  });

  it('createOperation delegates to the service', async () => {
    const dto = { title: 'Op', amount: 10 } as any;
    householdService.createOperation.mockResolvedValue({ operation: {} });

    await controller.createOperation(req, 'h1', dto);

    expect(householdService.createOperation).toHaveBeenCalledWith('user-1', 'h1', dto);
  });

  it('getHouseholdSubscriptions delegates to the service', async () => {
    householdService.getHouseholdSubscriptions.mockResolvedValue({ subscriptions: [] });

    await controller.getHouseholdSubscriptions(req, 'h1');

    expect(householdService.getHouseholdSubscriptions).toHaveBeenCalledWith('user-1', 'h1');
  });

  it('createSubscription delegates to the service', async () => {
    const dto = { title: 'Sub', amount: 10, debitDay: 5 } as any;
    householdService.createSubscription.mockResolvedValue({ id: 's1' });

    await controller.createSubscription(req, 'h1', dto);

    expect(householdService.createSubscription).toHaveBeenCalledWith('user-1', 'h1', dto);
  });

  it('deleteSubscription delegates to the service', async () => {
    await controller.deleteSubscription(req, 'h1', 's1');

    expect(householdService.deleteSubscription).toHaveBeenCalledWith('user-1', 'h1', 's1');
  });

  it('updateSubscription delegates to the service', async () => {
    const dto = { title: 'Sub' } as any;
    householdService.updateSubscription.mockResolvedValue({ id: 's1' });

    await controller.updateSubscription(req, 'h1', 's1', dto);

    expect(householdService.updateSubscription).toHaveBeenCalledWith('user-1', 'h1', 's1', dto);
  });

  it('getHouseholdActivities forwards optional date filters', async () => {
    householdService.getHouseholdActivities.mockResolvedValue([]);

    await controller.getHouseholdActivities(req, 'h1', '2026-01-01', '2026-01-31');

    expect(householdService.getHouseholdActivities).toHaveBeenCalledWith(
      'user-1',
      'h1',
      '2026-01-01',
      '2026-01-31',
    );
  });

  it('updateInitialBalance delegates to the service', async () => {
    const dto = { year: 2026, month: 9, amount: 100 };
    householdService.updateInitialBalance.mockResolvedValue({ operation: {} });

    await controller.updateInitialBalance(req, 'h1', dto);

    expect(householdService.updateInitialBalance).toHaveBeenCalledWith('user-1', 'h1', 2026, 9, 100);
  });

  it('setDefaultHousehold delegates to the service', async () => {
    await controller.setDefaultHousehold(req, 'h1');

    expect(householdService.setDefaultHousehold).toHaveBeenCalledWith('user-1', 'h1');
  });

  it('deleteHousehold delegates to the service', async () => {
    householdService.deleteHousehold.mockResolvedValue(undefined);

    await controller.deleteHousehold(req, 'h1');

    expect(householdService.deleteHousehold).toHaveBeenCalledWith('user-1', 'h1');
  });
});
