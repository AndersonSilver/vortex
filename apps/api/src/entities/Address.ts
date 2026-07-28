import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity({ name: "addresses" })
export class Address {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", default: "Principal" })
  label!: string;

  @Column({ type: "varchar" })
  cep!: string;

  @Column({ type: "varchar" })
  state!: string;

  @Column({ type: "varchar" })
  city!: string;

  @Column({ type: "varchar" })
  neighborhood!: string;

  @Column({ type: "varchar" })
  street!: string;

  @Column({ type: "varchar" })
  number!: string;

  @Column({ type: "varchar", nullable: true })
  complement?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
