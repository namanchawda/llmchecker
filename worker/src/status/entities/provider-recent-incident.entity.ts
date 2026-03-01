import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity()
@Index(['provider', 'externalId'], { unique: true }) // 🔒 HARD DEDUPE
export class ProviderRecentIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { nullable: false, onDelete: 'CASCADE' })
  provider!: Provider;

  // 🔑 Provider-stable ID (incident.id / RSS guid / fallback hash)
  @Column()
  externalId!: string;

  @Column()
  name!: string;

  @Column()
  status!: string;

  @Column({ nullable: true })
  impact?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  link?: string;

  // when we ingested this row
  @CreateDateColumn()
  createdAt!: Date;
}
