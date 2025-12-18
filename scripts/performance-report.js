/**
 * 性能報告腳本
 * 顯示應用性能統計和優化建議
 *
 * 使用方式：
 * npm run perf:report
 */

const Database = require("better-sqlite3");
const { join } = require("path");
const { existsSync } = require("fs");

const DB_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), "data", "lucky-draw.db");

console.log("📊 性能報告");
console.log("=".repeat(60));

// 檢查數據庫
if (!existsSync(DB_PATH)) {
  console.log("❌ 數據庫文件不存在:", DB_PATH);
  console.log("💡 提示：先啟動應用讓它創建數據庫");
  process.exit(0);
}

const db = new Database(DB_PATH);

try {
  // 1. 數據庫大小
  console.log("\n📦 數據庫信息：");
  const fs = require("fs");
  const stats = fs.statSync(DB_PATH);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`  文件大小: ${sizeInMB} MB`);

  // 2. 索引檢查
  console.log("\n🔍 性能索引狀態：");
  const expectedIndexes = [
    "idx_players_room_player",
    "idx_players_room_role",
    "idx_players_reconnect",
    "idx_rooms_activity",
    "idx_draw_orders_room",
    "idx_draw_results_room",
  ];

  const indexes = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='index' AND name LIKE 'idx_%'
  `,
    )
    .all()
    .map((row) => row.name);

  let missingIndexes = [];
  expectedIndexes.forEach((idx) => {
    if (indexes.includes(idx)) {
      console.log(`  ✅ ${idx}`);
    } else {
      console.log(`  ❌ ${idx} (缺失)`);
      missingIndexes.push(idx);
    }
  });

  if (missingIndexes.length > 0) {
    console.log("\n⚠️  警告：缺少性能索引");
    console.log("   運行以下命令修復：");
    console.log("   npm run db:optimize");
  } else {
    console.log("\n✅ 所有性能索引已就緒");
  }

  // 3. 數據統計
  console.log("\n📈 數據統計：");
  const tables = [
    { name: "rooms", label: "房間" },
    { name: "players", label: "玩家記錄" },
    { name: "draw_results", label: "抽獎結果" },
    { name: "system_logs", label: "系統日誌" },
  ];

  tables.forEach(({ name, label }) => {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
      console.log(`  ${label}: ${result.count}`);
    } catch (e) {
      console.log(`  ${label}: N/A`);
    }
  });

  // 4. 活躍房間
  console.log("\n🎮 活躍房間：");
  try {
    const activeRooms = db
      .prepare(
        `
      SELECT id, game_state, 
             (SELECT COUNT(*) FROM players WHERE room_id = rooms.id AND role = 'player') as player_count,
             datetime(last_activity_at, 'unixepoch') as last_activity
      FROM rooms
      WHERE last_activity_at > strftime('%s', 'now') - 1800
      ORDER BY last_activity_at DESC
      LIMIT 5
    `,
      )
      .all();

    if (activeRooms.length === 0) {
      console.log("  無活躍房間");
    } else {
      activeRooms.forEach((room) => {
        console.log(
          `  📍 ${room.id} - ${room.game_state} (${room.player_count} 玩家) - ${room.last_activity}`,
        );
      });
    }
  } catch (e) {
    console.log("  無法查詢活躍房間");
  }

  // 5. 性能建議
  console.log("\n💡 性能建議：");

  const roomCount = db
    .prepare("SELECT COUNT(*) as count FROM rooms")
    .get().count;
  const playerCount = db
    .prepare("SELECT COUNT(*) as count FROM players")
    .get().count;
  const logCount = db
    .prepare("SELECT COUNT(*) as count FROM system_logs")
    .get().count;

  if (roomCount > 50) {
    console.log("  ⚠️  房間數量較多（${roomCount}），建議定期清理過期房間");
  }

  if (logCount > 10000) {
    console.log(`  ⚠️  日誌記錄過多（${logCount}），建議清理舊日誌`);
    console.log(
      "     DELETE FROM system_logs WHERE created_at < strftime('%s', 'now') - 604800",
    );
  }

  if (playerCount > 1000) {
    console.log(`  ℹ️  玩家記錄較多（${playerCount}），考慮定期清理`);
  }

  // 6. WAL 模式檢查
  console.log("\n⚙️  SQLite 配置：");
  const journalMode = db.pragma("journal_mode", { simple: true });
  console.log(
    `  Journal Mode: ${journalMode} ${journalMode === "wal" ? "✅" : "⚠️  建議使用 WAL"}`,
  );

  const cacheSize = db.pragma("cache_size", { simple: true });
  console.log(`  Cache Size: ${Math.abs(cacheSize / 1024).toFixed(0)} MB`);

  // 7. 性能評分
  console.log("\n⭐ 性能評分：");
  let score = 100;
  let issues = [];

  if (missingIndexes.length > 0) {
    score -= 30;
    issues.push("缺少性能索引");
  }

  if (journalMode !== "wal") {
    score -= 15;
    issues.push("未使用 WAL 模式");
  }

  if (roomCount > 50) {
    score -= 10;
    issues.push("房間數量過多");
  }

  if (logCount > 10000) {
    score -= 10;
    issues.push("日誌記錄過多");
  }

  console.log(
    `  評分: ${score}/100 ${score >= 80 ? "🎉" : score >= 60 ? "👍" : "⚠️"}`,
  );

  if (issues.length > 0) {
    console.log("\n  需要改進：");
    issues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log("  ✅ 性能配置優秀！");
  }

  console.log("\n" + "=".repeat(60));
  console.log("💡 提示：運行 npm run db:optimize 應用性能優化");
  console.log("");
} catch (error) {
  console.error("❌ 錯誤:", error.message);
  process.exit(1);
} finally {
  db.close();
}
