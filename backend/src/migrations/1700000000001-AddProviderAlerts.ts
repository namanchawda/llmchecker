import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderAlerts1700000000001 implements MigrationInterface {
  name = 'AddProviderAlerts1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // One row per (user × provider). alertsEnabled can be toggled without deleting.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_alert_subscription" (
        "id"            UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "userId"        UUID              NOT NULL,
        "providerId"    CHARACTER VARYING NOT NULL,
        "alertsEnabled" BOOLEAN           NOT NULL DEFAULT true,
        "createdAt"     TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_alert_subscription" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_alert_subscription_user_provider"
          UNIQUE ("userId", "providerId"),
        CONSTRAINT "FK_provider_alert_subscription_user"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_provider_alert_subscription_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE CASCADE
      )
    `);

    // Dedup table — tracks which incidents the worker has already alerted on.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_incident_alert_state" (
        "id"              UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "providerId"      CHARACTER VARYING NOT NULL,
        "externalId"      CHARACTER VARYING NOT NULL,
        "lastAlertStatus" CHARACTER VARYING NOT NULL,
        "alertedAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_incident_alert_state" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_incident_alert_state"
          UNIQUE ("providerId", "externalId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_incident_alert_state"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_alert_subscription"`);
  }
}