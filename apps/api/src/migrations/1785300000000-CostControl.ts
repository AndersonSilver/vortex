import { MigrationInterface, QueryRunner } from "typeorm";

/** Categorias do seed com id fixo, para o backfill poder referenciá-las. */
const CAT_FILAMENT = "c0000000-0000-4000-8000-000000000001";
const CAT_EQUIPMENT = "c0000000-0000-4000-8000-000000000007";

export class CostControl1785300000000 implements MigrationInterface {
  name = "CostControl1785300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Categorias de gasto -----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "expense_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "kind" character varying NOT NULL,
        "target" character varying NOT NULL DEFAULT 'none',
        "emoji" character varying NOT NULL DEFAULT '💸',
        "system" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "expense_categories" (id, name, kind, target, emoji, system) VALUES
        ('${CAT_FILAMENT}', 'Filamento', 'direct_variable', 'filament', '🧵', true),
        ('c0000000-0000-4000-8000-000000000002', 'Embalagem', 'direct_variable', 'supply', '📦', true),
        ('c0000000-0000-4000-8000-000000000003', 'Consumível', 'direct_variable', 'supply', '🧪', true),
        ('c0000000-0000-4000-8000-000000000004', 'Peça de reposição', 'direct_variable', 'supply', '🔧', true),
        ('c0000000-0000-4000-8000-000000000005', 'Frete de envio', 'direct_variable', 'none', '🚚', true),
        ('c0000000-0000-4000-8000-000000000006', 'Taxa de venda', 'direct_variable', 'none', '🏷️', true),
        ('${CAT_EQUIPMENT}', 'Equipamento', 'capex', 'asset', '🖨️', true),
        ('c0000000-0000-4000-8000-000000000008', 'Ferramenta', 'capex', 'asset', '🛠️', true),
        ('c0000000-0000-4000-8000-000000000009', 'Aluguel', 'indirect_fixed', 'none', '🏠', true),
        ('c0000000-0000-4000-8000-000000000010', 'Energia elétrica', 'indirect_fixed', 'none', '⚡', true),
        ('c0000000-0000-4000-8000-000000000011', 'Internet e telefone', 'indirect_fixed', 'none', '🌐', true),
        ('c0000000-0000-4000-8000-000000000012', 'Software e assinaturas', 'indirect_fixed', 'none', '💻', true),
        ('c0000000-0000-4000-8000-000000000013', 'Serviços profissionais', 'indirect_fixed', 'none', '🧾', true),
        ('c0000000-0000-4000-8000-000000000014', 'Marketing e anúncios', 'indirect_fixed', 'none', '📣', true),
        ('c0000000-0000-4000-8000-000000000015', 'Impostos e taxas', 'indirect_fixed', 'none', '🏛️', true),
        ('c0000000-0000-4000-8000-000000000016', 'Manutenção', 'indirect_fixed', 'none', '🩹', true),
        ('c0000000-0000-4000-8000-000000000017', 'Outros', 'indirect_fixed', 'none', '💸', true)
    `);

    // 2. Insumos com estoque e custo médio móvel ---------------------------
    await queryRunner.query(`
      CREATE TABLE "supplies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "category_id" uuid NOT NULL,
        "unit" character varying NOT NULL DEFAULT 'un',
        "quantity_on_hand" numeric(12,3) NOT NULL DEFAULT 0,
        "avg_unit_cost" numeric(12,4) NOT NULL DEFAULT 0,
        "low_stock_threshold" numeric(12,3) NOT NULL DEFAULT 0,
        "supplier_id" uuid,
        "notes" text,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "supply_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supply_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "change_quantity" numeric(12,3) NOT NULL,
        "unit_cost" numeric(12,4),
        "reason" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supply_movements" PRIMARY KEY ("id")
      )
    `);

    // 3. Ativos depreciáveis ----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "category_id" uuid NOT NULL,
        "printer_id" uuid,
        "status" character varying NOT NULL DEFAULT 'active',
        "acquired_at" date NOT NULL,
        "acquisition_cost" numeric(12,2) NOT NULL,
        "salvage_value" numeric(12,2) NOT NULL DEFAULT 0,
        "useful_life_months" integer NOT NULL DEFAULT 60,
        "expected_hours_per_month" numeric(8,2) NOT NULL DEFAULT 0,
        "notes" text,
        "disposed_at" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assets" PRIMARY KEY ("id")
      )
    `);

    // 4. Despesas fixas recorrentes ---------------------------------------
    await queryRunner.query(`
      CREATE TABLE "recurring_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "category_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "period" character varying NOT NULL DEFAULT 'monthly',
        "due_day" integer,
        "start_date" date NOT NULL,
        "end_date" date,
        "supplier_id" uuid,
        "payment_method" character varying,
        "notes" text,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recurring_expenses" PRIMARY KEY ("id")
      )
    `);

    // 5. Livro único de despesas ------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "expense_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_id" uuid NOT NULL,
        "description" character varying NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "incurred_at" date NOT NULL,
        "source" character varying NOT NULL DEFAULT 'manual',
        "supplier_id" uuid,
        "purchase_order_id" uuid,
        "recurring_expense_id" uuid,
        "asset_id" uuid,
        "period_key" character varying(7),
        "payment_method" character varying,
        "attachment_url" character varying,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_entries" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_expense_entries_incurred_at" ON "expense_entries" ("incurred_at")`);
    // Trava o lançamento duplicado da mesma fixa/depreciação no mesmo mês.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_expense_entries_recurring_period"
      ON "expense_entries" ("recurring_expense_id", "period_key")
      WHERE "recurring_expense_id" IS NOT NULL AND "period_key" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_expense_entries_asset_period"
      ON "expense_entries" ("asset_id", "period_key")
      WHERE "asset_id" IS NOT NULL AND "period_key" IS NOT NULL AND "source" = 'depreciation'
    `);

    // 6. Compras: nota, data real, frete, encargos, desconto, pagamento ----
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "document_number" character varying`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "purchased_at" date`);
    await queryRunner.query(`UPDATE "purchase_orders" SET "purchased_at" = "created_at"::date`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ALTER COLUMN "purchased_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "freight_cost" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "other_charges" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "discount" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "payment_method" character varying`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD "installments" integer NOT NULL DEFAULT 1`);

    // 7. Itens de compra: de "só filamento" para qualquer tipo de gasto ----
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "category_id" uuid`);
    await queryRunner.query(`UPDATE "purchase_order_items" SET "category_id" = '${CAT_FILAMENT}'`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "category_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "description" character varying`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "supply_id" uuid`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "asset_id" uuid`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "quantity" numeric(12,3)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "unit" character varying NOT NULL DEFAULT 'un'`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "unit_cost" numeric(12,4)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "allocated_cost" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "asset_useful_life_months" integer`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "asset_salvage_value" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "asset_expected_hours_per_month" numeric(8,2)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "asset_printer_id" uuid`);
    // Os itens antigos eram todos em gramas de filamento.
    await queryRunner.query(`
      UPDATE "purchase_order_items"
      SET "quantity" = "quantity_grams",
          "unit" = 'g',
          "unit_cost" = CASE WHEN "quantity_grams" > 0 THEN "total_cost" / "quantity_grams" ELSE 0 END,
          "allocated_cost" = "total_cost"
    `);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "quantity" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "unit_cost" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN "quantity_grams"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "filament_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "total_cost" TYPE numeric(12,2)`);

    // 8. Backfill: compras já recebidas viram lançamento no livro ----------
    await queryRunner.query(`
      INSERT INTO "expense_entries" (category_id, description, amount, incurred_at, source, supplier_id, purchase_order_id)
      SELECT i."category_id",
             COALESCE(f."brand" || ' · ' || f."color", 'Item de compra'),
             i."total_cost",
             po."purchased_at",
             'purchase_order',
             po."supplier_id",
             po."id"
      FROM "purchase_order_items" i
      JOIN "purchase_orders" po ON po."id" = i."purchase_order_id"
      LEFT JOIN "filaments" f ON f."id" = i."filament_id"
      WHERE po."status" = 'received'
    `);

    // 9. Precificação: overhead e taxas automáticas ------------------------
    await queryRunner.query(`ALTER TABLE "store_settings" ADD "overhead_cost_per_hour" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "store_settings" ADD "overhead_hours_per_month" integer NOT NULL DEFAULT 160`);
    await queryRunner.query(`ALTER TABLE "store_settings" ADD "auto_cost_rates" boolean NOT NULL DEFAULT false`);

    // 10. Chaves estrangeiras ---------------------------------------------
    await queryRunner.query(`ALTER TABLE "supplies" ADD CONSTRAINT "FK_supplies_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "supplies" ADD CONSTRAINT "FK_supplies_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "supply_movements" ADD CONSTRAINT "FK_supply_movements_supply" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_assets_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_assets_printer" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "recurring_expenses" ADD CONSTRAINT "FK_recurring_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "recurring_expenses" ADD CONSTRAINT "FK_recurring_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "expense_entries" ADD CONSTRAINT "FK_expense_entries_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "expense_entries" ADD CONSTRAINT "FK_expense_entries_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "expense_entries" ADD CONSTRAINT "FK_expense_entries_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "expense_entries" ADD CONSTRAINT "FK_expense_entries_recurring" FOREIGN KEY ("recurring_expense_id") REFERENCES "recurring_expenses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "expense_entries" ADD CONSTRAINT "FK_expense_entries_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_poi_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_poi_supply" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_poi_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_poi_asset"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_poi_supply"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_poi_category"`);

    await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "auto_cost_rates"`);
    await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "overhead_hours_per_month"`);
    await queryRunner.query(`ALTER TABLE "store_settings" DROP COLUMN "overhead_cost_per_hour"`);

    // Volta os itens para o formato só-filamento. Itens que não eram de filamento
    // não têm como ser representados no modelo antigo e são descartados.
    await queryRunner.query(`DELETE FROM "purchase_order_items" WHERE "filament_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "quantity_grams" integer`);
    await queryRunner.query(`UPDATE "purchase_order_items" SET "quantity_grams" = ROUND("quantity")`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "quantity_grams" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "filament_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ALTER COLUMN "total_cost" TYPE numeric(10,2)`);
    for (const column of [
      "asset_printer_id",
      "asset_expected_hours_per_month",
      "asset_salvage_value",
      "asset_useful_life_months",
      "allocated_cost",
      "unit_cost",
      "unit",
      "quantity",
      "asset_id",
      "supply_id",
      "description",
      "category_id",
    ]) {
      await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN "${column}"`);
    }

    for (const column of [
      "installments",
      "payment_method",
      "discount",
      "other_charges",
      "freight_cost",
      "purchased_at",
      "document_number",
    ]) {
      await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN "${column}"`);
    }

    await queryRunner.query(`DROP TABLE "expense_entries"`);
    await queryRunner.query(`DROP TABLE "recurring_expenses"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TABLE "supply_movements"`);
    await queryRunner.query(`DROP TABLE "supplies"`);
    await queryRunner.query(`DROP TABLE "expense_categories"`);
  }
}
