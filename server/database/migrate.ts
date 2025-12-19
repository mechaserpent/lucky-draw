/**
 * 資料庫遷移工具
 * 用於在 Render 部署時自動應用 schema 變更
 */

import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const DB_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), "data", "lucky-draw.db");

export function runMigrations() {
  console.log("[Migration] Starting database migration...");
  console.log("[Migration] Database path:", DB_PATH);

  // 確保資料目錄存在
  const dbDir = join(process.cwd(), "data");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log("[Migration] Created data directory");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    // 檢查 is_revealed 欄位是否存在
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

    // 可以在這裡添加其他遷移
    // 例如：索引、其他欄位等

    console.log("[Migration] ✅ All migrations completed successfully");
  } catch (error) {
    console.error("[Migration] ❌ Migration failed:", error);
    throw error;
  } finally {
    db.close();
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
