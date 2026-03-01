import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { Provider } from './provider.entity';
import { Incident } from './incident.entity';

@Entity()
@Unique(['provider'])
export class CurrentStatusSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, {
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

  @OneToMany(() => Incident, i => i.currentSnapshot, {
    cascade: true,
  })
  incidents: Incident[];
}
