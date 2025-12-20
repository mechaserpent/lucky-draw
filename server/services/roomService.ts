/**
 * WebSocket 路由處理 (v0.9.0 Server-hosted)
 *
 * 支援功能：
 * - 房間管理（建立、加入、離開）
 * - 觀眾模式
 * - 斷線重連
 * - 抽獎設定與執行
 * - Server-hosted 模式：伺服器控制房間，所有玩家均為參與者
 */

import { db, schema, initDatabase } from "../database";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { measurePerformance } from "../utils/performance-monitor";

initDatabase();

export interface RoomSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  drawMode: "chain" | "random";
  firstDrawerMode: "random" | "manual"; // v0.9.0: 移除 'host' 選項
  firstDrawerId?: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  participantId: number;
  role: "player" | "spectator";
  isCreator: boolean; // v0.9.0: 房間創建者標記
  isHost: boolean; // 當前主持人標記
  isReady: boolean;
  isConnected: boolean;
  isVirtual: boolean;
}

export interface DrawResult {
  order: number;
  drawerId: number;
  giftOwnerId: number;
}

export interface Room {
  id: string;
  creatorId: string; // v0.9.0: 房間創建者 ID
  hostId: string; // 當前主持人 ID
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  gameState: "waiting" | "preflight" | "playing" | "complete";
  settings: RoomSettings;
  seed: number;
  drawSequence: Record<number, number>;
  drawOrder: number[];
  currentIndex: number;
  results: DrawResult[];
  serverHosted: boolean; // v0.9.0: 是否為伺服器託管模式

  // Derived fields (optional, server may attach)
  totalCount?: number;
  revealedCount?: number;
  remainingPlayers?: number[];
  remainingPlayersCount?: number;
  remainingGifts?: number[];
  remainingGiftsCount?: number;
  progress?: { revealed: number; total: number };
  currentDrawerId?: number;
  isDrawInProgress?: boolean;
  lastResultTimestamp?: number | null;
  lastResultAt?: number | null;
}

