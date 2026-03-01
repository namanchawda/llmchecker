import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

import { Prompt } from './prompt.entity';
import { Provider } from '../../status/entities/provider.entity';

@Entity()
export class PerformanceRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ✅ Provider relation (THIS FIXES provider error)
  @ManyToOne(() => Provider, { nullable: false })
  provider!: Provider;

  // ✅ Prompt relation
  @ManyToOne(() => Prompt, { nullable: false })
  prompt!: Prompt;

  @Column('int')
  latencyMs!: number;

  @Column()
  success!: boolean;

  // ✅ Optional error info
  @Column({ nullable: true })
  errorType?: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  executedAt!: Date;
}
