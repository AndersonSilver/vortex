import "reflect-metadata";
import { createApp } from "./app";
import { env } from "./config/env";
import { AppDataSource } from "./config/data-source";
import { ensureBucketExists } from "./config/storage";

async function main() {
  await AppDataSource.initialize();
  console.log("[api] Postgres conectado.");

  const pendingMigrations = await AppDataSource.showMigrations();
  if (pendingMigrations) {
    console.log("[api] Rodando migrations pendentes...");
    await AppDataSource.runMigrations();
    console.log("[api] Migrations aplicadas.");
  }

  await ensureBucketExists();
  console.log("[api] Bucket MinIO verificado.");

  const app = createApp();
  app.listen(env.apiPort, () => {
    console.log(`[api] Servidor rodando em http://localhost:${env.apiPort}`);
  });
}

main().catch((error) => {
  console.error("[api] Falha ao iniciar o servidor:", error);
  process.exit(1);
});