// ==================== 工具函數 ====================

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function generateReconnectToken(): string {
  return randomBytes(16).toString("hex");
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDrawSequence(
  playerIds: number[],
  seed: number,
): Record<number, number> | null {
  const random = mulberry32(seed);
  const ids = [...playerIds];

  let result: Record<number, number> = {};
  let attempts = 0;
  const maxAttempts = 10000;

  while (attempts < maxAttempts) {
    attempts++;
    result = {};

    let availableGifts = [...ids];
    let success = true;

    for (let i = availableGifts.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [availableGifts[i], availableGifts[j]] = [
        availableGifts[j],
        availableGifts[i],
      ];
    }

    for (let i = 0; i < ids.length; i++) {
      const drawerId = ids[i];
      const giftOwnerId = availableGifts[i];

      if (drawerId === giftOwnerId) {
        success = false;
        break;
      }
      result[drawerId] = giftOwnerId;
    }

    if (success && ids.every((id) => result[id] !== id)) {
      return result;
    }
  }

  return null;
}

// ==================== 資料庫操作 ====================

// 從資料庫載入房間完整狀態
export async function loadRoomFromDb(roomId: string): Promise<Room | null> {
  return measurePerformance(
    `loadRoomFromDb(${roomId})`,
    async () => {
      const roomData = await db.query.rooms.findFirst({
        where: eq(schema.rooms.id, roomId),
      });

      if (!roomData) return null;

      return _loadRoomFromDbInternal(roomId, roomData);
    },
    "database",
    { roomId },
  );
}

// 內部實現
async function _loadRoomFromDbInternal(
  roomId: string,
  roomData: any,
): Promise<Room | null> {
  // 載入玩家
  const playersData = await db.query.players.findMany({
    where: eq(schema.players.roomId, roomId),
  });

  // 載入抽獎序列
  const sequencesData = await db.query.drawSequences.findMany({
    where: eq(schema.drawSequences.roomId, roomId),
  });

  // 載入抽獎順序
  const ordersData = await db.query.drawOrders.findMany({
    where: eq(schema.drawOrders.roomId, roomId),
    orderBy: [schema.drawOrders.orderIndex],
  });

  // 載入抽獎結果
  const resultsData = await db.query.drawResults.findMany({
    where: eq(schema.drawResults.roomId, roomId),
    orderBy: [schema.drawResults.order],
  });

  // 轉換為 Room 格式
  const players: RoomPlayer[] = playersData
    .filter((p) => p.role === "player")
    .map((p) => ({
      id: p.playerId,
      name: p.name,
      participantId: p.participantId,
      role: p.role as "player" | "spectator",
      isCreator: !!(p as any).isCreator, // v0.9.0: 添加創建者標記
      isHost: !!p.isHost,
      isReady: !!p.isReady,
      isConnected: !!p.isConnected,
      isVirtual: !!p.isVirtual,
    }));

  const spectators: RoomPlayer[] = playersData
    .filter((p) => p.role === "spectator")
    .map((p) => ({
      id: p.playerId,
      name: p.name,
      participantId: p.participantId,
      role: p.role as "player" | "spectator",
      isCreator: !!(p as any).isCreator, // v0.9.0: 添加創建者標記
      isHost: !!p.isHost,
      isReady: !!p.isReady,
      isConnected: !!p.isConnected,
      isVirtual: !!p.isVirtual,
    }));

  const drawSequence: Record<number, number> = {};
  sequencesData.forEach((s) => {
    drawSequence[s.drawerId] = s.giftOwnerId;
  });

  const drawOrder = ordersData.map((o) => o.participantId);

  const results: DrawResult[] = resultsData.map((r) => ({
    order: r.order,
    drawerId: r.drawerId,
    giftOwnerId: r.giftOwnerId,
    isRevealed: !!r.isRevealed,
    performedAt: r.performedAt,
  }));

  // v0.9.0: 處理 firstDrawerMode 向後兼容（將 'host' 轉換為 'random'）
  let firstDrawerMode = roomData.firstDrawerMode as "random" | "manual";
  if ((roomData.firstDrawerMode as string) === "host") {
    firstDrawerMode = "random";
  }

  const totalCount = players.length;
  const revealedCount = results.filter((r: any) => !!r.isRevealed).length;
  // remainingPlayers: list of participantIds who haven't drawn yet
  const drawnSet = new Set(results.map((r: any) => r.drawerId));
  const remainingPlayers = drawOrder.filter((pid) => !drawnSet.has(pid));
  const remainingPlayersCount = remainingPlayers.length;
  // remainingGifts: participantIds not yet assigned as gift owners
  const assignedGiftsSet = new Set(results.map((r: any) => r.giftOwnerId));
  const remainingGifts = players
    .map((p) => p.participantId)
    .filter((pid) => !assignedGiftsSet.has(pid));
  const remainingGiftsCount = remainingGifts.length;
  const progress = { revealed: revealedCount, total: totalCount };
  const currentDrawerId = drawOrder[roomData.currentIndex];
  const isDrawInProgress = false; // server-side flag can be set by other flows if needed
  const lastResultTimestamp =
    results.reduce(
      (acc, r: any) =>
        r.performedAt ? Math.max(acc, Number(r.performedAt)) : acc,
      0,
    ) || null;

  return {
    id: roomData.id,
    creatorId: (roomData as any).creatorId || roomData.hostId, // v0.9.0: 添加創建者 ID
    hostId: roomData.hostId,
    players,
    spectators,
    gameState: roomData.gameState as
      | "waiting"
      | "preflight"
      | "playing"
      | "complete",
    settings: {
      maxPlayers: roomData.maxPlayers,
      allowSpectators: !!roomData.allowSpectators,
      drawMode: roomData.drawMode as "chain" | "random",
      firstDrawerMode,
      firstDrawerId: roomData.firstDrawerId ?? undefined,
    },
    seed: roomData.seed,
    drawSequence,
    drawOrder,
    currentIndex: roomData.currentIndex,
    results,
    serverHosted: (roomData as any).serverHosted !== false, // v0.9.0: 默認為 true

    // Derived SSOT fields
    totalCount,
    revealedCount,
    remainingPlayers,
    remainingPlayersCount,
    remainingGifts,
    remainingGiftsCount,
    progress,
    currentDrawerId,
    isDrawInProgress,
    lastResultTimestamp,

    // Backward-compat alias
    lastResultAt: lastResultTimestamp,
  };
}

// 儲存房間狀態到資料庫
export async function saveRoomToDb(room: Room): Promise<void> {
  return measurePerformance(
    `saveRoomToDb(${room.id})`,
    async () => _saveRoomToDbInternal(room),
    "database",
    { roomId: room.id, gameState: room.gameState },
  );
}

async function _saveRoomToDbInternal(room: Room): Promise<void> {
  const now = new Date();

  // 更新房間基本資訊
  await db
    .update(schema.rooms)
    .set({
      gameState: room.gameState,
      seed: room.seed,
      currentIndex: room.currentIndex,
      maxPlayers: room.settings.maxPlayers,
      allowSpectators: room.settings.allowSpectators,
      drawMode: room.settings.drawMode,
      firstDrawerMode: room.settings.firstDrawerMode,
      firstDrawerId: room.settings.firstDrawerId ?? null,
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(schema.rooms.id, room.id));
}

// ==================== 房間操作 ====================

export async function createRoom(
  creatorId: string,
  creatorName: string,
  settings: Partial<RoomSettings> = {},
  deviceId?: string,
): Promise<Room> {
  let roomId: string;
  do {
    roomId = generateRoomId();
  } while (await loadRoomFromDb(roomId));

  const now = new Date();
  const seed = Date.now();
  const reconnectToken = generateReconnectToken();
  const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2小時後過期

  // v0.9.0: 處理 firstDrawerMode 向後兼容（將 'host' 轉換為 'random'）
  let firstDrawerMode = settings.firstDrawerMode ?? "random";
  if ((firstDrawerMode as string) === "host") {
    firstDrawerMode = "random";
  }

  const roomSettings: RoomSettings = {
    maxPlayers: settings.maxPlayers ?? 20,
    allowSpectators: settings.allowSpectators ?? true,
    drawMode: settings.drawMode ?? "chain",
    firstDrawerMode,
    firstDrawerId: settings.firstDrawerId,
  };

  // 建立房間（v0.9.0: 創建者同時也是初始主持人）
  await db.insert(schema.rooms).values({
    id: roomId,
    creatorId, // v0.9.0: 記錄創建者
    hostId: creatorId, // 創建者初始為主持人
    maxPlayers: roomSettings.maxPlayers,
    allowSpectators: roomSettings.allowSpectators,
    drawMode: roomSettings.drawMode,
    firstDrawerMode: roomSettings.firstDrawerMode,
    firstDrawerId: roomSettings.firstDrawerId ?? null,
    gameState: "waiting",
    seed,
    currentIndex: 0,
    serverHosted: true, // v0.9.0: 默認為伺服器託管模式
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  } as any);

  // 建立創建者玩家（v0.9.0: 標記為創建者和主持人）
  await db.insert(schema.players).values({
    roomId,
    playerId: creatorId,
    name: creatorName,
    participantId: 1,
    role: "player",
    isCreator: true, // v0.9.0: 標記為創建者
    isHost: true, // 初始為主持人
    isReady: true,
    isConnected: true,
    isVirtual: false,
    deviceId: deviceId || null,
    reconnectToken,
    tokenExpiresAt,
    joinedAt: now,
  } as any);

  const room: Room = {
    id: roomId,
    creatorId, // v0.9.0: 添加創建者 ID
    hostId: creatorId,
    players: [
      {
        id: creatorId,
        name: creatorName,
        participantId: 1,
        role: "player",
        isCreator: true, // v0.9.0: 標記為創建者
        isHost: true,
        isReady: true,
        isConnected: true,
        isVirtual: false,
      },
    ],
    spectators: [],
    gameState: "waiting",
    settings: roomSettings,
    seed,
    drawSequence: {},
    drawOrder: [],
    currentIndex: 0,
    results: [],
    serverHosted: true, // v0.9.0: 默認為伺服器託管模式
  };

  return room;
}

export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string,
  asSpectator: boolean = false,
  deviceId?: string,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  // 檢查是否已在房間中
  const existingPlayer = [...room.players, ...room.spectators].find(
    (p) => p.id === playerId,
  );
  if (existingPlayer) {
    // 更新連線狀態
    await db
      .update(schema.players)
      .set({ isConnected: true, disconnectedAt: null })
      .where(
        and(
          eq(schema.players.roomId, roomId),
          eq(schema.players.playerId, playerId),
        ),
      );
    return loadRoomFromDb(roomId);
  }

  // 決定角色
  let role: "player" | "spectator" = "player";

  if (asSpectator) {
    if (!room.settings.allowSpectators) return null;
    role = "spectator";
  } else {
    // 遊戲進行中不允許加入（即使作為觀眾）
    if (room.gameState !== "waiting") {
      return null; // 返回 null 表示無法加入
    }
    // 玩家已滿，嘗試作為觀眾加入
    if (room.players.length >= room.settings.maxPlayers) {
      if (!room.settings.allowSpectators) return null;
      role = "spectator";
    }
  }

  const participantId =
    role === "player" ? room.players.length + 1 : -(room.spectators.length + 1); // 觀眾用負數 ID

  const reconnectToken = generateReconnectToken();
  const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2小時後過期

  // v0.9.0: 新加入的玩家不是創建者也不是主持人
  await db.insert(schema.players).values({
    roomId,
    playerId,
    name: playerName,
    participantId,
    role,
    isCreator: false, // v0.9.0: 新加入者不是創建者
    isHost: false,
    isReady: false,
    isConnected: true,
    isVirtual: false,
    deviceId: deviceId || null,
    reconnectToken,
    tokenExpiresAt,
    joinedAt: new Date(),
  } as any);

  // 更新房間活動時間
  await db
    .update(schema.rooms)
    .set({ lastActivityAt: new Date() })
    .where(eq(schema.rooms.id, roomId));

  return loadRoomFromDb(roomId);
}

export async function leaveRoom(
  roomId: string,
  playerId: string,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  const player = [...room.players, ...room.spectators].find(
    (p) => p.id === playerId,
  );
  if (!player) return room;

  // 如果是主機離開，解散房間
  if (player.isHost) {
    await db.delete(schema.rooms).where(eq(schema.rooms.id, roomId));
    return null;
  }

  // 移除玩家
  await db
    .delete(schema.players)
    .where(
      and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.playerId, playerId),
      ),
    );

  // 如果是玩家（非觀眾），重新分配 participantId
  if (player.role === "player") {
    const remainingPlayers = await db.query.players.findMany({
      where: and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.role, "player"),
      ),
      orderBy: [schema.players.participantId],
    });

    for (let i = 0; i < remainingPlayers.length; i++) {
      await db
        .update(schema.players)
        .set({ participantId: i + 1 })
        .where(eq(schema.players.id, remainingPlayers[i].id));
    }
  }

  return loadRoomFromDb(roomId);
}

