# 🚀 部署檢查清單

## 📦 部署前準備

### 1. 環境變數設定

```bash
# .env 或環境變數
NODE_ENV=production
DATABASE_PATH=/path/to/data/lucky-draw.db  # 可選，默認 ./data/lucky-draw.db
PORT=3000                                   # 可選，根據平台調整
```

### 2. 依賴安裝

```bash
npm ci --production  # 或 npm install --production
```

### 3. 構建應用（如果需要）

```bash
npm run build
```

---

## ✅ 性能優化檢查

### 自動應用的優化（無需手動操作）

✅ **數據庫優化**：

- SQLite WAL 模式
- 64MB 緩存
- 內存映射
- 所有性能索引

啟動時自動檢查和應用，日誌會顯示：

```
[DB] Applying performance optimization indexes...
[DB] Database initialized with performance optimizations at: ...
```

✅ **前端優化**：

- 雪花動畫優化（20個，GPU加速）
- 背景動畫 GPU 加速
- Transition 動畫優化

---

## 🔍 部署後驗證

### 1. 檢查數據庫索引

```bash
# 連接到數據庫
sqlite3 data/lucky-draw.db

# 查看所有索引
.indexes

# 應該包含這些性能索引：
# - idx_players_room_player
# - idx_players_room_role
# - idx_rooms_activity
# - idx_draw_orders_room
# 等等...

# 退出
.quit
```

### 2. 性能測試

#### A. 響應時間

```bash
# 測試首頁響應
curl -o /dev/null -s -w "Time: %{time_total}s\n" http://localhost:3000/

# 應該 < 100ms
```

#### B. 數據庫查詢速度

在應用日誌中查找：

```
grep "loadRoomFromDb" logs/*.log
# 應該看到 < 20ms 的查詢時間
```

#### C. WebSocket 延遲

創建房間並觀察瀏覽器開發者工具的 Network -> WS 標籤：

- 消息延遲應該 < 50ms
- 沒有大量重複的 `room_updated` 消息

### 3. 內存使用

```bash
# Linux/Mac
ps aux | grep node

# Windows PowerShell
Get-Process node | Select-Object WorkingSet, CPU

# 應該：
# - 空閒時：< 120MB
# - 10個房間：< 200MB
# - 30個房間：< 350MB
```

### 4. CPU 使用

```bash
# 使用 top 或 htop 觀察
top -p $(pgrep -f node)

# 應該：
# - 空閒時：< 5%
# - 活躍時：< 30%
```

---

## 🐛 常見問題排查

### 問題 1：索引未應用

**症狀**：查詢速度慢，CPU 使用高

**檢查**：

```bash
sqlite3 data/lucky-draw.db ".indexes players"
```

**解決**：

1. 刪除舊數據庫：`rm data/lucky-draw.db`
2. 重啟應用讓它重新初始化

### 問題 2：雪花動畫仍然卡頓

**檢查**：

1. 打開瀏覽器開發者工具 -> Performance
2. 錄製幾秒鐘
3. 查看 FPS 和渲染時間

**可能原因**：

- 舊的瀏覽器緩存，清除緩存後重試
- 設備性能太低，在設定中關閉雪花效果

### 問題 3：WebSocket 連接頻繁斷開

**檢查日誌**：

```bash
grep "WebSocket\|WS" logs/*.log
```

**可能原因**：

- 反向代理超時設定（如 Nginx）
- 需要添加 WebSocket 配置：
  ```nginx
  location / {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;  # 1小時
  }
  ```

### 問題 4：內存持續增長

**症狀**：內存使用超過 500MB

**可能原因**：

1. 定期清理未執行
2. 太多過期房間未清理

**檢查**：

```bash
sqlite3 data/lucky-draw.db "SELECT COUNT(*) FROM rooms;"
sqlite3 data/lucky-draw.db "SELECT COUNT(*) FROM players;"
```

**解決**：

```bash
# 手動觸發清理
sqlite3 data/lucky-draw.db "DELETE FROM rooms WHERE last_activity_at < strftime('%s', 'now') - 1800 AND game_state = 'waiting';"
```

---

## 📊 不同平台的建議設定

### Heroku (Free/Hobby)

```bash
# 最大 512MB RAM
# 建議設定：
DATABASE_PATH=/app/data/lucky-draw.db
```

- ✅ 支持 10-15 個並發房間
- ⚠️ 使用 ephemeral storage，重啟後數據丟失

### Railway / Render

```bash
# 512MB-1GB RAM
# 建議設定：
DATABASE_PATH=/data/lucky-draw.db
```

- ✅ 支持 20-30 個並發房間
- ✅ 持久化存儲可用

### Vercel / Netlify

⚠️ **不推薦**：

- Serverless 環境不適合 WebSocket
- SQLite 文件存儲問題
- 建議使用 VPS 或專用主機

### VPS (1GB RAM)

```bash
# 推薦配置
NODE_ENV=production
DATABASE_PATH=/var/lib/lucky-draw/lucky-draw.db
```

- ✅ 支持 30-50 個並發房間
- ✅ 完全控制，性能最佳

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 複製文件
COPY package*.json ./
RUN npm ci --production

COPY . .

# 創建數據目錄
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["npm", "start"]
```

掛載數據目錄：

```bash
docker run -v /path/to/data:/app/data -p 3000:3000 lucky-draw
```

---

## 🎯 推薦的生產環境配置

### 最小配置（Free Tier）

- **RAM**: 512MB
- **CPU**: 0.5 核心
- **磁碟**: 1GB
- **支持**: 10-15 個房間

### 推薦配置（小型應用）

- **RAM**: 1GB
- **CPU**: 1 核心
- **磁碟**: 5GB
- **支持**: 30-50 個房間

### 理想配置（中型應用）

- **RAM**: 2GB
- **CPU**: 2 核心
- **磁碟**: 10GB
- **支持**: 100+ 個房間

---

## 📝 部署後清單

- [ ] 應用成功啟動
- [ ] 看到 "Database initialized with performance optimizations" 日誌
- [ ] 數據庫索引已創建（使用 `.indexes` 檢查）
- [ ] 主頁雪花動畫流暢（60fps）
- [ ] 房間創建響應 < 100ms
- [ ] WebSocket 連接穩定
- [ ] 內存使用正常（< 200MB 空閒）
- [ ] CPU 使用正常（< 10% 空閒）
- [ ] 定期清理任務執行（查看日誌）
- [ ] 測試完整的抽獎流程
- [ ] 測試斷線重連功能

全部完成？🎉 你的應用已經準備好投入生產了！
