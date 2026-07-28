import { MigrationInterface, QueryRunner } from "typeorm";

export class FilamentAndPricing1785258729120 implements MigrationInterface {
    name = 'FilamentAndPricing1785258729120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "filaments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brand" character varying NOT NULL, "material" character varying NOT NULL, "color" character varying NOT NULL, "color_hex" character varying, "spool_weight_grams" integer NOT NULL, "remaining_weight_grams" integer NOT NULL, "cost_per_spool" numeric(10,2) NOT NULL, "low_stock_threshold_grams" integer NOT NULL DEFAULT '150', "supplier" character varying, "notes" text, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e296767288157534f60be0a722e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "filament_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "filament_id" uuid NOT NULL, "type" character varying NOT NULL, "change_grams" integer NOT NULL, "reason" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d01771d9a31d8860141270a8070" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "products" ADD "filament_id" uuid`);
        await queryRunner.query(`ALTER TABLE "products" ADD "weight_grams" integer`);
        await queryRunner.query(`ALTER TABLE "products" ADD "print_time_minutes" integer`);
        await queryRunner.query(`ALTER TABLE "products" ADD "cost_price" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "store_settings" ADD "electricity_cost_per_kwh" numeric(6,4) NOT NULL DEFAULT '0.9'`);
        await queryRunner.query(`ALTER TABLE "store_settings" ADD "machine_cost_per_hour" numeric(10,2) NOT NULL DEFAULT '2'`);
        await queryRunner.query(`ALTER TABLE "store_settings" ADD "labor_cost_per_hour" numeric(10,2) NOT NULL DEFAULT '20'`);
        await queryRunner.query(`ALTER TABLE "store_settings" ADD "default_waste_rate_percent" numeric(5,2) NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "store_settings" ADD "default_margin_percent" numeric(5,2) NOT NULL DEFAULT '40'`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_e895b97ea6e6a72a08c7af9c917" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "filament_movements" ADD CONSTRAINT "FK_ba4ac7c12aa5276be1a4c60e22b" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "filament_movements" DROP CONSTRAINT "FK_ba4ac7c12aa5276be1a4c60e22b"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_e895b97ea6e6a72a08c7af9c917"`);
        await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "default_margin_percent"`);
        await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "default_waste_rate_percent"`);
        await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "labor_cost_per_hour"`);
        await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "machine_cost_per_hour"`);
        await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "electricity_cost_per_kwh"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "cost_price"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "print_time_minutes"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "weight_grams"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "filament_id"`);
        await queryRunner.query(`DROP TABLE "filament_movements"`);
        await queryRunner.query(`DROP TABLE "filaments"`);
    }

}
