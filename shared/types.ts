/**
 * 共用類型定義 - 前後端共用
 */

// ==================== 房間設定 ====================
export interface RoomSettings {
  maxPlayers: number
  allowSpectators: boolean
  drawMode: 'chain' | 'random'
  firstDrawerMode: 'random' | 'manual' | 'host'
  firstDrawerId?: number
}

// ==================== 玩家 ====================
export interface RoomPlayer {
  id: string
  name: string
  participantId: number
  role: 'player' | 'spectator'
  isHost: boolean
  isReady: boolean
  isConnected: boolean
  isVirtual: boolean
}

// ==================== 抽獎結果 ====================
export interface DrawResult {
  order: number
  drawerId: number
  giftOwnerId: number
}

// ==================== 房間狀態 ====================
export interface RoomState {
  id: string
  hostId: string
  players: RoomPlayer[]
  spectators: RoomPlayer[]
  gameState: 'waiting' | 'playing' | 'complete'
  settings: RoomSettings
  seed: number
  drawSequence: Record<number, number>
  drawOrder: number[]
  currentIndex: number
  results: DrawResult[]
}

// ==================== WebSocket 訊息 ====================
export interface WSMessage {
  type: string
  payload?: any
}

// 客戶端 -> 伺服器
export type ClientMessageType = 
  | 'create_room'
  | 'join_room'
  | 'join_as_spectator'
  | 'leave_room'
  | 'reconnect'
  | 'host_add_player'
  | 'set_ready'
  | 'update_settings'
  | 'start_game'
  | 'perform_draw'
  | 'host_perform_draw'
  | 'next_drawer'
  | 'restart_game'
  | 'convert_to_spectator'
  | 'send_chat'

// 伺服器 -> 客戶端
export type ServerMessageType =
  | 'connected'
  | 'room_created'
  | 'room_joined'
  | 'room_updated'
  | 'settings_updated'
  | 'game_started'
  | 'draw_performed'
  | 'next_drawer'
  | 'game_complete'
  | 'game_restarted'
  | 'player_left'
  | 'player_disconnected'
  | 'player_reconnected'
  | 'player_converted_to_spectator'
  | 'room_disbanded'
  | 'chat_message'
  | 'error'
  | 'reconnect_success'
  | 'reconnect_token'

// ==================== 訊息 Payload 類型 ====================

export interface CreateRoomPayload {
  hostName: string
  settings?: Partial<RoomSettings>
}

export interface JoinRoomPayload {
  roomId: string
  playerName: string
  asSpectator?: boolean
}

export interface ReconnectPayload {
  roomId: string
  reconnectToken: string
}

export interface UpdateSettingsPayload {
  settings: Partial<RoomSettings>
}

export interface PerformDrawPayload {
  participantId?: number
}

export interface ChatMessagePayload {
  message: string
}

// ==================== 斷線重連 ====================
export interface ReconnectInfo {
  roomId: string
  odId: string
  reconnectToken: string
  playerName: string
  expiresAt: number
}
