# 🎰 輪盤抽獎動畫組件使用指南

## 概述

`RouletteAnimation.vue` 是一個橫向滾動抽獎動畫組件，實現了清晰的三段式 UX 流程。

## 特色

### ✨ 三段式狀態管理

1. **抽獎前 (Before)**
   - 顯示「下一位抽獎者」資訊
   - 進度條顯示 X/N 進度
   - 大型「開始抽獎」按鈕

2. **抽獎中 (Drawing)**
   - 橫向滾動動畫
   - 3.5 秒動畫時長，期待感十足
   - 中間指針視覺引導
   - 自動暫停背景動畫（雪花等）

3. **抽獎後 (After)**
   - 全螢幕慶祝畫面
   - 彩帶動畫
   - 清晰顯示抽獎者 → 禮物擁有者
   - 「下一位」或「查看結果」按鈕

### 🎨 視覺效果

- **漸層遮罩**: 左右兩側漸層，營造無限滾動感
- **中間指針**: 帶發光效果的視窗框
- **稀有物品**: 30% 機率出現金邊特效
- **中獎動畫**: 脈動光暈 + 放大效果
- **彩帶慶祝**: 30 個彩帶從天而降

### ⚡ 性能優化

- **預先計算結果**: 點擊按鈕時立即計算，動畫只是演出
- **will-change**: 優化 GPU 加速
- **暫停非關鍵動畫**: 抽獎時暫停背景裝飾
- **cubic-bezier 緩動**: 平滑減速，模擬真實感

## 使用方法

### 基本用法

```vue
<template>
  <RouletteAnimation
    :current-drawer="currentDrawer"
    :participants="participants"
    :drawn-count="drawnCount"
    :total-count="totalCount"
    :can-draw="canDraw"
    :is-last-draw="isLastDraw"
    @draw="handleDraw"
    @next="handleNext"
    @complete="handleComplete"
  />
</template>

<script setup>
import RouletteAnimation from "~/components/RouletteAnimation.vue";

const currentDrawer = ref({ id: 1, name: "小明" });
const participants = ref([
  { id: 1, name: "小明" },
  { id: 2, name: "小華" },
  { id: 3, name: "小美" },
]);
const drawnCount = ref(0);
const totalCount = ref(3);
const canDraw = ref(true);
const isLastDraw = computed(() => drawnCount.value === totalCount.value - 1);

function handleDraw() {
  // 在這裡執行抽獎邏輯（PRNG + Derangement）
  // 結果計算完成後，動畫會自動播放
  console.log("執行抽獎計算...");
}

function handleNext() {
  // 進入下一位抽獎者
  drawnCount.value++;
  canDraw.value = true;
}

function handleComplete() {
  // 所有人抽完，跳轉到結果頁面
  console.log("抽獎完成！");
}
</script>
```

### Props 說明

| Prop            | 類型                  | 必填 | 說明                          |
| --------------- | --------------------- | ---- | ----------------------------- |
| `currentDrawer` | `Participant \| null` | ✅   | 當前抽獎者物件 `{ id, name }` |
| `participants`  | `Participant[]`       | ✅   | 所有參與者列表                |
| `drawnCount`    | `number`              | ✅   | 已完成抽獎人數                |
| `totalCount`    | `number`              | ✅   | 總參與人數                    |
| `canDraw`       | `boolean`             | ✅   | 是否可以抽獎                  |
| `isLastDraw`    | `boolean`             | ✅   | 是否最後一位                  |

### Events 說明

| Event      | 參數 | 說明                                   |
| ---------- | ---- | -------------------------------------- |
| `draw`     | -    | 使用者點擊「開始抽獎」，應執行抽獎邏輯 |
| `next`     | -    | 使用者點擊「下一位」，進入下一輪       |
| `complete` | -    | 最後一位抽完，應跳轉到結果頁           |

### Expose 方法

```vue
<script setup>
const rouletteRef = ref();

// 重置組件狀態（用於重新開始）
function resetAnimation() {
  rouletteRef.value?.reset();
}
</script>

<template>
  <RouletteAnimation ref="rouletteRef" ... />
</template>
```

## 整合到現有專案

### 1. 在 solo.vue 中使用

```vue
<template>
  <div>
    <!-- 設定階段保持原樣 -->
    <template v-if="state.phase === 'setup'">
      <!-- ... 原有設定 UI ... -->
    </template>

    <!-- 抽獎階段 - 使用新組件 -->
    <template v-if="state.phase === 'drawing'">
      <RouletteAnimation
        :current-drawer="getCurrentDrawer()"
        :participants="state.participants"
        :drawn-count="state.results.length"
        :total-count="state.participants.length"
        :can-draw="!hasDrawnCurrent"
        :is-last-draw="state.currentIndex === state.participants.length - 1"
        @draw="handlePerformDraw"
        @next="handleNextDraw"
        @complete="celebrate"
      />
    </template>
  </div>
</template>

<script setup>
// 原有邏輯保持不變
function handlePerformDraw() {
  if (isDrawing.value) return;

  // 執行抽獎計算
  const result = performDraw();
  if (result) {
    const giftOwner = getParticipant(result.giftOwnerId);
    if (giftOwner) {
      resultGiftOwner.value = giftOwner.name;
    }
  }

  hasDrawnCurrent.value = true;
}
</script>
```

