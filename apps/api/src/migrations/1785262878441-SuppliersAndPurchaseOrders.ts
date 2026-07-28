import { MigrationInterface, QueryRunner } from "typeorm";

export class SuppliersAndPurchaseOrders1785262878441 implements MigrationInterface {
    name = 'SuppliersAndPurchaseOrders1785262878441'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Suppliers table
        await queryRunner.query(`CREATE TABLE "suppliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "contact_name" character varying, "phone" character varying, "email" character varying, "notes" text, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`);

        // 2. Data migration: create a Supplier row for each distinct free-text value already in filaments.supplier,
        //    then point filaments.supplier_id at it, BEFORE dropping the old text column.
        await queryRunner.query(`
            INSERT INTO "suppliers" (id, name, active, created_at, updated_at)
            SELECT uuid_generate_v4(), supplier, true, now(), now()
            FROM (SELECT DISTINCT supplier FROM "filaments" WHERE supplier IS NOT NULL) t
        `);
        await queryRunner.query(`ALTER TABLE "filaments" ADD "supplier_id" uuid`);
        await queryRunner.query(`
            UPDATE "filaments" f SET supplier_id = s.id
            FROM "suppliers" s WHERE f.supplier = s.name
        `);
        await queryRunner.query(`ALTER TABLE "filaments" DROP COLUMN "supplier"`);

        // 3. Purchase orders + items
        await queryRunner.query(`CREATE TABLE "purchase_order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_order_id" uuid NOT NULL, "filament_id" uuid NOT NULL, "quantity_grams" integer NOT NULL, "total_cost" numeric(10,2) NOT NULL, CONSTRAINT "PK_e8b7568d25c41e3290db596b312" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "supplier_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "notes" text, "received_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_05148947415204a897e8beb2553" PRIMARY KEY ("id"))`);

        await queryRunner.query(`ALTER TABLE "store_settings" ALTER COLUMN "electricity_cost_per_kwh" SET DEFAULT '0.9'`);

        // 4. Foreign keys
        await queryRunner.query(`ALTER TABLE "filaments" ADD CONSTRAINT "FK_filaments_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_3f92bb44026cedfe235c8b91244" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_80a0979260e3e7889cd11fa4972" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_d16a885aa88447ccfd010e739b0" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_d16a885aa88447ccfd010e739b0"`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_80a0979260e3e7889cd11fa4972"`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_3f92bb44026cedfe235c8b91244"`);
        await queryRunner.query(`ALTER TABLE "filaments" DROP CONSTRAINT "FK_filaments_supplier"`);
        await queryRunner.query(`ALTER TABLE "store_settings" ALTER COLUMN "electricity_cost_per_kwh" SET DEFAULT 0.9`);

        await queryRunner.query(`DROP TABLE "purchase_orders"`);
        await queryRunner.query(`DROP TABLE "purchase_order_items"`);

        // Restore filaments.supplier as free text before dropping supplier_id/suppliers
        await queryRunner.query(`ALTER TABLE "filaments" ADD "supplier" character varying`);
        await queryRunner.query(`
            UPDATE "filaments" f SET supplier = s.name
            FROM "suppliers" s WHERE f.supplier_id = s.id
        `);
        await queryRunner.query(`ALTER TABLE "filaments" DROP COLUMN "supplier_id"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
    }

}
