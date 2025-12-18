/**
 * WebSocket 路由處理
 *
 * 支援功能：
 * - 房間管理（建立、加入、離開）
 * - 觀眾模式
 * - 斷線重連
 * - 抽獎設定與執行
 */

import { db, schema, initDatabase } from "../database";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

initDatabase();

export interface RoomSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  drawMode: "chain" | "random";
  firstDrawerMode: "random" | "manual" | "host";
  firstDrawerId?: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  participantId: number;
  role: "player" | "spectator";
  isHost: boolean;
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
  hostId: string;
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  gameState: "waiting" | "playing" | "complete";
  settings: RoomSettings;
  seed: number;
  drawSequence: Record<number, number>;
  drawOrder: number[];
  currentIndex: number;
  results: DrawResult[];
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
  const roomData = await db.query.rooms.findFirst({
    where: eq(schema.rooms.id, roomId),
  });

  if (!roomData) return null;

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
  }));

  return {
    id: roomData.id,
    hostId: roomData.hostId,
    players,
    spectators,
    gameState: roomData.gameState as "waiting" | "playing" | "complete",
    settings: {
      maxPlayers: roomData.maxPlayers,
      allowSpectators: !!roomData.allowSpectators,
      drawMode: roomData.drawMode as "chain" | "random",
      firstDrawerMode: roomData.firstDrawerMode as "random" | "manual" | "host",
      firstDrawerId: roomData.firstDrawerId ?? undefined,
    },
    seed: roomData.seed,
    drawSequence,
    drawOrder,
    currentIndex: roomData.currentIndex,
    results,
  };
}

// 儲存房間狀態到資料庫
export async function saveRoomToDb(room: Room): Promise<void> {
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
  hostId: string,
  hostName: string,
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

  const roomSettings: RoomSettings = {
    maxPlayers: settings.maxPlayers ?? 20,
    allowSpectators: settings.allowSpectators ?? true,
    drawMode: settings.drawMode ?? "chain",
    firstDrawerMode: settings.firstDrawerMode ?? "random",
    firstDrawerId: settings.firstDrawerId,
  };

  // 建立房間
  await db.insert(schema.rooms).values({
    id: roomId,
    hostId,
    maxPlayers: roomSettings.maxPlayers,
    allowSpectators: roomSettings.allowSpectators,
    drawMode: roomSettings.drawMode,
    firstDrawerMode: roomSettings.firstDrawerMode,
    firstDrawerId: roomSettings.firstDrawerId ?? null,
    gameState: "waiting",
    seed,
    currentIndex: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  // 建立主機玩家
  await db.insert(schema.players).values({
    roomId,
    playerId: hostId,
    name: hostName,
    participantId: 1,
    role: "player",
    isHost: true,
    isReady: true,
    isConnected: true,
    isVirtual: false,
    deviceId: deviceId || null,
    reconnectToken,
    tokenExpiresAt,
    joinedAt: now,
  });

  const room: Room = {
    id: roomId,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        participantId: 1,
        role: "player",
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

  await db.insert(schema.players).values({
    roomId,
    playerId,
    name: playerName,
    participantId,
    role,
    isHost: false,
    isReady: false,
    isConnected: true,
    isVirtual: false,
    deviceId: deviceId || null,
    reconnectToken,
    tokenExpiresAt,
    joinedAt: new Date(),
  });

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

  // 如果沒有任何連線的人，關閉房間
  if (connectedPlayers.length === 0 && connectedSpectators.length === 0) {
    console.log(`[Room] No connected players in room ${roomId}, closing room`);
    await deleteRoom(roomId);
    return null;
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

  if (!playerData) return null;

  // 更新玩家連線狀態和新的 playerId
  await db
    .update(schema.players)
    .set({
      playerId: newPlayerId,
      isConnected: true,
      disconnectedAt: null,
    })
    .where(eq(schema.players.id, playerData.id));

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

  // 決定第一位抽獎者
  const random = mulberry32(gameSeed);
  let firstDrawerId: number;

  switch (room.settings.firstDrawerMode) {
    case "host":
      firstDrawerId =
        room.players.find((p) => p.isHost)?.participantId ?? playerIds[0];
      break;
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

  // 儲存結果
  await db.insert(schema.drawResults).values({
    roomId,
    order: result.order,
    drawerId: result.drawerId,
    giftOwnerId: result.giftOwnerId,
    performedAt: new Date(),
  });

  await db
    .update(schema.rooms)
    .set({ lastActivityAt: new Date() })
    .where(eq(schema.rooms.id, roomId));

  const updatedRoom = await loadRoomFromDb(roomId);
  return updatedRoom ? { room: updatedRoom, result } : null;
}

export async function nextDrawer(roomId: string): Promise<Room | null> {
  const room = await loadRoomFromDb(roomId);
  if (!room) return null;

  let newState = room.gameState;
  let newIndex = room.currentIndex;

  // 檢查是否所有人都已抽完（用 results.length 判斷）
  if (room.results.length >= room.players.length) {
    newState = "complete";
  } else if (room.currentIndex >= room.drawOrder.length - 1) {
    // 如果到達順序末端但還沒抽完，也標記為完成
    newState = "complete";
  } else {
    newIndex = room.currentIndex + 1;
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
