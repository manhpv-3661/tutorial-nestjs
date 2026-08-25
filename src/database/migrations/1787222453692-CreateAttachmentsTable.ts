import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachmentsTable1787222453692 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_type" character varying NOT NULL,
        "owner_id" uuid NOT NULL,
        "file_name" character varying NOT NULL,
        "file_type" character varying NOT NULL,
        "file_size" integer NOT NULL,
        "path" character varying NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachments_id" PRIMARY KEY ("id")
      );

      CREATE INDEX "IDX_attachments_owner" ON "attachments" ("owner_type", "owner_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attachments";`);
  }
}
