import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tira as categorias de produto do enum do código e passa para uma tabela editável no admin.
 * products.category continua guardando o slug, então nenhum produto precisa ser tocado —
 * o seed abaixo usa exatamente os slugs que o enum antigo tinha.
 */
export class ProductCategories1785360000000 implements MigrationInterface {
  name = "ProductCategories1785360000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "emoji" character varying NOT NULL DEFAULT '📦',
        "sort_order" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_product_categories_slug" ON "product_categories" ("slug")`,
    );
    await queryRunner.query(`
      INSERT INTO "product_categories" (slug, name, emoji, sort_order) VALUES
        ('figurines', 'Miniaturas', '🎭', 1),
        ('industrial', 'Industrial', '⚙️', 2),
        ('decor', 'Decoração', '🏺', 3),
        ('tech', 'Tech', '🔌', 4),
        ('toys', 'Brinquedos', '🧸', 5)
    `);
    // Rede de segurança: se algum produto tiver um slug fora do enum antigo, ele vira categoria
    // também, senão o produto ficaria com uma categoria que não existe em lugar nenhum.
    await queryRunner.query(`
      INSERT INTO "product_categories" (slug, name, sort_order)
      SELECT DISTINCT p."category", p."category", 99
      FROM "products" p
      WHERE p."category" <> ''
        AND NOT EXISTS (SELECT 1 FROM "product_categories" c WHERE c."slug" = p."category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_product_categories_slug"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
  }
}
