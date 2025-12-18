/**
 * 資料庫連線配置
 * 使用 better-sqlite3 + Drizzle ORM
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { join } from "path";

// 資料庫文件路徑
const DB_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), "data", "lucky-draw.db");

// 確保資料夾存在
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// 建立 SQLite 連線
const sqlite = new Database(DB_PATH);

// 性能優化設定
sqlite.pragma("journal_mode = WAL"); // 提高並發性能
sqlite.pragma("synchronous = NORMAL"); // 平衡性能和安全性
sqlite.pragma("cache_size = -64000"); // 64MB 緩存
sqlite.pragma("temp_store = MEMORY"); // 臨時數據存在內存
sqlite.pragma("mmap_size = 30000000000"); // 使用記憶體映射

// 建立 Drizzle 實例
export const db = drizzle(sqlite, { schema });

// 導出 schema 供其他模組使用
export { schema };

// 追蹤資料庫初始化狀態
let isInitialized = false;

// 初始化資料庫表
export function initDatabase() {
  // 如果已經初始化過，直接返回
  if (isInitialized) {
    return;
  }

  // 建立 rooms 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      host_session_id TEXT,
      max_players INTEGER NOT NULL DEFAULT 20,
      allow_spectators INTEGER NOT NULL DEFAULT 1,
      draw_mode TEXT NOT NULL DEFAULT 'chain',
      first_drawer_mode TEXT NOT NULL DEFAULT 'random',
      first_drawer_id INTEGER,
      game_state TEXT NOT NULL DEFAULT 'waiting',
      seed INTEGER NOT NULL,
      current_index INTEGER NOT NULL DEFAULT 0,
      server_hosted INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL
    )
  `);

  // 建立 players 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      session_id TEXT,
      device_id TEXT,
      name TEXT NOT NULL,
      participant_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      is_creator INTEGER NOT NULL DEFAULT 0,
      is_host INTEGER NOT NULL DEFAULT 0,
      is_ready INTEGER NOT NULL DEFAULT 0,
      is_connected INTEGER NOT NULL DEFAULT 1,
      is_virtual INTEGER NOT NULL DEFAULT 0,
      disconnected_at INTEGER,
      reconnect_token TEXT,
      token_expires_at INTEGER,
      joined_at INTEGER NOT NULL
    )
  `);

  // 遷移：為現有表添加新欄位（如果不存在）
  try {
    sqlite.exec(`ALTER TABLE players ADD COLUMN device_id TEXT`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }

  try {
    sqlite.exec(`ALTER TABLE players ADD COLUMN token_expires_at INTEGER`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }

  // v0.9.0 遷移：添加 creator_id 欄位（SQLite 需要使用 DEFAULT 添加 NOT NULL 欄位）
  try {
    // 先添加可空欄位
    sqlite.exec(`ALTER TABLE rooms ADD COLUMN creator_id TEXT`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }
  // 確保現有房間有 creator_id（使用 host_id 作為默認值）
  try {
    sqlite.exec(
      `UPDATE rooms SET creator_id = host_id WHERE creator_id IS NULL`,
    );
  } catch (e) {
    // 忽略錯誤
  }

  // v0.9.0 遷移：添加 server_hosted 欄位
  try {
    // SQLite 支持在 ALTER TABLE 時使用 DEFAULT 值
    sqlite.exec(`ALTER TABLE rooms ADD COLUMN server_hosted INTEGER DEFAULT 1`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }
  // 確保現有房間有 server_hosted 值
  try {
    sqlite.exec(
      `UPDATE rooms SET server_hosted = 1 WHERE server_hosted IS NULL`,
    );
  } catch (e) {
    // 忽略錯誤
  }

  // v0.9.0 遷移：添加 is_creator 欄位
  try {
    sqlite.exec(`ALTER TABLE players ADD COLUMN is_creator INTEGER DEFAULT 0`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }
  // 確保現有玩家有 is_creator 值
  try {
    sqlite.exec(`UPDATE players SET is_creator = 0 WHERE is_creator IS NULL`);
  } catch (e) {
    // 忽略錯誤
  }

  // 建立 draw_sequences 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS draw_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      drawer_id INTEGER NOT NULL,
      gift_owner_id INTEGER NOT NULL
    )
  `);

  // 建立 draw_orders 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS draw_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      participant_id INTEGER NOT NULL
    )
  `);

  // 建立 draw_results 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS draw_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL,
      drawer_id INTEGER NOT NULL,
      gift_owner_id INTEGER NOT NULL,
      performed_at INTEGER NOT NULL
    )
  `);

  // 建立 chat_messages 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at INTEGER NOT NULL
    )
  `);

  // 建立 system_logs 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL DEFAULT 'info',
      category TEXT NOT NULL DEFAULT 'event',
      message TEXT NOT NULL,
      details TEXT,
      room_id TEXT,
      player_id TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // 建立基本索引
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
    CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
    CREATE INDEX IF NOT EXISTS idx_players_reconnect_token ON players(reconnect_token);
    CREATE INDEX IF NOT EXISTS idx_draw_sequences_room_id ON draw_sequences(room_id);
    CREATE INDEX IF NOT EXISTS idx_draw_orders_room_id ON draw_orders(room_id);
    CREATE INDEX IF NOT EXISTS idx_draw_results_room_id ON draw_results(room_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
    CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
  `);

  // 🚀 性能優化索引（自動應用）
  console.log("[DB] Applying performance optimization indexes...");
  sqlite.exec(`
    -- 玩家查詢優化（最常用的查詢模式）
    CREATE INDEX IF NOT EXISTS idx_players_room_player ON players(room_id, player_id);
    CREATE INDEX IF NOT EXISTS idx_players_room_role ON players(room_id, role);
    CREATE INDEX IF NOT EXISTS idx_players_reconnect ON players(room_id, reconnect_token);
    CREATE INDEX IF NOT EXISTS idx_players_device ON players(device_id) WHERE device_id IS NOT NULL;
    
    -- 房間查詢優化
    CREATE INDEX IF NOT EXISTS idx_rooms_activity ON rooms(last_activity_at, game_state);
    CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);
    
    -- 抽獎數據優化
    CREATE INDEX IF NOT EXISTS idx_draw_sequences_room ON draw_sequences(room_id);
    CREATE INDEX IF NOT EXISTS idx_draw_orders_room ON draw_orders(room_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_draw_results_room ON draw_results(room_id, "order");
    
    -- 日誌優化
    CREATE INDEX IF NOT EXISTS idx_logs_cleanup ON system_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_room ON system_logs(room_id, created_at);
  `);

  isInitialized = true;
  console.log(
    "[DB] Database initialized with performance optimizations at:",
    DB_PATH,
  );
}

// 確保資料庫已初始化
export function ensureInitialized() {
  if (!isInitialized) {
    initDatabase();
  }
}

// 清理過期房間（預設 30 分鐘無活動）
// 注意：只清除 waiting 狀態的房間，不清除正在進行或已完成的遊戲
export function cleanupExpiredRooms(maxAgeMinutes: number = 30) {
  // 確保資料庫已初始化
  ensureInitialized();

  // Drizzle 的 timestamp 模式存的是秒為單位，所以需要轉換
  const cutoffSeconds = Math.floor(Date.now() / 1000) - maxAgeMinutes * 60;

  // 使用事務批量刪除，提升性能
  const transaction = sqlite.transaction(() => {
    // 先刪除關聯的玩家、抽獎序列、順序和結果
    const rooms = sqlite
      .prepare(
        `SELECT id FROM rooms WHERE last_activity_at < ? AND game_state = 'waiting'`,
      )
      .all(cutoffSeconds);

    if (rooms.length === 0) return 0;

    const roomIds = rooms.map((r: any) => r.id);
    const placeholders = roomIds.map(() => "?").join(",");

    sqlite
      .prepare(`DELETE FROM players WHERE room_id IN (${placeholders})`)
      .run(...roomIds);
    sqlite
      .prepare(`DELETE FROM draw_sequences WHERE room_id IN (${placeholders})`)
      .run(...roomIds);
    sqlite
      .prepare(`DELETE FROM draw_orders WHERE room_id IN (${placeholders})`)
      .run(...roomIds);
    sqlite
      .prepare(`DELETE FROM draw_results WHERE room_id IN (${placeholders})`)
      .run(...roomIds);
    sqlite
      .prepare(`DELETE FROM rooms WHERE id IN (${placeholders})`)
      .run(...roomIds);

    return rooms.length;
  });

  const deletedCount = transaction();

  if (deletedCount > 0) {
    console.log(`[DB] Cleaned up ${deletedCount} expired rooms`);
  }

  return deletedCount;
}

// 清理過期日誌
export function cleanupExpiredLogs(maxAgeDays: number = 7) {
  // 確保資料庫已初始化
  ensureInitialized();

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const result = sqlite
    .prepare(
      `
    DELETE FROM system_logs WHERE created_at < ?
  `,
    )
    .run(cutoff);

  if (result.changes > 0) {
    console.log(`[DB] Cleaned up ${result.changes} expired logs`);
  }

  return result.changes;
}

// 清理指定類型的日誌
export function clearLogsByCategory(
  category: "access" | "error" | "event" | "system" | "all",
) {
  let result;
  if (category === "all") {
    result = sqlite.prepare(`DELETE FROM system_logs`).run();
  } else {
    result = sqlite
      .prepare(`DELETE FROM system_logs WHERE category = ?`)
      .run(category);
  }

  console.log(`[DB] Cleared ${result.changes} ${category} logs`);
  return result.changes;
}

// 獲取日誌統計
export function getLogStats() {
  const stats = sqlite
    .prepare(
      `
    SELECT 
      category,
      level,
      COUNT(*) as count
    FROM system_logs
    GROUP BY category, level
  `,
    )
    .all();

  const total = sqlite
    .prepare(`SELECT COUNT(*) as count FROM system_logs`)
    .get() as { count: number };

  return {
    total: total.count,
    byCategory: stats,
  };
}

// 關閉資料庫連線
export function closeDatabase() {
  sqlite.close();
  console.log("[DB] Database connection closed");
}

// 導出 sqlite 供直接查詢
export { sqlite };
