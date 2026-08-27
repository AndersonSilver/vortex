import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderItemNullableProduct1785330000000 implements MigrationInterface {
    name = 'OrderItemNullableProduct1785330000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "product_id" SET NOT NULL`);
    }

}
