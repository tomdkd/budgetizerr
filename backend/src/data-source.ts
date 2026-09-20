import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { Household } from './entities/household.entity';
import { HouseholdMember } from './entities/household-member.entity';
import { BankAccount } from './entities/bank-account.entity';
import { Operation } from './entities/operation.entity';
import { Activity } from './entities/activity.entity';
import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';
import { PushSubscription } from './entities/push-subscription.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'budget_user',
  password: process.env.DB_PASSWORD || 'budget_secret_password',
  database: process.env.DB_NAME || 'budgetizerr_db',
  entities: [
    User,
    Session,
    Household,
    HouseholdMember,
    BankAccount,
    Operation,
    Activity,
    Notification,
    Subscription,
    PushSubscription,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});