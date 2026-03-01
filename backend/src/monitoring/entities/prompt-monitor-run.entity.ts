import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { PromptMonitorJob } from './prompt-monitor-job.entity';

@Entity()
export class PromptMonitorRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PromptMonitorJob, { onDelete: 'CASCADE' })
  job!: PromptMonitorJob;

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ type: 'integer', nullable: true })
  responseTimeMs?: number;

  @Column({ type: 'text', nullable: true })
  responseText?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorType?: string;

  @Column({ type: 'integer', nullable: true })
  httpStatus?: number;

  @CreateDateColumn({ type: 'timestamptz'})
  createdAt!: Date;
}