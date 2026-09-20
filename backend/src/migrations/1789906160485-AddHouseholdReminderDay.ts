import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHouseholdReminderDay1789906160485 implements MigrationInterface {
  name = 'AddHouseholdReminderDay1789906160485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "households" ADD "reminderDay" integer NOT NULL DEFAULT 28`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "households" DROP COLUMN "reminderDay"`);
  }
}