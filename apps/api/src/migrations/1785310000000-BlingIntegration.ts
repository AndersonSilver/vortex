import { MigrationInterface, QueryRunner } from "typeorm";

export class BlingIntegration1785310000000 implements MigrationInterface {
    name = 'BlingIntegration1785310000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "channel" varchar NOT NULL DEFAULT 'site'`);
        await queryRunner.query(`UPDATE "orders" SET "channel" = 'manual' WHERE "is_manual" = true`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "external_order_id" varchar`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "origin_label" varchar`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_orders_channel_external_order_id" ON "orders" ("channel", "external_order_id") WHERE "external_order_id" IS NOT NULL`,
        );

        await queryRunner.query(`ALTER TABLE "products" ADD "sku" varchar`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_products_sku" ON "products" ("sku") WHERE "sku" IS NOT NULL`,
        );

        await queryRunner.query(`
            CREATE TABLE "bling_credentials" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "access_token" varchar NOT NULL,
                "refresh_token" varchar NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bling_credentials" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "bling_credentials"`);

        await queryRunner.query(`DROP INDEX "UQ_products_sku"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku"`);

        await queryRunner.query(`DROP INDEX "UQ_orders_channel_external_order_id"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "origin_label"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "external_order_id"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "channel"`);
    }

}
