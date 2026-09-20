import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, ILike, Not } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { CreateOperationDto } from './dto/create-operation.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UpdateHouseholdSettingsDto } from './dto/update-household-settings.dto';
import {
  Activity,
  ActivityAction,
  Household,
  MovementType,
  Operation,
  OperationType,
  Subscription,
} from 'src/entities';
import { HouseholdMember, HouseholdRole } from '../entities/household-member.entity';

@Injectable()
export class HouseholdService {
  constructor(private readonly dataSource: DataSource) {}

  async assertHouseholdMembership(userId: string, householdId: string) {
    const membership = await this.dataSource.getRepository(HouseholdMember).findOne({
      where: { user: { id: userId }, household: { id: householdId } },
    });
    if (!membership) {
      throw new ForbiddenException('Accès refusé à ce foyer.');
    }
    return membership;
  }

  async updateHouseholdSettings(
    userId: string,
    householdId: string,
    dto: UpdateHouseholdSettingsDto,
  ) {
    await this.assertHouseholdMembership(userId, householdId);
    const household = await this.dataSource.getRepository(Household).findOne({
      where: { id: householdId },
    });
    if (!household) throw new NotFoundException('Foyer introuvable.');
    household.reminderDay = dto.reminderDay;
    await this.dataSource.getRepository(Household).save(household);
    return { householdId, reminderDay: household.reminderDay };
  }

  private getMonthStart(year: number, month: number) {
    return new Date(year, month - 1, 1, 0, 0, 0, 0);
  }

