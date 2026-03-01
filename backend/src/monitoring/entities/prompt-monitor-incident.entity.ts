import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { PromptMonitorJob } from './prompt-monitor-job.entity';

@Entity()
export class PromptMonitorIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PromptMonitorJob, { onDelete: 'CASCADE' })
  job!: PromptMonitorJob;

  @Column()
  jobId!: string;

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  startHttpStatus?: number;

  @Column({ nullable: true })
  startErrorType?: string;
}