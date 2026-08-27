import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductMarketplaceAliases1785320000000 implements MigrationInterface {
    name = 'ProductMarketplaceAliases1785320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "marketplace_aliases" jsonb NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "marketplace_aliases"`);
    }

}
