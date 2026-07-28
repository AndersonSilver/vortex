import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Product } from "./Product";

@Entity({ name: "cart_items" })
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.cartItems, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ type: "int" })
  qty!: number;

  @Column({ type: "varchar" })
  color!: string;

  @Column({ type: "varchar" })
  material!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
