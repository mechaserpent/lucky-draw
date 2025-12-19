# Render 資料庫更新完整方案

## ✅ 已完成的配置

### 1. 自動遷移機制

**文件**: `server/database/migrate.ts`

- 自動檢查 `is_revealed` 欄位是否存在
- 如果不存在則執行 `ALTER TABLE` 添加
- 冪等性設計，可安全重複執行

### 2. 資料庫初始化更新

**文件**: `server/database/index.ts`

- 更新 `CREATE TABLE draw_results` 包含 `is_revealed` 欄位
- 在 `initDatabase()` 末尾自動調用 `runMigrations()`
- 確保新安裝和現有資料庫都能正確運行

### 3. Schema 定義

**文件**: `server/database/schema.ts`

- 已添加 `isRevealed` 字段定義
- 默認值為 `false`（未揭曉）

## 🚀 Render 部署流程

### 自動部署（推薦）✨

**無需任何手動操作！** 只需 push 代碼到 GitHub：

```bash
git add .
git commit -m "feat: add isRevealed field with auto-migration"
git push origin main
```

Render 會自動：

1. 檢測到新 commit
2. 拉取最新代碼
3. 執行 `npm install`
4. 執行 `npm run build`
5. 重啟應用
6. **啟動時自動執行 `initDatabase()` → `runMigrations()`**
7. 檢查並添加 `is_revealed` 欄位
8. 完成！✅

### 驗證部署成功

**查看 Render Logs**:

1. 進入 Render Dashboard
2. 選擇你的 Service
3. 點擊 "Logs" 標籤
4. 搜索以下日誌：

```
[Migration] Starting database migration...
[Migration] Database path: ...
[Migration] Adding is_revealed column to draw_results table...
[Migration] ✅ Successfully added is_revealed column
[DB] Database initialized with performance optimizations at: ...
```

或者（如果已經有欄位）：

```
[Migration] ✅ is_revealed column already exists, skipping
```

## 🔧 本地測試（可選）

### 測試遷移腳本

**選項 1: 安裝 tsx 並執行**

```bash
npm install -D tsx
npm run db:migrate
```

**選項 2: 刪除資料庫重建（快速）**

```bash
# 停止開發伺服器
# 然後
Remove-Item data\lucky-draw.db* -Force
npm run dev
```

啟動後會自動：

1. 創建新資料庫
2. 執行 `CREATE TABLE`（包含 `is_revealed`）
3. 執行 `runMigrations()`（檢查但跳過，因為欄位已存在）

## 🎯 部署檢查清單

### 代碼變更

- [x] `server/database/schema.ts` - 添加 `isRevealed` 字段定義
- [x] `server/database/index.ts` - 更新 `CREATE TABLE` 語句
- [x] `server/database/index.ts` - 調用 `runMigrations()`
- [x] `server/database/migrate.ts` - 新建遷移腳本
- [x] `server/services/roomService.ts` - 插入時設置 `isRevealed: false`
- [x] `server/routes/ws.ts` - 廣播包含 `isRevealed` 狀態
- [x] `app/pages/online.vue` - 客戶端使用 `isRevealed` 過濾結果

### Git 操作

```bash
# 檢查變更
git status

# 添加所有變更
git add .

# 提交
git commit -m "feat: implement SSOT with isRevealed field and auto-migration"

# 推送到 GitHub
git push origin main
```

### Render 自動觸發

- GitHub push 後，Render 會自動開始部署
- 等待約 2-5 分鐘完成
- 查看 Logs 確認遷移成功

## 📊 監控和驗證

### 1. 檢查應用啟動日誌

```
✓ Nuxt Nitro server built
[Cleanup] Starting automatic cleanup service...
[DB] Applying performance optimization indexes...
[Migration] Starting database migration...
[Migration] ✅ Successfully added is_revealed column
[DB] Database initialized with performance optimizations at: ...
```

### 2. 測試功能

1. 訪問應用 URL
2. 創建房間
3. 添加玩家
4. 開始遊戲
5. 執行抽獎
6. 確認結果顯示正確（只顯示 `isRevealed: true` 的結果）

### 3. 檢查 WebSocket 日誌

```
[WS] Broadcasting draw_performed with result: {
  drawerId: 1,
  giftOwnerId: 2,
  isRevealed: false,    <-- 應該看到這個字段
  totalResults: 1
}
```

## ⚠️ 故障排除

### 問題 1: 遷移沒有執行

**症狀**: 仍然看到 `no such column: "is_revealed"` 錯誤

**解決方案**:

1. 檢查 Render Logs 是否有 `[Migration]` 日誌
2. 如果沒有，檢查 `initDatabase()` 是否被調用
3. 手動觸發重新部署（Render Dashboard > Manual Deploy）

### 問題 2: 遷移執行但仍然報錯

**症狀**: 看到 `[Migration] ✅` 但仍然有錯誤

**解決方案**:

1. 可能是資料庫連接池問題
2. 在 Render Dashboard 重啟服務
3. 檢查是否有多個實例在運行

### 問題 3: 權限錯誤

**症狀**: `Permission denied` 或 `EACCES` 錯誤

**解決方案**:

1. 確認 Render 的 Persistent Disk 已掛載
2. 檢查 `DATABASE_PATH` 環境變量指向正確位置
3. 確保目錄有寫入權限

### 問題 4: 本地資料庫被鎖定

**症狀**: 無法刪除 `lucky-draw.db` 文件

**解決方案**:

```bash
# 停止開發伺服器（Ctrl+C）
# 等待幾秒讓資料庫連接關閉
# 然後
Remove-Item data\lucky-draw.db* -Force
```

## 🔮 未來遷移範本

當需要添加新欄位時，在 `migrate.ts` 中添加：

```typescript
// 檢查新欄位是否存在
const hasNewField = tableInfo.some(
  (col: any) => col.name === "new_column_name",
);

if (!hasNewField) {
  console.log("[Migration] Adding new_column_name to table_name...");

  db.exec(`
    ALTER TABLE table_name 
    ADD COLUMN new_column_name INTEGER NOT NULL DEFAULT 0;
  `);

  console.log("[Migration] ✅ Successfully added new_column_name");
}
```

同時更新：

1. `schema.ts` - Drizzle schema 定義
2. `index.ts` - `CREATE TABLE` 語句
3. 相關業務邏輯

## 📚 相關文件

- `docs/DATABASE_MIGRATION.md` - 詳細遷移指南
- `untitled:planSsotIsRevealed.prompt.md` - SSOT 架構實施計劃
- `server/database/migrate.ts` - 遷移腳本
- `server/database/index.ts` - 資料庫初始化
- `server/database/schema.ts` - Schema 定義

## 🎉 完成！

所有配置已就緒，Render 部署會自動處理資料庫遷移。只需 push 代碼到 GitHub，Render 會完成其餘工作！

```bash
git push origin main
# 然後等待 Render 自動部署
# 檢查 Logs 確認成功
# 測試功能
# ✅ 完成！
```
