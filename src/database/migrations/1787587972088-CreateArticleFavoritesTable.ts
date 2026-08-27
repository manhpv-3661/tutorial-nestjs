import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArticleFavoritesTable1787587972088 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "article_favorites" (
        "user_id" uuid NOT NULL,
        "article_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_article_favorites" PRIMARY KEY ("user_id", "article_id"),
        CONSTRAINT "FK_article_favorites_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_article_favorites_article" FOREIGN KEY ("article_id")
          REFERENCES "articles" ("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_article_favorites_article_id" ON "article_favorites" ("article_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "article_favorites";`);
  }
}
