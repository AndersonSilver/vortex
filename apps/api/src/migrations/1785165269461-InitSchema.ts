import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1785165269461 implements MigrationInterface {
    name = 'InitSchema1785165269461'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "label" character varying NOT NULL DEFAULT 'Principal', "cep" character varying NOT NULL, "state" character varying NOT NULL, "city" character varying NOT NULL, "neighborhood" character varying NOT NULL, "street" character varying NOT NULL, "number" character varying NOT NULL, "complement" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "name_snapshot" character varying NOT NULL, "price_snapshot" numeric(10,2) NOT NULL, "qty" integer NOT NULL, "color" character varying NOT NULL, "material" character varying NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "provider" character varying NOT NULL DEFAULT 'mercadopago', "mp_payment_id" character varying, "method" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "raw_payload" jsonb, "amount" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying NOT NULL, "user_id" uuid, "customer_name" character varying NOT NULL, "customer_email" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "payment_method" character varying NOT NULL, "payment_status" character varying NOT NULL DEFAULT 'pending', "subtotal" numeric(10,2) NOT NULL, "discount" numeric(10,2) NOT NULL DEFAULT '0', "shipping_cost" numeric(10,2) NOT NULL DEFAULT '0', "total" numeric(10,2) NOT NULL, "shipping_method" character varying NOT NULL, "coupon_code" character varying, "address_snapshot" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE ("order_number"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "category" character varying NOT NULL, "description" text NOT NULL, "price" numeric(10,2) NOT NULL, "old_price" numeric(10,2), "emoji" character varying NOT NULL DEFAULT '📦', "image_url" character varying, "badge" character varying, "colors" jsonb NOT NULL DEFAULT '[]', "materials" jsonb NOT NULL DEFAULT '[]', "specs" jsonb NOT NULL DEFAULT '{}', "rating" numeric(2,1) NOT NULL DEFAULT '5', "reviews_count" integer NOT NULL DEFAULT '0', "stock" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_464f927ae360106b783ed0b410" ON "products" ("slug") `);
        await queryRunner.query(`CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "qty" integer NOT NULL, "color" character varying NOT NULL, "material" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "cpf" character varying, "phone" character varying, "role" character varying NOT NULL DEFAULT 'customer', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "type" character varying NOT NULL, "value" numeric(10,2) NOT NULL, "min_order" numeric(10,2) NOT NULL DEFAULT '0', "uses" integer NOT NULL DEFAULT '0', "max_uses" integer NOT NULL DEFAULT '100', "expires_at" date NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e025109230e82925843f2a14c4" ON "coupons" ("code") `);
        await queryRunner.query(`CREATE TABLE "custom_quote_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "file_url" character varying NOT NULL, "material" character varying NOT NULL, "color" character varying NOT NULL, "qty" integer NOT NULL DEFAULT '1', "notes" text, "email" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "quoted_price" numeric(10,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e36410873f13076872d1037b9c6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "store_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_name" character varying NOT NULL DEFAULT 'Vórtex 3D', "store_email" character varying NOT NULL DEFAULT 'contato@vortex3d.com.br', "store_phone" character varying NOT NULL DEFAULT '(11) 99999-9999', "store_cnpj" character varying NOT NULL DEFAULT '00.000.000/0001-00', "free_shipping_threshold" numeric(10,2) NOT NULL DEFAULT '299', "pix_discount_percent" numeric(5,2) NOT NULL DEFAULT '5', "boleto_discount_percent" numeric(5,2) NOT NULL DEFAULT '3', "installments_without_interest" integer NOT NULL DEFAULT '3', "pix_key" character varying NOT NULL DEFAULT 'contato@vortex3d.com.br', "notify_new_order" boolean NOT NULL DEFAULT true, "notify_payment_confirmed" boolean NOT NULL DEFAULT true, "notify_low_stock" boolean NOT NULL DEFAULT true, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4da44f346b360f378f1489b6199" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "addresses" ADD CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_b7213c20c1ecdc6597abc8f1212" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_30e89257a105eab7648a35c7fce" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_quote_requests" ADD CONSTRAINT "FK_8d87d48d4f849294bc803fe9675" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_quote_requests" DROP CONSTRAINT "FK_8d87d48d4f849294bc803fe9675"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_30e89257a105eab7648a35c7fce"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_b7213c20c1ecdc6597abc8f1212"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_b2f7b823a21562eeca20e72b006"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT "FK_16aac8a9f6f9c1dd6bcb75ec023"`);
        await queryRunner.query(`DROP TABLE "store_settings"`);
        await queryRunner.query(`DROP TABLE "custom_quote_requests"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e025109230e82925843f2a14c4"`);
        await queryRunner.query(`DROP TABLE "coupons"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "cart_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_464f927ae360106b783ed0b410"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "addresses"`);
    }

}
