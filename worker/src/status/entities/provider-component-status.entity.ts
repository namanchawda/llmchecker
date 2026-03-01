import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Provider } from './provider.entity';

/**
 * Stores CURRENT service-level (component) status
 * One row per (provider + component)
 * Updated by cron (NO history)
 */
@Entity('provider_component_status')
@Unique(['provider', 'componentKey'])
export class ProviderComponentStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 🔗 Provider (OpenAI / Anthropic / Gemini / Grok)
  @ManyToOne(() => Provider, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  provider: Provider;

  /**
   * Stable identifier from status page
   * Examples:
   *  - openai-api
   *  - openai-chatgpt
   *  - claude-api
   *  - gemini-vertex-ai
   */
  @Column()
  componentKey: string;

  /**
   * Display name
   * Examples:
   *  - API
   *  - ChatGPT
   *  - Sora
   *  - Claude API
   */
  @Column()
  name: string;

  /**
   * Optional grouping
   * Examples:
   *  - APIs
   *  - ChatGPT
   *  - Sora
   */
  @Column({ nullable: true })
  group?: string;

  /**
   * Normalized status
   */
  @Column()
  status:
    | 'operational'
    | 'degraded'
    | 'partial_outage'
    | 'outage'
    | 'maintenance'
    | 'unknown';

  /**
   * Optional raw description from provider
   */
  @Column({ nullable: true })
  description?: string;

  /**
   * Auto-updated whenever cron refreshes this row
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
