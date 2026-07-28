import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Printer } from "./Printer";

@Entity({ name: "printer_maintenance_logs" })
export class PrinterMaintenanceLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Printer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "printer_id" })
  printer!: Printer;

  @Column({ name: "printer_id", type: "uuid" })
  printerId!: string;

  @Column({ type: "varchar" })
  description!: string;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  cost?: number | null;

  @Column({ name: "hours_at_maintenance", type: "numeric", precision: 10, scale: 2, nullable: true })
  hoursAtMaintenance?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
