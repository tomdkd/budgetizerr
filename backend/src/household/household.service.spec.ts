import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HouseholdRole } from '../entities/household-member.entity';
import { OperationType } from '../entities/operation.entity';
import { HouseholdService } from './household.service';
import { createMockManager, createMockQueryBuilder, createMockQueryRunner } from '../test-utils/mock-query-runner';

describe('HouseholdService', () => {
  let manager: ReturnType<typeof createMockManager>;
  let queryRunner: ReturnType<typeof createMockQueryRunner>;
  let dataSource: any;
  let service: HouseholdService;

  beforeEach(() => {
    manager = createMockManager();
    queryRunner = createMockQueryRunner(manager);
    dataSource = {
      createQueryRunner: vi.fn(() => queryRunner),
      getRepository: vi.fn(),
      manager,
    };
    service = new HouseholdService(dataSource);
  });

  describe('assertHouseholdMembership', () => {
    it('returns the membership when it exists', async () => {
      const membership = { id: 'membership-1' };
      const repo = { findOne: vi.fn().mockResolvedValue(membership) };
      dataSource.getRepository.mockReturnValue(repo);

      const result = await service.assertHouseholdMembership('user-1', 'household-1');

      expect(result).toBe(membership);
    });

    it('throws ForbiddenException when there is no membership', async () => {
      dataSource.getRepository.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) });

      await expect(service.assertHouseholdMembership('user-1', 'household-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateHouseholdSettings', () => {
    it('updates and persists the reminder day', async () => {
      const membershipRepo = { findOne: vi.fn().mockResolvedValue({ id: 'membership-1' }) };
      const household = { id: 'household-1', reminderDay: 1 };
      const householdRepo = { findOne: vi.fn().mockResolvedValue(household), save: vi.fn() };
      dataSource.getRepository.mockImplementation((entity: any) =>
        entity.name === 'Household' ? householdRepo : membershipRepo,
      );

      const result = await service.updateHouseholdSettings('user-1', 'household-1', { reminderDay: 12 });

      expect(household.reminderDay).toBe(12);
      expect(householdRepo.save).toHaveBeenCalledWith(household);
      expect(result).toEqual({ householdId: 'household-1', reminderDay: 12 });
    });

    it('throws NotFoundException when the household does not exist', async () => {
      const membershipRepo = { findOne: vi.fn().mockResolvedValue({ id: 'membership-1' }) };
      const householdRepo = { findOne: vi.fn().mockResolvedValue(null), save: vi.fn() };
      dataSource.getRepository.mockImplementation((entity: any) =>
        entity.name === 'Household' ? householdRepo : membershipRepo,
      );

      await expect(
        service.updateHouseholdSettings('user-1', 'household-1', { reminderDay: 12 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserHouseholds', () => {
    it('maps memberships to the household DTO shape', async () => {
      const memberships = [
        {
          role: HouseholdRole.OWNER,
          contributionPercentage: 100,
          isDefault: true,
          household: {
            id: 'household-1',
            name: 'Foyer',
            reminderDay: 5,
            members: [
              {
                id: 'member-1',
                user: { id: 'user-1', fullName: 'John Doe', email: 'john@test.com' },
                role: HouseholdRole.OWNER,
                contributionPercentage: 100,
                contributionRate: '100.00',
              },
            ],
          },
        },
      ];
      const repo = { find: vi.fn().mockResolvedValue(memberships) };
      dataSource.getRepository.mockReturnValue(repo);

      const result = await service.getUserHouseholds('user-1');

      expect(result).toEqual([
        {
          id: 'household-1',
          name: 'Foyer',
          reminderDay: 5,
          role: HouseholdRole.OWNER,
          contributionPercentage: 100,
          isDefault: true,
          members: [
            {
              id: 'member-1',
              userId: 'user-1',
              fullName: 'John Doe',
              email: 'john@test.com',
              role: HouseholdRole.OWNER,
              contributionPercentage: 100,
              contributionRate: 100,
            },
          ],
        },
      ]);
    });
  });

  describe('updateContributionRate', () => {
    it('allows the owner to update any member rate', async () => {
      const membershipRepo = {
        findOne: vi
          .fn()
          .mockResolvedValueOnce({ id: 'current-membership', role: HouseholdRole.OWNER })
          .mockResolvedValueOnce({ id: 'member-1' }),
        save: vi.fn(),
      };
      dataSource.getRepository.mockReturnValue(membershipRepo);

      const result = await service.updateContributionRate('user-1', 'household-1', 'member-1', 70);

      expect(membershipRepo.save).toHaveBeenCalledWith(expect.objectContaining({ contributionRate: 70 }));
      expect(result).toEqual({ memberId: 'member-1', rate: 70 });
    });

    it('throws ForbiddenException when a non-owner updates someone else’s rate', async () => {
      const membershipRepo = {
        findOne: vi
          .fn()
          .mockResolvedValueOnce({ id: 'current-membership', role: HouseholdRole.MEMBER })
          .mockResolvedValueOnce({ id: 'member-1' }),
        save: vi.fn(),
      };
      dataSource.getRepository.mockReturnValue(membershipRepo);

      await expect(
        service.updateContributionRate('user-1', 'household-1', 'member-1', 70),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the target member does not exist', async () => {
      const membershipRepo = {
        findOne: vi
          .fn()
          .mockResolvedValueOnce({ id: 'current-membership', role: HouseholdRole.OWNER })
          .mockResolvedValueOnce(null),
        save: vi.fn(),
      };
      dataSource.getRepository.mockReturnValue(membershipRepo);

      await expect(
        service.updateContributionRate('user-1', 'household-1', 'member-1', 70),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHouseholdActivities', () => {
    it('throws ForbiddenException when the user is not a member', async () => {
      dataSource.getRepository.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) });

      await expect(service.getHouseholdActivities('user-1', 'household-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns mapped activities filtered by the optional date range', async () => {
      const membershipRepo = { findOne: vi.fn().mockResolvedValue({ id: 'membership-1' }) };
      const activityQueryBuilder = createMockQueryBuilder();
      activityQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'activity-1',
          action: 'CREATE',
          targetEntity: 'Transaction',
          createdAt: new Date('2026-01-01'),
          author: { fullName: 'John Doe', email: 'john@test.com' },
          payloadBefore: null,
          payloadAfter: { amount: 10 },
        },
      ]);
      const activityRepo = { createQueryBuilder: vi.fn(() => activityQueryBuilder) };
      dataSource.getRepository.mockImplementation((entity: any) =>
        entity.name === 'Activity' ? activityRepo : membershipRepo,
      );

      const result = await service.getHouseholdActivities(
        'user-1',
        'household-1',
        '2026-01-01',
        '2026-01-31',
      );

      expect(activityQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        {
          id: 'activity-1',
          action: 'CREATE',
          targetEntity: 'Transaction',
          createdAt: new Date('2026-01-01'),
          user: { fullName: 'John Doe', email: 'john@test.com' },
          payloadBefore: null,
          payloadAfter: { amount: 10 },
        },
      ]);
    });

    it('throws BadRequestException for an invalid date range', async () => {
      const membershipRepo = { findOne: vi.fn().mockResolvedValue({ id: 'membership-1' }) };
      const activityQueryBuilder = createMockQueryBuilder();
      const activityRepo = { createQueryBuilder: vi.fn(() => activityQueryBuilder) };
      dataSource.getRepository.mockImplementation((entity: any) =>
        entity.name === 'Activity' ? activityRepo : membershipRepo,
      );

      await expect(
        service.getHouseholdActivities('user-1', 'household-1', 'not-a-date'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchUsers', () => {
    it('returns an empty array for a query shorter than 2 characters', async () => {
      const result = await service.searchUsers('user-1', 'a');

      expect(result).toEqual([]);
      expect(dataSource.getRepository).not.toHaveBeenCalled();
    });

    it('searches users by name or email excluding the current user', async () => {
      const userRepo = { find: vi.fn().mockResolvedValue([{ id: 'user-2' }]) };
      dataSource.getRepository.mockReturnValue(userRepo);

      const result = await service.searchUsers('user-1', 'john');

      expect(userRepo.find).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'user-2' }]);
    });
  });

  describe('createOperation', () => {
    const dto = { title: 'Groceries', amount: 50 } as any;

    it('creates the operation, computes totals and commits the transaction', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' }) // membership
        .mockResolvedValueOnce({ id: 'user-1' }) // user
        .mockResolvedValueOnce({ id: 'household-1' }); // household

      const totalsQueryBuilder = createMockQueryBuilder();
      totalsQueryBuilder.getMany.mockResolvedValue([]);
      manager.getRepository = vi.fn(() => ({ createQueryBuilder: vi.fn(() => totalsQueryBuilder) }));

      const result = await service.createOperation('user-1', 'household-1', dto);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result.operation.title).toBe('Groceries');
      expect(result.realBalance).toBe(0);
    });

    it('rolls back the transaction when the user is not a member', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.createOperation('user-1', 'household-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('throws NotFoundException when the user or household cannot be found', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.createOperation('user-1', 'household-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException for an invalid recurring debit date', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({ id: 'household-1' });

      await expect(
        service.createOperation('user-1', 'household-1', {
          ...dto,
          isRecurring: true,
          debitDate: 'not-a-date',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getHouseholdSubscriptions', () => {
    it('returns subscriptions and the total monthly cost', async () => {
      const membershipRepo = { findOne: vi.fn().mockResolvedValue({ id: 'membership-1' }) };
      const subscriptionRepo = {
        find: vi.fn().mockResolvedValue([
          { id: 'sub-1', title: 'Internet', description: null, amount: '30.00', debitDay: 5, isActive: true },
        ]),
      };
      dataSource.getRepository.mockImplementation((entity: any) =>
        entity.name === 'Subscription' ? subscriptionRepo : membershipRepo,
      );

      const result = await service.getHouseholdSubscriptions('user-1', 'household-1');

      expect(result).toEqual({
        subscriptions: [
          { id: 'sub-1', title: 'Internet', description: null, amount: 30, debitDay: 5, isActive: true },
        ],
        totalMonthlyCost: 30,
      });
    });

    it('throws ForbiddenException when the user is not a member', async () => {
      dataSource.getRepository.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) });

      await expect(service.getHouseholdSubscriptions('user-1', 'household-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createSubscription', () => {
    const dto = { title: 'Internet', amount: 30, debitDay: 5 };

    it('creates a subscription and a linked operation', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({ id: 'household-1' });

      const result = await service.createSubscription('user-1', 'household-1', dto);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toMatchObject({ title: 'Internet', amount: 30, debitDay: 5, isActive: true });
    });

    it('rolls back when the user is not a member', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.createSubscription('user-1', 'household-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('updateSubscription', () => {
    it('updates the subscription and the current month operation if any', async () => {
      const subscription = { id: 'sub-1', title: 'Old', description: 'old', amount: 10, debitDay: 5 };
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(subscription);
      const operationQueryBuilder = createMockQueryBuilder();
      const operation = { id: 'operation-1', title: 'Old', description: 'old', amount: 10, date: new Date() };
      operationQueryBuilder.getOne.mockResolvedValue(operation);
      manager.getRepository = vi.fn(() => ({ createQueryBuilder: vi.fn(() => operationQueryBuilder) }));

      const result = await service.updateSubscription('user-1', 'household-1', 'sub-1', {
        title: 'New',
        amount: 20,
      });

      expect(operation.title).toBe('New');
      expect(result).toMatchObject({ id: 'sub-1', title: 'New', amount: 20 });
    });

    it('throws NotFoundException when the subscription does not exist', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(null);

      await expect(
        service.updateSubscription('user-1', 'household-1', 'sub-1', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSubscription', () => {
    it('deletes the subscription and its current operation', async () => {
      const subscription = { id: 'sub-1', title: 'Internet', amount: 30, debitDay: 5 };
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(subscription);
      const operationQueryBuilder = createMockQueryBuilder();
      operationQueryBuilder.getOne.mockResolvedValue({ id: 'operation-1' });
      manager.getRepository = vi.fn(() => ({ createQueryBuilder: vi.fn(() => operationQueryBuilder) }));

      await service.deleteSubscription('user-1', 'household-1', 'sub-1');

      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), 'operation-1');
      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), 'sub-1');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when the subscription does not exist', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(null);

      await expect(service.deleteSubscription('user-1', 'household-1', 'sub-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createHousehold', () => {
    it('creates a solo household for the current user', async () => {
      const currentUser = { id: 'user-1', fullName: 'John Doe', email: 'john@test.com' };
      manager.findOne.mockResolvedValueOnce(currentUser);
      manager.count.mockResolvedValue(0);
      const membershipRepo = {
        find: vi.fn().mockResolvedValue([
          { id: 'membership-1', user: currentUser, isDefault: true, contributionRate: 100 },
        ]),
      };
      dataSource.getRepository.mockReturnValue(membershipRepo);

      const result = await service.createHousehold('user-1', { name: 'Foyer', isShared: false } as any);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toMatchObject({ name: 'Foyer', role: HouseholdRole.OWNER });
    });

    it('throws BadRequestException when the current user cannot be found', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createHousehold('user-1', { name: 'Foyer', isShared: false } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when shared percentages do not sum to 100', async () => {
      manager.findOne.mockResolvedValueOnce({ id: 'user-1', fullName: 'John Doe' });

      await expect(
        service.createHousehold('user-1', {
          name: 'Foyer',
          isShared: true,
          members: [{ userId: 'user-2', contributionPercentage: 50 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ensureMonthlyInitialBalance', () => {
    it('throws BadRequestException for an invalid period', async () => {
      await expect(service.ensureMonthlyInitialBalance('household-1', 2026, 13)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns the existing initial balance operation when present', async () => {
      manager.findOne.mockResolvedValueOnce({ id: 'household-1' });
      const existingOperationQueryBuilder = createMockQueryBuilder();
      const existingOperation = { id: 'operation-1' };
      existingOperationQueryBuilder.getOne.mockResolvedValue(existingOperation);
      manager.createQueryBuilder = vi.fn(() => existingOperationQueryBuilder);

      const result = await service.ensureMonthlyInitialBalance('household-1', 2026, 9);

      expect(result).toBe(existingOperation);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when the household does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.ensureMonthlyInitialBalance('household-1', 2026, 9)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateInitialBalance', () => {
    it('throws BadRequestException for an invalid period', async () => {
      await expect(
        service.updateInitialBalance('user-1', 'household-1', 2026, 13, 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a new initial balance operation and returns the updated totals', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'membership-1' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({ id: 'household-1' });
      const initialBalanceQueryBuilder = createMockQueryBuilder();
      initialBalanceQueryBuilder.getOne.mockResolvedValue(null);
      const totalsQueryBuilder = createMockQueryBuilder();
      totalsQueryBuilder.getMany.mockResolvedValue([]);
      manager.getRepository = vi.fn(() => ({ createQueryBuilder: vi.fn(() => totalsQueryBuilder) }));
      manager.createQueryBuilder = vi.fn(() => initialBalanceQueryBuilder);

      const result = await service.updateInitialBalance('user-1', 'household-1', 2026, 9, 200);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.operation.amount).toBe(200);
    });

    it('throws ForbiddenException when the user is not a member', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateInitialBalance('user-1', 'household-1', 2026, 9, 200),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMonthOperations', () => {
    it('throws ForbiddenException when the user is not a member', async () => {
      dataSource.getRepository.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) });

      await expect(service.getMonthOperations('user-1', 'household-1', 2026, 9)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the operations for the requested month', async () => {
      const membershipRepo = { findOne: vi.fn().mockResolvedValue({ id: 'membership-1' }) };
      dataSource.getRepository.mockReturnValue(membershipRepo);

      manager.findOne.mockResolvedValueOnce({ id: 'household-1' });
      const existingOperationQueryBuilder = createMockQueryBuilder();
      existingOperationQueryBuilder.getOne.mockResolvedValue({ id: 'operation-1' });
      manager.createQueryBuilder = vi.fn(() => existingOperationQueryBuilder);

      const totalsQueryBuilder = createMockQueryBuilder();
      totalsQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'operation-2',
          title: 'Solde initial',
          description: null,
          amount: '100.00',
          date: new Date('2026-09-01'),
          type: OperationType.INITIAL_BALANCE,
          isRecurring: false,
          createdAt: new Date('2026-09-01'),
          paidBy: null,
        },
      ]);
      dataSource.manager.getRepository = vi.fn(() => ({
        createQueryBuilder: vi.fn(() => totalsQueryBuilder),
      }));

      const result = await service.getMonthOperations('user-1', 'household-1', 2026, 9);

      expect(result.year).toBe(2026);
      expect(result.initialBalance).toBe('100.00');
      expect(result.operations).toHaveLength(1);
    });
  });

  describe('setDefaultHousehold', () => {
    it('clears the previous default and sets the new one', async () => {
      manager.findOne.mockResolvedValueOnce({ id: 'membership-1' });
      const updateQueryBuilder: any = {
        update: vi.fn(() => updateQueryBuilder),
        set: vi.fn(() => updateQueryBuilder),
        where: vi.fn(() => updateQueryBuilder),
        execute: vi.fn(),
      };
      manager.createQueryBuilder = vi.fn(() => updateQueryBuilder);

      await service.setDefaultHousehold('user-1', 'household-1');

      expect(updateQueryBuilder.execute).toHaveBeenCalled();
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'membership-1', {
        isDefault: true,
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws ForbiddenException when the user is not a member', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.setDefaultHousehold('user-1', 'household-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteHousehold', () => {
    it('deletes the household when the current user is the owner', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'household-1', name: 'Foyer' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({ id: 'ownership-1', role: HouseholdRole.OWNER });

      await service.deleteHousehold('user-1', 'household-1');

      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), { household: { id: 'household-1' } });
      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), 'household-1');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when the household does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.deleteHousehold('user-1', 'household-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the current user is not the owner', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'household-1', name: 'Foyer' })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(null);

      await expect(service.deleteHousehold('user-1', 'household-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
