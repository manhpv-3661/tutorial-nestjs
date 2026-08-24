import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArticlesTable1787587971088 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "body" text NOT NULL,
        "tag_list" text[] NOT NULL DEFAULT '{}',
        "author_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_articles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_articles_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_articles_author" FOREIGN KEY ("author_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_articles_author_id" ON "articles" ("author_id");
      CREATE INDEX "IDX_articles_tag_list" ON "articles" USING GIN ("tag_list");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "articles";`);
  }
}
