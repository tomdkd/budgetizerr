import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Household } from './household.entity';
import { Operation } from './operation.entity';

export enum AccountType {
  CHECKING = 'CHECKING',
  JOINT = 'JOINT',
  SAVINGS = 'SAVINGS',
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Household, (household) => household.bankAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.CHECKING })
  type: AccountType;

  @Column({ nullable: true })
  iban: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  initialBalance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Operation, (operation) => operation.account)
  operations: Operation[];
}