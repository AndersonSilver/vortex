import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { addressesRouter } from "./modules/addresses/addresses.routes";
import { productsRouter } from "./modules/products/products.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { couponsRouter } from "./modules/coupons/coupons.routes";
import { shippingRouter } from "./modules/shipping/shipping.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { webhooksRouter } from "./modules/webhooks/webhooks.routes";
import { quotesRouter } from "./modules/quotes/quotes.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { filamentsRouter } from "./modules/filaments/filaments.routes";
import { printersRouter } from "./modules/printers/printers.routes";
import { printJobsRouter } from "./modules/print-jobs/print-jobs.routes";
import { suppliersRouter } from "./modules/suppliers/suppliers.routes";
import { purchaseOrdersRouter } from "./modules/purchase-orders/purchase-orders.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.webOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/addresses", addressesRouter);
  app.use("/products", productsRouter);
  app.use("/cart", cartRouter);
  app.use("/coupons", couponsRouter);
  app.use("/shipping", shippingRouter);
  app.use("/orders", ordersRouter);
  app.use("/payments", paymentsRouter);
  app.use("/webhooks", webhooksRouter);
  app.use("/quotes", quotesRouter);
  app.use("/media", mediaRouter);
  app.use("/admin", adminRouter);
  app.use("/settings", settingsRouter);
  app.use("/filaments", filamentsRouter);
  app.use("/printers", printersRouter);
  app.use("/print-jobs", printJobsRouter);
  app.use("/suppliers", suppliersRouter);
  app.use("/purchase-orders", purchaseOrdersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
