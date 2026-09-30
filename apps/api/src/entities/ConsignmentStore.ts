import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ConsignmentStock } from "./ConsignmentStock";

/** Loja física parceira que recebe peças da Vortex em consignação. */
@Entity({ name: "consignment_stores" })
export class ConsignmentStore {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  /** CNPJ ou CPF. */
  @Column({ type: "varchar", nullable: true })
  document?: string | null;

  @Column({ name: "contact_name", type: "varchar", nullable: true })
  contactName?: string | null;

  @Column({ type: "varchar", nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", nullable: true })
  email?: string | null;

  @Column({ type: "text", nullable: true })
  address?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @OneToMany(() => ConsignmentStock, (stock) => stock.store)
  stock!: ConsignmentStock[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
