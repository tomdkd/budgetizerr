import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationService } from './notification.service';

class PushSubscriptionKeysDto {
  @IsString()
  p256dh: string;

  @IsString()
  auth: string;
}

class SubscribeDto {
  @IsString()
  endpoint: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.notificationService.getPublicKey() };
  }

  @UseGuards(AuthGuard)
  @Post('subscribe')
  subscribe(@Req() req: any, @Body() dto: SubscribeDto) {
    return this.notificationService.saveSubscription(
      req.user.id,
      dto.endpoint,
      dto.keys.p256dh,
      dto.keys.auth,
    );
  }

  @UseGuards(AuthGuard)
  @Post('test')
  async sendTestNotification(@Req() req: any) {
    await this.notificationService.sendNotificationToUser(req.user.id, {
      title: 'Budgetizerr - Test reussi',
      body: 'Les notifications push fonctionnent parfaitement sur cet appareil !',
      url: '/operations',
    });
    return { success: true };
  }
}
