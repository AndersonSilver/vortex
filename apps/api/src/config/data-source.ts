import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";
import {
  Address,
  CartItem,
  Coupon,
  CustomQuoteRequest,
  Order,
  OrderItem,
  Payment,
  Product,
  StoreSettings,
  User,
} from "../entities";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: false,
  logging: env.nodeEnv === "development" ? ["error", "warn"] : false,
  entities: [
    User,
    Address,
    Product,
    CartItem,
    Coupon,
    Order,
    OrderItem,
    Payment,
    CustomQuoteRequest,
    StoreSettings,
  ],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
});
