/**
 * WebSocket 連線管理 - 支援新功能 (v0.9.0 Server-hosted)
 *
 * 功能：
 * - 房間管理
 * - 觀眾模式
 * - 斷線重連
 * - 抽獎設定
 * - Server-hosted 模式：伺服器控制房間，所有玩家均為參與者
 */

import type {
  RoomState,
  RoomPlayer,
  RoomSettings,
  DrawResult,
  ReconnectInfo,
} from "../../shared/types";

export type { RoomState, RoomPlayer, RoomSettings, DrawResult };

export interface WSMessage {
  type: string;
  payload?: any;
}

// 重連資訊儲存 key
const RECONNECT_STORAGE_KEY = "lucky-draw-reconnect";

// 禁用自動重連標誌（用於 URL 加入房間時）
let skipAutoReconnect = false;

export function useWebSocket() {
  const ws = useState<WebSocket | null>("ws", () => null);
  const isConnected = useState("wsConnected", () => false);
  const playerId = useState("playerId", () => "");
  const roomState = useState<RoomState | null>("roomState", () => null);
  const myRole = useState<"player" | "spectator">("myRole", () => "player");
  const error = useState<string | null>("wsError", () => null);

  // 事件處理器（使用 useState 確保跨組件共享）
  const eventHandlers = useState<Map<string, Function[]>>(
    "wsEventHandlers",
    () => new Map(),
  );

  function on(event: string, handler: Function) {
    if (!eventHandlers.value.has(event)) {
      eventHandlers.value.set(event, []);
    }
    eventHandlers.value.get(event)!.push(handler);
  }

  function off(event: string, handler?: Function) {
    if (!handler) {
      eventHandlers.value.delete(event);
    } else {
      const handlers = eventHandlers.value.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx > -1) handlers.splice(idx, 1);
      }
    }
  }

  function emit(event: string, data?: any) {
    const handlers = eventHandlers.value.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.value = new WebSocket(wsUrl);

    ws.value.onopen = () => {
      isConnected.value = true;
      error.value = null;
      console.log("WebSocket connected");

      // 嘗試自動重連
      tryAutoReconnect();
    };

    ws.value.onclose = () => {
      isConnected.value = false;
      console.log("WebSocket disconnected");
    };

    ws.value.onerror = (e) => {
      error.value = "連線錯誤";
      console.error("WebSocket error:", e);
    };

    ws.value.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };
  }

  function disconnect() {
    ws.value?.close();
    ws.value = null;
    isConnected.value = false;
    roomState.value = null;
  }

  function send(msg: WSMessage) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg));
    }
  }

  function saveReconnectInfo(info: ReconnectInfo) {
    try {
      localStorage.setItem(RECONNECT_STORAGE_KEY, JSON.stringify(info));
      console.log("[Reconnect] Info saved:", {
        roomId: info.roomId,
        playerId: info.playerId,
        expiresAt: new Date(info.expiresAt).toLocaleString(),
      });
    } catch (e) {
      console.error("Failed to save reconnect info:", e);
    }
  }

  function getReconnectInfo(): ReconnectInfo | null {
    try {
      const data = localStorage.getItem(RECONNECT_STORAGE_KEY);
      if (!data) {
        console.log("[Reconnect] No saved info found");
        return null;
      }

      const info: ReconnectInfo = JSON.parse(data);

      // 檢查是否過期（2 小時）
      if (info.expiresAt < Date.now()) {
        console.log(
          "[Reconnect] Info expired:",
          new Date(info.expiresAt).toLocaleString(),
        );
        clearReconnectInfo();
        return null;
      }

      console.log("[Reconnect] Valid info found:", {
        roomId: info.roomId,
        playerId: info.playerId,
        remainingTime:
          Math.round((info.expiresAt - Date.now()) / 1000 / 60) + " minutes",
      });

      return info;
    } catch (e) {
      console.error("[Reconnect] Failed to get info:", e);
      return null;
    }
  }

  function clearReconnectInfo() {
    try {
      localStorage.removeItem(RECONNECT_STORAGE_KEY);
      console.log("[Reconnect] Info cleared");
    } catch (e) {
      console.error("Failed to clear reconnect info:", e);
    }
  }

  /**
   * 設置跳過自動重連標誌
   * 用於 URL 加入房間時禁用自動重連
   */
  function setSkipAutoReconnect(skip: boolean) {
    skipAutoReconnect = skip;
  }

  /**
   * 嘗試自動重連到房間
   * 在 WebSocket 連線建立後自動調用
   */
  function tryAutoReconnect() {
    // 如果設置了跳過標誌，則不自動重連
    if (skipAutoReconnect) {
      console.log("[Reconnect] Skipping auto-reconnect (flag set)");
      skipAutoReconnect = false; // 重置標誌
      return;
    }

    // 使用 useDeviceId 的重連資訊
    const { getReconnectInfo: getDeviceReconnectInfo } = useDeviceId();
    const info = getDeviceReconnectInfo();

    if (!info) {
      console.log("[Reconnect] No reconnect info available");
      return;
    }

    // 檢查 token 是否過期
    if (info.expiresAt < Date.now()) {
      console.log("[Reconnect] Token expired");
      const { clearReconnectInfo: clearDeviceReconnectInfo } = useDeviceId();
      clearDeviceReconnectInfo();
      return;
    }

    console.log("[Reconnect] Attempting auto-reconnect...", {
      roomId: info.roomId,
      playerId: info.playerId,
      playerName: info.playerName,
    });

    // 發送重連請求
    send({
      type: "reconnect",
      payload: {
        roomId: info.roomId,
        reconnectToken: info.reconnectToken,
      },
    });

    // 設定超時檢測（5秒內沒有收到回應視為失敗）
    setTimeout(() => {
      if (!roomState.value) {
        console.log("[Reconnect] Timeout - no response from server");
        emit("reconnectFailed", "重連超時，請重新加入房間");
      }
    }, 5000);
  }

  /**
   * 手動觸發重連
   * 用於使用者主動嘗試重連的情況
   */
  function manualReconnect() {
    console.log("[Reconnect] Manual reconnect triggered");

    if (!isConnected.value) {
      console.log("[Reconnect] Not connected, establishing connection first");
      connect();
      // 連線建立後會自動觸發 tryAutoReconnect
      return;
    }

    tryAutoReconnect();
  }

  function handleMessage(msg: WSMessage) {
    console.log("WS Message:", msg.type, msg.payload);

    switch (msg.type) {
      case "connected":
        playerId.value = msg.payload.playerId || msg.payload.odId;
        break;

      case "reconnect_token":
        // 儲存重連資訊（使用 useDeviceId）
        if (msg.payload.roomId && msg.payload.reconnectToken) {
          const { saveReconnectInfo: saveDeviceReconnectInfo } = useDeviceId();
          const player =
            roomState.value?.players.find((p) => p.id === msg.payload.odId) ||
            roomState.value?.spectators.find((s) => s.id === msg.payload.odId);

          saveDeviceReconnectInfo({
            roomId: msg.payload.roomId,
            playerId: msg.payload.odId,
            playerName: player?.name || "",
            reconnectToken: msg.payload.reconnectToken,
            expiresAt: msg.payload.expiresAt || Date.now() + 2 * 60 * 60 * 1000,
          });
        }
        break;

      case "room_created":
      case "room_joined":
        roomState.value = msg.payload.room;
        if (msg.payload.role) {
          myRole.value = msg.payload.role;
        }
        emit("roomJoined", roomState.value);
        emit("roomUpdated", roomState.value); // 同時觸發 roomUpdated 確保相容性
        break;

      case "reconnect_success":
        roomState.value = msg.payload.room;
        const reconnectedPlayer = msg.payload.player;
        myRole.value = reconnectedPlayer?.role || "player";
        playerId.value = reconnectedPlayer.id;
        console.log("[Reconnect] Success!", {
          roomId: roomState.value.id,
          playerId: reconnectedPlayer.id,
          playerName: reconnectedPlayer.name,
          role: myRole.value,
          isHost: reconnectedPlayer.isHost,
        });
        emit("reconnectSuccess", {
          room: roomState.value,
          player: reconnectedPlayer,
        });
        emit("roomUpdated", roomState.value); // 觸發 roomUpdated 確保 UI 更新
        break;

      case "reconnect_failed":
        console.log("[Reconnect] Failed:", msg.payload.message);
        // 清除過期的重連資訊
        const { clearReconnectInfo: clearDeviceReconnectInfo } = useDeviceId();
        clearDeviceReconnectInfo();
        emit("reconnectFailed", msg.payload.message);
        break;

      case "room_updated":
      case "settings_updated":
        roomState.value = msg.payload.room;
        emit("roomUpdated", roomState.value);
        break;

      case "game_started":
        roomState.value = msg.payload.room;
        emit("gameStarted", roomState.value);
        break;

      case "draw_performed":
        roomState.value = msg.payload.room;
        emit("drawPerformed", msg.payload.result);
        break;

      case "next_drawer":
        roomState.value = msg.payload.room;
        emit("nextDrawer", roomState.value);
        break;

      case "game_complete":
        roomState.value = msg.payload.room;
        // 遊戲完成後清除重連資訊，避免返回首頁時觸發自動重連
        clearReconnectInfo();
        const { clearReconnectInfo: clearDeviceReconnectInfoComplete } =
          useDeviceId();
        clearDeviceReconnectInfoComplete();
        console.log("[Game Complete] Reconnect info cleared");
        emit("gameComplete", roomState.value);
        break;

      case "game_restarted":
        roomState.value = msg.payload.room;
        emit("gameRestarted", roomState.value);
        break;

      case "room_disbanded":
        roomState.value = null;
        // 清除所有重連資訊
        clearReconnectInfo();
        const { clearReconnectInfo: clearDeviceReconnectInfo2 } = useDeviceId();
        clearDeviceReconnectInfo2();
        console.log("[Room] Disbanded - reconnect info cleared");
        emit("roomDisbanded", msg.payload.message);
        break;

      case "player_left":
        roomState.value = msg.payload.room;
        emit("playerLeft", msg.payload.playerId || msg.payload.odId);
        break;

      case "player_disconnected":
        roomState.value = msg.payload.room;
        emit("playerDisconnected", {
          playerId: msg.payload.odId,
          isHost: msg.payload.isHost,
          hostTransferred: msg.payload.hostTransferred,
          newHostId: msg.payload.newHostId,
        });
        break;

      case "player_reconnected":
        roomState.value = msg.payload.room;
        emit("playerReconnected", {
          playerId: msg.payload.odId,
          playerName: msg.payload.playerName,
        });
        break;

      case "player_converted_to_spectator":
        roomState.value = msg.payload.room;
        if (msg.payload.odId === playerId.value) {
          myRole.value = "spectator";
        }
        emit("playerConvertedToSpectator", msg.payload.odId);
        break;

      case "state_synced":
        // 伺服器回傳最新狀態
        console.log("[Sync] State synced from server", {
          timestamp: msg.payload.timestamp,
          gameState: msg.payload.room?.gameState,
          currentIndex: msg.payload.room?.currentIndex,
          results: msg.payload.room?.results?.length,
        });
        roomState.value = msg.payload.room;
        emit("stateSynced", msg.payload.room);
        break;

      case "heartbeat_ack":
        // 心跳回應
        console.log(
          "[Heartbeat] Server responded at",
          new Date(msg.payload.timestamp).toLocaleTimeString(),
        );
        break;

      case "preflight_response":
        // Pre-flight 測試回應
        console.log("[Preflight] Server responded", {
          testId: msg.payload.testId,
          latency: Date.now() - (msg.payload.timestamp || 0),
          serverId: msg.payload.serverId,
        });
        emit("preflightResponse", msg.payload);
        break;

      case "preflight_broadcast":
        // 其他玩家的 preflight 測試廣播
        console.log("[Preflight] Broadcast from", msg.payload.fromOdId);
        emit("preflightBroadcast", msg.payload);
        break;

      case "state_validated":
        // 狀態驗證結果
        console.log("[Validate] State validation result", {
          isValid: msg.payload.isValid,
          validation: msg.payload.validation,
        });

        if (!msg.payload.isValid) {
          console.warn(
            "[Validate] State mismatch detected, correcting...",
            msg.payload.validation,
          );
          // 自動更正為伺服器狀態
          roomState.value = msg.payload.correctState;
        }

        emit("stateValidated", msg.payload);
        break;

      case "error":
        error.value = msg.payload.message;
        emit("error", msg.payload.message);
        break;
    }
  }

  function createRoom(hostName: string, settings: Partial<RoomSettings> = {}) {
    const { getDeviceId, clearReconnectInfo: clearDeviceReconnectInfo } =
      useDeviceId();
    const deviceId = getDeviceId();

    // 清除舊的重連資訊，避免與自動重連衝突
    clearDeviceReconnectInfo();

    send({
      type: "create_room",
      payload: { hostName, settings, deviceId },
    });
  }

  function joinRoom(
    roomId: string,
    playerName: string,
    asSpectator: boolean = false,
  ) {
    const { getDeviceId, clearReconnectInfo: clearDeviceReconnectInfo } =
      useDeviceId();
    const deviceId = getDeviceId();

    // 清除舊的重連資訊，避免與自動重連衝突
    clearDeviceReconnectInfo();

    send({
      type: "join_room",
      payload: { roomId, playerName, asSpectator, deviceId },
    });
  }

  function leaveRoom() {
    send({ type: "leave_room" });
    roomState.value = null;
    clearReconnectInfo();
  }

  function reconnect(roomId: string, reconnectToken: string) {
    send({
      type: "reconnect",
      payload: { roomId, reconnectToken },
    });
  }

  // ==================== 設定操作 ====================

  function updateSettings(settings: Partial<RoomSettings>) {
    send({
      type: "update_settings",
      payload: { settings },
    });
  }

  function setReady(ready: boolean) {
    send({
      type: "set_ready",
      payload: { ready },
    });
  }

  function renamePlayer(newName: string) {
    send({
      type: "rename_player",
      payload: { newName },
    });
  }

  function convertToSpectator(targetPlayerId?: string) {
    send({
      type: "convert_to_spectator",
      payload: { targetPlayerId: targetPlayerId || playerId.value },
    });
  }

  // ==================== 遊戲操作 ====================

  function startGame(seed?: number) {
    send({
      type: "start_game",
      payload: { seed },
    });
  }

  function performDraw() {
    send({ type: "perform_draw" });
  }

  function hostPerformDraw(participantId: number) {
    send({
      type: "host_perform_draw",
      payload: { participantId },
    });
  }

  function nextDrawer() {
    send({ type: "next_drawer" });
  }

  function restartGame() {
    send({ type: "restart_game" });
  }

  function hostAddPlayer(playerName: string) {
    send({
      type: "host_add_player",
      payload: { playerName },
    });
  }

  // ==================== 狀態同步 ====================

  /**
   * 請求伺服器同步最新狀態
   */
  function syncState() {
    send({ type: "sync_state" });
  }

  /**
   * 發送心跳包
   */
  function sendHeartbeat() {
    send({ type: "heartbeat" });
  }

  /**
   * Pre-flight 連線測試
   */
  function preflightTest(testId: string) {
    send({
      type: "preflight_test",
      payload: { testId },
    });
  }

  /**
   * 驗證本地狀態與伺服器是否一致
   */
  function validateState() {
    if (!roomState.value) {
      console.warn("[Validate] No room state to validate");
      return;
    }

    send({
      type: "validate_state",
      payload: {
        state: {
          gameState: roomState.value.gameState,
          currentIndex: roomState.value.currentIndex,
          results: roomState.value.results,
          players: roomState.value.players,
        },
      },
    });
  }

  function getCurrentPlayer(): RoomPlayer | null {
    if (!roomState.value || !playerId.value) return null;
    return (
      [...roomState.value.players, ...roomState.value.spectators].find(
        (p) => p.id === playerId.value,
      ) || null
    );
  }

  function isCurrentDrawer(): boolean {
    if (!roomState.value || !playerId.value) return false;
    const currentDrawerId =
      roomState.value.drawOrder[roomState.value.currentIndex];
    const player = roomState.value.players.find((p) => p.id === playerId.value);
    return player?.participantId === currentDrawerId;
  }

  function isHost(): boolean {
    return getCurrentPlayer()?.isHost ?? false;
  }

  // v0.9.0: 檢查是否為房間創建者
  function isCreator(): boolean {
    return getCurrentPlayer()?.isCreator ?? false;
  }

  function isSpectator(): boolean {
    return myRole.value === "spectator";
  }

  function getPlayerName(participantId: number): string {
    if (!roomState.value) return "?";
    const player = roomState.value.players.find(
      (p) => p.participantId === participantId,
    );
    return player?.name || "?";
  }

  function hasReconnectInfo(): boolean {
    const { getReconnectInfo: getDeviceReconnectInfo } = useDeviceId();
    return getDeviceReconnectInfo() !== null;
  }

  return {
    // 狀態
    ws,
    isConnected,
    playerId,
    roomState,
    myRole,
    error,

    // 連線管理
    connect,
    disconnect,
    send,
    on,
    off,

    // 重連管理
    hasReconnectInfo,
    getReconnectInfo,
    clearReconnectInfo,
    tryAutoReconnect,
    manualReconnect,
    setSkipAutoReconnect,

    // 房間操作
    createRoom,
    joinRoom,
    leaveRoom,

    // 設定操作
    updateSettings,
    setReady,
    renamePlayer,
    convertToSpectator,

    // 遊戲操作
    startGame,
    performDraw,
    hostPerformDraw,
    nextDrawer,
    restartGame,
    hostAddPlayer,

    // 狀態同步
    syncState,
    sendHeartbeat,
    preflightTest,
    validateState,

    // 工具函數
    getCurrentPlayer,
    isCurrentDrawer,
    isHost,
    isCreator, // v0.9.0: 添加創建者檢查
    isSpectator,
    getPlayerName,
  };
}
