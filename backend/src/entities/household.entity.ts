import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { HouseholdMember } from './household-member.entity';
import { BankAccount } from './bank-account.entity';
import { Operation } from './operation.entity';
import { Subscription } from './subscription.entity';

@Entity('households')
export class Household {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 28 })
  reminderDay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => HouseholdMember, (member) => member.household)
  members: HouseholdMember[];

  @OneToMany(() => BankAccount, (account) => account.household)
  bankAccounts: BankAccount[];

  @OneToMany(() => Operation, (operation) => operation.household)
  operations: Operation[];

  @OneToMany(() => Subscription, (subscription) => subscription.household)
  subscriptions: Subscription[];
}