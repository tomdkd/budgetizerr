import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  User,
  Household,
  HouseholdMember,
  Activity,
  Notification,
  Session,
  BankAccount,
  Operation,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Household,
      HouseholdMember,
      Activity,
      Notification,
      Session,
      BankAccount,
      Operation,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}