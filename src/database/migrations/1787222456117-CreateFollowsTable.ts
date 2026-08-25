import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFollowsTable1787222456117 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "follows" (
        "follower_id" uuid NOT NULL,
        "following_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follows" PRIMARY KEY ("follower_id", "following_id"),
        CONSTRAINT "FK_follows_follower" FOREIGN KEY ("follower_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follows_following" FOREIGN KEY ("following_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_follows_no_self_follow" CHECK ("follower_id" <> "following_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "follows";`);
  }
}
