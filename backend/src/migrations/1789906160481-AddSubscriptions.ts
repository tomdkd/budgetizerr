import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptions1789906160481 implements MigrationInterface {
  name = 'AddSubscriptions1789906160481';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "amount" numeric(10,2) NOT NULL,
        "debitDay" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "household_id" uuid,
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_household" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_household"`,
    );
    await queryRunner.query(`DROP TABLE "subscriptions"`);
  }
}