# 🎄 聖誕交換禮物抽獎系統

一個互動式的聖誕節交換禮物抽獎網頁應用程式，支援單機模式和多人連線模式。

## ✨ 功能特色

### 🎲 連鎖式抽獎
- 抽到誰的禮物，就換誰抽！
- 使用 Mulberry32 PRNG 確保隨機性和可重複性
- Derangement 演算法確保不會抽到自己的禮物

### 🖥️ 單機模式
- 由主持人操作所有抽獎流程
- 適合投影到大螢幕給所有人觀看
- 支援 2-100 人參與
- 可自訂參與者名單
- 進階選項：可設定特定配對（需密碼驗證）

### 🌐 連線模式
- 每個人用自己的裝置加入房間
- 輪到時自己按下抽獎按鈕
- 即時同步抽獎過程給所有人
- 主機可協助加入虛擬玩家
- 主機可強制開始遊戲

### 🔒 安全功能
- 管理員密碼保護重置功能
- Seed 持久化，重新整理不影響結果
- 所有資料僅存在本地瀏覽器

## 🚀 快速開始

### 安裝依賴
```bash
npm install
```

### 開發模式
```bash
npm run dev
```

### 生產環境建置
```bash
npm run build
```

### 預覽生產版本
```bash
npm run preview
```

## 📁 專案結構

```
draw/
├── app/
│   ├── pages/
│   │   ├── index.vue      # 首頁 - 模式選擇
│   │   ├── solo.vue       # 單機模式
│   │   └── online.vue     # 連線模式
│   ├── composables/
│   │   ├── useGameState.ts    # 遊戲狀態管理
│   │   ├── useWebSocket.ts    # WebSocket 連線管理
│   │   └── useSiteConfig.ts   # 網站配置
│   ├── layouts/
│   │   └── default.vue    # 預設版面配置
│   └── app.vue            # 根組件
├── server/
│   ├── routes/
│   │   └── ws.ts          # WebSocket 伺服器端點
│   └── utils/
│       └── room.ts        # 房間管理邏輯
├── .env                   # 環境配置檔
├── .env.example           # 環境配置範例
├── nuxt.config.ts         # Nuxt 配置
└── package.json
```

## ⚙️ 環境配置

可以透過 `.env` 檔案自訂應用程式設定。複製 `.env.example` 為 `.env` 開始設定：

```bash
cp .env.example .env
```

### 可配置選項

| 變數名稱 | 預設值 | 說明 |
|---------|--------|------|
| `NUXT_PUBLIC_SITE_TITLE` | 聖誕交換禮物抽獎 | 網站標題 |
| `NUXT_PUBLIC_SITE_SUBTITLE` | 連鎖式抽獎 - 抽到誰的禮物，就換誰抽！ | 網站副標題 |
| `NUXT_PUBLIC_SITE_ICON_LEFT` | 🎄 | 標題左側圖示 |
| `NUXT_PUBLIC_SITE_ICON_RIGHT` | 🎁 | 標題右側圖示 |
| `NUXT_PUBLIC_THEME_PRIMARY` | #c41e3a | 主題主色（聖誕紅） |
| `NUXT_PUBLIC_THEME_SECONDARY` | #228b22 | 主題輔色（聖誕綠） |
| `NUXT_PUBLIC_THEME_BG_FROM` | #1a472a | 背景漸層起始色 |
| `NUXT_PUBLIC_THEME_BG_TO` | #2d1f1f | 背景漸層結束色 |
| `NUXT_PUBLIC_MIN_PLAYERS` | 2 | 最小參與人數 |
| `NUXT_PUBLIC_MAX_PLAYERS` | 100 | 單機模式最大人數 |
| `NUXT_PUBLIC_ONLINE_MAX_PLAYERS` | 50 | 連線模式最大人數 |
| `NUXT_PUBLIC_ROOM_CODE_LENGTH` | 6 | 房間代碼長度 |
| `NUXT_PUBLIC_FEATURES_SNOWFLAKES` | true | 是否顯示雪花動畫 |
| `NUXT_PUBLIC_FEATURES_PASSWORD_PROTECTION` | true | 是否啟用密碼保護 |

### 配置範例

#### 情人節主題
```env
NUXT_PUBLIC_SITE_TITLE=情人節交換禮物
NUXT_PUBLIC_SITE_ICON_LEFT=💕
NUXT_PUBLIC_SITE_ICON_RIGHT=🎀
NUXT_PUBLIC_THEME_PRIMARY=#e91e63
NUXT_PUBLIC_THEME_SECONDARY=#ff4081
NUXT_PUBLIC_THEME_BG_FROM=#2d1f2d
NUXT_PUBLIC_THEME_BG_TO=#1a1a2e
NUXT_PUBLIC_FEATURES_SNOWFLAKES=false
```

#### 公司活動主題
```env
NUXT_PUBLIC_SITE_TITLE=年終交換禮物抽獎
NUXT_PUBLIC_SITE_SUBTITLE=公司年終活動專用
NUXT_PUBLIC_SITE_ICON_LEFT=🎊
NUXT_PUBLIC_SITE_ICON_RIGHT=🎉
NUXT_PUBLIC_MAX_PLAYERS=200
NUXT_PUBLIC_ONLINE_MAX_PLAYERS=100
```

