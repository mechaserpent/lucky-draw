/*
 * REMOVED: migrate.ts has been archived to tools/legacy-migrations/migrate.ts
 * This file intentionally does not perform migrations anymore to support "clone -> deploy" flow.
 * If you need to run migrations, use the archived script in tools/legacy-migrations or execute them manually.
 */

export function runMigrations() {
  console.warn(
    "[Migration] runMigrations() is disabled. Archived to tools/legacy-migrations/migrate.ts",
  );
}
