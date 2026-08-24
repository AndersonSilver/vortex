import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { MeasurementUnit } from "@vortex/shared";
import { Asset } from "./Asset";
import { ExpenseCategory } from "./ExpenseCategory";
import { Filament } from "./Filament";
import { PurchaseOrder } from "./PurchaseOrder";
import { Supply } from "./Supply";

@Entity({ name: "purchase_order_items" })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "purchase_order_id" })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: "purchase_order_id", type: "uuid" })
  purchaseOrderId!: string;

  @ManyToOne(() => ExpenseCategory, { eager: true })
  @JoinColumn({ name: "category_id" })
  category!: ExpenseCategory;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  /** Texto livre para itens que não movimentam estoque (serviço, taxa, software). */
  @Column({ type: "varchar", nullable: true })
  description?: string | null;

  @ManyToOne(() => Filament, { eager: true, nullable: true })
  @JoinColumn({ name: "filament_id" })
  filament?: Filament | null;

  @Column({ name: "filament_id", type: "uuid", nullable: true })
  filamentId?: string | null;

  @ManyToOne(() => Supply, { eager: true, nullable: true })
  @JoinColumn({ name: "supply_id" })
  supply?: Supply | null;

  @Column({ name: "supply_id", type: "uuid", nullable: true })
  supplyId?: string | null;

  /** Ativo criado no recebimento, quando a categoria é de investimento. */
  @ManyToOne(() => Asset, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "asset_id" })
  asset?: Asset | null;

  @Column({ name: "asset_id", type: "uuid", nullable: true })
  assetId?: string | null;

  @Column({ type: "numeric", precision: 12, scale: 3 })
  quantity!: number;

  @Column({ type: "varchar", default: "un" })
  unit!: MeasurementUnit;

  @Column({ name: "unit_cost", type: "numeric", precision: 12, scale: 4 })
  unitCost!: number;

  @Column({ name: "total_cost", type: "numeric", precision: 12, scale: 2 })
  totalCost!: number;

  /** Custo com rateio de frete/encargos/desconto. Preenchido no recebimento. */
  @Column({ name: "allocated_cost", type: "numeric", precision: 12, scale: 2, nullable: true })
  allocatedCost?: number | null;

  /** Vida útil em meses do ativo a criar, quando a categoria é capex. */
  @Column({ name: "asset_useful_life_months", type: "int", nullable: true })
  assetUsefulLifeMonths?: number | null;

  @Column({ name: "asset_salvage_value", type: "numeric", precision: 12, scale: 2, nullable: true })
  assetSalvageValue?: number | null;

  @Column({ name: "asset_expected_hours_per_month", type: "numeric", precision: 8, scale: 2, nullable: true })
  assetExpectedHoursPerMonth?: number | null;

  @Column({ name: "asset_printer_id", type: "uuid", nullable: true })
  assetPrinterId?: string | null;
}
