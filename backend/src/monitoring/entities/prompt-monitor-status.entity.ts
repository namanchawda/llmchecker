import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { PromptMonitorJob } from './prompt-monitor-job.entity';

@Entity()
export class PromptMonitorStatus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PromptMonitorJob, { onDelete: 'CASCADE' })
  job!: PromptMonitorJob;

  @Column()
  jobId!: string; // 🔥 IMPORTANT

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ type: 'integer', nullable: true })
  responseTimeMs?: number;

  @Column({ type: 'text', nullable: true })
  responseText?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorType?: string | null;

  @Column({ type: 'integer', nullable: true })
  httpStatus?: number;

  @UpdateDateColumn({ type: 'timestamptz'})
  updatedAt!: Date;
}