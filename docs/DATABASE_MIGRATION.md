# 資料庫遷移指南

## 本地開發環境

### 方案 1: 刪除並重建（快速）

```bash
# 刪除資料庫
Remove-Item data\lucky-draw.db*

# 重啟伺服器（會自動創建新 schema）
npm run dev
```

### 方案 2: 執行遷移（保留數據）

```bash
# 安裝 tsx（如果還沒有）
npm install -D tsx

# 執行遷移
npm run db:migrate
```

## Render 部署環境

### 自動遷移（推薦）✅

**已配置！** 現在每次應用啟動時會自動檢查並應用遷移。

**工作原理**:

1. `server/database/index.ts` 的 `initDatabase()` 函數會在啟動時執行
2. 自動調用 `runMigrations()` 檢查 schema 變更
3. 如果 `is_revealed` 欄位不存在，自動執行 `ALTER TABLE` 添加
4. 冪等性設計：多次執行安全無副作用

**日誌確認**:

```
[Migration] Starting database migration...
[Migration] Adding is_revealed column to draw_results table...
[Migration] ✅ Successfully added is_revealed column
[DB] Database initialized with performance optimizations at: ...
```

### 手動遷移（備用方案）

如果需要手動執行：

**選項 1: 使用 Render Shell**

```bash
# 進入 Render Dashboard > Service > Shell
npm run db:migrate
```

**選項 2: 使用 Drizzle Kit**

```bash
# 生成遷移文件
npm run db:generate

# 推送到資料庫
npm run db:push
```

**選項 3: 直接執行 SQL**

```sql
ALTER TABLE draw_results
ADD COLUMN is_revealed INTEGER NOT NULL DEFAULT 0;
```

## 遷移文件說明

### `server/database/migrate.ts`

- 檢查 `is_revealed` 欄位是否存在
- 如果不存在則執行 `ALTER TABLE` 添加
- 冪等性設計，可安全重複執行

### `server/database/index.ts`

- 更新 `CREATE TABLE` 語句包含 `is_revealed`
- 在 `initDatabase()` 末尾自動調用 `runMigrations()`
- 確保新安裝和現有安裝都能正確運行

## 驗證遷移成功

### 檢查日誌

```bash
# 本地
npm run dev

# Render
查看 Logs 標籤頁
```

**成功標誌**:

```
[Migration] ✅ Successfully added is_revealed column
或
[Migration] ✅ is_revealed column already exists, skipping
```

### 測試功能

1. 創建房間
2. 開始遊戲
3. 執行抽獎
4. 檢查結果顯示（應該只顯示 `isRevealed: true` 的結果）

## 常見問題

### Q: Render 部署時如何確保遷移執行？

**A**: 已自動配置！`initDatabase()` 會在應用啟動時執行遷移。

### Q: 如何確認遷移是否成功？

**A**: 查看 Render Logs，搜索 `[Migration]` 關鍵字。

### Q: 遷移失敗怎麼辦？

**A**:

1. 檢查 Logs 中的錯誤訊息
2. 確認資料庫文件權限
3. 手動執行 `npm run db:migrate`
4. 如果是權限問題，可能需要在 Render Dashboard 中設置環境變量

### Q: 舊數據會丟失嗎？

**A**: 不會！`ALTER TABLE` 會保留所有現有數據，只是添加新欄位（默認值 0）。

### Q: 能否回滾遷移？

**A**: SQLite 不支持 `DROP COLUMN`，但可以：

1. 創建新表（沒有 is_revealed）
2. 複製數據
3. 刪除舊表
4. 重命名新表

## 未來遷移

添加新遷移時，在 `server/database/migrate.ts` 中添加：

```typescript
// 檢查新欄位
const hasNewField = tableInfo.some((col: any) => col.name === "new_field_name");

if (!hasNewField) {
  console.log("[Migration] Adding new_field_name...");
  db.exec(`
    ALTER TABLE table_name 
    ADD COLUMN new_field_name TYPE NOT NULL DEFAULT value;
  `);
  console.log("[Migration] ✅ Successfully added new_field_name");
}
```

## 部署清單

Render 部署前確認：

- [x] `schema.ts` 更新完成
- [x] `migrate.ts` 包含遷移邏輯
- [x] `index.ts` 的 `CREATE TABLE` 更新
- [x] `initDatabase()` 調用 `runMigrations()`
- [x] 本地測試遷移成功
- [x] Git commit 和 push

Render 會自動：

1. 拉取最新代碼
2. 運行 `npm install`
3. 運行 `npm run build`
4. 啟動應用
5. **執行 `initDatabase()` → `runMigrations()`** ✨
6. 應用就緒！
