import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Singleton row holding the Bling OAuth tokens for this Vortex instance. Kept separate from
 * StoreSettings on purpose — that entity's DTO is sent to the admin frontend as-is, and these are
 * live secrets (access token expires in hours, refresh token can mint new access tokens for 30 days).
 */
@Entity({ name: "bling_credentials" })
export class BlingCredential {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "access_token", type: "varchar" })
  accessToken!: string;

  @Column({ name: "refresh_token", type: "varchar" })
  refreshToken!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
