/**
 * 資料庫結構設計 - SQLite + Drizzle ORM
 * 
 * 支持功能：
 * - 房間持久化
 * - 玩家資料保留（斷線重連）
 * - 觀眾模式
 * - 抽獎設定（連鎖式 / 隨機 / 手動指定第一位）
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ==================== 房間設定 ====================
export const rooms = sqliteTable('rooms', {
  // 房間基本資訊
  id: text('id').primaryKey(), // 4位房間代碼，如 "ABCD"
  hostId: text('host_id').notNull(), // 主機的 playerId
  hostSessionId: text('host_session_id'), // 主機當前的 WebSocket session ID（用於重連識別）
  
  // 房間設定
  maxPlayers: integer('max_players').notNull().default(20),
  allowSpectators: integer('allow_spectators', { mode: 'boolean' }).notNull().default(true),
  
  // 抽獎設定
  drawMode: text('draw_mode', { enum: ['chain', 'random'] }).notNull().default('chain'),
  // chain: 連鎖式抽獎（A 抽到 B，B 下一個抽）
  // random: 隨機順序抽獎
  
  firstDrawerMode: text('first_drawer_mode', { enum: ['random', 'manual', 'host'] }).notNull().default('random'),
  // random: 隨機決定第一位
  // manual: 主機手動指定
  // host: 主機先抽
  
  firstDrawerId: integer('first_drawer_id'), // 手動指定時的第一位抽獎者 participantId
  
  // 遊戲狀態
  gameState: text('game_state', { enum: ['waiting', 'playing', 'complete'] }).notNull().default('waiting'),
  seed: integer('seed').notNull(),
  currentIndex: integer('current_index').notNull().default(0),
  
  // 時間戳
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ==================== 玩家資料 ====================
export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // 關聯
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  
  // 玩家識別
  playerId: text('player_id').notNull(), // WebSocket 分配的玩家 ID（如 "P12345678"）
  sessionId: text('session_id'), // 當前的 WebSocket session ID（用於重連識別）
  
  // 玩家資料
  name: text('name').notNull(),
  participantId: integer('participant_id').notNull(), // 在房間中的編號（1, 2, 3...）
  
  // 角色與狀態
  role: text('role', { enum: ['player', 'spectator'] }).notNull().default('player'),
  isHost: integer('is_host', { mode: 'boolean' }).notNull().default(false),
  isReady: integer('is_ready', { mode: 'boolean' }).notNull().default(false),
  isConnected: integer('is_connected', { mode: 'boolean' }).notNull().default(true),
  isVirtual: integer('is_virtual', { mode: 'boolean' }).notNull().default(false), // 主機協助加入的虛擬玩家
  
  // 斷線重連
  disconnectedAt: integer('disconnected_at', { mode: 'timestamp' }),
  reconnectToken: text('reconnect_token'), // 用於驗證重連身份
  
  // 時間戳
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ==================== 抽獎序列 ====================
export const drawSequences = sqliteTable('draw_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  
  drawerId: integer('drawer_id').notNull(), // 抽獎者的 participantId
  giftOwnerId: integer('gift_owner_id').notNull(), // 被抽到的禮物擁有者 participantId
})

// ==================== 抽獎順序 ====================
export const drawOrders = sqliteTable('draw_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  
  orderIndex: integer('order_index').notNull(), // 順序索引（0, 1, 2...）
  participantId: integer('participant_id').notNull(), // 該順序的抽獎者 participantId
})

// ==================== 抽獎結果 ====================
export const drawResults = sqliteTable('draw_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  
  order: integer('order').notNull(), // 抽獎順序（1, 2, 3...）
  drawerId: integer('drawer_id').notNull(), // 抽獎者的 participantId
  giftOwnerId: integer('gift_owner_id').notNull(), // 被抽到的禮物擁有者 participantId
  
  performedAt: integer('performed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ==================== 聊天訊息（可選）====================
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  
  senderId: text('sender_id').notNull(), // 發送者的 playerId
  senderName: text('sender_name').notNull(),
  message: text('message').notNull(),
  
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ==================== 系統日誌 ====================
export const systemLogs = sqliteTable('system_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // 日誌類型
  level: text('level', { enum: ['info', 'warn', 'error', 'debug'] }).notNull().default('info'),
  category: text('category', { enum: ['access', 'error', 'event', 'system'] }).notNull().default('event'),
  
  // 日誌內容
  message: text('message').notNull(),
  details: text('details'), // JSON 格式的詳細資訊
  
  // 相關資訊
  roomId: text('room_id'),
  playerId: text('player_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  
  // 時間戳
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// ==================== 類型導出 ====================
export type Room = typeof rooms.$inferSelect
export type NewRoom = typeof rooms.$inferInsert
export type Player = typeof players.$inferSelect
export type NewPlayer = typeof players.$inferInsert
export type DrawSequence = typeof drawSequences.$inferSelect
export type DrawOrder = typeof drawOrders.$inferSelect
export type DrawResult = typeof drawResults.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect
export type SystemLog = typeof systemLogs.$inferSelect
export type NewSystemLog = typeof systemLogs.$inferInsert
