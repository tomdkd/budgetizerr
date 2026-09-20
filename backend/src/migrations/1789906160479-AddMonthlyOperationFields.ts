import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonthlyOperationFields1789906160479 implements MigrationInterface {
  name = 'AddMonthlyOperationFields1789906160479';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."operations_type_enum" AS ENUM('INCOME', 'EXPENSE', 'INITIAL_BALANCE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ADD "type" "public"."operations_type_enum" NOT NULL DEFAULT 'EXPENSE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ADD "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "operations" ADD "household_id" uuid`);
    await queryRunner.query(`
      UPDATE "operations" AS operation
      SET "household_id" = account."household_id"
      FROM "bank_accounts" AS account
      WHERE operation."bank_account_id" = account."id"
    `);
    await queryRunner.query(`
      UPDATE "operations"
      SET "date" = (date_trunc('month', "date" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
      WHERE "type" = 'INITIAL_BALANCE'
    `);
    await queryRunner.query(`
      DELETE FROM "operations" AS duplicate
      USING "operations" AS kept
      WHERE duplicate."type" = 'INITIAL_BALANCE'
        AND kept."type" = 'INITIAL_BALANCE'
        AND duplicate."household_id" = kept."household_id"
        AND duplicate."date" = kept."date"
        AND duplicate."id" > kept."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "CHK_operations_initial_balance_month_start" CHECK ("type" <> 'INITIAL_BALANCE' OR "date" = date_trunc('month', "date"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "FK_operations_household" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_operations_initial_balance_unique_month" ON "operations" ("household_id", "date") WHERE "type" = 'INITIAL_BALANCE' AND "household_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_operations_initial_balance_unique_month"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "CHK_operations_initial_balance_month_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "FK_operations_household"`,
    );
    await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "household_id"`);
    await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "date"`);
    await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."operations_type_enum"`);
  }
}