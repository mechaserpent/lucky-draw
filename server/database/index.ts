/**
 * 資料庫連線配置
 * 使用 better-sqlite3 + Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { join } from 'path'

// 資料庫文件路徑
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'lucky-draw.db')

// 確保資料夾存在
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'

const dbDir = dirname(DB_PATH)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

// 建立 SQLite 連線
const sqlite = new Database(DB_PATH)

// 啟用 WAL 模式以提高並發性能
sqlite.pragma('journal_mode = WAL')

// 建立 Drizzle 實例
export const db = drizzle(sqlite, { schema })

// 導出 schema 供其他模組使用
export { schema }

// 初始化資料庫表
export function initDatabase() {
  // 建立 rooms 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL
    )
  `)

  // 建立 players 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      session_id TEXT,
      name TEXT NOT NULL,
      participant_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      is_host INTEGER NOT NULL DEFAULT 0,
      is_ready INTEGER NOT NULL DEFAULT 0,
      is_connected INTEGER NOT NULL DEFAULT 1,
      is_virtual INTEGER NOT NULL DEFAULT 0,
      disconnected_at INTEGER,
      reconnect_token TEXT,
      joined_at INTEGER NOT NULL
    )
  `)

  // 建立 draw_sequences 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS draw_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      drawer_id INTEGER NOT NULL,
      gift_owner_id INTEGER NOT NULL
    )
  `)

  // 建立 draw_orders 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS draw_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      participant_id INTEGER NOT NULL
    )
  `)

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
  `)

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
  `)

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
  `)

  // 建立索引
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
  `)

  console.log('[DB] Database initialized at:', DB_PATH)
}

// 清理過期房間（預設 30 分鐘無活動）
export function cleanupExpiredRooms(maxAgeMinutes: number = 30) {
  const cutoff = Date.now() - maxAgeMinutes * 60 * 1000
  const result = sqlite.prepare(`
    DELETE FROM rooms WHERE last_activity_at < ?
  `).run(cutoff)
  
  if (result.changes > 0) {
    console.log(`[DB] Cleaned up ${result.changes} expired rooms`)
  }
  
  return result.changes
}

// 清理過期日誌
export function cleanupExpiredLogs(maxAgeDays: number = 7) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  const result = sqlite.prepare(`
    DELETE FROM system_logs WHERE created_at < ?
  `).run(cutoff)
  
  if (result.changes > 0) {
    console.log(`[DB] Cleaned up ${result.changes} expired logs`)
  }
  
  return result.changes
}

// 清理指定類型的日誌
export function clearLogsByCategory(category: 'access' | 'error' | 'event' | 'system' | 'all') {
  let result
  if (category === 'all') {
    result = sqlite.prepare(`DELETE FROM system_logs`).run()
  } else {
    result = sqlite.prepare(`DELETE FROM system_logs WHERE category = ?`).run(category)
  }
  
  console.log(`[DB] Cleared ${result.changes} ${category} logs`)
  return result.changes
}

// 獲取日誌統計
export function getLogStats() {
  const stats = sqlite.prepare(`
    SELECT 
      category,
      level,
      COUNT(*) as count
    FROM system_logs
    GROUP BY category, level
  `).all()
  
  const total = sqlite.prepare(`SELECT COUNT(*) as count FROM system_logs`).get() as { count: number }
  
  return {
    total: total.count,
    byCategory: stats
  }
}

// 關閉資料庫連線
export function closeDatabase() {
  sqlite.close()
  console.log('[DB] Database connection closed')
}

// 導出 sqlite 供直接查詢
export { sqlite }
