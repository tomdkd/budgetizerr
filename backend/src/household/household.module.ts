import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { Household, HouseholdMember, Subscription } from '../entities';
import { NotificationModule } from '../notification/notification.module';
import { MonthlyReminderService } from './monthly-reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Household, HouseholdMember, Subscription]),
    NotificationModule,
  ],
  controllers: [HouseholdController],
  providers: [HouseholdService, MonthlyReminderService],
})
export class HouseholdModule {}