import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { BankAccount } from './bank-account.entity';
import { Household } from './household.entity';
import { User } from './user.entity';
import { Subscription } from './subscription.entity';

export enum OperationCategory {
  HOUSING = 'HOUSING',
  ENERGY = 'ENERGY',
  GROCERIES = 'GROCERIES',
  CHILDCARE = 'CHILDCARE',
  TRANSPORT = 'TRANSPORT',
  LEISURE = 'LEISURE',
  SAVINGS = 'SAVINGS',
  SALARY = 'SALARY',
  OTHER = 'OTHER',
}

export enum MovementType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum OperationType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  INITIAL_BALANCE = 'INITIAL_BALANCE',
}

@Entity('operations')
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BankAccount, (account) => account.operations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bank_account_id' })
  account: BankAccount;

  @ManyToOne(() => Household, (household) => household.operations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paid_by_user_id' })
  paidBy: User | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: MovementType })
  movementType: MovementType;

  @Column({ type: 'enum', enum: OperationType, default: OperationType.EXPENSE })
  type: OperationType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column({ type: 'enum', enum: OperationCategory, default: OperationCategory.OTHER })
  category: OperationCategory;

  @Column({ type: 'int', nullable: true })
  dueDay: number | null;

  @Column({ nullable: true })
  targetIban: string;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ type: 'int', default: 2 })
  notifyDaysBefore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}