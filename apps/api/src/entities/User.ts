import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { UserRole } from "@vortex/shared";
import { Address } from "./Address";
import { Order } from "./Order";
import { CartItem } from "./CartItem";
import { ConsignmentStore } from "./ConsignmentStore";

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

  /** Loja consignada do usuário; preenchido só quando role = "consignado". */
  @ManyToOne(() => ConsignmentStore, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "consignment_store_id" })
  consignmentStore?: ConsignmentStore | null;

  @Column({ name: "consignment_store_id", type: "uuid", nullable: true })
  consignmentStoreId?: string | null;

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
