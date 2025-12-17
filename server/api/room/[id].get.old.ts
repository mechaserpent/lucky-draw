// 檢查房間是否存在
import { getRoom } from '~~/server/utils/room'

export default defineEventHandler((event) => {
  const roomId = getRouterParam(event, 'id')?.toUpperCase()
  
  if (!roomId) {
    return {
      exists: false,
      error: '未提供房間代碼'
    }
  }
  
  const room = getRoom(roomId)
  
  if (!room) {
    return {
      exists: false,
      roomId,
      error: '房間不存在或已解散'
    }
  }
  
  return {
    exists: true,
    roomId: room.id,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    gameState: room.gameState
  }
})