### 2. 在 online.vue 中使用

```vue
<template>
  <div>
    <!-- 等待階段 -->
    <template v-if="room.status === 'waiting'">
      <!-- ... 等待房間 UI ... -->
    </template>

    <!-- 遊戲進行中 -->
    <template v-if="room.status === 'playing'">
      <RouletteAnimation
        :current-drawer="currentDrawer"
        :participants="players"
        :drawn-count="results.length"
        :total-count="players.length"
        :can-draw="isMyTurn && !hasDrawn"
        :is-last-draw="results.length === players.length - 1"
        @draw="performMyDraw"
        @next="waitForNextPlayer"
        @complete="goToResults"
      />
    </template>
  </div>
</template>
```

## 自訂樣式

### 調整動畫時長

```vue
<script setup>
// 在 RouletteAnimation.vue 中修改常數
const SPIN_DURATION = 3.5; // 秒，建議 2.5-4 秒
</script>
```

### 調整項目尺寸

```vue
<script setup>
const ITEM_WIDTH = 100; // px，每個項目寬度
const ITEM_GAP = 8; // px，項目間距
</script>
```

### 自訂 Emoji 圖示

```vue
<script setup>
function prepareRouletteItems() {
  // 修改這裡的 emojis 陣列
  const emojis = ["🎁", "🎀", "🎊", "🎉", "🎈", "⭐", "💝", "🎄"];
  // ...
}
</script>
```

### 主題色彩調整

所有顏色都使用 CSS 變數，會自動跟隨全域主題：

```css
/* 自動使用的變數 */
var(--theme-primary)      /* 主色調 */
var(--theme-secondary)    /* 次要色 */
var(--theme-accent)       /* 強調色 */
var(--theme-surface)      /* 表面 */
var(--theme-bg-start)     /* 背景漸層 */
var(--theme-text)         /* 文字 */
```

## 效能建議

### 行動裝置優化

1. **減少克隆次數**

   ```vue
   const CLONE_TIMES = 3 // 手機用 3-4 次，桌面用 5-6 次
   ```

2. **縮短動畫時間**

   ```vue
   const SPIN_DURATION = 2.5 // 手機用 2.5 秒，桌面用 3.5-4 秒
   ```

3. **關閉不必要的效果**
   ```css
   @media (max-width: 768px) {
     .confetti {
       display: none; /* 手機關閉彩帶 */
     }
   }
   ```

### 避免卡頓

- ✅ 抽獎結果在按鈕點擊時**立即計算**
- ✅ 動畫只是**視覺演出**，不涉及計算
- ✅ 使用 `will-change: transform` 啟用 GPU
- ✅ 抽獎時暫停背景動畫
- ✅ 使用 `cubic-bezier` 而非線性緩動

## 瀏覽器支援

- ✅ Chrome 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Edge 90+
- ⚠️ 需要支援 CSS `backdrop-filter`

## 範例場景

### 聖誕節主題

```vue
<script setup>
// 在 prepareRouletteItems 中使用聖誕 emoji
const emojis = ["🎄", "🎅", "⛄", "🎁", "🔔", "⭐", "🕯️", "🧦"];
</script>
```

### 新年主題

```vue
<script setup>
const emojis = ["🧧", "🎆", "🏮", "🐉", "💰", "🎊", "🎉", "🍊"];
</script>
```

### 派對主題

```vue
<script setup>
const emojis = ["🎈", "🎉", "🎊", "🥳", "🍾", "🎂", "🎁", "✨"];
</script>
```

## 故障排除

### 動畫不播放

1. 確認 `@draw` 事件有正確觸發
2. 檢查 `extendedItems` 是否有資料
3. 確認 `trackRef` 有正確綁定

### 停止位置不準

1. 檢查 `ITEM_WIDTH` 和實際 CSS 寬度是否一致
2. 確認 `ITEM_GAP` 和 CSS `gap` 相符
3. 調整 `winnerIndex` 計算位置

### 手機版卡頓

1. 減少 `CLONE_TIMES` 到 3
2. 縮短 `SPIN_DURATION` 到 2.5 秒
3. 關閉 `confetti` 動畫
4. 移除 `motion blur` 效果

## 進階自訂

### 加入音效

```vue
<script setup>
function startDraw() {
  // 播放抽獎音效
  const spinSound = new Audio("/sounds/spin.mp3");
  spinSound.play();

  // 動畫結束時播放結果音效
  setTimeout(() => {
    const resultSound = new Audio("/sounds/win.mp3");
    resultSound.play();
  }, SPIN_DURATION * 1000);
}
</script>
```

### 加入震動反饋（手機）

```vue
<script setup>
function startDraw() {
  // 開始震動
  if ("vibrate" in navigator) {
    navigator.vibrate(200);
  }

  // 結束時震動
  setTimeout(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }, SPIN_DURATION * 1000);
}
</script>
```

## 授權

MIT License - 可自由修改和使用
