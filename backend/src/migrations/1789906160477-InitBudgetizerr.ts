import { MigrationInterface, QueryRunner } from "typeorm";

export class InitBudgetizerr1789906160477 implements MigrationInterface {
    name = 'InitBudgetizerr1789906160477'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "refreshTokenHash" character varying NOT NULL, "userAgent" character varying, "ipAddress" character varying, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "UQ_b08788ca45cbd90f0bd96c2f077" UNIQUE ("refreshTokenHash"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."operations_movementtype_enum" AS ENUM('DEBIT', 'CREDIT')`);
        await queryRunner.query(`CREATE TYPE "public"."operations_category_enum" AS ENUM('HOUSING', 'ENERGY', 'GROCERIES', 'CHILDCARE', 'TRANSPORT', 'LEISURE', 'SAVINGS', 'SALARY', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "operations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "movementType" "public"."operations_movementtype_enum" NOT NULL, "category" "public"."operations_category_enum" NOT NULL DEFAULT 'OTHER', "dueDay" integer, "targetIban" character varying, "isRecurring" boolean NOT NULL DEFAULT false, "notifyDaysBefore" integer NOT NULL DEFAULT '2', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "bank_account_id" uuid, CONSTRAINT "PK_7b62d84d6f9912b975987165856" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bank_accounts_type_enum" AS ENUM('CHECKING', 'JOINT', 'SAVINGS')`);
        await queryRunner.query(`CREATE TABLE "bank_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" "public"."bank_accounts_type_enum" NOT NULL DEFAULT 'CHECKING', "iban" character varying, "initialBalance" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "household_id" uuid, CONSTRAINT "PK_c872de764f2038224a013ff25ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "households" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b1aef2640717132e9231aac756" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."household_members_role_enum" AS ENUM('OWNER', 'MEMBER')`);
        await queryRunner.query(`CREATE TABLE "household_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."household_members_role_enum" NOT NULL DEFAULT 'MEMBER', "contributionPercentage" numeric(5,2) NOT NULL DEFAULT '100', "user_id" uuid, "household_id" uuid, CONSTRAINT "UQ_eda51fd15f360f367e2261c7f5a" UNIQUE ("user_id", "household_id"), CONSTRAINT "PK_198055660706bdbea68909fdb01" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."activities_action_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`);
        await queryRunner.query(`CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" "public"."activities_action_enum" NOT NULL, "targetEntity" character varying NOT NULL, "targetId" character varying NOT NULL, "payloadBefore" jsonb, "payloadAfter" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('SENT', 'FAILED', 'READ')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "message" text NOT NULL, "redirectUrl" character varying, "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'SENT', "error" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "fullName" character varying NOT NULL, "monthlySalary" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operations" ADD CONSTRAINT "FK_5c9403f132a699566deb468d5b7" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bank_accounts" ADD CONSTRAINT "FK_4fe9676c9dbd33a0940d50c0b28" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "household_members" ADD CONSTRAINT "FK_7e5f19ba92bb79aa4a6400e3827" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "household_members" ADD CONSTRAINT "FK_6b8b13e8e04d123ec8cb8b5c318" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2"`);
        await queryRunner.query(`ALTER TABLE "household_members" DROP CONSTRAINT "FK_6b8b13e8e04d123ec8cb8b5c318"`);
        await queryRunner.query(`ALTER TABLE "household_members" DROP CONSTRAINT "FK_7e5f19ba92bb79aa4a6400e3827"`);
        await queryRunner.query(`ALTER TABLE "bank_accounts" DROP CONSTRAINT "FK_4fe9676c9dbd33a0940d50c0b28"`);
        await queryRunner.query(`ALTER TABLE "operations" DROP CONSTRAINT "FK_5c9403f132a699566deb468d5b7"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`DROP TABLE "activities"`);
        await queryRunner.query(`DROP TYPE "public"."activities_action_enum"`);
        await queryRunner.query(`DROP TABLE "household_members"`);
        await queryRunner.query(`DROP TYPE "public"."household_members_role_enum"`);
        await queryRunner.query(`DROP TABLE "households"`);
        await queryRunner.query(`DROP TABLE "bank_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."bank_accounts_type_enum"`);
        await queryRunner.query(`DROP TABLE "operations"`);
        await queryRunner.query(`DROP TYPE "public"."operations_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."operations_movementtype_enum"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
    }

}
