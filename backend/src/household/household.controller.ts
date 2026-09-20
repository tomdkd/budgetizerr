import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HouseholdService } from './household.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateInitialBalanceDto } from './dto/update-initial-balance.dto';
import { CreateOperationDto } from './dto/create-operation.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UpdateContributionRateDto } from './dto/update-contribution-rate.dto';
import { MonthlyReminderService } from './monthly-reminder.service';
import { UpdateHouseholdSettingsDto } from './dto/update-household-settings.dto';

@UseGuards(AuthGuard)
@Controller('households')
export class HouseholdController {
  constructor(
    private readonly householdService: HouseholdService,
    private readonly monthlyReminderService: MonthlyReminderService,
  ) {}

  @Get()
  async getMyHouseholds(@Req() req: any) {
    return this.householdService.getUserHouseholds(req.user.id);
  }

  @Patch(':householdId/settings')
  async updateHouseholdSettings(
    @Req() req: any,
    @Param('householdId') householdId: string,
    @Body() dto: UpdateHouseholdSettingsDto,
  ) {
    return this.householdService.updateHouseholdSettings(req.user.id, householdId, dto);
  }

  @Get('search-users')
  async searchUsers(@Req() req: any, @Query('q') query: string) {
    return this.householdService.searchUsers(req.user.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createHousehold(@Req() req: any, @Body() dto: CreateHouseholdDto) {
    return this.householdService.createHousehold(req.user.id, dto);
  }

  @Get(':id/operations')
  async getMonthlyOperations(
    @Req() req: any,
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.householdService.getMonthOperations(
      req.user.id,
      id,
      Number(year),
      Number(month),
    );
  }

  @Put(':householdId/members/:memberId/rate')
  async updateContributionRate(
    @Req() req: any,
    @Param('householdId') householdId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateContributionRateDto,
  ) {
    return this.householdService.updateContributionRate(
      req.user.id,
      householdId,
      memberId,
      dto.rate,
    );
  }

  @Post(':householdId/test-monthly-reminder')
  async testMonthlyReminder(@Req() req: any, @Param('householdId') householdId: string) {
    await this.householdService.assertHouseholdMembership(req.user.id, householdId);
    return this.monthlyReminderService.sendReminderForHousehold(householdId);
  }

  @Post(':id/operations')
  @HttpCode(HttpStatus.CREATED)
  async createOperation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateOperationDto,
  ) {
    return this.householdService.createOperation(req.user.id, id, dto);
  }

  @Get(':householdId/subscriptions')
  async getHouseholdSubscriptions(@Req() req: any, @Param('householdId') householdId: string) {
    return this.householdService.getHouseholdSubscriptions(req.user.id, householdId);
  }

  @Post(':householdId/subscriptions')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Req() req: any,
    @Param('householdId') householdId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.householdService.createSubscription(req.user.id, householdId, dto);
  }

  @Delete(':householdId/subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscription(
    @Req() req: any,
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    await this.householdService.deleteSubscription(req.user.id, householdId, id);
  }

  @Put(':householdId/subscriptions/:id')
  async updateSubscription(
    @Req() req: any,
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.householdService.updateSubscription(req.user.id, householdId, id, dto);
  }

  @Get(':householdId/activities')
  async getHouseholdActivities(
    @Req() req: any,
    @Param('householdId') householdId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.householdService.getHouseholdActivities(
      req.user.id,
      householdId,
      startDate,
      endDate,
    );
  }

  @Put(':id/operations/initial-balance')
  async updateInitialBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInitialBalanceDto,
  ) {
    return this.householdService.updateInitialBalance(
      req.user.id,
      id,
      dto.year,
      dto.month,
      dto.amount,
    );
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setDefaultHousehold(@Req() req: any, @Param('id') id: string) {
    await this.householdService.setDefaultHousehold(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHousehold(@Req() req: any, @Param('id') id: string) {
    return this.householdService.deleteHousehold(req.user.id, id);
  }
}