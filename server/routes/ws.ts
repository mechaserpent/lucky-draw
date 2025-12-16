import { 
  getRoom, 
  createRoom, 
  joinRoom, 
  leaveRoom, 
  setReady, 
  startGame, 
  performDraw, 
  nextDrawer,
  restartGame,
  updateRoomMaxPlayers
} from '../utils/room'

interface Peer {
  id: string
  roomId?: string
  send: (data: string) => void
}

const peers = new Map<string, Peer>()

// 生成玩家 ID
function generatePlayerId(): string {
  return 'P' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

// 廣播給房間內所有人
function broadcastToRoom(roomId: string, message: object, excludeId?: string) {
  for (const [id, peer] of peers) {
    if (peer.roomId === roomId && id !== excludeId) {
      peer.send(JSON.stringify(message))
    }
  }
}

export default defineWebSocketHandler({
  open(peer) {
    const playerId = generatePlayerId()
    const peerObj: Peer = {
      id: playerId,
      send: (data: string) => peer.send(data)
    }
    peers.set(playerId, peerObj)
    
    // 儲存 playerId 到 peer context
    ;(peer as any).playerId = playerId
    
    peer.send(JSON.stringify({
      type: 'connected',
      payload: { playerId }
    }))
    
    console.log(`[WS] Player connected: ${playerId}`)
  },

  message(peer, message) {
    const playerId = (peer as any).playerId
    const peerObj = peers.get(playerId)
    if (!peerObj) return

    try {
      const msg = JSON.parse(message.text())
      console.log(`[WS] Message from ${playerId}:`, msg.type)

      switch (msg.type) {
        case 'create_room': {
          const { hostName, maxPlayers } = msg.payload
          const room = createRoom(playerId, hostName, maxPlayers)
          peerObj.roomId = room.id
          
          peer.send(JSON.stringify({
            type: 'room_created',
            payload: { room }
          }))
          break
        }

        case 'join_room': {
          const { roomId, playerName } = msg.payload
          const existingRoom = getRoom(roomId.toUpperCase())
          
          if (!existingRoom) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '房間不存在或已解散' }
            }))
            return
          }
          
          if (existingRoom.players.length >= existingRoom.maxPlayers) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '房間人數已滿，請聯繫房主增加人數上限' }
            }))
            return
          }
          
          const room = joinRoom(roomId.toUpperCase(), playerId, playerName)
          
          if (!room) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '無法加入房間，遊戲可能已經開始' }
            }))
            return
          }
          
          peerObj.roomId = roomId.toUpperCase()
          
          // 通知加入者
          peer.send(JSON.stringify({
            type: 'room_joined',
            payload: { room }
          }))
          
          // 通知房間其他人
          broadcastToRoom(room.id, {
            type: 'room_updated',
            payload: { room }
          }, playerId)
          break
        }

        case 'leave_room': {
          if (!peerObj.roomId) return
          
          const wasHost = getRoom(peerObj.roomId)?.hostId === playerId
          const room = leaveRoom(peerObj.roomId, playerId)
          const oldRoomId = peerObj.roomId
          peerObj.roomId = undefined
          
          if (room) {
            broadcastToRoom(oldRoomId, {
              type: 'player_left',
              payload: { room, playerId }
            })
          } else if (wasHost) {
            // 房間已解散（主機離開且房間空了或主機主動解散）
            broadcastToRoom(oldRoomId, {
              type: 'room_disbanded',
              payload: { message: '主機已離開，房間已解散' }
            })
          }
          break
        }

        case 'host_add_player': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room || room.hostId !== playerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有主機可以協助加入玩家' }
            }))
            return
          }
          
          const { playerName } = msg.payload
          if (!playerName) return
          
          // 為虛擬玩家生成一個特殊 ID
          const virtualId = 'V' + Math.random().toString(36).substring(2, 10).toUpperCase()
          const updatedRoom = joinRoom(room.id, virtualId, playerName)
          
          if (updatedRoom) {
            broadcastToRoom(room.id, {
              type: 'room_updated',
              payload: { room: updatedRoom }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room: updatedRoom }
            }))
          } else {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '無法加入玩家，房間人數已滿。請先在設定中增加人數上限。' }
            }))
          }
          break
        }

        case 'set_ready': {
          if (!peerObj.roomId) return
          
          const room = setReady(peerObj.roomId, playerId, msg.payload.ready)
          if (room) {
            broadcastToRoom(room.id, {
              type: 'room_updated',
              payload: { room }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room }
            }))
          }
          break
        }

        case 'start_game': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room || room.hostId !== playerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有主機可以開始遊戲' }
            }))
            return
          }
          
          const startedRoom = startGame(peerObj.roomId, msg.payload?.seed)
          if (!startedRoom) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '無法開始遊戲，請確保至少有 2 位玩家' }
            }))
            return
          }
          
          // 通知所有人遊戲開始
          broadcastToRoom(startedRoom.id, {
            type: 'game_started',
            payload: { room: startedRoom }
          })
          peer.send(JSON.stringify({
            type: 'game_started',
            payload: { room: startedRoom }
          }))
          break
        }

        case 'perform_draw': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room) return
          
          // 找到當前玩家的參與者 ID
          const player = room.players.find(p => p.id === playerId)
          if (!player) return
          
          // 檢查是否是當前抽獎者
          const currentDrawerId = room.drawOrder[room.currentIndex]
          if (player.participantId !== currentDrawerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '還沒輪到你抽獎' }
            }))
            return
          }
          
          const result = performDraw(peerObj.roomId, player.participantId)
          if (result) {
            broadcastToRoom(result.room.id, {
              type: 'draw_performed',
              payload: { room: result.room, result: result.result }
            })
            peer.send(JSON.stringify({
              type: 'draw_performed',
              payload: { room: result.room, result: result.result }
            }))
          }
          break
        }

        case 'host_perform_draw': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room || room.hostId !== playerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有主機可以代替抽獎' }
            }))
            return
          }
          
          const result = performDraw(peerObj.roomId, msg.payload.participantId)
          if (result) {
            broadcastToRoom(result.room.id, {
              type: 'draw_performed',
              payload: { room: result.room, result: result.result }
            })
            peer.send(JSON.stringify({
              type: 'draw_performed',
              payload: { room: result.room, result: result.result }
            }))
          }
          break
        }

        case 'next_drawer': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room || room.hostId !== playerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有主機可以進入下一位' }
            }))
            return
          }
          
          const updatedRoom = nextDrawer(peerObj.roomId)
          if (updatedRoom) {
            const msgType = updatedRoom.gameState === 'complete' ? 'game_complete' : 'next_drawer'
            broadcastToRoom(updatedRoom.id, {
              type: msgType,
              payload: { room: updatedRoom }
            })
            peer.send(JSON.stringify({
              type: msgType,
              payload: { room: updatedRoom }
            }))
          }
          break
        }

        case 'restart_game': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room || room.hostId !== playerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有主機可以重新開始遊戲' }
            }))
            return
          }
          
          const restartedRoom = restartGame(peerObj.roomId)
          if (restartedRoom) {
            broadcastToRoom(restartedRoom.id, {
              type: 'game_restarted',
              payload: { room: restartedRoom }
            })
            peer.send(JSON.stringify({
              type: 'game_restarted',
              payload: { room: restartedRoom }
            }))
          }
          break
        }

        case 'update_max_players': {
          if (!peerObj.roomId) return
          
          const room = getRoom(peerObj.roomId)
          if (!room || room.hostId !== playerId) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有主機可以修改房間上限' }
            }))
            return
          }
          
          const { maxPlayers } = msg.payload
          if (typeof maxPlayers !== 'number' || !Number.isFinite(maxPlayers) || !Number.isInteger(maxPlayers)) {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '無效的人數上限' }
            }))
            return
          }
          
          const updatedRoom = updateRoomMaxPlayers(peerObj.roomId, playerId, maxPlayers)
          if (updatedRoom) {
            broadcastToRoom(updatedRoom.id, {
              type: 'room_updated',
              payload: { room: updatedRoom }
            })
            peer.send(JSON.stringify({
              type: 'room_updated',
              payload: { room: updatedRoom }
            }))
          } else {
            peer.send(JSON.stringify({
              type: 'error',
              payload: { message: '無法修改房間上限，新上限不能小於目前人數' }
            }))
          }
          break
        }
      }
    } catch (e) {
      console.error('[WS] Error parsing message:', e)
    }
  },

  close(peer) {
    const playerId = (peer as any).playerId
    const peerObj = peers.get(playerId)
    
    if (peerObj?.roomId) {
      const wasHost = getRoom(peerObj.roomId)?.hostId === playerId
      const oldRoomId = peerObj.roomId
      const room = leaveRoom(peerObj.roomId, playerId)
      
      if (room) {
        broadcastToRoom(oldRoomId, {
          type: 'player_left',
          payload: { room, playerId }
        })
      } else if (wasHost) {
        // 主機離開，房間解散
        broadcastToRoom(oldRoomId, {
          type: 'room_disbanded',
          payload: { message: '主機已離開，房間已解散' }
        })
      }
    }
    
    peers.delete(playerId)
    console.log(`[WS] Player disconnected: ${playerId}`)
  }
})