  private getSubscriptionDate(year: number, month: number, debitDay: number) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return new Date(Date.UTC(year, month - 1, Math.min(debitDay, lastDay), 0, 0, 0, 0));
  }

  private async createInitialBalance(
    manager: EntityManager,
    household: Household,
    amount: number,
    date: Date,
  ) {
    const operation = manager.create(Operation, {
      household,
      title: 'Solde initial',
      amount,
      movementType: amount < 0 ? MovementType.DEBIT : MovementType.CREDIT,
      type: OperationType.INITIAL_BALANCE,
      date,
    });

    return manager.save(Operation, operation);
  }

  async getUserHouseholds(userId: string) {
    const memberships = await this.dataSource.getRepository(HouseholdMember).find({
      where: { user: { id: userId } },
      relations: {
        household: {
          members: {
            user: true,
          },
        },
      },
      order: {
        id: 'ASC',
      },
    });

    return memberships.map((m) => {
      const h = m.household;
      return {
        id: h.id,
        name: h.name,
        reminderDay: h.reminderDay,
        role: m.role,
        contributionPercentage: m.contributionPercentage,
        isDefault: m.isDefault || memberships.length === 1,
        members: h.members.map((member) => ({
          id: member.id,
          userId: member.user.id,
          fullName: member.user.fullName,
          email: member.user.email,
          role: member.role,
          contributionPercentage: member.contributionPercentage,
          contributionRate: Number(member.contributionRate),
        })),
      };
    });
  }

  async updateContributionRate(
    userId: string,
    householdId: string,
    memberId: string,
    rate: number,
  ) {
    const currentMembership = await this.assertHouseholdMembership(userId, householdId);
    const membership = await this.dataSource.getRepository(HouseholdMember).findOne({
      where: { id: memberId, household: { id: householdId } },
    });
    if (!membership) {
      throw new NotFoundException('Membre introuvable dans ce foyer.');
    }
    if (currentMembership.role !== HouseholdRole.OWNER && membership.id !== currentMembership.id) {
      throw new ForbiddenException('Seul le membre concerné ou le propriétaire peut modifier ce ratio.');
    }

    membership.contributionRate = rate;
    await this.dataSource.getRepository(HouseholdMember).save(membership);
    return { memberId, rate };
  }

  async getHouseholdActivities(
    userId: string,
    householdId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const membership = await this.dataSource.getRepository(HouseholdMember).findOne({
      where: { user: { id: userId }, household: { id: householdId } },
    });

    if (!membership) {
      throw new ForbiddenException('Accès refusé à ce foyer.');
    }

    const query = this.dataSource
      .getRepository(Activity)
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.author', 'author')
      .where(
        `(activity.targetEntity = :householdEntity AND activity.targetId = :householdId)
         OR activity.payloadAfter ->> 'householdId' = :householdId
         OR activity.payloadBefore ->> 'householdId' = :householdId`,
        { householdEntity: 'Household', householdId },
      );

    const parseDate = (value: string, endOfDay = false) => {
      const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
        : value;
      const date = new Date(normalizedValue);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('La plage de dates est invalide.');
      }
      return date;
    };

    if (startDate) {
      query.andWhere('activity.createdAt >= :startDate', {
        startDate: parseDate(startDate),
      });
    }
    if (endDate) {
      query.andWhere('activity.createdAt <= :endDate', {
        endDate: parseDate(endDate, true),
      });
    }
    if (startDate && endDate && parseDate(startDate) > parseDate(endDate, true)) {
      throw new BadRequestException('La date de début doit précéder la date de fin.');
    }

    const activities = await query.orderBy('activity.createdAt', 'DESC').getMany();

    return activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      targetEntity: activity.targetEntity,
      createdAt: activity.createdAt,
      user: activity.author
        ? { fullName: activity.author.fullName, email: activity.author.email }
        : null,
      payloadBefore: activity.payloadBefore,
      payloadAfter: activity.payloadAfter,
    }));
  }

  async createOperation(userId: string, householdId: string, dto: CreateOperationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membership = await queryRunner.manager.findOne(HouseholdMember, {
        where: { user: { id: userId }, household: { id: householdId } },
      });
      if (!membership) {
        throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
      }

      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      const household = await queryRunner.manager.findOne(Household, {
        where: { id: householdId },
      });
      if (!user || !household) {
        throw new NotFoundException('Utilisateur ou foyer introuvable.');
      }

      const isRecurring = dto.isRecurring ?? false;
      const operationDate = isRecurring && dto.debitDate
        ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(dto.debitDate)
            ? `${dto.debitDate}T00:00:00.000Z`
            : dto.debitDate)
        : new Date();
      if (Number.isNaN(operationDate.getTime())) {
        throw new BadRequestException('La date de prélèvement est invalide.');
      }
      const type = dto.type ?? OperationType.EXPENSE;
      let subscription: Subscription | null = null;
      if (isRecurring) {
        subscription = queryRunner.manager.create(Subscription, {
          household,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          amount: dto.amount,
          debitDay: operationDate.getUTCDate(),
          isActive: true,
        });
        subscription = await queryRunner.manager.save(Subscription, subscription);
      }
      const operation = queryRunner.manager.create(Operation, {
        household,
        paidBy: user,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        amount: dto.amount,
        movementType: type === OperationType.INCOME ? MovementType.CREDIT : MovementType.DEBIT,
        type,
        date: operationDate,
        isRecurring,
        subscription,
      });
      const savedOperation = await queryRunner.manager.save(Operation, operation);

      const activity = queryRunner.manager.create(Activity, {
        author: user,
        action: ActivityAction.CREATE,
        targetEntity: 'Transaction',
        targetId: savedOperation.id,
        payloadAfter: {
          title: savedOperation.title,
          description: savedOperation.description,
          amount: dto.amount,
          type,
          isRecurring,
          date: operationDate,
          householdId,
          subscriptionId: subscription?.id,
        },
      });
      await queryRunner.manager.save(Activity, activity);

      const operationMonth = operationDate.getUTCMonth() + 1;
      const operationYear = operationDate.getUTCFullYear();
      const totals = await this.getMonthlyTotals(
        queryRunner.manager,
        householdId,
        operationYear,
        operationMonth,
      );
      await queryRunner.commitTransaction();

      return {
        operation: {
          id: savedOperation.id,
          title: savedOperation.title,
          description: savedOperation.description,
          amount: Number(savedOperation.amount),
          type: savedOperation.type,
          isRecurring: savedOperation.isRecurring,
          date: savedOperation.date,
        },
        year: operationYear,
        month: operationMonth,
        realBalance: totals.realBalance,
        plannedExpenses: totals.plannedExpenses,
        availableBalance: totals.availableBalance,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getHouseholdSubscriptions(userId: string, householdId: string) {
    const membership = await this.dataSource.getRepository(HouseholdMember).findOne({
      where: { user: { id: userId }, household: { id: householdId } },
    });
    if (!membership) {
      throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
    }

    const subscriptions = await this.dataSource.getRepository(Subscription).find({
      where: { household: { id: householdId }, isActive: true },
      order: { debitDay: 'ASC', title: 'ASC' },
    });

    return {
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        title: subscription.title,
        description: subscription.description,
        amount: Number(subscription.amount),
        debitDay: subscription.debitDay,
        isActive: subscription.isActive,
      })),
      totalMonthlyCost: subscriptions.reduce(
        (total, subscription) => total + Number(subscription.amount),
        0,
      ),
    };
  }

  async createSubscription(userId: string, householdId: string, dto: CreateSubscriptionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membership = await queryRunner.manager.findOne(HouseholdMember, {
        where: { user: { id: userId }, household: { id: householdId } },
      });
      if (!membership) {
        throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
      }
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      const household = await queryRunner.manager.findOne(Household, {
        where: { id: householdId },
      });
      if (!user || !household) {
        throw new NotFoundException('Utilisateur ou foyer introuvable.');
      }

      const subscription = queryRunner.manager.create(Subscription, {
        household,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        amount: dto.amount,
        debitDay: dto.debitDay,
        isActive: true,
      });
      const savedSubscription = await queryRunner.manager.save(Subscription, subscription);
      const now = new Date();
      const operation = queryRunner.manager.create(Operation, {
        household,
        paidBy: user,
        title: savedSubscription.title,
        description: savedSubscription.description,
        amount: savedSubscription.amount,
        movementType: MovementType.DEBIT,
        type: OperationType.EXPENSE,
        date: this.getSubscriptionDate(now.getUTCFullYear(), now.getUTCMonth() + 1, dto.debitDay),
        isRecurring: true,
        subscription: savedSubscription,
      });
      const savedOperation = await queryRunner.manager.save(Operation, operation);

      const activity = queryRunner.manager.create(Activity, {
        author: user,
        action: ActivityAction.CREATE,
        targetEntity: 'Subscription',
        targetId: savedSubscription.id,
        payloadAfter: {
          title: savedSubscription.title,
          description: savedSubscription.description,
          amount: Number(savedSubscription.amount),
          debitDay: savedSubscription.debitDay,
          date: savedOperation.date,
          householdId,
          operationId: savedOperation.id,
        },
      });
      await queryRunner.manager.save(Activity, activity);
      await queryRunner.commitTransaction();

      return {
        id: savedSubscription.id,
        title: savedSubscription.title,
        description: savedSubscription.description,
        amount: Number(savedSubscription.amount),
        debitDay: savedSubscription.debitDay,
        isActive: savedSubscription.isActive,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateSubscription(
    userId: string,
    householdId: string,
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membership = await queryRunner.manager.findOne(HouseholdMember, {
        where: { user: { id: userId }, household: { id: householdId } },
      });
      if (!membership) {
        throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
      }
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      const subscription = await queryRunner.manager.findOne(Subscription, {
        where: { id: subscriptionId, household: { id: householdId } },
      });
      if (!user || !subscription) {
        throw new NotFoundException('Abonnement introuvable.');
      }

      const payloadBefore = {
        title: subscription.title,
        description: subscription.description,
        amount: Number(subscription.amount),
        debitDay: subscription.debitDay,
      };
      if (dto.title !== undefined) subscription.title = dto.title.trim();
      if (dto.description !== undefined) subscription.description = dto.description.trim() || null;
      if (dto.amount !== undefined) subscription.amount = dto.amount;
      if (dto.debitDay !== undefined) subscription.debitDay = dto.debitDay;
      const savedSubscription = await queryRunner.manager.save(Subscription, subscription);

      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;
      const monthStart = this.getMonthStart(currentYear, currentMonth);
      const nextMonthStart = this.getMonthStart(
        currentMonth === 12 ? currentYear + 1 : currentYear,
        currentMonth === 12 ? 1 : currentMonth + 1,
      );
      const operation = await queryRunner.manager
        .getRepository(Operation)
        .createQueryBuilder('operation')
        .where('operation.subscription_id = :subscriptionId', { subscriptionId })
        .andWhere('operation.date >= :monthStart', { monthStart })
        .andWhere('operation.date < :nextMonthStart', { nextMonthStart })
        .getOne();
      if (operation) {
        operation.title = savedSubscription.title;
        operation.description = savedSubscription.description;
        operation.amount = savedSubscription.amount;
        operation.date = this.getSubscriptionDate(currentYear, currentMonth, savedSubscription.debitDay);
        await queryRunner.manager.save(Operation, operation);
      }

      const activity = queryRunner.manager.create(Activity, {
        author: user,
        action: ActivityAction.UPDATE,
        targetEntity: 'Subscription',
        targetId: savedSubscription.id,
        payloadBefore,
        payloadAfter: {
          title: savedSubscription.title,
          description: savedSubscription.description,
          amount: Number(savedSubscription.amount),
          debitDay: savedSubscription.debitDay,
          householdId,
        },
      });
      await queryRunner.manager.save(Activity, activity);
      await queryRunner.commitTransaction();

      return {
        id: savedSubscription.id,
        title: savedSubscription.title,
        description: savedSubscription.description,
        amount: Number(savedSubscription.amount),
        debitDay: savedSubscription.debitDay,
        isActive: savedSubscription.isActive,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteSubscription(userId: string, householdId: string, subscriptionId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membership = await queryRunner.manager.findOne(HouseholdMember, {
        where: { user: { id: userId }, household: { id: householdId } },
      });
      if (!membership) {
        throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
      }
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      const subscription = await queryRunner.manager.findOne(Subscription, {
        where: { id: subscriptionId, household: { id: householdId } },
      });
      if (!user || !subscription) {
        throw new NotFoundException('Abonnement introuvable.');
      }

      const operation = await queryRunner.manager
        .getRepository(Operation)
        .createQueryBuilder('operation')
        .where('operation.subscription_id = :subscriptionId', { subscriptionId })
        .andWhere('operation.date >= :now', { now: new Date() })
        .getOne();

      const activity = queryRunner.manager.create(Activity, {
        author: user,
        action: ActivityAction.DELETE,
        targetEntity: 'Subscription',
        targetId: subscription.id,
        payloadBefore: {
          title: subscription.title,
          amount: Number(subscription.amount),
          debitDay: subscription.debitDay,
          householdId,
        },
      });
      await queryRunner.manager.save(Activity, activity);
      if (operation) await queryRunner.manager.delete(Operation, operation.id);
      await queryRunner.manager.delete(Subscription, subscription.id);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createHousehold(currentUserId: string, dto: CreateHouseholdDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const currentUser = await queryRunner.manager.findOne(User, {
        where: { id: currentUserId },
      });

      if (!currentUser) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      // Utilisation du type énuméré HouseholdRole
      let membersToInsert: { user: User; role: HouseholdRole; percentage: number }[] = [];

      if (!dto.isShared || !dto.members || dto.members.length === 0) {
        // Foyer solo
        membersToInsert = [{ user: currentUser, role: HouseholdRole.OWNER, percentage: 100 }];
      } else {
        // Foyer partagé : vérification des 100%
        const totalPercentage = dto.members.reduce(
          (sum, m) => sum + Number(m.contributionPercentage),
          0,
        );

        if (Math.round(totalPercentage) !== 100) {
          throw new BadRequestException(
            `La somme des quotes-parts doit être égale à 100% (actuellement : ${totalPercentage}%).`,
          );
        }

        for (const m of dto.members) {
          const foundUser = await queryRunner.manager.findOne(User, {
            where: { id: m.userId },
          });

          if (!foundUser) {
            throw new BadRequestException(`Utilisateur ${m.userId} introuvable.`);
          }

          membersToInsert.push({
            user: foundUser,
            role: foundUser.id === currentUser.id ? HouseholdRole.OWNER : HouseholdRole.MEMBER,
            percentage: Number(m.contributionPercentage),
          });
        }
      }

      // 1. Enregistrement du foyer
      const household = queryRunner.manager.create(Household, {
        name: dto.name.trim(),
      });
      const savedHousehold = await queryRunner.manager.save(Household, household);

      await this.createInitialBalance(
        queryRunner.manager,
        savedHousehold,
        0,
        this.getMonthStart(new Date().getFullYear(), new Date().getMonth() + 1),
      );

      // 2. Enregistrement des membres
      for (const m of membersToInsert) {
        const membership = queryRunner.manager.create(HouseholdMember, {
          household: savedHousehold,
          user: m.user,
          role: m.role,
          contributionPercentage: m.percentage,
          contributionRate: membersToInsert.length === 1 ? 100 : 50,
          isDefault:
            (await queryRunner.manager.count(HouseholdMember, {
              where: { user: { id: m.user.id } },
            })) === 0,
        });
        await queryRunner.manager.save(HouseholdMember, membership);
      }

      const activity = queryRunner.manager.create(Activity, {
        user: currentUser,
        action: ActivityAction.CREATE,
        targetEntity: 'Household',
        targetId: savedHousehold.id,
        payloadAfter: {
          name: savedHousehold.name,
          membersCount: membersToInsert.length,
        },
      });
      await queryRunner.manager.save(Activity, activity);

      await queryRunner.commitTransaction();

      const createdMemberships = await this.dataSource.getRepository(HouseholdMember).find({
        where: { household: { id: savedHousehold.id } },
        relations: { user: true },
      });
      const currentMembership = createdMemberships.find(
        (membership) => membership.user.id === currentUserId,
      );

      return {
        id: savedHousehold.id,
        name: savedHousehold.name,
        role: HouseholdRole.OWNER,
        isDefault:
          currentMembership?.isDefault ?? false,
        contributionPercentage:
          membersToInsert.find((m) => m.user.id === currentUser.id)?.percentage ?? 100,
        members: membersToInsert.map((m) => ({
          id: createdMemberships.find((membership) => membership.user.id === m.user.id)?.id ?? m.user.id,
          userId: m.user.id,
          fullName: m.user.fullName,
          email: m.user.email,
          role: m.role,
          contributionPercentage: m.percentage,
          contributionRate:
            createdMemberships.find((membership) => membership.user.id === m.user.id)
              ?.contributionRate ?? 50,
        })),
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async searchUsers(currentUserId: string, query: string) {
    const cleanQuery = query?.trim();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    return this.dataSource.getRepository(User).find({
      where: [
        { id: Not(currentUserId), fullName: ILike(`%${cleanQuery}%`) },
        { id: Not(currentUserId), email: ILike(`%${cleanQuery}%`) },
      ],
      select: {
        id: true,
        fullName: true,
        email: true,
      },
      take: 8,
    });
  }

  async ensureMonthlyInitialBalance(householdId: string, year: number, month: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('La période demandée est invalide.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const household = await queryRunner.manager.findOne(Household, {
        where: { id: householdId },
      });

      if (!household) {
        throw new NotFoundException('Foyer introuvable.');
      }

      const monthStart = this.getMonthStart(year, month);
      const existing = await queryRunner.manager
        .createQueryBuilder(Operation, 'operation')
        .where('operation.household_id = :householdId', { householdId })
        .andWhere('operation.type = :type', { type: OperationType.INITIAL_BALANCE })
        .andWhere('operation.date = :monthStart', { monthStart })
        .getOne();

      if (existing) {
        await queryRunner.commitTransaction();
        return existing;
      }

      const previousMonthStart = this.getMonthStart(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
      const previousBalance = await queryRunner.manager
        .createQueryBuilder(Operation, 'operation')
        .select(
          `COALESCE(SUM(CASE
            WHEN operation.type = :income THEN operation.amount
            WHEN operation.type = :expense THEN -operation.amount
            WHEN operation.type = :initialBalance THEN operation.amount
            ELSE 0
          END), 0)`,
          'balance',
        )
        .where('operation.household_id = :householdId', { householdId })
        .andWhere('operation.date >= :previousMonthStart', { previousMonthStart })
        .andWhere('operation.date < :monthStart', { monthStart })
        .setParameters({
          income: OperationType.INCOME,
          expense: OperationType.EXPENSE,
          initialBalance: OperationType.INITIAL_BALANCE,
        })
        .getRawOne<{ balance: string }>();

      const operation = await this.createInitialBalance(
        queryRunner.manager,
        household,
        Number(previousBalance?.balance ?? 0),
        monthStart,
      );

      await queryRunner.commitTransaction();
      return operation;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async getMonthlyTotals(
    manager: EntityManager,
    householdId: string,
    year: number,
    month: number,
  ) {
    const monthStart = this.getMonthStart(year, month);
    const nextMonthStart = this.getMonthStart(
      month === 12 ? year + 1 : year,
      month === 12 ? 1 : month + 1,
    );
    const operations = await manager
      .getRepository(Operation)
      .createQueryBuilder('operation')
      .leftJoinAndSelect('operation.paidBy', 'paidBy')
      .where('operation.household_id = :householdId', { householdId })
      .andWhere('operation.date >= :monthStart', { monthStart })
      .andWhere('operation.date < :nextMonthStart', { nextMonthStart })
      .orderBy('operation.date', 'ASC')
      .getMany();
    const realBalance = operations.reduce(
      (total, operation) =>
        total +
        (operation.type === OperationType.INCOME || operation.type === OperationType.INITIAL_BALANCE
          ? Number(operation.amount)
          : 0),
      0,
    );
    const plannedExpenses = operations
      .filter((operation) => operation.type === OperationType.EXPENSE)
      .reduce((total, operation) => total + Number(operation.amount), 0);

    return {
      realBalance,
      plannedExpenses,
      availableBalance: realBalance - plannedExpenses,
      operations,
    };
  }

  async updateInitialBalance(
    userId: string,
    householdId: string,
    year: number,
    month: number,
    amount: number,
  ) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('La période demandée est invalide.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membership = await queryRunner.manager.findOne(HouseholdMember, {
        where: { user: { id: userId }, household: { id: householdId } },
      });
      if (!membership) {
        throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
      }

      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      const household = await queryRunner.manager.findOne(Household, {
        where: { id: householdId },
      });
      if (!user || !household) {
        throw new NotFoundException('Utilisateur ou foyer introuvable.');
      }

      const monthStart = this.getMonthStart(year, month);
      let operation = await queryRunner.manager
        .getRepository(Operation)
        .createQueryBuilder('operation')
        .where('operation.household_id = :householdId', { householdId })
        .andWhere('operation.type = :type', { type: OperationType.INITIAL_BALANCE })
        .andWhere('operation.date = :monthStart', { monthStart })
        .getOne();
      const oldAmount = operation ? Number(operation.amount) : 0;
      const oldTitle = operation?.title ?? 'Solde initial';
      const oldDate = operation?.date ?? monthStart;

      if (operation) {
        operation.amount = amount;
        operation.date = monthStart;
        operation.movementType = amount < 0 ? MovementType.DEBIT : MovementType.CREDIT;
        operation = await queryRunner.manager.save(Operation, operation);
      } else {
        operation = await this.createInitialBalance(
          queryRunner.manager,
          household,
          amount,
          monthStart,
        );
      }

      const activity = queryRunner.manager.create(Activity, {
        author: user,
        action: ActivityAction.UPDATE,
        targetEntity: 'Transaction',
        targetId: operation.id,
        payloadBefore: {
          amount: oldAmount,
          title: oldTitle,
          date: oldDate,
        },
        payloadAfter: {
          amount,
          title: operation.title,
          date: operation.date,
          month,
          year,
          householdId,
        },
      });
      await queryRunner.manager.save(Activity, activity);

      const totals = await this.getMonthlyTotals(queryRunner.manager, householdId, year, month);
      await queryRunner.commitTransaction();

      return {
        operation: {
          id: operation.id,
          title: operation.title,
          amount: Number(operation.amount),
          date: operation.date,
          type: operation.type,
        },
        realBalance: totals.realBalance,
        plannedExpenses: totals.plannedExpenses,
        availableBalance: totals.availableBalance,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMonthOperations(userId: string, householdId: string, year: number, month: number) {
    const membership = await this.dataSource.getRepository(HouseholdMember).findOne({
      where: { user: { id: userId }, household: { id: householdId } },
    });

    if (!membership) {
      throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
    }

    await this.ensureMonthlyInitialBalance(householdId, year, month);

    const totals = await this.getMonthlyTotals(this.dataSource.manager, householdId, year, month);

    return {
      year,
      month,
      realBalance: totals.realBalance,
      plannedExpenses: totals.plannedExpenses,
      availableBalance: totals.availableBalance,
      initialBalance: totals.operations.find(
        (operation) => operation.type === OperationType.INITIAL_BALANCE,
      )?.amount ?? 0,
      operations: totals.operations.map((operation) => ({
        id: operation.id,
        title: operation.title,
        description: operation.description,
        amount: Number(operation.amount),
        date: operation.date,
        type: operation.type,
        isRecurring: operation.isRecurring,
        createdAt: operation.createdAt,
        user: operation.paidBy
          ? { fullName: operation.paidBy.fullName, email: operation.paidBy.email }
          : null,
      })),
    };
  }

  async setDefaultHousehold(userId: string, householdId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membership = await queryRunner.manager.findOne(HouseholdMember, {
        where: {
          user: { id: userId },
          household: { id: householdId },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Vous n’êtes pas membre de ce foyer.');
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(HouseholdMember)
        .set({ isDefault: false })
        .where('user_id = :userId', { userId })
        .execute();

      await queryRunner.manager.update(HouseholdMember, membership.id, {
        isDefault: true,
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteHousehold(currentUserId: string, householdId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const household = await queryRunner.manager.findOne(Household, {
        where: { id: householdId },
      });

      if (!household) {
        throw new NotFoundException('Foyer introuvable.');
      }

      const currentUser = await queryRunner.manager.findOne(User, {
        where: { id: currentUserId },
      });

      const ownerMembership = await queryRunner.manager.findOne(HouseholdMember, {
        where: {
          household: { id: householdId },
          user: { id: currentUserId },
          role: HouseholdRole.OWNER,
        },
      });

      if (!currentUser || !ownerMembership) {
        throw new ForbiddenException('Seul le propriétaire peut supprimer ce foyer.');
      }

      const activity = queryRunner.manager.create(Activity, {
        author: currentUser,
        action: ActivityAction.DELETE,
        targetEntity: 'Household',
        targetId: householdId,
        payloadBefore: { id: household.id, name: household.name },
      });
      await queryRunner.manager.save(Activity, activity);

      await queryRunner.manager.delete(HouseholdMember, {
        household: { id: householdId },
      });
      await queryRunner.manager.delete(Household, householdId);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}