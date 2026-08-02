import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualOrderDiscountType1785290000000 implements MigrationInterface {
    name = 'ManualOrderDiscountType1785290000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "discount_type" varchar NOT NULL DEFAULT 'fixed'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "discount_value" numeric(10,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`UPDATE "orders" SET "discount_value" = "discount"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discount_value"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discount_type"`);
    }

}
