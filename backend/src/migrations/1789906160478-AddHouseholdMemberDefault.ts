import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHouseholdMemberDefault1789906160478 implements MigrationInterface {
  name = 'AddHouseholdMemberDefault1789906160478';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "household_members" ADD "isDefault" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      UPDATE "household_members"
      SET "isDefault" = true
      WHERE "id" IN (
        SELECT "id"
        FROM (
          SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "id") AS "rank"
          FROM "household_members"
        ) AS ranked
        WHERE "rank" = 1
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "household_members" DROP COLUMN "isDefault"`);
  }
}