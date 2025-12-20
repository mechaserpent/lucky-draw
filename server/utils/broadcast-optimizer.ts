/**
 * WebSocket 廣播優化工具
 *
 * 功能：
 * - 節流合併連續的房間狀態更新
 * - 減少不必要的廣播
 * - 只發送差異更新而非完整狀態
 */

interface PendingBroadcast {
  roomId: string;
  message: object;
  timeout: NodeJS.Timeout;
}

// 待發送的廣播佇列
const pendingBroadcasts = new Map<string, PendingBroadcast>();

// 節流延遲（毫秒）
const THROTTLE_DELAY = 50;

/**
 * 節流廣播 - 合併短時間內的多次更新
 */
export function throttledBroadcast(
  roomId: string,
  message: object,
  broadcastFn: (roomId: string, message: object) => void,
  immediate: boolean = false,
) {
  // 如果是立即廣播（如開始遊戲、完成抽獎等關鍵事件）
  if (immediate) {
    // 取消待處理的廣播
    const pending = pendingBroadcasts.get(roomId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingBroadcasts.delete(roomId);
    }
    // 立即執行
    broadcastFn(roomId, message);
    return;
  }

  // 取消之前的計時器
  const existing = pendingBroadcasts.get(roomId);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  // 設置新的計時器
  const timeout = setTimeout(() => {
    broadcastFn(roomId, message);
    pendingBroadcasts.delete(roomId);
  }, THROTTLE_DELAY);

  pendingBroadcasts.set(roomId, {
    roomId,
    message,
    timeout,
  });
}

/**
 * 計算房間狀態差異
 * 只發送變更的部分，減少數據傳輸量
 */
export function calculateRoomDiff(
  oldState: any,
  newState: any,
): { changed: boolean; diff: any } {
  if (!oldState) {
    return { changed: true, diff: newState };
  }

  const diff: any = {};
  let changed = false;

  // 檢查基本字段
  const fields = ["gameState", "currentIndex", "hostId", "seed"];
  for (const field of fields) {
    if (oldState[field] !== newState[field]) {
      diff[field] = newState[field];
      changed = true;
    }
  }

  // 檢查玩家列表（簡化比較）
  if (JSON.stringify(oldState.players) !== JSON.stringify(newState.players)) {
    diff.players = newState.players;
    changed = true;
  }

  // 檢查結果列表（通常只會增加）
  if (oldState.results?.length !== newState.results?.length) {
    diff.results = newState.results;
    changed = true;
  }

  return { changed, diff: changed ? diff : null };
}

/**
 * 批量更新數據庫
 * 收集多個更新操作，一次性執行
 */
class DatabaseBatchUpdater {
  private updates: Array<() => Promise<any>> = [];
  private timeout: NodeJS.Timeout | null = null;
  private processing = false;

  add(updateFn: () => Promise<any>) {
    this.updates.push(updateFn);

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => this.flush(), 100);
  }

  async flush() {
    if (this.processing || this.updates.length === 0) return;

    this.processing = true;
    const batch = [...this.updates];
    this.updates = [];

    try {
      await Promise.all(batch.map((fn) => fn()));
    } catch (error) {
      console.error("[BatchUpdater] Error processing batch:", error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Cleanup on shutdown - cancel pending operations
   */
  cleanup() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.updates = [];
    this.processing = false;
  }
}

export const dbBatchUpdater = new DatabaseBatchUpdater();

/**
 * Flush pending broadcasts and database batch updates (used during graceful shutdown)
 */
export async function flushPendingBroadcasts() {
  try {
    // Clear pending broadcast timeouts
    for (const [, pending] of pendingBroadcasts) {
      try {
        clearTimeout(pending.timeout);
      } catch (e) {
        // ignore
      }
    }
    pendingBroadcasts.clear();

    // Flush any pending DB batches
    await dbBatchUpdater.flush();
    console.log(
      "[BroadcastOptimizer] Flushed pending broadcasts and DB batches",
    );
  } catch (e) {
    console.error("[BroadcastOptimizer] Error flushing pending broadcasts:", e);
  }
}
