/**
 * 系統日誌服務
 * 
 * 功能：
 * - Access Log: 記錄 HTTP 請求
 * - Error Log: 記錄錯誤
 * - Event Log: 記錄系統事件（房間建立、遊戲開始等）
 */

import { db, schema, sqlite } from '../database'
import { eq, and, desc, lt, sql } from 'drizzle-orm'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type LogCategory = 'access' | 'error' | 'event' | 'system'

interface LogOptions {
  level?: LogLevel
  category?: LogCategory
  roomId?: string
  playerId?: string
  ip?: string
  userAgent?: string
  details?: Record<string, any>
}

// 寫入日誌
export async function log(message: string, options: LogOptions = {}) {
  const {
    level = 'info',
    category = 'event',
    roomId,
    playerId,
    ip,
    userAgent,
    details
  } = options

  try {
    await db.insert(schema.systemLogs).values({
      level,
      category,
      message,
      details: details ? JSON.stringify(details) : null,
      roomId,
      playerId,
      ip,
      userAgent,
      createdAt: new Date()
    })
  } catch (e) {
    // 如果寫入資料庫失敗，至少輸出到控制台
    console.error('[LOG] Failed to write log:', e)
    console.log(`[${level.toUpperCase()}] [${category}] ${message}`)
  }
}

// 快捷方法
export const accessLog = (message: string, options: Omit<LogOptions, 'category'> = {}) => 
  log(message, { ...options, category: 'access' })

export const errorLog = (message: string, options: Omit<LogOptions, 'category'> = {}) => 
  log(message, { ...options, category: 'error', level: 'error' })

export const eventLog = (message: string, options: Omit<LogOptions, 'category'> = {}) => 
  log(message, { ...options, category: 'event' })

export const systemLog = (message: string, options: Omit<LogOptions, 'category'> = {}) => 
  log(message, { ...options, category: 'system' })

// 查詢日誌
export interface LogQuery {
  category?: LogCategory
  level?: LogLevel
  roomId?: string
  playerId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export async function queryLogs(query: LogQuery = {}) {
  const { limit = 100, offset = 0 } = query
  
  // 使用原生 SQL 查詢以獲得更好的靈活性
  let sql = `SELECT * FROM system_logs WHERE 1=1`
  const params: any[] = []
  
  if (query.category) {
    sql += ` AND category = ?`
    params.push(query.category)
  }
  
  if (query.level) {
    sql += ` AND level = ?`
    params.push(query.level)
  }
  
  if (query.roomId) {
    sql += ` AND room_id = ?`
    params.push(query.roomId)
  }
  
  if (query.playerId) {
    sql += ` AND player_id = ?`
    params.push(query.playerId)
  }
  
  if (query.startDate) {
    sql += ` AND created_at >= ?`
    params.push(query.startDate.getTime())
  }
  
  if (query.endDate) {
    sql += ` AND created_at <= ?`
    params.push(query.endDate.getTime())
  }
  
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  const logs = sqlite.prepare(sql).all(...params) as any[]
  
  // 解析 details JSON
  return logs.map(log => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
    createdAt: new Date(log.created_at)
  }))
}

// 獲取日誌統計
export async function getLogStatistics() {
  const stats = sqlite.prepare(`
    SELECT 
      category,
      level,
      COUNT(*) as count,
      MIN(created_at) as oldest,
      MAX(created_at) as newest
    FROM system_logs
    GROUP BY category, level
    ORDER BY category, level
  `).all() as any[]
  
  const total = sqlite.prepare(`
    SELECT COUNT(*) as count FROM system_logs
  `).get() as { count: number }
  
  const last24h = sqlite.prepare(`
    SELECT COUNT(*) as count FROM system_logs 
    WHERE created_at >= ?
  `).get(Date.now() - 24 * 60 * 60 * 1000) as { count: number }
  
  return {
    total: total.count,
    last24h: last24h.count,
    byCategory: stats.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = {}
      acc[s.category][s.level] = s.count
      return acc
    }, {} as Record<string, Record<string, number>>)
  }
}

// 清理日誌
export async function clearLogs(category?: LogCategory) {
  if (category) {
    const result = sqlite.prepare(`DELETE FROM system_logs WHERE category = ?`).run(category)
    await systemLog(`Cleared ${result.changes} ${category} logs`, { level: 'info' })
    return result.changes
  } else {
    const result = sqlite.prepare(`DELETE FROM system_logs`).run()
    console.log(`[LOG] Cleared all ${result.changes} logs`)
    return result.changes
  }
}

// 清理過期日誌
export async function cleanupOldLogs(daysToKeep: number = 7) {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
  const result = sqlite.prepare(`
    DELETE FROM system_logs WHERE created_at < ?
  `).run(cutoff)
  
  if (result.changes > 0) {
    await systemLog(`Cleaned up ${result.changes} old logs (older than ${daysToKeep} days)`, { level: 'info' })
  }
  
  return result.changes
}
