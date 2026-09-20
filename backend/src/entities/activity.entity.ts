import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ActivityAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.activities, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  author: User;

  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  @Column()
  targetEntity: string; // Ex: 'Operation', 'BankAccount', 'Household'

  @Column()
  targetId: string;

  @Column({ type: 'jsonb', nullable: true })
  payloadBefore: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  payloadAfter: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}