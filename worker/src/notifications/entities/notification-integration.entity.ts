import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export type IntegrationType =
  | 'slack'
  | 'discord'
  | 'telegram'
  | 'teams'
  | 'email';

@Entity('notification_integration')
export class NotificationIntegration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  @Column({ type: 'varchar' })
  type!: IntegrationType;

  /** Human-readable label e.g. "Ops Slack" */
  @Column({ default: '' })
  name!: string;

  /** Slack / Discord / Teams → incoming webhook URL */
  @Column({ default: '' })
  webhookUrl!: string;

  /** Telegram only — chat ID (bot token comes from env) */
  @Column({ default: '' })
  chatId!: string;

  /** Email only — recipient address */
  @Column({ default: '' })
  emailAddress!: string;

  /** Fire when a scheduler goes down */
  @Column({ default: true })
  alertOnDown!: boolean;

  /** Fire when a scheduler recovers */
  @Column({ default: true })
  alertOnRecovery!: boolean;

  /** Master on/off switch */
  @Column({ default: true })
  isEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}