// 玩家斷線處理
export async function handleDisconnect(
  roomId: string,
  playerId: string,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  const player = [...room.players, ...room.spectators].find(
    (p) => p.id === playerId,
  );
  if (!player) return room;

  // 更新斷線狀態
  await db
    .update(schema.players)
    .set({
      isConnected: false,
      disconnectedAt: new Date(),
    })
    .where(
      and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.playerId, playerId),
      ),
    );

  // 檢查房間是否還有連線的玩家
  const connectedPlayers = room.players.filter(
    (p) => p.id !== playerId && p.isConnected,
  );
  const connectedSpectators = room.spectators.filter(
    (p) => p.id !== playerId && p.isConnected,
  );

  // 如果沒有任何連線的人，標記為待清理（讓定期清理任務處理）
  // 不立即刪除，給予玩家重連的機會
  if (connectedPlayers.length === 0 && connectedSpectators.length === 0) {
    console.log(
      `[Room] No connected players in room ${roomId}, marking for cleanup (not deleting immediately)`,
    );
    // 更新 lastActivityAt，讓清理任務根據時間決定是否刪除
    await db
      .update(schema.rooms)
      .set({ lastActivityAt: new Date() })
      .where(eq(schema.rooms.id, roomId));
    return await loadRoomFromDb(roomId);
  }

  // 如果是主機斷線，將主機權限移交給下一位玩家
  if (player.isHost) {
    if (connectedPlayers.length > 0) {
      // 移交主機權限給第一位在線玩家
      const newHost = connectedPlayers[0];

      // 移除舊主機的主機身份
      await db
        .update(schema.players)
        .set({ isHost: false })
        .where(
          and(
            eq(schema.players.roomId, roomId),
            eq(schema.players.playerId, playerId),
          ),
        );

      // 設定新主機
      await db
        .update(schema.players)
        .set({ isHost: true })
        .where(
          and(
            eq(schema.players.roomId, roomId),
            eq(schema.players.playerId, newHost.id),
          ),
        );

      // 更新房間的 hostId
      await db
        .update(schema.rooms)
        .set({
          hostId: newHost.id,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        })
        .where(eq(schema.rooms.id, roomId));
    }
  }

  return loadRoomFromDb(roomId);
}

