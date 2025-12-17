/**
 * 歷史紀錄管理 Composable
 * 用於保存和讀取先前的抽籤結果
 */
import { ref, readonly } from 'vue'

const HISTORY_KEY = 'lucky-draw-history'
const MAX_HISTORY = 20

export interface HistoryRecord {
  id: string
  timestamp: number
  mode: 'solo' | 'online'
  seed: number
  participantCount: number
  results: {
    order: number
    drawerName: string
    giftOwnerName: string
  }[]
}

export function useHistory() {
  const history = ref<HistoryRecord[]>([])
  
  // 載入歷史
  function loadHistory() {
    if (import.meta.client) {
      try {
        const saved = localStorage.getItem(HISTORY_KEY)
        if (saved) {
          history.value = JSON.parse(saved)
        }
      } catch (e) {
        console.error('Failed to load history:', e)
        history.value = []
      }
    }
  }
  
  // 儲存歷史
  function saveHistory() {
    if (import.meta.client) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
      } catch (e) {
        console.error('Failed to save history:', e)
      }
    }
  }
  
  // 添加一筆紀錄
  function addRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>) {
    const newRecord: HistoryRecord = {
      ...record,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    }
    
    history.value.unshift(newRecord)
    
    // 限制最大數量
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }
    
    saveHistory()
    return newRecord
  }
  
  // 刪除一筆紀錄
  function removeRecord(id: string) {
    history.value = history.value.filter((r: HistoryRecord) => r.id !== id)
    saveHistory()
  }
  
  // 清除所有歷史
  function clearHistory() {
    history.value = []
    saveHistory()
  }
  
  // 格式化時間
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    
    if (recordDate.getTime() === today.getTime()) {
      return `今天 ${timeStr}`
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (recordDate.getTime() === yesterday.getTime()) {
      return `昨天 ${timeStr}`
    }
    
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) + ' ' + timeStr
  }
  
  // 初始化時載入
  if (import.meta.client) {
    loadHistory()
  }
  
  return {
    history: readonly(history),
    loadHistory,
    addRecord,
    removeRecord,
    clearHistory,
    formatTime
  }
}