#### 新年主題
```env
NUXT_PUBLIC_SITE_TITLE=新年交換禮物
NUXT_PUBLIC_SITE_SUBTITLE=新年快樂！一起來抽禮物吧！
NUXT_PUBLIC_SITE_ICON_LEFT=🧧
NUXT_PUBLIC_SITE_ICON_RIGHT=🎆
NUXT_PUBLIC_THEME_PRIMARY=#d4af37
NUXT_PUBLIC_THEME_SECONDARY=#c41e3a
NUXT_PUBLIC_THEME_BG_FROM=#8b0000
NUXT_PUBLIC_THEME_BG_TO=#2d0a0a
NUXT_PUBLIC_FEATURES_SNOWFLAKES=false
```

### 🎨 如何切換主題

1. **編輯 `.env` 檔案**
   ```bash
   # Windows
   notepad .env
   
   # Mac/Linux
   nano .env
   ```

2. **修改相關設定值**
   - 改變標題：`NUXT_PUBLIC_SITE_TITLE`
   - 改變圖示：`NUXT_PUBLIC_SITE_ICON_LEFT` 和 `NUXT_PUBLIC_SITE_ICON_RIGHT`
   - 改變主色調：`NUXT_PUBLIC_THEME_PRIMARY`（影響按鈕顏色）
   - 改變背景：`NUXT_PUBLIC_THEME_BG_FROM` 和 `NUXT_PUBLIC_THEME_BG_TO`
   - 關閉雪花：`NUXT_PUBLIC_FEATURES_SNOWFLAKES=false`

3. **重新啟動伺服器**
   ```bash
   # 停止目前的伺服器 (Ctrl+C)
   # 重新啟動
   npm run dev
   ```

4. **色彩選擇建議**
   - 使用 [Color Hunt](https://colorhunt.co/) 或 [Coolors](https://coolors.co/) 尋找配色靈感
   - 主色 (`THEME_PRIMARY`) 應與背景有足夠對比度
   - 背景漸層的兩個顏色不要差異太大，以免刺眼

## 🎮 使用說明

### 單機模式
1. 在首頁選擇「單機模式」
2. 設定參與人數（或手動編輯參與者名單）
3. 首次使用需設定管理員密碼
4. 點擊「開始抽獎」
5. 依序點擊「抽獎」和「下一位」按鈕

### 連線模式
1. 主機選擇「連線模式」→「建立新房間」
2. 輸入名字和人數上限
3. 分享房間代碼給其他參與者
4. 其他人選擇「加入房間」輸入代碼和名字
5. 所有人準備好後，主機點擊「開始遊戲」
6. 輪到誰就由誰按下抽獎按鈕

## 🛠️ 技術棧

- **框架**: Nuxt 4.2.2
- **前端**: Vue 3.5.25
- **建置工具**: Vite 7.3.0
- **伺服器**: Nitro 2.12.9
- **即時通訊**: WebSocket (Nitro 內建支援)
- **狀態管理**: Vue Composables + localStorage

## 📝 進階設定

### 設定特定配對（進階選項）
1. 在單機模式設定頁面點擊「進階選項」
2. 輸入管理員密碼
3. 選擇 A → B 的配對（A 會抽到 B 的禮物）
4. 此功能設計為隱藏，不會在介面上明顯顯示

### 重設 Seed
- 需要管理員密碼
- 會生成新的隨機種子
- 建議在開始前設定好，避免中途更改

## 🚀 部署指南

本專案使用 Nuxt 4，需要支援 Node.js 伺服器環境的平台部署（因為使用 WebSocket）。

### 推薦平台

#### 1. Render（推薦 - 免費方案可用）
1. 在 [Render](https://render.com/) 註冊帳號
2. 連接你的 GitHub 儲存庫
3. 建立新的「Web Service」
4. 設定：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node .output/server/index.mjs`
   - **Environment**: `Node`
5. 新增環境變數（可選，在 Environment 頁面設定）
6. 點擊 Deploy

#### 2. Railway
1. 在 [Railway](https://railway.app/) 註冊帳號
2. 從 GitHub 建立新專案
3. Railway 會自動偵測 Nuxt 專案
4. 設定環境變數（如需要）
5. 自動部署

#### 3. Fly.io
```bash
# 安裝 flyctl
npm install -g flyctl

# 登入
fly auth login

# 建立應用程式
fly launch

# 部署
fly deploy
```

#### 4. 自架 VPS（例如 DigitalOcean、Linode）
```bash
# 在伺服器上
git clone <your-repo-url>
cd draw
npm install
npm run build

# 使用 PM2 管理程序
npm install -g pm2
pm2 start .output/server/index.mjs --name "draw"
pm2 save
pm2 startup
```

### ⚠️ 不支援的平台
以下平台**不支援** WebSocket，無法使用連線模式：
- Vercel（Serverless 函數不支援持久連線）
- Netlify（同上）
- GitHub Pages（純靜態）

如果只需要**單機模式**，可以使用靜態部署：
```bash
# 修改 nuxt.config.ts，設定 ssr: false
npm run generate
# 將 .output/public 部署到任何靜態伺服器
```

### 環境變數設定
在部署平台設定以下環境變數（全部可選）：
- `NUXT_PUBLIC_SITE_TITLE` - 網站標題
- `NUXT_PUBLIC_SITE_ICON_LEFT` - 左側圖示
- `NUXT_PUBLIC_SITE_ICON_RIGHT` - 右側圖示
- `NUXT_PUBLIC_THEME_PRIMARY` - 主題色
- `NUXT_PUBLIC_FEATURES_SNOWFLAKES` - 是否顯示雪花

## 🎨 介面預覽

- 聖誕節主題配色（紅綠金）
- 雪花動畫背景
- 響應式設計，支援手機和電腦
- 抽獎動畫效果
- 完成時彩帶慶祝動畫

## 📄 授權

MIT License

---

🎁 祝大家聖誕快樂！Merry Christmas! 🎄
