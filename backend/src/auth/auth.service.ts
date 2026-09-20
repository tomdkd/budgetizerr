import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { Session } from '../entities/session.entity';
import {
  User,
  Household,
  HouseholdMember,
  HouseholdRole,
  MovementType,
  Operation,
  OperationType,
  Activity,
  ActivityAction,
} from '../entities';

@Injectable()
export class AuthService {
  constructor(private readonly dataSource: DataSource) {}

  async register(dto: RegisterDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Vérifier si l'utilisateur existe déjà
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (existingUser) {
        throw new ConflictException('Un compte existe déjà avec cette adresse email.');
      }

      // 2. Hasher le mot de passe
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(dto.password, saltRounds);

      // 3. Créer l'utilisateur
      const user = queryRunner.manager.create(User, {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        monthlySalary: dto.monthlySalary ?? null,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      // 4. Créer le foyer principal
      const household = queryRunner.manager.create(Household, {
        name: `Foyer de ${savedUser.fullName.split(' ')[0]}`,
      });
      const savedHousehold = await queryRunner.manager.save(Household, household);

      const now = new Date();
      const initialBalanceDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const initialBalance = queryRunner.manager.create(Operation, {
        household: savedHousehold,
        title: 'Solde initial',
        amount: 0,
        movementType: MovementType.CREDIT,
        type: OperationType.INITIAL_BALANCE,
        date: initialBalanceDate,
      });
      await queryRunner.manager.save(Operation, initialBalance);

      // 5. Associer l'utilisateur au foyer en tant que OWNER
      const membership = queryRunner.manager.create(HouseholdMember, {
        user: savedUser,
        household: savedHousehold,
        role: HouseholdRole.OWNER,
        contributionPercentage: 100,
        isDefault: true,
      });
      await queryRunner.manager.save(HouseholdMember, membership);

      // 6. Journaliser la création dans Activity
      const activity = queryRunner.manager.create(Activity, {
        author: savedUser,
        action: ActivityAction.CREATE,
        targetEntity: 'User',
        targetId: savedUser.id,
        payloadAfter: {
          email: savedUser.email,
          fullName: savedUser.fullName,
          householdId: savedHousehold.id,
        },
      });
      await queryRunner.manager.save(Activity, activity);

      // Valider la transaction complète
      await queryRunner.commitTransaction();

      return {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        household: {
          id: savedHousehold.id,
          name: savedHousehold.name,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Erreur inscription détaillée :', error); // <--- Ajoute cette ligne
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException("Erreur lors de la création de l'espace utilisateur.");
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto, metadata: { userAgent?: string; ipAddress?: string }) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    // Génération d'un token opaque aléatoire (64 octets hex = 128 caractères)
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Expiration à 30 jours
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const sessionRepo = this.dataSource.getRepository(Session);
    const session = sessionRepo.create({
      user,
      refreshTokenHash: hashedToken,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt,
    });

    await sessionRepo.save(session);

    return {
      rawToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async logout(rawToken: string) {
    if (!rawToken) return;
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.dataSource.getRepository(Session).delete({ refreshTokenHash: hashedToken });
  }
}