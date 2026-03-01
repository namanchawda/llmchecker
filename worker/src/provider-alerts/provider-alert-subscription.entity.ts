import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { User } from '../auth/entities/user.entity';

/**
 * Worker-side copy of provider_alert_subscription.
 * The worker only needs userId + providerId + alertsEnabled — no relations needed
 * beyond userId (for querying). Provider is looked up by string ID directly.
 */
@Entity('provider_alert_subscription')
@Unique(['userId', 'providerId'])
export class ProviderAlertSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  providerId!: string;

  @Column({ default: true })
  alertsEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}