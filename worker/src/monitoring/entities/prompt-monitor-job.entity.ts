import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PromptMonitorRun } from './prompt-monitor-run.entity';

@Entity()
export class PromptMonitorJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @Column()
  provider!: 'openai' | 'anthropic' | 'gemini' | 'grok';

  @Column()
  model!: string;

  @Column()
  encryptedApiKey!: string;

  @Column()
  prompt!: string;

  @Column()
  intervalSeconds!: number;

  @Column({ default: true })
  isActive!: boolean;

  /** When false, no alerts are sent for this scheduler regardless of integrations */
  @Column({ default: true })
  alertsEnabled!: boolean;

  @OneToMany(() => PromptMonitorRun, run => run.job)
  runs!: PromptMonitorRun[];

  @CreateDateColumn()
  createdAt!: Date;
}