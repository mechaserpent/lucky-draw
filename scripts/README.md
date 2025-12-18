# 性能優化腳本使用指南

## 自動應用（推薦）✅

優化已內置到應用啟動流程，**無需手動操作**！

```bash
npm run dev   # 或 npm start
```

啟動時會自動：

- 創建所有性能優化索引
- 配置 SQLite 最佳實踐參數
- 顯示確認日誌

---

## 手動應用（可選）

### 方式 1：使用 Node.js 腳本（跨平台 ✅ Windows/Linux/Mac）

```bash
# 運行遷移腳本
node scripts/apply-optimizations.js
```

**輸出示例**：

```
🔧 連接數據庫: data/lucky-draw.db
📊 應用性能優化索引...
✅ 優化索引應用成功！

📋 已創建的索引：
  📦 players:
     ✓ idx_players_room_player
     ✓ idx_players_room_role
     ✓ idx_players_reconnect
     ...

📈 數據庫統計：
  房間: 5
  玩家: 12
  抽獎結果: 8
  日誌: 234

🎉 完成！數據庫已優化
```

### 方式 2：使用 sqlite3 命令（Linux/Mac，需安裝 sqlite3）

```bash
sqlite3 data/lucky-draw.db < server/database/optimizations.sql
```

### 方式 3：直接在 SQLite 中執行（任何平台）

```bash
# 打開數據庫
sqlite3 data/lucky-draw.db

# 複製 server/database/optimizations.sql 的內容貼上執行

# 驗證索引
.indexes players

# 退出
.quit
```

---

## 驗證優化

### 檢查索引

```bash
# 方式 1：使用腳本自動驗證
node scripts/apply-optimizations.js

# 方式 2：手動檢查
sqlite3 data/lucky-draw.db ".indexes"
```

**應該看到**：

- `idx_players_room_player`
- `idx_players_room_role`
- `idx_rooms_activity`
- `idx_draw_orders_room`
- 等等...

### 測試性能

```bash
# 啟動應用並查看日誌
npm run dev

# 觀察啟動日誌
# 應該看到：
# [DB] Applying performance optimization indexes...
# [DB] Database initialized with performance optimizations at: ...
```

---

## 不同環境的部署

### 🏠 本地開發

```bash
# 直接啟動，優化自動應用
npm run dev
```

### 🚀 生產環境（VPS/專用主機）

```bash
# 設定環境變數
export NODE_ENV=production
export DATABASE_PATH=/var/lib/lucky-draw/lucky-draw.db

# 啟動應用（優化自動應用）
npm start
```

### 🐳 Docker 部署

```dockerfile
# Dockerfile 已包含必要設定
docker build -t lucky-draw .
docker run -v /data:/app/data -p 3000:3000 lucky-draw
```

優化會在容器首次啟動時自動應用。

### ☁️ PaaS 平台（Heroku/Railway/Render）

**無需特殊配置！** 部署時自動應用：

1. 推送代碼到平台
2. 平台自動構建和啟動
3. 啟動時自動創建數據庫和索引
4. 完成！

---

## 故障排除

### ❌ 問題：索引未創建

**症狀**：查詢慢，CPU 高

**檢查**：

```bash
sqlite3 data/lucky-draw.db ".indexes players"
```

**解決**：

```bash
# 1. 停止應用
# 2. 手動運行腳本
node scripts/apply-optimizations.js
# 3. 重新啟動應用
npm start
```

### ❌ 問題：權限錯誤

**症狀**：`Error: SQLITE_READONLY`

**解決**：

```bash
# 檢查文件權限
ls -la data/lucky-draw.db

# 修正權限
chmod 664 data/lucky-draw.db
chmod 775 data/
```

### ❌ 問題：數據庫鎖定

**症狀**：`Error: database is locked`

**解決**：

```bash
# 1. 確保沒有其他進程使用數據庫
pkill node

# 2. 刪除 WAL 和 SHM 文件
rm data/lucky-draw.db-wal
rm data/lucky-draw.db-shm

# 3. 重新啟動
npm start
```

---

## 🛠️ 可用的腳本

### 1. 應用數據庫優化

```bash
npm run db:optimize
# 或
node scripts/apply-optimizations.js
```

**功能**：

- 應用所有性能優化索引
- 驗證索引創建成功
- 顯示數據庫統計信息

**輸出示例**：

```
✅ 優化索引應用成功！
📋 已創建的索引：
  📦 players: idx_players_room_player, idx_players_room_role...
📈 數據庫統計：
  房間: 5
  玩家: 12
```

### 2. 性能報告

```bash
npm run perf:report
# 或
node scripts/performance-report.js
```

**功能**：

- 檢查數據庫大小和配置
- 驗證性能索引狀態
- 顯示活躍房間列表
- 提供性能評分和建議

**輸出示例**：

```
📊 性能報告
📦 數據庫信息：
  文件大小: 2.34 MB
🔍 性能索引狀態：
  ✅ idx_players_room_player
  ✅ idx_rooms_activity
⭐ 性能評分：95/100 🎉
```

---

## ✅ 完成檢查清單

部署完成後，確認以下項目：

- [ ] 應用成功啟動
- [ ] 看到 "Database initialized with performance optimizations" 日誌
- [ ] 運行 `npm run db:optimize` 看到所有索引
- [ ] 運行 `npm run perf:report` 評分 > 80
- [ ] 房間創建響應 < 100ms
- [ ] 主頁動畫流暢（60fps）
- [ ] WebSocket 連接穩定
- [ ] 內存使用 < 200MB（空閒）
- [ ] CPU 使用 < 10%（空閒）

全部完成？🎉 優化部署成功！
