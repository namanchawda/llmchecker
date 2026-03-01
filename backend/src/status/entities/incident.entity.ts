import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Provider } from './provider.entity';
import { CurrentStatusSnapshot } from './current-status-snapshot.entity';

@Entity()
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  impact?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  link?: string;

  @ManyToOne(() => Provider, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  provider: Provider;

  @ManyToOne(() => CurrentStatusSnapshot, cs => cs.incidents, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  currentSnapshot: CurrentStatusSnapshot;
}
