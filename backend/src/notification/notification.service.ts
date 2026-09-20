import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as webpush from 'web-push';
import { Repository } from 'typeorm';
import { PushSubscription } from '../entities/push-subscription.entity';
import { User } from '../entities/user.entity';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    webpush.setVapidDetails(
      this.configService.getOrThrow<string>('VAPID_SUBJECT'),
      this.configService.getOrThrow<string>('VAPID_PUBLIC_KEY'),
      this.configService.getOrThrow<string>('VAPID_PRIVATE_KEY'),
    );
  }

  getPublicKey() {
    return this.configService.getOrThrow<string>('VAPID_PUBLIC_KEY');
  }

  async saveSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    let subscription = await this.subscriptionRepository.findOne({ where: { endpoint } });
    if (subscription) {
      subscription.user = user;
      subscription.p256dh = p256dh;
      subscription.auth = auth;
    } else {
      subscription = this.subscriptionRepository.create({ endpoint, p256dh, auth, user });
    }

    await this.subscriptionRepository.save(subscription);
    return { success: true };
  }

  async sendNotificationToUser(userId: string, payload: PushNotificationPayload) {
    const subscriptions = await this.subscriptionRepository.find({
      where: { user: { id: userId } },
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(payload),
          );
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.subscriptionRepository.delete(subscription.id);
          }
        }
      }),
    );
  }
}
