/**
 * 房間查詢 API - 支援資料庫
 */
import { getRoom } from '~~/server/services/roomService'

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, 'id')?.toUpperCase()
  
  if (!roomId) {
    return {
      exists: false,
      error: '未提供房間代碼'
    }
  }
  
  const room = await getRoom(roomId)
  
  if (!room) {
    return {
      exists: false,
      roomId,
      error: '房間不存在或已解散'
    }
  }
  
  // 檢查是否可以加入
  let canJoin = true
  let reason = ''
  
  if (room.gameState !== 'waiting') {
    canJoin = false
    reason = '遊戲已經開始，無法加入'
  } else if (room.players.length >= room.settings.maxPlayers && !room.settings.allowSpectators) {
    canJoin = false
    reason = '房間已滿'
  }

  return {
    exists: true,
    roomId: room.id,
    playerCount: room.players.length,
    spectatorCount: room.spectators.length,
    maxPlayers: room.settings.maxPlayers,
    allowSpectators: room.settings.allowSpectators,
    gameState: room.gameState,
    canJoin,
    reason
  }
})
