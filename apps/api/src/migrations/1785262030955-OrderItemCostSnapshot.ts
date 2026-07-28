import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderItemCostSnapshot1785262030955 implements MigrationInterface {
    name = 'OrderItemCostSnapshot1785262030955'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ADD "cost_price_snapshot" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "store_settings" ALTER COLUMN "electricity_cost_per_kwh" SET DEFAULT '0.9'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_settings" ALTER COLUMN "electricity_cost_per_kwh" SET DEFAULT 0.9`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "cost_price_snapshot"`);
    }

}
