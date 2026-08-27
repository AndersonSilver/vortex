import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderMarketplaceOrderNumber1785340000000 implements MigrationInterface {
    name = 'OrderMarketplaceOrderNumber1785340000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "marketplace_order_number" varchar`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "marketplace_order_number"`);
    }

}
