import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptions1789906160483 implements MigrationInterface {
  name = 'AddPushSubscriptions1789906160483';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "endpoint" text NOT NULL,
        "p256dh" character varying NOT NULL,
        "auth" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid,
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_push_subscriptions_user"`,
    );
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
  }
}