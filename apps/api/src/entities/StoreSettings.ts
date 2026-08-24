import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "store_settings" })
export class StoreSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "store_name", type: "varchar", default: "Vórtex 3D" })
  storeName!: string;

  @Column({ name: "store_email", type: "varchar", default: "contato@vortex3d.com.br" })
  storeEmail!: string;

  @Column({ name: "store_phone", type: "varchar", default: "(11) 99999-9999" })
  storePhone!: string;

  @Column({ name: "store_cnpj", type: "varchar", default: "00.000.000/0001-00" })
  storeCnpj!: string;

  @Column({ name: "free_shipping_threshold", type: "numeric", precision: 10, scale: 2, default: 299 })
  freeShippingThreshold!: number;

  @Column({ name: "pix_discount_percent", type: "numeric", precision: 5, scale: 2, default: 5 })
  pixDiscountPercent!: number;

  @Column({ name: "boleto_discount_percent", type: "numeric", precision: 5, scale: 2, default: 3 })
  boletoDiscountPercent!: number;

  @Column({ name: "installments_without_interest", type: "int", default: 3 })
  installmentsWithoutInterest!: number;

  @Column({ name: "pix_key", type: "varchar", default: "contato@vortex3d.com.br" })
  pixKey!: string;

  @Column({ name: "notify_new_order", type: "boolean", default: true })
  notifyNewOrder!: boolean;

  @Column({ name: "notify_payment_confirmed", type: "boolean", default: true })
  notifyPaymentConfirmed!: boolean;

  @Column({ name: "notify_low_stock", type: "boolean", default: true })
  notifyLowStock!: boolean;

  @Column({ name: "electricity_cost_per_kwh", type: "numeric", precision: 6, scale: 4, default: 0.9 })
  electricityCostPerKwh!: number;

  @Column({ name: "machine_cost_per_hour", type: "numeric", precision: 10, scale: 2, default: 2.0 })
  machineCostPerHour!: number;

  @Column({ name: "labor_cost_per_hour", type: "numeric", precision: 10, scale: 2, default: 20.0 })
  laborCostPerHour!: number;

  @Column({ name: "default_waste_rate_percent", type: "numeric", precision: 5, scale: 2, default: 5 })
  defaultWasteRatePercent!: number;

  @Column({ name: "default_margin_percent", type: "numeric", precision: 5, scale: 2, default: 40 })
  defaultMarginPercent!: number;

  /** Custo fixo indireto rateado por hora produtiva. */
  @Column({ name: "overhead_cost_per_hour", type: "numeric", precision: 10, scale: 2, default: 0 })
  overheadCostPerHour!: number;

  /** Horas produtivas por mês usadas para ratear o custo fixo. */
  @Column({ name: "overhead_hours_per_month", type: "int", default: 160 })
  overheadHoursPerMonth!: number;

  /** Quando ligado, a precificação usa as taxas calculadas dos gastos reais. */
  @Column({ name: "auto_cost_rates", type: "boolean", default: false })
  autoCostRates!: boolean;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
