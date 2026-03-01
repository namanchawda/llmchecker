import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique
} from 'typeorm';

import { Prompt } from './prompt.entity';
import { Provider } from '../../status/entities/provider.entity';


@Entity()
@Unique(['provider'])
export class CurrentPerformanceRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { nullable: false })
  provider!: Provider;

  @ManyToOne(() => Prompt, { nullable: false })
  prompt!: Prompt;

  @Column('int')
  latencyMs!: number;

  @Column()
  success!: boolean;

  @Column({ nullable: true })
  errorType?: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  executedAt!: Date;
}
