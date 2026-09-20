import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContributionRate1789906160484 implements MigrationInterface {
  name = 'AddContributionRate1789906160484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "household_members" ADD "contributionRate" numeric(5,2) NOT NULL DEFAULT '50'`,
    );
    await queryRunner.query(
      `UPDATE "household_members" SET "contributionRate" = 100 WHERE "user_id" IN (SELECT "user_id" FROM "household_members" GROUP BY "user_id" HAVING COUNT(*) = 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "household_members" DROP COLUMN "contributionRate"`);
  }
}
