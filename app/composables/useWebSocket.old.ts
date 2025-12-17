// WebSocket 連線管理
export interface RoomState {
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

export interface WSMessage {
  type: string
  payload?: any
}

export function useWebSocket() {
  const ws = useState<WebSocket | null>('ws', () => null)
  const isConnected = useState('wsConnected', () => false)
  const playerId = useState('playerId', () => '')
  const roomState = useState<RoomState | null>('roomState', () => null)
  const error = useState<string | null>('wsError', () => null)
  
  // 事件處理器（使用 useState 確保跨組件共享）
  const eventHandlers = useState<Map<string, Function[]>>('wsEventHandlers', () => new Map())
  
  function on(event: string, handler: Function) {
    if (!eventHandlers.value.has(event)) {
      eventHandlers.value.set(event, [])
    }
    eventHandlers.value.get(event)!.push(handler)
  }
  
  function off(event: string, handler?: Function) {
    if (!handler) {
      // 移除該事件的所有處理器
      eventHandlers.value.delete(event)
    } else {
      const handlers = eventHandlers.value.get(event)
      if (handlers) {
        const idx = handlers.indexOf(handler)
        if (idx > -1) handlers.splice(idx, 1)
      }
    }
  }
  
  function emit(event: string, data?: any) {
    const handlers = eventHandlers.value.get(event)
    if (handlers) {
      handlers.forEach(h => h(data))
    }
  }
  
  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) return
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    
    ws.value = new WebSocket(wsUrl)
    
    ws.value.onopen = () => {
      isConnected.value = true
      error.value = null
      console.log('WebSocket connected')
    }
    
    ws.value.onclose = () => {
      isConnected.value = false
      console.log('WebSocket disconnected')
    }
    
    ws.value.onerror = (e) => {
      error.value = '連線錯誤'
      console.error('WebSocket error:', e)
    }
    
    ws.value.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        handleMessage(msg)
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }
  }
  
  function disconnect() {
    ws.value?.close()
    ws.value = null
    isConnected.value = false
    roomState.value = null
  }
  
  function send(msg: WSMessage) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg))
    }
  }
  
  function handleMessage(msg: WSMessage) {
    console.log('WS Message:', msg.type, msg.payload)
    
    switch (msg.type) {
      case 'connected':
        playerId.value = msg.payload.playerId
        break
        
      case 'room_created':
      case 'room_joined':
      case 'room_updated':
        roomState.value = msg.payload.room
        emit('roomUpdated', roomState.value)
        break
        
      case 'game_started':
        roomState.value = msg.payload.room
        emit('gameStarted', roomState.value)
        break
        
      case 'draw_performed':
        roomState.value = msg.payload.room
        emit('drawPerformed', msg.payload.result)
        break
        
      case 'next_drawer':
        roomState.value = msg.payload.room
        emit('nextDrawer', roomState.value)
        break
        
      case 'game_complete':
        roomState.value = msg.payload.room
        emit('gameComplete', roomState.value)
        break
      
      case 'game_restarted':
        roomState.value = msg.payload.room
        emit('gameRestarted', roomState.value)
        break
      
      case 'room_disbanded':
        roomState.value = null
        emit('roomDisbanded', msg.payload.message)
        break
        
      case 'player_left':
        roomState.value = msg.payload.room
        emit('playerLeft', msg.payload.playerId)
        break
        
      case 'error':
        error.value = msg.payload.message
        emit('error', msg.payload.message)
        break
    }
  }
  
  // 房間操作
  function createRoom(hostName: string, maxPlayers: number) {
    send({
      type: 'create_room',
      payload: { hostName, maxPlayers }
    })
  }
  
  function joinRoom(roomId: string, playerName: string) {
    send({
      type: 'join_room',
      payload: { roomId, playerName }
    })
  }
  
  function leaveRoom() {
    send({ type: 'leave_room' })
    roomState.value = null
  }
  
  function setReady(ready: boolean) {
    send({
      type: 'set_ready',
      payload: { ready }
    })
  }
  
  function startGame(seed?: number) {
    send({
      type: 'start_game',
      payload: { seed }
    })
  }
  
  function performDraw() {
    send({ type: 'perform_draw' })
  }
  
  function hostPerformDraw(participantId: number) {
    send({
      type: 'host_perform_draw',
      payload: { participantId }
    })
  }
  
  function nextDrawer() {
    send({ type: 'next_drawer' })
  }
  
  // 獲取當前玩家
  function getCurrentPlayer() {
    if (!roomState.value || !playerId.value) return null
    return roomState.value.players.find(p => p.id === playerId.value)
  }
  
  // 是否是當前抽獎者
  function isCurrentDrawer() {
    if (!roomState.value || !playerId.value) return false
    const currentDrawerId = roomState.value.drawOrder[roomState.value.currentIndex]
    const player = roomState.value.players.find(p => p.id === playerId.value)
    return player?.participantId === currentDrawerId
  }
  
  // 是否是主機
  function isHost() {
    return getCurrentPlayer()?.isHost ?? false
  }
  
  return {
    ws,
    isConnected,
    playerId,
    roomState,
    error,
    connect,
    disconnect,
    send,
    on,
    off,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    performDraw,
    hostPerformDraw,
    nextDrawer,
    getCurrentPlayer,
    isCurrentDrawer,
    isHost
  }
}
