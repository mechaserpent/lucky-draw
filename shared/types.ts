/**
 * 共用類型定義 - 前後端共用 (v0.9.0 Server-hosted)
 */

// ==================== 房間設定 ====================
export interface RoomSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  drawMode: "chain" | "random";
  firstDrawerMode: "random" | "manual"; // v0.9.0: 移除 'host' 選項
  firstDrawerId?: number;
}

// ==================== 玩家 ====================
export interface RoomPlayer {
  id: string;
  name: string;
  participantId: number;
  role: "player" | "spectator";
  isCreator: boolean; // v0.9.0: 房間創建者標記（無特殊權限）
  isHost: boolean; // 當前主持人標記（有管理權限，可轉移）
  isReady: boolean;
  isConnected: boolean;
  isVirtual: boolean;
}

// ==================== 抽獎結果 ====================
export interface DrawResult {
  order: number;
  drawerId: number; // participantId
  giftOwnerId: number; // participantId
  // Server-enriched display / state fields
  isRevealed?: boolean;
  performedAt?: number | null;
  drawerName?: string | null;
  giftOwnerName?: string | null;
}

// ==================== 房間狀態 ====================
export interface RoomState {
  id: string;
  creatorId: string; // v0.9.0: 房間創建者 ID（僅用於識別）
  hostId: string; // 當前主持人 ID（有管理權限）
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  gameState: "waiting" | "preflight" | "playing" | "complete"; // v0.10: 添加 preflight 準備階段
  settings: RoomSettings;
  seed: number;
  drawSequence: Record<number, number>;
  drawOrder: number[];
  currentIndex: number;
  results: DrawResult[];
  serverHosted: boolean; // v0.9.0: 是否為伺服器託管模式

  // Derived SSOT fields (server authoritative)
  totalCount?: number;
  revealedCount?: number;
  remainingPlayers?: number[]; // list of participantIds not yet drawn
  remainingPlayersCount?: number;
  remainingGifts?: number[]; // list of participantIds not yet assigned as gifts
  remainingGiftsCount?: number;
  progress?: { revealed: number; total: number };
  currentDrawerId?: number;
  isDrawInProgress?: boolean;
  lastResultTimestamp?: number | null;

  // backward-compatible aliases (deprecated)
  lastResultAt?: number | null;
}

// ==================== WebSocket 訊息 ====================
export interface WSMessage {
  type: string;
  payload?: any;
}

// 客戶端 -> 伺服器
export type ClientMessageType =
  | "create_room"
  | "join_room"
  | "join_as_spectator"
  | "leave_room"
  | "reconnect"
  | "host_add_player"
  | "set_ready"
  | "update_settings"
  | "start_game"
  | "preflight_ready" // v0.10: preflight 準備完成信號
  | "perform_draw"
  | "host_perform_draw"
  | "next_drawer"
  | "restart_game"
  | "convert_to_spectator"
  | "send_chat";

// 伺服器 -> 客戶端
export type ServerMessageType =
  | "connected"
  | "room_created"
  | "room_joined"
  | "room_updated"
  | "settings_updated"
  | "preflight_start" // v0.10: preflight 階段開始（房主已啟動）
  | "game_started"
  | "draw_performed"
  | "result_revealed"
  | "next_drawer"
  | "game_complete"
  | "game_restarted"
  | "player_left"
  | "player_disconnected"
  | "player_reconnected"
  | "player_converted_to_spectator"
  | "room_disbanded"
  | "chat_message"
  | "error"
  | "reconnect_success"
  | "reconnect_token";

// ==================== 訊息 Payload 類型 ====================

export interface CreateRoomPayload {
  hostName: string;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  asSpectator?: boolean;
}

export interface ReconnectPayload {
  roomId: string;
  reconnectToken: string;
}

export interface UpdateSettingsPayload {
  settings: Partial<RoomSettings>;
}

export interface PerformDrawPayload {
  participantId?: number;
}

export interface ChatMessagePayload {
  message: string;
}

// ==================== 斷線重連 ====================
export interface ReconnectInfo {
  roomId: string;
  odId: string;
  reconnectToken: string;
  playerName: string;
  expiresAt: number;
}
