/**
 * 裝置識別管理 - 用於斷線重連
 * 
 * 功能：
 * - 生成並持久化裝置唯一 ID
 * - 管理重連 Token
 * - 提供重連所需的識別資訊
 */

const DEVICE_ID_KEY = 'lucky-draw-device-id'
const RECONNECT_INFO_KEY = 'lucky-draw-reconnect-info'

export interface ReconnectInfo {
  roomId: string
  playerId: string
  playerName: string
  reconnectToken: string
  expiresAt: number
}

export function useDeviceId() {
  // 生成裝置 ID（基於多個瀏覽器特徵）
  function generateDeviceId(): string {
    // 使用多個因素生成唯一 ID
    const factors = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      // 添加隨機成分確保唯一性
      Math.random().toString(36).substring(2, 15)
    ]
    
    const combined = factors.join('|')
    
    // 簡單哈希（實際應用中可以使用更好的哈希算法）
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 轉換為32位整數
    }
    
    // 生成可讀的 ID（D 開頭，後接時間戳和哈希）
    const timestamp = Date.now().toString(36)
    const hashStr = Math.abs(hash).toString(36)
    const randomStr = Math.random().toString(36).substring(2, 6)
    
    return `D${timestamp}${hashStr}${randomStr}`.toUpperCase()
  }
  
  // 獲取或創建裝置 ID
  function getDeviceId(): string {
    try {
      let deviceId = localStorage.getItem(DEVICE_ID_KEY)
      
      if (!deviceId) {
        deviceId = generateDeviceId()
        localStorage.setItem(DEVICE_ID_KEY, deviceId)
      }
      
      return deviceId
    } catch (e) {
      // localStorage 不可用時，生成臨時 ID
      console.warn('localStorage not available, using temporary device ID')
      return generateDeviceId()
    }
  }
  
  // 儲存重連資訊
  function saveReconnectInfo(info: ReconnectInfo): void {
    try {
      localStorage.setItem(RECONNECT_INFO_KEY, JSON.stringify(info))
    } catch (e) {
      console.error('Failed to save reconnect info:', e)
    }
  }
  
  // 獲取重連資訊
  function getReconnectInfo(roomId?: string): ReconnectInfo | null {
    try {
      const data = localStorage.getItem(RECONNECT_INFO_KEY)
      if (!data) return null
      
      const info: ReconnectInfo = JSON.parse(data)
      
      // 檢查是否過期
      if (info.expiresAt < Date.now()) {
        clearReconnectInfo()
        return null
      }
      
      // 如果指定了 roomId，檢查是否匹配
      if (roomId && info.roomId !== roomId) {
        return null
      }
      
      return info
    } catch (e) {
      console.error('Failed to get reconnect info:', e)
      return null
    }
  }
  
  // 清除重連資訊
  function clearReconnectInfo(): void {
    try {
      localStorage.removeItem(RECONNECT_INFO_KEY)
    } catch (e) {
      console.error('Failed to clear reconnect info:', e)
    }
  }
  
  // 檢查是否有有效的重連資訊
  function hasValidReconnectInfo(roomId?: string): boolean {
    return getReconnectInfo(roomId) !== null
  }
  
  return {
    getDeviceId,
    saveReconnectInfo,
    getReconnectInfo,
    clearReconnectInfo,
    hasValidReconnectInfo
  }
}
