import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationCreationFields1789906160480 implements MigrationInterface {
  name = 'AddOperationCreationFields1789906160480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operations" ADD "description" text`,
    );
    await queryRunner.query(`ALTER TABLE "operations" ADD "paid_by_user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "FK_operations_paid_by_user" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "FK_operations_paid_by_user"`,
    );
    await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "paid_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "description"`);
  }
}