// 玩家重連
export async function handleReconnect(
  roomId: string,
  reconnectToken: string,
  newPlayerId: string,
): Promise<{ room: Room; player: RoomPlayer } | null> {
  // 透過 reconnectToken 找到玩家
  const playerData = await db.query.players.findFirst({
    where: and(
      eq(schema.players.roomId, roomId),
      eq(schema.players.reconnectToken, reconnectToken),
    ),
  });

  if (!playerData) {
    console.log(`[Reconnect] Player not found with token`);
    return null;
  }

  const oldPlayerId = playerData.playerId;

  // 更新玩家連線狀態和新的 playerId，保留原始角色和狀態
  await db
    .update(schema.players)
    .set({
      playerId: newPlayerId,
      isConnected: true,
      disconnectedAt: null,
    })
    .where(eq(schema.players.id, playerData.id));

  console.log(
    `[Reconnect] Player reconnected: ${oldPlayerId} -> ${newPlayerId}, role: ${playerData.role}, isCreator: ${playerData.isCreator}, isHost: ${playerData.isHost}`,
  );

  // 如果重連的是主持人，更新房間的 hostId
  if (playerData.isHost) {
    await db
      .update(schema.rooms)
      .set({
        hostId: newPlayerId,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(schema.rooms.id, roomId));
    console.log(
      `[Reconnect] Host reconnected, updated hostId from ${oldPlayerId} to ${newPlayerId}`,
    );
  }

  // 如果重連的是創建者，更新房間的 creatorId
  if (playerData.isCreator) {
    await db
      .update(schema.rooms)
      .set({
        creatorId: newPlayerId,
        updatedAt: new Date(),
      })
      .where(eq(schema.rooms.id, roomId));
    console.log(
      `[Reconnect] Creator reconnected, updated creatorId from ${oldPlayerId} to ${newPlayerId}`,
    );
  }

  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  const player = [...room.players, ...room.spectators].find(
    (p) => p.id === newPlayerId,
  );
  if (!player) return null;

  return { room, player };
}

// 將玩家轉為觀眾
export async function convertToSpectator(
  roomId: string,
  playerId: string,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;
  if (!room.settings.allowSpectators) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isHost) return null; // 主機不能轉為觀眾

  // 更新角色
  await db
    .update(schema.players)
    .set({
      role: "spectator",
      participantId: -(room.spectators.length + 1),
    })
    .where(
      and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.playerId, playerId),
      ),
    );

  // 重新分配玩家 participantId
  const remainingPlayers = await db.query.players.findMany({
    where: and(
      eq(schema.players.roomId, roomId),
      eq(schema.players.role, "player"),
    ),
    orderBy: [schema.players.participantId],
  });

  for (let i = 0; i < remainingPlayers.length; i++) {
    await db
      .update(schema.players)
      .set({ participantId: i + 1 })
      .where(eq(schema.players.id, remainingPlayers[i].id));
  }

  return loadRoomFromDb(roomId);
}

