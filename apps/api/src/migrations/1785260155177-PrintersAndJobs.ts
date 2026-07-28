import { MigrationInterface, QueryRunner } from "typeorm";

export class PrintersAndJobs1785260155177 implements MigrationInterface {
    name = 'PrintersAndJobs1785260155177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "printers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "model" character varying, "status" character varying NOT NULL DEFAULT 'idle', "wattage" integer NOT NULL DEFAULT '150', "total_print_hours" numeric(10,2) NOT NULL DEFAULT '0', "purchase_cost" numeric(10,2), "location" character varying, "notes" text, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_036bb976f205339f632e2eb0642" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "printer_maintenance_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "printer_id" uuid NOT NULL, "description" character varying NOT NULL, "cost" numeric(10,2), "hours_at_maintenance" numeric(10,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b41a8026eee59dbb851bafe46ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "print_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "label" character varying NOT NULL, "printer_id" uuid, "filament_id" uuid, "order_item_id" uuid, "custom_quote_id" uuid, "status" character varying NOT NULL DEFAULT 'queued', "estimated_minutes" integer, "actual_minutes" integer, "weight_grams_used" integer, "notes" text, "started_at" TIMESTAMP, "finished_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a581cb9acbf52d919f86445434e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "store_settings" ALTER COLUMN "electricity_cost_per_kwh" SET DEFAULT '0.9'`);
        await queryRunner.query(`ALTER TABLE "printer_maintenance_logs" ADD CONSTRAINT "FK_ad0d9a19cac532144d837935e6a" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "print_jobs" ADD CONSTRAINT "FK_db7b189f5ed73bb31aeb1baff1e" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "print_jobs" ADD CONSTRAINT "FK_f094a1a60618aff632b15a382a5" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "print_jobs" ADD CONSTRAINT "FK_0c1e257993936013a23b59c4482" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "print_jobs" ADD CONSTRAINT "FK_cadb98f326abb0aff26010226a2" FOREIGN KEY ("custom_quote_id") REFERENCES "custom_quote_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "print_jobs" DROP CONSTRAINT "FK_cadb98f326abb0aff26010226a2"`);
        await queryRunner.query(`ALTER TABLE "print_jobs" DROP CONSTRAINT "FK_0c1e257993936013a23b59c4482"`);
        await queryRunner.query(`ALTER TABLE "print_jobs" DROP CONSTRAINT "FK_f094a1a60618aff632b15a382a5"`);
        await queryRunner.query(`ALTER TABLE "print_jobs" DROP CONSTRAINT "FK_db7b189f5ed73bb31aeb1baff1e"`);
        await queryRunner.query(`ALTER TABLE "printer_maintenance_logs" DROP CONSTRAINT "FK_ad0d9a19cac532144d837935e6a"`);
        await queryRunner.query(`ALTER TABLE "store_settings" ALTER COLUMN "electricity_cost_per_kwh" SET DEFAULT 0.9`);
        await queryRunner.query(`DROP TABLE "print_jobs"`);
        await queryRunner.query(`DROP TABLE "printer_maintenance_logs"`);
        await queryRunner.query(`DROP TABLE "printers"`);
    }

}
