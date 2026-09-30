import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Consignação em lojas físicas parceiras. Cada loja tem estoque próprio (não mexe em
 * products.stock), paga um repasse fixo por peça vendida e acerta com a Vortex em saldo
 * corrido: débito das vendas menos os pagamentos lançados pelo admin.
 *
 * users.role já é varchar, então o perfil "consignado" não precisa de alteração de tipo —
 * só da coluna que liga o usuário à loja dele.
 */
export class Consignment1785370000000 implements MigrationInterface {
  name = "Consignment1785370000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "consignment_stores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "document" character varying,
        "contact_name" character varying,
        "phone" character varying,
        "email" character varying,
        "address" text,
        "notes" text,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consignment_stores" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`ALTER TABLE "users" ADD "consignment_store_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_consignment_store"
        FOREIGN KEY ("consignment_store_id") REFERENCES "consignment_stores"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "consignment_stock" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "transfer_price" numeric(10,2) NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consignment_stock" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_consignment_stock_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "FK_consignment_stock_store" FOREIGN KEY ("store_id")
          REFERENCES "consignment_stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_consignment_stock_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_consignment_stock_store_product" ON "consignment_stock" ("store_id", "product_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "consignment_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "note" text,
        "admin_note" text,
        "requested_by_user_id" uuid,
        "shipped_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consignment_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_consignment_requests_store" FOREIGN KEY ("store_id")
          REFERENCES "consignment_stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_consignment_requests_user" FOREIGN KEY ("requested_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_consignment_requests_store_status" ON "consignment_requests" ("store_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "consignment_request_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "qty_requested" integer NOT NULL,
        "qty_sent" integer,
        "transfer_price" numeric(10,2),
        CONSTRAINT "PK_consignment_request_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_consignment_request_items_request" FOREIGN KEY ("request_id")
          REFERENCES "consignment_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_consignment_request_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "consignment_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "change_quantity" integer NOT NULL,
        "transfer_price" numeric(10,2) NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "note" character varying,
        "created_by_user_id" uuid,
        "request_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consignment_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_consignment_movements_store" FOREIGN KEY ("store_id")
          REFERENCES "consignment_stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_consignment_movements_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_consignment_movements_user" FOREIGN KEY ("created_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_consignment_movements_request" FOREIGN KEY ("request_id")
          REFERENCES "consignment_requests"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_consignment_movements_store_created" ON "consignment_movements" ("store_id", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "consignment_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "paid_at" date NOT NULL,
        "method" character varying NOT NULL DEFAULT 'pix',
        "note" character varying,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consignment_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_consignment_payments_store" FOREIGN KEY ("store_id")
          REFERENCES "consignment_stores"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "consignment_payments"`);
    await queryRunner.query(`DROP TABLE "consignment_movements"`);
    await queryRunner.query(`DROP TABLE "consignment_request_items"`);
    await queryRunner.query(`DROP TABLE "consignment_requests"`);
    await queryRunner.query(`DROP TABLE "consignment_stock"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_consignment_store"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "consignment_store_id"`);
    await queryRunner.query(`DROP TABLE "consignment_stores"`);
  }
}
