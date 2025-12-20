/**
 * Nitro Plugin - 定期清理過期資料
 *
 * 功能：
 * - 每 10 分鐘清理過期房間（30 分鐘無活動）
 * - 每天清理過期日誌（7 天前的日誌）
 */

import { cleanupExpiredRooms, cleanupExpiredLogs } from "../database";
import {
  flushPendingBroadcasts,
  dbBatchUpdater,
} from "../utils/broadcast-optimizer";

export default defineNitroPlugin((nitroApp) => {
  console.log("[Cleanup] Starting automatic cleanup service...");

  // 每 10 分鐘清理過期房間（30 分鐘無活動）
  const roomCleanupInterval = setInterval(
    () => {
      try {
        const deleted = cleanupExpiredRooms(30);
        if (deleted > 0) {
          console.log(`[Cleanup] Removed ${deleted} expired rooms`);
        }
      } catch (error) {
        console.error("[Cleanup] Error cleaning up rooms:", error);
      }
    },
    10 * 60 * 1000,
  ); // 10 分鐘

  // 每天清理過期日誌（7 天前的日誌）
  const logCleanupInterval = setInterval(
    () => {
      try {
        const deleted = cleanupExpiredLogs(7);
        if (deleted > 0) {
          console.log(`[Cleanup] Removed ${deleted} expired logs`);
        }
      } catch (error) {
        console.error("[Cleanup] Error cleaning up logs:", error);
      }
    },
    24 * 60 * 60 * 1000,
  ); // 24 小時

  // 啟動時執行一次清理
  setTimeout(() => {
    cleanupExpiredRooms(30);
    cleanupExpiredLogs(7);
    console.log("[Cleanup] Initial cleanup completed");
  }, 5000); // 啟動後 5 秒執行

  // Nitro 關閉時清理定時器和待處理任務
  nitroApp.hooks.hook("close", async () => {
    console.log("[Cleanup] Shutting down cleanup service...");
    clearInterval(roomCleanupInterval);
    clearInterval(logCleanupInterval);

    // 清理廣播優化器中待處理的任務
    try {
      await flushPendingBroadcasts();
      await dbBatchUpdater.flush();
    } catch (e) {
      console.error("[Cleanup] Failed to flush pending tasks:", e);
    }

    console.log("[Cleanup] Cleanup service stopped");
  });
});
