import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkSubscriptionOperations1789906160482 implements MigrationInterface {
  name = 'LinkSubscriptionOperations1789906160482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "operations" ADD "subscription_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "FK_operations_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "FK_operations_subscription"`,
    );
    await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "subscription_id"`);
  }
}