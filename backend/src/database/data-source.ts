import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// npm run migration:generate src/migrations/AddTimezoneToUser
// ```

// TypeORM compares your entity to the live DB and auto-writes a file like:
// ```
// src/migrations/1709123456789-AddTimezoneToUser.ts

dotenv.config();

/**
 * Standalone DataSource used ONLY by the TypeORM CLI for migrations.
 * The app itself uses TypeOrmModule.forRoot() in app.module.ts.
 *
 * Usage:
 *   npx typeorm-ts-node-commonjs migration:generate src/migrations/MigrationName -d src/database/data-source.ts
 *   npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
 *   npx typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'llm_monitor',

  // Point at compiled JS in dist/ when running migrations in production.
  // During development we use ts-node so we point at .ts sources directly.
  entities: [__dirname + '/../**/*.entity.{ts,js}'],

  // Tell TypeORM where to write / find migration files.
  migrations: [__dirname + '/../migrations/*.{ts,js}'],

  // IMPORTANT: must be false when using migrations — synchronize would
  // silently overwrite schema changes you're trying to track.
  synchronize: false,

  logging: ['migration'],
});