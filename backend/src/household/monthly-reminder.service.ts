import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Household } from '../entities/household.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class MonthlyReminderService {
  constructor(
    @InjectRepository(Household)
    private readonly householdRepository: Repository<Household>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 9 * * *')
  async sendMonthlyReminders() {
    const households = await this.householdRepository.find({
      relations: { members: { user: true }, subscriptions: true },
    });
    const today = new Date().getDate();

    for (const household of households) {
      if (household.reminderDay === today) {
        await this.sendReminderForHousehold(household.id, households);
      }
    }
  }

  async sendReminderForHousehold(householdId: string, loadedHouseholds?: Household[]) {
    const household = loadedHouseholds?.find((item) => item.id === householdId)
      ?? await this.householdRepository.findOne({
        where: { id: householdId },
        relations: { members: { user: true }, subscriptions: true },
      });

    if (!household || household.members.length < 2) {
      return { householdId, notifiedMembers: 0, totalSubscriptions: 0 };
    }

    const totalSubscriptions = household.subscriptions
      .filter((subscription) => subscription.isActive)
      .reduce((total, subscription) => total + Number(subscription.amount), 0);

    for (const member of household.members) {
      const rate = Number(member.contributionRate ?? 50);
      const shareAmount = (totalSubscriptions * (rate / 100)).toFixed(2);
      await this.notificationService.sendNotificationToUser(member.user.id, {
        title: 'Budgetizerr - Virement compte joint',
        body: `Rappel charges : votre part pour le mois prochain est de ${shareAmount} € (${rate}% des charges fixes).`,
        url: '/subscriptions',
      });
    }

    return {
      householdId,
      notifiedMembers: household.members.length,
      totalSubscriptions,
    };
  }
}