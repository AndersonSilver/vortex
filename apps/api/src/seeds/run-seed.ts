import "reflect-metadata";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source";
import { Coupon, Product, User } from "../entities";
import { getSettingsEntity } from "../modules/settings/settings.service";
import { PRODUCTS_SEED } from "./products.seed";
import { COUPONS_SEED } from "./coupons.seed";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@vortex3d.com.br";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123456";

async function seedProducts() {
  const repo = AppDataSource.getRepository(Product);
  for (const data of PRODUCTS_SEED) {
    const existing = await repo.findOneBy({ slug: data.slug });
    if (existing) {
      Object.assign(existing, data);
      await repo.save(existing);
    } else {
      await repo.save(repo.create(data));
    }
  }
  console.log(`[seed] ${PRODUCTS_SEED.length} produtos sincronizados.`);
}

async function seedCoupons() {
  const repo = AppDataSource.getRepository(Coupon);
  for (const data of COUPONS_SEED) {
    const existing = await repo.findOneBy({ code: data.code });
    if (existing) {
      Object.assign(existing, data);
      await repo.save(existing);
    } else {
      await repo.save(repo.create(data));
    }
  }
  console.log(`[seed] ${COUPONS_SEED.length} cupons sincronizados.`);
}

async function seedAdminUser() {
  const repo = AppDataSource.getRepository(User);
  const existing = await repo.findOneBy({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`[seed] Usuário admin já existe (${ADMIN_EMAIL}).`);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await repo.save(
    repo.create({
      name: "Administrador Vórtex 3D",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    }),
  );
  console.log(`[seed] Usuário admin criado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

async function main() {
  await AppDataSource.initialize();
  await seedProducts();
  await seedCoupons();
  await seedAdminUser();
  await getSettingsEntity();
  console.log("[seed] Configurações da loja garantidas.");
  await AppDataSource.destroy();
  console.log("[seed] Concluído.");
}

main().catch((error) => {
  console.error("[seed] Falha ao popular o banco:", error);
  process.exit(1);
});
