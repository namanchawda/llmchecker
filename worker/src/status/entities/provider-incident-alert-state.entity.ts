import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

/**
 * Tracks which incidents we have already dispatched alerts for.
 * One row per (providerId × externalId).
 *
 * Rules:
 *   - Row absent                                → new incident  → alert "started"  → insert row
 *   - Row present + lastAlertStatus ≠ 'resolved'
 *     AND incoming status = 'resolved'          → alert "resolved" → update row
 *   - Anything else                             → already handled  → skip
 */
@Entity('provider_incident_alert_state')
@Unique(['providerId', 'externalId'])
export class ProviderIncidentAlertState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  providerId!: string;

  @Column()
  externalId!: string;

  @Column()
  lastAlertStatus!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  alertedAt!: Date;
}