/**
 * API: 獲取結果數據
 * GET /api/result/[id]
 * 
 * 支援跨用戶查看結果（用於分享連結）
 */

import { db, schema } from '../../database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const resultId = getRouterParam(event, 'id')
  
  if (!resultId) {
    throw createError({
      statusCode: 400,
      message: '缺少結果 ID'
    })
  }

  try {
    // 從 resultId 解析出 roomId 或 seed
    // 格式: solo_<seed>_<timestamp> 或 online_<roomId>_<seed>_<timestamp>
    const parts = resultId.split('_')
    
    if (parts[0] === 'online' && parts.length >= 4) {
      // 連線模式: 從資料庫載入
      const roomId = parts[1]
      
      const room = await db.query.rooms.findFirst({
        where: eq(schema.rooms.id, roomId)
      })
      
      if (!room) {
        throw createError({
          statusCode: 404,
          message: '房間不存在或已過期'
        })
      }
      
      // 載入玩家
      const players = await db.query.players.findMany({
        where: eq(schema.players.roomId, roomId)
      })
      
      // 載入結果
      const results = await db.query.drawResults.findMany({
        where: eq(schema.drawResults.roomId, roomId),
        orderBy: [schema.drawResults.order]
      })
      
      // 建立 participantId 到名字的映射
      const playerMap = new Map(players.map(p => [p.participantId, p.name]))
      
      return {
        id: resultId,
        mode: 'online',
        roomId: roomId,
        seed: room.seed,
        participantCount: players.filter(p => p.role === 'player').length,
        results: results.map(r => ({
          order: r.order,
          drawerName: playerMap.get(r.drawerId) || '?',
          giftOwnerName: playerMap.get(r.giftOwnerId) || '?'
        }))
      }
    } else if (parts[0] === 'solo' && parts.length >= 3) {
      // 主持模式: 僅通過 localStorage 共享
      // API 無法獲取，返回錯誤提示使用原始設備查看
      throw createError({
        statusCode: 404,
        message: '主持模式結果僅存於原始設備，請在原始瀏覽器中查看'
      })
    } else {
      throw createError({
        statusCode: 400,
        message: '無效的結果 ID 格式'
      })
    }
  } catch (e: any) {
    if (e.statusCode) throw e
    
    console.error('Failed to load result:', e)
    throw createError({
      statusCode: 500,
      message: '載入結果失敗'
    })
  }
})
