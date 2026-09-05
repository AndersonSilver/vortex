import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "product_categories" })
export class ProductCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Chave gravada em products.category. Gerada do nome na criação e imutável depois. */
  @Index({ unique: true })
  @Column({ type: "varchar" })
  slug!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", default: "📦" })
  emoji!: string;

  /** Ordem das abas do catálogo; empates caem na ordem alfabética do nome. */
  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
