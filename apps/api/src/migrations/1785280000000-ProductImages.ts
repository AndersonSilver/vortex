import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductImages1785280000000 implements MigrationInterface {
    name = 'ProductImages1785280000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "images" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`
            UPDATE "products"
            SET "images" = jsonb_build_array("image_url")
            WHERE "image_url" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "images"`);
    }

}
