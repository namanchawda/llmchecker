import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity()
export class StatusSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, p => p.snapshots, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  provider: Provider;

  @Column()
  status: string;

  @Column({ nullable: true })
  message?: string;

  @Column({ type: 'timestamptz' })
  checkedAt: Date;
}
