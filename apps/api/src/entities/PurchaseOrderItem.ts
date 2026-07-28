import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Filament } from "./Filament";
import { PurchaseOrder } from "./PurchaseOrder";

@Entity({ name: "purchase_order_items" })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "purchase_order_id" })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: "purchase_order_id", type: "uuid" })
  purchaseOrderId!: string;

  @ManyToOne(() => Filament, { eager: true })
  @JoinColumn({ name: "filament_id" })
  filament!: Filament;

  @Column({ name: "filament_id", type: "uuid" })
  filamentId!: string;

  @Column({ name: "quantity_grams", type: "int" })
  quantityGrams!: number;

  @Column({ name: "total_cost", type: "numeric", precision: 10, scale: 2 })
  totalCost!: number;
}
