import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommentsTable1787723414133 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "body" text NOT NULL,
        "article_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_article" FOREIGN KEY ("article_id")
          REFERENCES "articles" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_author" FOREIGN KEY ("author_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_comments_article_id" ON "comments" ("article_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "comments";`);
  }
}