// ==================== 遊戲操作 ====================

export async function updateRoomSettings(
  roomId: string,
  hostId: string,
  settings: Partial<RoomSettings>,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;
  if (room.hostId !== hostId) return null;
  if (room.gameState !== "waiting") return null;

  // 驗證設定
  if (settings.maxPlayers !== undefined) {
    if (settings.maxPlayers < room.players.length) return null;
    if (settings.maxPlayers < 2 || settings.maxPlayers > 100) return null;
  }

  await db
    .update(schema.rooms)
    .set({
      maxPlayers: settings.maxPlayers ?? room.settings.maxPlayers,
      allowSpectators:
        settings.allowSpectators ?? room.settings.allowSpectators,
      drawMode: settings.drawMode ?? room.settings.drawMode,
      firstDrawerMode:
        settings.firstDrawerMode ?? room.settings.firstDrawerMode,
      firstDrawerId:
        settings.firstDrawerId ?? room.settings.firstDrawerId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.rooms.id, roomId));

  return loadRoomFromDb(roomId);
}

export async function setReady(
  roomId: string,
  playerId: string,
  ready: boolean,
): Promise<Room | null> {
  await db
    .update(schema.players)
    .set({ isReady: ready })
    .where(
      and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.playerId, playerId),
      ),
    );

  return loadRoomFromDb(roomId);
}

