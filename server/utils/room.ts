// 房間和玩家類型
export interface RoomPlayer {
  id: string
  name: string
  participantId: number
  isHost: boolean
  isReady: boolean
}

export interface DrawResult {
  order: number
  drawerId: number
  giftOwnerId: number
}

export interface Room {
  id: string
  hostId: string
  players: RoomPlayer[]
  gameState: 'waiting' | 'playing' | 'complete'
  maxPlayers: number
  seed: number
  drawSequence: Record<number, number>
  drawOrder: number[]
  currentIndex: number
  results: DrawResult[]
}

// 房間儲存
const rooms = new Map<string, Room>()

// 生成房間 ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// Mulberry32 PRNG
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// 生成抽獎序列
function generateDrawSequence(playerIds: number[], seed: number): Record<number, number> | null {
  const random = mulberry32(seed)
  const ids = [...playerIds]
  
  let result: Record<number, number> = {}
  let attempts = 0
  const maxAttempts = 10000

  while (attempts < maxAttempts) {
    attempts++
    result = {}
    
    let availableGifts = [...ids]
    let success = true

    // Fisher-Yates 洗牌
    for (let i = availableGifts.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[availableGifts[i], availableGifts[j]] = [availableGifts[j], availableGifts[i]]
    }

    for (let i = 0; i < ids.length; i++) {
      const drawerId = ids[i]
      const giftOwnerId = availableGifts[i]
      
      if (drawerId === giftOwnerId) {
        success = false
        break
      }
      result[drawerId] = giftOwnerId
    }

    if (success && ids.every(id => result[id] !== id)) {
      return result
    }
  }

  return null
}

// 獲取房間
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId)
}

// 建立房間
export function createRoom(hostId: string, hostName: string, maxPlayers: number): Room {
  let roomId: string
  do {
    roomId = generateRoomId()
  } while (rooms.has(roomId))

  const room: Room = {
    id: roomId,
    hostId,
    players: [{
      id: hostId,
      name: hostName,
      participantId: 1,
      isHost: true,
      isReady: true
    }],
    gameState: 'waiting',
    maxPlayers,
    seed: Date.now(),
    drawSequence: {},
    drawOrder: [],
    currentIndex: 0,
    results: []
  }

  rooms.set(roomId, room)
  return room
}

// 加入房間
export function joinRoom(roomId: string, playerId: string, playerName: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.gameState !== 'waiting') return null
  if (room.players.length >= room.maxPlayers) return null
  if (room.players.some(p => p.id === playerId)) return room

  const participantId = room.players.length + 1
  room.players.push({
    id: playerId,
    name: playerName,
    participantId,
    isHost: false,
    isReady: false
  })

  return room
}

// 離開房間
export function leaveRoom(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null

  const wasHost = room.hostId === playerId
  
  // 如果主機離開，直接解散房間
  if (wasHost) {
    rooms.delete(roomId)
    return null
  }

  room.players = room.players.filter(p => p.id !== playerId)
  
  // 如果房間空了，刪除房間
  if (room.players.length === 0) {
    rooms.delete(roomId)
    return null
  }

  // 重新分配參與者 ID
  room.players.forEach((p, i) => {
    p.participantId = i + 1
  })

  return room
}

// 設定準備狀態
export function setReady(roomId: string, playerId: string, ready: boolean): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null

  const player = room.players.find(p => p.id === playerId)
  if (player) {
    player.isReady = ready
  }

  return room
}

// 開始遊戲
export function startGame(roomId: string, seed?: number): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.players.length < 2) return null

  // 使用提供的 seed 或現有的
  if (seed) {
    room.seed = seed
  }

  const playerIds = room.players.map(p => p.participantId)
  const drawSequence = generateDrawSequence(playerIds, room.seed)
  
  if (!drawSequence) return null

  room.drawSequence = drawSequence
  
  // 建立連鎖順序
  const random = mulberry32(room.seed)
  const startIdx = Math.floor(random() * room.players.length)
  const starterId = room.players[startIdx].participantId

  room.drawOrder = []
  let currentId = starterId
  const visited = new Set<number>()

  while (!visited.has(currentId) && room.drawOrder.length < room.players.length) {
    visited.add(currentId)
    room.drawOrder.push(currentId)
    currentId = room.drawSequence[currentId]
  }

  // 處理多個連通分量
  const remaining = playerIds.filter(id => !visited.has(id))
  while (remaining.length > 0) {
    const nextStart = remaining.shift()!
    let curr = nextStart
    while (!visited.has(curr)) {
      visited.add(curr)
      room.drawOrder.push(curr)
      const idx = remaining.indexOf(room.drawSequence[curr])
      if (idx > -1) remaining.splice(idx, 1)
      curr = room.drawSequence[curr]
    }
  }

  room.currentIndex = 0
  room.results = []
  room.gameState = 'playing'

  return room
}

// 執行抽獎
export function performDraw(roomId: string, participantId?: number): { room: Room; result: DrawResult } | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.gameState !== 'playing') return null
  if (room.currentIndex >= room.drawOrder.length) return null

  const currentDrawerId = room.drawOrder[room.currentIndex]
  
  // 如果指定了參與者 ID，檢查是否是當前抽獎者
  if (participantId !== undefined && participantId !== currentDrawerId) {
    return null
  }

  // 檢查當前抽獎者是否已經抽過（防止重複抽獎）
  const alreadyDrawn = room.results.some(r => r.order === room.currentIndex + 1)
  if (alreadyDrawn) {
    // 已經抽過，返回現有結果而不是新增
    const existingResult = room.results.find(r => r.order === room.currentIndex + 1)!
    return { room, result: existingResult }
  }

  const giftOwnerId = room.drawSequence[currentDrawerId]

  const result: DrawResult = {
    order: room.currentIndex + 1,
    drawerId: currentDrawerId,
    giftOwnerId
  }

  room.results.push(result)

  return { room, result }
}

// 下一位抽獎者
export function nextDrawer(roomId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null

  if (room.currentIndex >= room.drawOrder.length - 1) {
    room.gameState = 'complete'
  } else {
    room.currentIndex++
  }

  return room
}

// 重新開始遊戲（保持設定，更新 seed）
export function restartGame(roomId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null

  // 重置為等待狀態
  room.gameState = 'waiting'
  room.seed = Date.now()
  room.drawSequence = {}
  room.drawOrder = []
  room.currentIndex = 0
  room.results = []
  
  // 重置所有玩家的準備狀態（主機自動準備）
  room.players.forEach(p => {
    p.isReady = p.isHost
  })

  return room
}

// 更新房間人數上限
export function updateRoomMaxPlayers(roomId: string, hostId: string, newMaxPlayers: number): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  
  // 只有主機可以更新
  if (room.hostId !== hostId) return null
  
  // 確保新上限不小於當前人數
  if (newMaxPlayers < room.players.length) return null
  
  // 確保新上限在有效範圍內 (2-100)
  if (newMaxPlayers < 2 || newMaxPlayers > 100) return null
  
  room.maxPlayers = newMaxPlayers
  return room
}

// 清理空房間（可定時執行）
export function cleanupEmptyRooms() {
  for (const [id, room] of rooms) {
    if (room.players.length === 0) {
      rooms.delete(id)
    }
  }
}
