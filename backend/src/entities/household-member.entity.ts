import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Household } from './household.entity';

export enum HouseholdRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

@Entity('household_members')
@Unique(['user', 'household'])
export class HouseholdMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.householdMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Household, (household) => household.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @Column({ type: 'enum', enum: HouseholdRole, default: HouseholdRole.MEMBER })
  role: HouseholdRole;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100.0 })
  contributionPercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.0 })
  contributionRate: number;

  @Column({ default: false })
  isDefault: boolean;
}