export async function renamePlayer(
  roomId: string,
  playerId: string,
  newName: string,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  // 遊戲進行中不能改名
  if (room.gameState !== "waiting") return null;

  await db
    .update(schema.players)
    .set({ name: newName })
    .where(
      and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.playerId, playerId),
      ),
    );

  return loadRoomFromDb(roomId);
}

// v0.10: 更新房間遊戲狀態（用於 preflight 準備階段）
export async function updateGameState(
  roomId: string,
  newGameState: "waiting" | "preflight" | "playing" | "complete",
): Promise<Room | null> {
  const room = await db.query.rooms.findFirst({
    where: eq(schema.rooms.id, roomId),
  });

  if (!room) return null;

  // 更新資料庫中的 gameState（暫時轉換為相容格式）
  const dbGameState = newGameState === "preflight" ? "waiting" : newGameState;

  await db
    .update(schema.rooms)
    .set({ gameState: dbGameState as any })
    .where(eq(schema.rooms.id, roomId));

  // 載入更新後的房間並手動設置 gameState
  const updatedRoom = await loadRoomFromDb(roomId);
  if (updatedRoom) {
    // 直接修改 gameState 以支援 preflight
    (updatedRoom as any).gameState = newGameState;
  }

  return updatedRoom;
}

export async function startGame(
  roomId: string,
  seed?: number,
): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;
  if (room.players.length < 2) return null;

  const gameSeed = seed ?? Date.now();
  const playerIds = room.players.map((p) => p.participantId);
  const drawSequence = generateDrawSequence(playerIds, gameSeed);

  if (!drawSequence) return null;

  // 決定第一位抽獎者（v0.9.0: 移除 'host' 選項）
  const random = mulberry32(gameSeed);
  let firstDrawerId: number;

  switch (room.settings.firstDrawerMode) {
    case "manual":
      firstDrawerId = room.settings.firstDrawerId ?? playerIds[0];
      break;
    case "random":
    default:
      const startIdx = Math.floor(random() * room.players.length);
      firstDrawerId = room.players[startIdx].participantId;
      break;
  }

  // 建立抽獎順序
  let drawOrder: number[] = [];

  if (room.settings.drawMode === "chain") {
    // 連鎖式：A 抽到 B，B 下一個抽
    let currentId = firstDrawerId;
    const visited = new Set<number>();

    while (!visited.has(currentId) && drawOrder.length < room.players.length) {
      visited.add(currentId);
      drawOrder.push(currentId);
      currentId = drawSequence[currentId];
    }

    // 處理多個連通分量
    const remaining = playerIds.filter((id) => !visited.has(id));
    while (remaining.length > 0) {
      const nextStart = remaining.shift()!;
      let curr = nextStart;
      while (!visited.has(curr)) {
        visited.add(curr);
        drawOrder.push(curr);
        const idx = remaining.indexOf(drawSequence[curr]);
        if (idx > -1) remaining.splice(idx, 1);
        curr = drawSequence[curr];
      }
    }
  } else {
    // 隨機順序
    drawOrder = [...playerIds];
    for (let i = drawOrder.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [drawOrder[i], drawOrder[j]] = [drawOrder[j], drawOrder[i]];
    }
  }

  // 清除舊的抽獎資料
  await db
    .delete(schema.drawSequences)
    .where(eq(schema.drawSequences.roomId, roomId));
  await db
    .delete(schema.drawOrders)
    .where(eq(schema.drawOrders.roomId, roomId));
  await db
    .delete(schema.drawResults)
    .where(eq(schema.drawResults.roomId, roomId));

  // 儲存抽獎序列
  for (const [drawerId, giftOwnerId] of Object.entries(drawSequence)) {
    await db.insert(schema.drawSequences).values({
      roomId,
      drawerId: parseInt(drawerId),
      giftOwnerId,
    });
  }

  // 儲存抽獎順序
  for (let i = 0; i < drawOrder.length; i++) {
    await db.insert(schema.drawOrders).values({
      roomId,
      orderIndex: i,
      participantId: drawOrder[i],
    });
  }

  // 更新房間狀態
  await db
    .update(schema.rooms)
    .set({
      gameState: "playing",
      seed: gameSeed,
      currentIndex: 0,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(schema.rooms.id, roomId));

  // SSOT: 狀態轉換日誌
  console.log("[SSOT] State Transition:", {
    roomId,
    action: "START_GAME",
    from: { gameState: "waiting" },
    to: { gameState: "playing", currentIndex: 0 },
    seed: gameSeed,
    drawOrderLength: drawOrder.length,
    firstDrawer: firstDrawerId,
    timestamp: new Date().toISOString(),
  });

  return loadRoomFromDb(roomId);
}

