import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ProductBadge, ProductCategoryKey, ProductSpecs } from "@vortex/shared";
import { Filament } from "./Filament";

@Entity({ name: "products" })
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar" })
  slug!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  category!: ProductCategoryKey;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  price!: number;

  @Column({ name: "old_price", type: "numeric", precision: 10, scale: 2, nullable: true })
  oldPrice?: number | null;

  @Column({ type: "varchar", default: "📦" })
  emoji!: string;

  @Column({ name: "image_url", type: "varchar", nullable: true })
  imageUrl?: string | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  images!: string[];

  @Column({ name: "video_url", type: "varchar", nullable: true })
  videoUrl?: string | null;

  @Column({ type: "varchar", nullable: true })
  badge?: ProductBadge | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  colors!: string[];

  @Column({ type: "varchar" })
  material!: string;

  @Column({ type: "jsonb", default: () => "'{}'" })
  specs!: ProductSpecs;

  @Column({ type: "numeric", precision: 2, scale: 1, default: 5.0 })
  rating!: number;

  @Column({ name: "reviews_count", type: "int", default: 0 })
  reviewsCount!: number;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @ManyToOne(() => Filament, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "filament_id" })
  filament?: Filament | null;

  @Column({ name: "filament_id", type: "uuid", nullable: true })
  filamentId?: string | null;

  @Column({ name: "weight_grams", type: "int", nullable: true })
  weightGrams?: number | null;

  @Column({ name: "print_time_minutes", type: "int", nullable: true })
  printTimeMinutes?: number | null;

  @Column({ name: "cost_price", type: "numeric", precision: 10, scale: 2, nullable: true })
  costPrice?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
