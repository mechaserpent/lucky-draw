/**
 * WebSocket 路由處理 - 使用資料庫持久化
 * 
 * 支援功能：
 * - 房間管理（建立、加入、離開）
 * - 觀眾模式
 * - 斷線重連
 * - 抽獎設定與執行
 */

import * as roomService from '../services/roomService'
import type { RoomState, RoomPlayer, RoomSettings, DrawResult } from '../../shared/types'

interface Peer {
  id: string
  roomId?: string
  reconnectToken?: string
  send: (data: string) => void
}

const peers = new Map<string, Peer>()

// 生成玩家 ID
function generatePlayerId(): string {
  return 'P' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

// 廣播給房間內所有人（玩家 + 觀眾）
function broadcastToRoom(roomId: string, message: object, excludeId?: string) {
  for (const [id, peer] of peers) {
    if (peer.roomId === roomId && id !== excludeId) {
      peer.send(JSON.stringify(message))
    }
  }
}

// 將 Room 轉換為前端格式（兼容舊版）
function toRoomState(room: Awaited<ReturnType<typeof roomService.getRoom>>): RoomState | null {
  if (!room) return null
  
  return {
    id: room.id,
    hostId: room.hostId,
    players: room.players,
    spectators: room.spectators,
    gameState: room.gameState,
    settings: room.settings,
    seed: room.seed,
    drawSequence: room.drawSequence,
    drawOrder: room.drawOrder,
    currentIndex: room.currentIndex,
    results: room.results
  }
}

// 發送錯誤訊息
function sendError(peer: any, message: string) {
  peer.send(JSON.stringify({
    type: 'error',
    payload: { message }
  }))
}

export default defineWebSocketHandler({
  async open(peer) {
    const odId = generatePlayerId()
    const peerObj: Peer = {
      id: odId,
      send: (data: string) => peer.send(data)
    }
    peers.set(odId, peerObj)
    
    // 儲存 odId 到 peer context
    ;(peer as any).odId = odId
    
    peer.send(JSON.stringify({
      type: 'connected',
      payload: { odId }
    }))
    
    console.log(`[WS] Player connected: ${odId}`)
  },

  async message(peer, message) {
    const odId = (peer as any).odId
    const peerObj = peers.get(odId)
    if (!peerObj) return

    try {
      const msg = JSON.parse(message.text())
      console.log(`[WS] Message from ${odId}:`, msg.type)

      switch (msg.type) {
        // ==================== 房間管理 ====================
        
        case 'create_room': {
          const { hostName, settings } = msg.payload
          const room = await roomService.createRoom(odId, hostName, settings)
          peerObj.roomId = room.id
          
          // 獲取重連 token
          const reconnectToken = await roomService.getReconnectToken(room.id, odId)
          peerObj.reconnectToken = reconnectToken ?? undefined
          
          peer.send(JSON.stringify({
            type: 'room_created',
            payload: { room: toRoomState(room) }
          }))
          
          // 發送重連 token
          if (reconnectToken) {
            peer.send(JSON.stringify({
              type: 'reconnect_token',
              payload: { 
                roomId: room.id, 
                reconnectToken,
                odId
              }
            }))
          }
          break
        }

        case 'join_room': {
          const { roomId, playerName, asSpectator, deviceId } = msg.payload
          const upperRoomId = roomId.toUpperCase()
          
          const existingRoom = await roomService.getRoom(upperRoomId)
          if (!existingRoom) {
            sendError(peer, '房間不存在或已解散')
            return
          }
          
          // 檢查是否玩家已滿且不允許觀眾
          if (!asSpectator && 
              existingRoom.players.length >= existingRoom.settings.maxPlayers &&
              !existingRoom.settings.allowSpectators) {
            sendError(peer, '房間人數已滿')
            return
          }
          
          const room = await roomService.joinRoom(upperRoomId, odId, playerName, asSpectator, deviceId)
          
          if (!room) {
            sendError(peer, '無法加入房間')
            return
          }
          
          peerObj.roomId = upperRoomId
          
          // 獲取重連 token
          const reconnectToken = await roomService.getReconnectToken(room.id, odId)
          peerObj.reconnectToken = reconnectToken ?? undefined
          
          // 判斷加入的角色
          const joinedAsSpectator = room.spectators.some(s => s.id === odId)
          
          // 通知加入者
          peer.send(JSON.stringify({
            type: 'room_joined',
            payload: { 
              room: toRoomState(room),
              role: joinedAsSpectator ? 'spectator' : 'player'
            }
          }))
          
          // 發送重連 token（帶有過期時間）
          if (reconnectToken) {
            peer.send(JSON.stringify({
              type: 'reconnect_token',
              payload: { 
                roomId: room.id, 
                reconnectToken,
                odId,
                expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2小時
              }
            }))
          }
          
          // 通知房間其他人
          broadcastToRoom(room.id, {
            type: 'room_updated',
            payload: { room: toRoomState(room) }
          }, odId)
          break
        }

        case 'reconnect': {
          const { roomId, reconnectToken } = msg.payload
          const upperRoomId = roomId.toUpperCase()
          
          const result = await roomService.handleReconnect(upperRoomId, reconnectToken, odId)
          
          if (!result) {
            sendError(peer, '重連失敗，請重新加入房間')
            return
          }
          
          peerObj.roomId = upperRoomId
          peerObj.reconnectToken = reconnectToken
          
          // 通知重連成功
          peer.send(JSON.stringify({
            type: 'reconnect_success',
            payload: { 
              room: toRoomState(result.room),
              player: result.player
            }
          }))
          
          // 通知房間其他人
          broadcastToRoom(result.room.id, {
            type: 'player_reconnected',
            payload: { 
              room: toRoomState(result.room),
              odId,
              playerName: result.player.name
            }
          }, odId)
          break
        }

        case 'leave_room': {
          if (!peerObj.roomId) return
          
          const oldRoomId = peerObj.roomId
          const existingRoom = await roomService.getRoom(oldRoomId)
          const wasHost = existingRoom?.hostId === odId
          
          const room = await roomService.leaveRoom(oldRoomId, odId)
          peerObj.roomId = undefined
          peerObj.reconnectToken = undefined
          
          if (room) {
            broadcastToRoom(oldRoomId, {
              type: 'player_left',
              payload: { room: toRoomState(room), odId }
            })
          } else if (wasHost) {
            broadcastToRoom(oldRoomId, {
              type: 'room_disbanded',
              payload: { message: '主機已離開，房間已解散' }
            })
          }
          break
        }

        // ==================== 玩家操作 ====================

        case 'host_add_player': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以協助加入玩家')
            return
          }
          
          const { playerName } = msg.payload
          if (!playerName) return
          
          // 為虛擬玩家生成特殊 ID
          const virtualId = 'V' + Math.random().toString(36).substring(2, 10).toUpperCase()
          const updatedRoom = await roomService.joinRoom(room.id, virtualId, playerName)
          
          if (updatedRoom) {
            broadcastToRoom(room.id, {
              type: 'room_updated',
              payload: { room: toRoomState(updatedRoom) }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room: toRoomState(updatedRoom) }
            }))
          } else {
            sendError(peer, '無法加入玩家，房間人數已滿。請先在設定中增加人數上限。')
          }
          break
        }

        case 'set_ready': {
          if (!peerObj.roomId) return
          
          const room = await roomService.setReady(peerObj.roomId, odId, msg.payload.ready)
          if (room) {
            broadcastToRoom(room.id, {
              type: 'room_updated',
              payload: { room: toRoomState(room) }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room: toRoomState(room) }
            }))
          }
          break
        }

        case 'rename_player': {
          if (!peerObj.roomId) return
          
          const { newName } = msg.payload
          if (!newName || newName.trim().length === 0) {
            sendError(peer, '名稱不能為空')
            return
          }
          
          const room = await roomService.renamePlayer(peerObj.roomId, odId, newName.trim())
          if (room) {
            broadcastToRoom(room.id, {
              type: 'room_updated',
              payload: { room: toRoomState(room) }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room: toRoomState(room) }
            }))
          }
          break
        }

        case 'convert_to_spectator': {
          if (!peerObj.roomId) return
          
          const { targetPlayerId } = msg.payload
          const room = await roomService.getRoom(peerObj.roomId)
          
          if (!room) return
          
          // 只有主機可以將其他人轉為觀眾，或玩家自己轉換
          if (targetPlayerId !== odId && room.hostId !== odId) {
            sendError(peer, '只有主機可以將玩家轉為觀眾')
            return
          }
          
          const updatedRoom = await roomService.convertToSpectator(peerObj.roomId, targetPlayerId)
          
          if (updatedRoom) {
            broadcastToRoom(updatedRoom.id, {
              type: 'player_converted_to_spectator',
              payload: { 
                room: toRoomState(updatedRoom),
                odId: targetPlayerId
              }
            })
          } else {
            sendError(peer, '無法轉換為觀眾')
          }
          break
        }

        // ==================== 設定操作 ====================

        case 'update_settings': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以修改設定')
            return
          }
          
          const { settings } = msg.payload
          const updatedRoom = await roomService.updateRoomSettings(peerObj.roomId, odId, settings)
          
          if (updatedRoom) {
            broadcastToRoom(updatedRoom.id, {
              type: 'settings_updated',
              payload: { room: toRoomState(updatedRoom) }
            })
            peer.send(JSON.stringify({
              type: 'settings_updated',
              payload: { room: toRoomState(updatedRoom) }
            }))
          } else {
            sendError(peer, '無法更新設定')
          }
          break
        }

        // 兼容舊版的 update_max_players
        case 'update_max_players': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以修改房間上限')
            return
          }
          
          const { maxPlayers } = msg.payload
          const updatedRoom = await roomService.updateRoomSettings(peerObj.roomId, odId, { maxPlayers })
          
          if (updatedRoom) {
            broadcastToRoom(updatedRoom.id, {
              type: 'room_updated',
              payload: { room: toRoomState(updatedRoom) }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room: toRoomState(updatedRoom) }
            }))
          } else {
            sendError(peer, '無法修改房間上限，新上限不能小於目前人數')
          }
          break
        }

        // ==================== 遊戲操作 ====================

        case 'start_game': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以開始遊戲')
            return
          }
          
          const startedRoom = await roomService.startGame(peerObj.roomId, msg.payload?.seed)
          if (!startedRoom) {
            sendError(peer, '無法開始遊戲，請確保至少有 2 位玩家')
            return
          }
          
          broadcastToRoom(startedRoom.id, {
            type: 'game_started',
            payload: { room: toRoomState(startedRoom) }
          })
          peer.send(JSON.stringify({
            type: 'game_started',
            payload: { room: toRoomState(startedRoom) }
          }))
          break
        }

        case 'perform_draw': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room) return
          
          // 找到當前玩家
          const player = room.players.find(p => p.id === odId)
          if (!player) {
            sendError(peer, '只有玩家可以抽獎')
            return
          }
          
          // 檢查是否是當前抽獎者
          const currentDrawerId = room.drawOrder[room.currentIndex]
          if (player.participantId !== currentDrawerId) {
            sendError(peer, '還沒輪到你抽獎')
            return
          }
          
          const result = await roomService.performDraw(peerObj.roomId, player.participantId)
          if (result) {
            broadcastToRoom(result.room.id, {
              type: 'draw_performed',
              payload: { room: toRoomState(result.room), result: result.result }
            })
            peer.send(JSON.stringify({
              type: 'draw_performed',
              payload: { room: toRoomState(result.room), result: result.result }
            }))
          }
          break
        }

        case 'host_perform_draw': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以代替抽獎')
            return
          }
          
          const result = await roomService.performDraw(peerObj.roomId, msg.payload.participantId)
          if (result) {
            broadcastToRoom(result.room.id, {
              type: 'draw_performed',
              payload: { room: toRoomState(result.room), result: result.result }
            })
            peer.send(JSON.stringify({
              type: 'draw_performed',
              payload: { room: toRoomState(result.room), result: result.result }
            }))
          }
          break
        }

        case 'next_drawer': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以進入下一位')
            return
          }
          
          const updatedRoom = await roomService.nextDrawer(peerObj.roomId)
          if (updatedRoom) {
            const msgType = updatedRoom.gameState === 'complete' ? 'game_complete' : 'next_drawer'
            broadcastToRoom(updatedRoom.id, {
              type: msgType,
              payload: { room: toRoomState(updatedRoom) }
            })
            peer.send(JSON.stringify({
              type: msgType,
              payload: { room: toRoomState(updatedRoom) }
            }))
          }
          break
        }

        case 'restart_game': {
          if (!peerObj.roomId) return
          
          const room = await roomService.getRoom(peerObj.roomId)
          if (!room || room.hostId !== odId) {
            sendError(peer, '只有主機可以重新開始遊戲')
            return
          }
          
          const restartedRoom = await roomService.restartGame(peerObj.roomId)
          if (restartedRoom) {
            broadcastToRoom(restartedRoom.id, {
              type: 'game_restarted',
              payload: { room: toRoomState(restartedRoom) }
            })
            peer.send(JSON.stringify({
              type: 'game_restarted',
              payload: { room: toRoomState(restartedRoom) }
            }))
          }
          break
        }
      }
    } catch (e) {
      console.error('[WS] Error processing message:', e)
    }
  },

  async close(peer) {
    const odId = (peer as any).odId
    const peerObj = peers.get(odId)
    
    if (peerObj?.roomId) {
      const room = await roomService.getRoom(peerObj.roomId)
      const wasHost = room?.hostId === odId
      const oldRoomId = peerObj.roomId
      
      // 處理斷線（不立即移除玩家，給予重連機會）
      const updatedRoom = await roomService.handleDisconnect(peerObj.roomId, odId)
      
      if (updatedRoom) {
        // 檢查是否有主機移交
        const newHost = wasHost && updatedRoom.hostId !== odId
        
        // 通知其他人玩家斷線
        broadcastToRoom(oldRoomId, {
          type: 'player_disconnected',
          payload: { 
            room: toRoomState(updatedRoom), 
            odId,
            isHost: wasHost,
            newHostId: newHost ? updatedRoom.hostId : undefined,
            hostTransferred: newHost
          }
        })
      }
    }
    
    peers.delete(odId)
    console.log(`[WS] Player disconnected: ${odId}`)
  }
})
