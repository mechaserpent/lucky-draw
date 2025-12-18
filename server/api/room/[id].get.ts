/**
 * 房間查詢 API - 支援資料庫
 */
import { getRoom } from "~~/server/services/roomService";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id")?.toUpperCase();
  const query = getQuery(event);
  const deviceId = query.deviceId as string | undefined;

  if (!roomId) {
    return {
      exists: false,
      error: "未提供房間代碼",
    };
  }

  const room = await getRoom(roomId);

  if (!room) {
    return {
      exists: false,
      roomId,
      error: "房間不存在或已解散",
    };
  }

  // 檢查 deviceId 是否已在房間中
  let isDeviceInRoom = false;
  let existingPlayerName = "";
  if (deviceId) {
    const allPlayers = [...room.players, ...room.spectators];
    // 通過遍歷檢查，因為 RoomPlayer 類型可能沒有 deviceId 字段
    // 需要從資料庫直接查詢
    const { db, schema } = await import("~~/server/database");
    const { eq, and } = await import("drizzle-orm");

    const playerRecord = await db.query.players.findFirst({
      where: and(
        eq(schema.players.roomId, roomId),
        eq(schema.players.deviceId, deviceId),
      ),
    });

    if (playerRecord) {
      isDeviceInRoom = true;
      existingPlayerName = playerRecord.name;
    }
  }

  // 檢查是否可以加入
  let canJoin = true;
  let reason = "";

  // 如果 deviceId 已在房間中，可以重連
  if (isDeviceInRoom) {
    canJoin = true;
    reason = "";
  } else if (room.gameState !== "waiting") {
    canJoin = false;
    reason = "遊戲已經開始，無法加入";
  } else if (
    room.players.length >= room.settings.maxPlayers &&
    !room.settings.allowSpectators
  ) {
    canJoin = false;
    reason = "房間已滿";
  }

  return {
    exists: true,
    roomId: room.id,
    playerCount: room.players.length,
    spectatorCount: room.spectators.length,
    maxPlayers: room.settings.maxPlayers,
    allowSpectators: room.settings.allowSpectators,
    gameState: room.gameState,
    canJoin,
    reason,
    isDeviceInRoom,
    existingPlayerName,
  };
});
