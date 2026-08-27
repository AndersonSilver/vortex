import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderViewedAt1785350000000 implements MigrationInterface {
    name = 'OrderViewedAt1785350000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "viewed_at" TIMESTAMP WITH TIME ZONE`);
        // Existing orders predate this feature — treat them as already seen so only orders
        // created from here on show the "new" badge.
        await queryRunner.query(`UPDATE "orders" SET "viewed_at" = now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "viewed_at"`);
    }

}
