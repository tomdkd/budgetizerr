import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { Session } from '../entities/session.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawToken = request.cookies?.['budgetizerr_session'];

    if (!rawToken) {
      throw new UnauthorizedException('Session absente ou expirée.');
    }

    // Recalcul du hash SHA-256 du token
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Vérification de la session en base non expirée
    const session = await this.dataSource.getRepository(Session).findOne({
      where: {
        refreshTokenHash: hashedToken,
        expiresAt: MoreThan(new Date()),
      },
      relations: {
        user: true,
      },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Session invalide ou révoquée.');
    }

    // Injection de l'utilisateur dans la requête Express
    request.user = session.user;
    request.sessionEntity = session;

    return true;
  }
}