export async function performDraw(
  roomId: string,
  participantId?: number,
): Promise<{ room: Room; result: DrawResult } | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;
  if (room.gameState !== "playing") return null;
  if (room.currentIndex >= room.drawOrder.length) return null;

  const currentDrawerId = room.drawOrder[room.currentIndex];

  if (participantId !== undefined && participantId !== currentDrawerId) {
    return null;
  }

  // 檢查是否已抽過
  const alreadyDrawn = room.results.some(
    (r) => r.order === room.currentIndex + 1,
  );
  if (alreadyDrawn) {
    const existingResult = room.results.find(
      (r) => r.order === room.currentIndex + 1,
    )!;
    return { room, result: existingResult };
  }

  const giftOwnerId = room.drawSequence[currentDrawerId];

  const result: DrawResult = {
    order: room.currentIndex + 1,
    drawerId: currentDrawerId,
    giftOwnerId,
  };

  // 儲存結果但先不揭曉（isRevealed=false），由任一客戶端在動畫完成後通知伺服器揭曉
  await db.insert(schema.drawResults).values({
    roomId,
    order: result.order,
    drawerId: result.drawerId,
    giftOwnerId: result.giftOwnerId,
    isRevealed: false,
    // DB requires non-null performed_at; set to now and server will update again at reveal if needed
    performedAt: new Date(),
  });

  await db
    .update(schema.rooms)
    .set({ lastActivityAt: new Date() })
    .where(eq(schema.rooms.id, roomId));

  // SSOT: 狀態轉換日誌
  console.log("[SSOT] State Transition:", {
    roomId,
    action: "PERFORM_DRAW",
    currentIndex: room.currentIndex,
    drawerId: result.drawerId,
    giftOwnerId: result.giftOwnerId,
    resultCount: room.results.length + 1,
    timestamp: new Date().toISOString(),
  });

  const updatedRoom = await loadRoomFromDb(roomId);

  // enrich returned result with isRevealed and performedAt (SSOT)
  const lastResult = updatedRoom?.results?.[updatedRoom.results.length - 1];
  const returnedResult = {
    order: result.order,
    drawerId: result.drawerId,
    giftOwnerId: result.giftOwnerId,
    isRevealed: !!(lastResult as any)?.isRevealed,
    performedAt: (lastResult as any)?.performedAt || new Date(),
  };

  return updatedRoom
    ? { room: updatedRoom, result: returnedResult as DrawResult }
    : null;
}

export async function revealResult(
  roomId: string,
  order: number,
): Promise<{ room: Room; result: DrawResult } | null> {
  // Ensure result exists
  const existing = await db.query.drawResults.findFirst({
    where: and(
      eq(schema.drawResults.roomId, roomId),
      eq(schema.drawResults.order, order),
    ),
  });
  if (!existing) return null;

  if (!existing.isRevealed) {
    // mark as revealed and set performedAt
    await db
      .update(schema.drawResults)
      .set({ isRevealed: true, performedAt: new Date() })
      .where(
        and(
          eq(schema.drawResults.roomId, roomId),
          eq(schema.drawResults.order, order),
        ),
      );

    await db
      .update(schema.rooms)
      .set({ lastActivityAt: new Date() })
      .where(eq(schema.rooms.id, roomId));
  }

  // fetch updated room and enrich result
  const updatedRoom = await loadRoomFromDb(roomId);
  if (!updatedRoom) return null;

  const enriched = updatedRoom.results.find((r) => r.order === order);
  return enriched ? { room: updatedRoom, result: enriched } : null;
}

