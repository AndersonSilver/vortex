import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { UserRole } from "@vortex/shared";
import { Address } from "./Address";
import { Order } from "./Order";
import { CartItem } from "./CartItem";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", nullable: true })
  passwordHash?: string | null;

  @Column({ name: "google_id", type: "varchar", nullable: true, unique: true })
  googleId?: string | null;

  @Column({ type: "varchar", nullable: true })
  cpf?: string;

  @Column({ type: "varchar", nullable: true })
  phone?: string;

  @Column({ type: "varchar", default: "customer" })
  role!: UserRole;

  @OneToMany(() => Address, (address) => address.user)
  addresses!: Address[];

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => CartItem, (item) => item.user)
  cartItems!: CartItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
