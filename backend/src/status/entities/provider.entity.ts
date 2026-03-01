import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { StatusSnapshot } from './status-snapshot.entity';
import { Incident } from './incident.entity';

@Entity()
export class Provider {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  host: string;

  @OneToMany(() => StatusSnapshot, s => s.provider)
  snapshots: StatusSnapshot[];

  @OneToMany(() => Incident, i => i.provider)
  incidents: Incident[];
}