export async function nextDrawer(roomId: string): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  // 驗證當前抽獎者是否已經抽過
  const currentDrawerId = room.drawOrder[room.currentIndex];
  const hasDrawn = room.results.some((r) => r.drawerId === currentDrawerId);
  if (!hasDrawn) {
    console.log(
      `[NextDrawer] Current drawer ${currentDrawerId} has not drawn yet, ignoring request`,
    );
    return room; // 返回當前狀態，不做任何改變
  }

  let newState = room.gameState;
  let newIndex = room.currentIndex;

  // 檢查是否所有人都已抽完
  // 使用 drawOrder 長度作為總人數，確保每個人都抽過
  const totalPlayers = room.drawOrder.length;
  const drawnCount = room.results.length;

  console.log(
    `[NextDrawer] Progress: ${drawnCount}/${totalPlayers} drawn, currentIndex: ${room.currentIndex}`,
  );

  if (drawnCount >= totalPlayers) {
    // 所有人都已抽完
    newState = "complete";
    console.log(`[NextDrawer] Game complete, all players have drawn`);
  } else if (room.currentIndex >= totalPlayers - 1) {
    // 已到最後一位，檢查是否真的完成
    if (drawnCount >= totalPlayers) {
      newState = "complete";
      console.log(`[NextDrawer] Game complete at last drawer`);
    } else {
      console.log(
        `[NextDrawer] Warning: At last drawer but not all drawn (${drawnCount}/${totalPlayers})`,
      );
      // 保持在最後一位，等待抽獎完成
      newIndex = room.currentIndex;
    }
  } else {
    // 進入下一位
    newIndex = room.currentIndex + 1;
    console.log(`[NextDrawer] Moving to next drawer: index ${newIndex}`);
  }

  await db
    .update(schema.rooms)
    .set({
      gameState: newState,
      currentIndex: newIndex,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(schema.rooms.id, roomId));

  // SSOT: 狀態轉換日誌
  console.log("[SSOT] State Transition:", {
    roomId,
    action: "NEXT_DRAWER",
    from: { gameState: room.gameState, currentIndex: room.currentIndex },
    to: { gameState: newState, currentIndex: newIndex },
    drawnCount,
    totalPlayers,
    isComplete: newState === "complete",
    timestamp: new Date().toISOString(),
  });

  return loadRoomFromDb(roomId);
}

// 刪除房間及其所有相關資料
export async function deleteRoom(roomId: string): Promise<void> {
  // 刪除相關資料
  await db
    .delete(schema.drawResults)
    .where(eq(schema.drawResults.roomId, roomId));
  await db
    .delete(schema.drawOrders)
    .where(eq(schema.drawOrders.roomId, roomId));
  await db
    .delete(schema.drawSequences)
    .where(eq(schema.drawSequences.roomId, roomId));
  await db.delete(schema.players).where(eq(schema.players.roomId, roomId));
  await db.delete(schema.rooms).where(eq(schema.rooms.id, roomId));

  console.log(`[Room] Deleted room ${roomId} and all related data`);
}

export async function restartGame(roomId: string): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  // 清除遊戲資料
  await db
    .delete(schema.drawSequences)
    .where(eq(schema.drawSequences.roomId, roomId));
  await db
    .delete(schema.drawOrders)
    .where(eq(schema.drawOrders.roomId, roomId));
  await db
    .delete(schema.drawResults)
    .where(eq(schema.drawResults.roomId, roomId));

  // 重置房間狀態
  await db
    .update(schema.rooms)
    .set({
      gameState: "waiting",
      seed: Date.now(),
      currentIndex: 0,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(schema.rooms.id, roomId));

  // 重置玩家準備狀態
  await db
    .update(schema.players)
    .set({ isReady: false })
    .where(
      and(eq(schema.players.roomId, roomId), eq(schema.players.isHost, false)),
    );

  return loadRoomFromDb(roomId);
}

// ==================== 查詢函數 ====================

export async function getRoom(roomId: string): Promise<Room | null> {
  return loadRoomFromDb(roomId);
}

export async function getPlayerByReconnectToken(
  roomId: string,
  token: string,
): Promise<RoomPlayer | null> {
  const playerData = await db.query.players.findFirst({
    where: and(
      eq(schema.players.roomId, roomId),
      eq(schema.players.reconnectToken, token),
    ),
  });

  if (!playerData) return null;

  return {
    id: playerData.playerId,
    name: playerData.name,
    participantId: playerData.participantId,
    role: playerData.role as "player" | "spectator",
    isCreator: !!(playerData as any).isCreator, // v0.9.0: 添加創建者標記
    isHost: !!playerData.isHost,
    isReady: !!playerData.isReady,
    isConnected: !!playerData.isConnected,
    isVirtual: !!playerData.isVirtual,
  };
}

export async function getReconnectToken(
  roomId: string,
  playerId: string,
): Promise<string | null> {
  const playerData = await db.query.players.findFirst({
    where: and(
      eq(schema.players.roomId, roomId),
      eq(schema.players.playerId, playerId),
    ),
  });

  return playerData?.reconnectToken ?? null;
}
