/**
 * 性能監控工具
 * 記錄慢查詢和慢操作
 */

interface PerformanceLog {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

// 性能閾值（毫秒）
const THRESHOLDS = {
  database: 50, // 數據庫操作 > 50ms
  websocket: 100, // WebSocket 處理 > 100ms
  general: 100, // 一般操作 > 100ms
};

// 最近的性能日誌（保留最近 100 條）
const recentLogs: PerformanceLog[] = [];
const MAX_LOGS = 100;

/**
 * 記錄操作性能
 */
export function logPerformance(
  operation: string,
  duration: number,
  type: "database" | "websocket" | "general" = "general",
  metadata?: any,
) {
  const threshold = THRESHOLDS[type];

  if (duration > threshold) {
    const log: PerformanceLog = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    // 添加到最近日誌
    recentLogs.push(log);
    if (recentLogs.length > MAX_LOGS) {
      recentLogs.shift();
    }

    // 輸出警告
    console.warn(
      `[Performance] ${type.toUpperCase()} - ${operation} took ${duration}ms` +
        (metadata ? ` | ${JSON.stringify(metadata)}` : ""),
    );
  }
}

/**
 * 性能計時器包裝器
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  type: "database" | "websocket" | "general" = "general",
  metadata?: any,
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    logPerformance(operation, duration, type, metadata);
  }
}

/**
 * 同步版本的性能計時器
 */
export function measurePerformanceSync<T>(
  operation: string,
  fn: () => T,
  type: "database" | "websocket" | "general" = "general",
  metadata?: any,
): T {
  const start = Date.now();
  try {
    return fn();
  } finally {
    const duration = Date.now() - start;
    logPerformance(operation, duration, type, metadata);
  }
}

/**
 * 獲取性能統計
 */
export function getPerformanceStats() {
  if (recentLogs.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      maxDuration: 0,
      slowestOperation: null,
    };
  }

  const durations = recentLogs.map((log) => log.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const slowestOperation = recentLogs.reduce((max, log) =>
    log.duration > max.duration ? log : max,
  );

  return {
    count: recentLogs.length,
    avgDuration: Math.round(avgDuration),
    maxDuration,
    slowestOperation: {
      operation: slowestOperation.operation,
      duration: slowestOperation.duration,
      timestamp: new Date(slowestOperation.timestamp).toISOString(),
    },
    recentLogs: recentLogs.slice(-10), // 最近 10 條
  };
}

/**
 * 清除性能日誌
 */
export function clearPerformanceLogs() {
  recentLogs.length = 0;
  console.log("[Performance] Logs cleared");
}

/**
 * 輸出性能報告
 */
export function printPerformanceReport() {
  const stats = getPerformanceStats();

  console.log("\n📊 Performance Report:");
  console.log(`  Total slow operations: ${stats.count}`);
  console.log(`  Average duration: ${stats.avgDuration}ms`);
  console.log(`  Max duration: ${stats.maxDuration}ms`);

  if (stats.slowestOperation) {
    console.log(`\n  Slowest operation:`);
    console.log(`    ${stats.slowestOperation.operation}`);
    console.log(`    Duration: ${stats.slowestOperation.duration}ms`);
    console.log(`    Time: ${stats.slowestOperation.timestamp}`);
  }

  if (stats.recentLogs && stats.recentLogs.length > 0) {
    console.log(`\n  Recent slow operations:`);
    stats.recentLogs.forEach((log: any) => {
      console.log(`    - ${log.operation}: ${log.duration}ms`);
    });
  }

  console.log("");
}
