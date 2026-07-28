import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { CouponType } from "@vortex/shared";

@Entity({ name: "coupons" })
export class Coupon {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar" })
  code!: string;

  @Column({ type: "varchar" })
  type!: CouponType;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  value!: number;

  @Column({ name: "min_order", type: "numeric", precision: 10, scale: 2, default: 0 })
  minOrder!: number;

  @Column({ type: "int", default: 0 })
  uses!: number;

  @Column({ name: "max_uses", type: "int", default: 100 })
  maxUses!: number;

  @Column({ name: "expires_at", type: "date" })
  expiresAt!: string;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
