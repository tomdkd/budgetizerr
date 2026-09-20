import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from './session.entity';
import { HouseholdMember } from './household-member.entity';
import { Activity } from './activity.entity';
import { Notification } from './notification.entity';
import { PushSubscription } from './push-subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlySalary: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => HouseholdMember, (member) => member.user)
  householdMemberships: HouseholdMember[];

  @OneToMany(() => Activity, (activity) => activity.author)
  activities: Activity[];

  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications: Notification[];

  @OneToMany(() => PushSubscription, (subscription) => subscription.user)
  pushSubscriptions: PushSubscription[];
}