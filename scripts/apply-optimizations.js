/**
 * 數據庫遷移腳本
 * 用於手動應用性能優化索引（可選）
 *
 * 使用方式：
 * node scripts/apply-optimizations.js
 */

const Database = require("better-sqlite3");
const { join } = require("path");
const { existsSync } = require("fs");

const DB_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), "data", "lucky-draw.db");

if (!existsSync(DB_PATH)) {
  console.error("❌ 數據庫文件不存在:", DB_PATH);
  console.log("💡 提示：先啟動應用讓它創建數據庫");
  process.exit(1);
}

console.log("🔧 連接數據庫:", DB_PATH);
const db = new Database(DB_PATH);

try {
  console.log("📊 應用性能優化索引...");

  db.exec(`
    -- 玩家查詢優化（最常用的查詢模式）
    CREATE INDEX IF NOT EXISTS idx_players_room_player ON players(room_id, player_id);
    CREATE INDEX IF NOT EXISTS idx_players_room_role ON players(room_id, role);
    CREATE INDEX IF NOT EXISTS idx_players_reconnect ON players(room_id, reconnect_token);
    CREATE INDEX IF NOT EXISTS idx_players_device ON players(device_id) WHERE device_id IS NOT NULL;
    
    -- 房間查詢優化
    CREATE INDEX IF NOT EXISTS idx_rooms_activity ON rooms(last_activity_at, game_state);
    CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);
    
    -- 抽獎數據優化
    CREATE INDEX IF NOT EXISTS idx_draw_sequences_room ON draw_sequences(room_id);
    CREATE INDEX IF NOT EXISTS idx_draw_orders_room ON draw_orders(room_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_draw_results_room ON draw_results(room_id, "order");
    
    -- 日誌優化
    CREATE INDEX IF NOT EXISTS idx_logs_cleanup ON system_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_room ON system_logs(room_id, created_at);
  `);

  console.log("✅ 優化索引應用成功！");

  // 驗證索引
  console.log("\n📋 已創建的索引：");
  const indexes = db
    .prepare(
      `
    SELECT name, tbl_name 
    FROM sqlite_master 
    WHERE type='index' 
    AND name LIKE 'idx_%'
    ORDER BY tbl_name, name
  `,
    )
    .all();

  const groupedIndexes = {};
  indexes.forEach((idx) => {
    if (!groupedIndexes[idx.tbl_name]) {
      groupedIndexes[idx.tbl_name] = [];
    }
    groupedIndexes[idx.tbl_name].push(idx.name);
  });

  Object.entries(groupedIndexes).forEach(([table, idxList]) => {
    console.log(`\n  📦 ${table}:`);
    idxList.forEach((name) => {
      console.log(`     ✓ ${name}`);
    });
  });

  // 統計信息
  console.log("\n📈 數據庫統計：");
  const stats = [
    { name: "房間", query: "SELECT COUNT(*) as count FROM rooms" },
    { name: "玩家", query: "SELECT COUNT(*) as count FROM players" },
    { name: "抽獎結果", query: "SELECT COUNT(*) as count FROM draw_results" },
    { name: "日誌", query: "SELECT COUNT(*) as count FROM system_logs" },
  ];

  stats.forEach(({ name, query }) => {
    const result = db.prepare(query).get();
    console.log(`  ${name}: ${result.count}`);
  });

  console.log("\n🎉 完成！數據庫已優化");
} catch (error) {
  console.error("❌ 錯誤:", error.message);
  process.exit(1);
} finally {
  db.close();
}
