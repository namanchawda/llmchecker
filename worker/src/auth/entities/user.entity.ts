import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  // EMAIL/PASSWORD users only
  @Column({ nullable: true })
  passwordHash?: string;

  // GOOGLE users only — Google verifies the email themselves, no OTP needed
  @Column({ nullable: true })
  googleId?: string;

  // ── Email verification ─────────────────────────────────────────
  // false until user enters correct OTP after signup
  @Column({ default: false })
  emailVerified!: boolean;

  // 6-digit OTP stored temporarily during signup
  @Column({ nullable: true })
  otpCode?: string;

  // OTP expires after 10 minutes
  @Column({ type: 'timestamptz', nullable: true })
  otpExpiresAt?: Date;

  // 🔑 API KEY SYSTEM
  @Column({ nullable: true })
  apiKey?: string;

  @Column({ default: 0 })
  apiKeyQuota!: number;

  @CreateDateColumn()
  createdAt!: Date;
}