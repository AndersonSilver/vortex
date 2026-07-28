import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { FilamentMovementType } from "@vortex/shared";
import { Filament } from "./Filament";

@Entity({ name: "filament_movements" })
export class FilamentMovement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Filament, { onDelete: "CASCADE" })
  @JoinColumn({ name: "filament_id" })
  filament!: Filament;

  @Column({ name: "filament_id", type: "uuid" })
  filamentId!: string;

  @Column({ type: "varchar" })
  type!: FilamentMovementType;

  @Column({ name: "change_grams", type: "int" })
  changeGrams!: number;

  @Column({ type: "varchar", nullable: true })
  reason?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
