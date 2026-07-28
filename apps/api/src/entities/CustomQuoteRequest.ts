import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { CustomQuoteStatus } from "@vortex/shared";
import { User } from "./User";

@Entity({ name: "custom_quote_requests" })
export class CustomQuoteRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ name: "file_url", type: "varchar" })
  fileUrl!: string;

  @Column({ type: "varchar" })
  material!: string;

  @Column({ type: "varchar" })
  color!: string;

  @Column({ type: "int", default: 1 })
  qty!: number;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "varchar" })
  email!: string;

  @Column({ type: "varchar", default: "pending" })
  status!: CustomQuoteStatus;

  @Column({ name: "quoted_price", type: "numeric", precision: 10, scale: 2, nullable: true })
  quotedPrice?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
