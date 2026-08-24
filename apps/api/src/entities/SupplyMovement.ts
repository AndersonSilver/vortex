import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { SupplyMovementType } from "@vortex/shared";
import { Supply } from "./Supply";

@Entity({ name: "supply_movements" })
export class SupplyMovement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Supply, { onDelete: "CASCADE" })
  @JoinColumn({ name: "supply_id" })
  supply!: Supply;

  @Column({ name: "supply_id", type: "uuid" })
  supplyId!: string;

  @Column({ type: "varchar" })
  type!: SupplyMovementType;

  @Column({ name: "change_quantity", type: "numeric", precision: 12, scale: 3 })
  changeQuantity!: number;

  @Column({ name: "unit_cost", type: "numeric", precision: 12, scale: 4, nullable: true })
  unitCost?: number | null;

  @Column({ type: "varchar", nullable: true })
  reason?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
