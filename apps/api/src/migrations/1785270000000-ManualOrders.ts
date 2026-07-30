import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualOrders1785270000000 implements MigrationInterface {
    name = 'ManualOrders1785270000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "customer_phone" varchar`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "is_manual" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "customer_email" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "customer_email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "is_manual"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customer_phone"`);
    }

}
