/*
 * ARCHIVE: Original migrate.ts archived here on request (deleted from active codebase)
 * This file is kept for historical reference only. Do NOT use in production.
 */

/* Original file content (v0.9.0 migration tool) */
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const DB_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), "data", "lucky-draw.db");

export function runMigrations() {
  console.log("[Migration] Starting database migration...");
  console.log("[Migration] Database path:", DB_PATH);

  const dbDir = join(process.cwd(), "data");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log("[Migration] Created data directory");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    const tableInfo = db.pragma("table_info(draw_results)");
    const hasIsRevealed = tableInfo.some(
      (col: any) => col.name === "is_revealed",
    );

    if (!hasIsRevealed) {
      console.log(
        "[Migration] Adding is_revealed column to draw_results table...",
      );

      db.exec(`
        ALTER TABLE draw_results 
        ADD COLUMN is_revealed INTEGER NOT NULL DEFAULT 0;
      `);

      console.log("[Migration] ✅ Successfully added is_revealed column");
    } else {
      console.log("[Migration] ✅ is_revealed column already exists, skipping");
    }

    console.log("[Migration] ✅ All migrations completed successfully");
  } catch (error) {
    console.error("[Migration] ❌ Migration failed:", error);
    throw error;
  } finally {
    db.close();
  }
}

// Historical archive
