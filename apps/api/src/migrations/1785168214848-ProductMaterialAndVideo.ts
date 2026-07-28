import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductMaterialAndVideo1785168214848 implements MigrationInterface {
    name = 'ProductMaterialAndVideo1785168214848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "materials"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "video_url" character varying`);
        await queryRunner.query(`ALTER TABLE "products" ADD "material" character varying NOT NULL DEFAULT 'PLA'`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "material" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "material"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "video_url"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "materials" jsonb NOT NULL DEFAULT '[]'`);
    }

}
