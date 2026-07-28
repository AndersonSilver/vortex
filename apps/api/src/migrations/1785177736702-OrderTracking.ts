import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderTracking1785177736702 implements MigrationInterface {
    name = 'OrderTracking1785177736702'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "tracking_code" character varying`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "tracking_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tracking_url"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tracking_code"`);
    }

}
