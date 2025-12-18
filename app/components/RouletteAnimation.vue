<template>
  <div class="roulette-container">
    <!-- 三段式狀態 UI -->

    <!-- 階段 1: 抽獎前 -->
    <div v-if="state === 'before'" class="before-draw">
      <div class="next-drawer-info">
        <div class="drawer-avatar">👤</div>
        <div class="drawer-details">
          <p class="label">
            {{
              isCurrentPlayer ? $t("game.yourTurn") : $t("game.nextDrawerLabel")
            }}
          </p>
          <h2 class="drawer-name">
            {{ currentDrawer?.name || $t("game.preparingDraw") }}
          </h2>
        </div>
      </div>

      <div class="progress-info">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="progress-text">{{ drawnCount }} / {{ totalCount }}</p>
      </div>

      <button
        class="btn btn-primary btn-lg draw-button"
        @click="startDraw"
        :disabled="!canDraw"
      >
        <span class="btn-icon">🎲</span>
        <span class="btn-text">{{ $t("game.startDraw") }}</span>
      </button>
    </div>

    <!-- 階段 2: 抽獎中 - 橫向滾動 -->
    <div v-if="state === 'drawing'" class="roulette-draw">
      <div class="roulette-wrapper">
        <!-- 中間指針／視窗框 -->
        <div class="roulette-pointer">
          <div class="pointer-arrow">▼</div>
        </div>

        <!-- 橫向滾動軌道 -->
        <div class="roulette-track-container">
          <div class="roulette-track" ref="trackRef" :style="trackStyle">
            <div
              v-for="(item, idx) in extendedItems"
              :key="`item-${idx}`"
              class="roulette-item"
              :class="{
                'is-winner': item.isWinner && showWinnerHighlight,
                'is-rare': item.isRare,
              }"
            >
              <div class="item-avatar">{{ item.emoji }}</div>
              <div class="item-name">{{ item.name }}</div>
            </div>
          </div>
        </div>

        <!-- 漸層遮罩 -->
        <div class="roulette-mask roulette-mask-left"></div>
        <div class="roulette-mask roulette-mask-right"></div>
      </div>

      <div class="drawing-hint">
        <div class="spinner">🎁</div>
        <p>{{ $t("game.drawing") }}</p>
      </div>
    </div>

    <!-- 階段 3: 抽獎後 - 全螢幕慶祝 -->
    <Transition name="result-reveal">
      <div v-if="state === 'after'" class="result-screen">
        <div class="confetti-layer">
          <div
            v-for="i in 30"
            :key="i"
            class="confetti"
            :style="getConfettiStyle(i)"
          ></div>
        </div>

        <div class="result-content">
          <div class="result-badge">🎉 {{ $t("game.drawResult") }} 🎉</div>

          <div class="result-card">
            <div class="drawer-info">
              <div class="avatar-large">👤</div>
              <h2>{{ displayDrawerName }}</h2>
              <p class="role-label">{{ $t("game.drawer") }}</p>
            </div>

            <div class="arrow-large">➡️</div>

            <div class="winner-info">
              <div class="avatar-large glow">🎁</div>
              <h2 class="winner-name">{{ displayWinnerName }}</h2>
              <p class="role-label">{{ $t("game.giftOwner") }}</p>
            </div>
          </div>

          <button
            v-if="canShowNextButton"
            class="btn btn-primary btn-lg next-button"
            @click="handleNext"
          >
            <span class="btn-icon">➡️</span>
            <span class="btn-text">{{
              isLastDraw ? $t("game.viewResult") : $t("game.nextDrawer")
            }}</span>
          </button>

          <!-- 非房主/非當前抽獎者的等待提示 -->
          <div v-else class="waiting-next-hint">
            <p>⏳ {{ $t("game.waitingForNext") }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Participant {
  id: number;
  name: string;
}

interface RouletteItem {
  id: number;
  name: string;
  emoji: string;
  isWinner: boolean;
  isRare: boolean;
}

interface ActualResult {
  drawerName: string;
  giftOwnerName: string;
}

const props = defineProps<{
  currentDrawer: Participant | null;
  participants: Participant[];
  drawnCount: number;
  totalCount: number;
  canDraw: boolean;
  isLastDraw: boolean;
  actualResult?: ActualResult | null;
  canShowNextButton?: boolean; // 是否顯示下一位按鈕（房主或當前抽獎者）
  isCurrentPlayer?: boolean; // 當前用戶是否是這一輪的抽獎者
}>();

const emit = defineEmits<{
  (e: "draw"): void;
  (e: "next"): void;
  (e: "complete"): void;
  (e: "animation-start"): void;
  (e: "animation-end"): void;
}>();

// 狀態管理
const state = ref<"before" | "drawing" | "after">("before");
const winnerName = ref("");
const trackRef = ref<HTMLElement | null>(null);
const trackStyle = ref({});
const showWinnerHighlight = ref(false); // 控制獲勝者高亮效果)

// 進度計算
const progress = computed(() => {
  if (props.totalCount === 0) return 0;
  return (props.drawnCount / props.totalCount) * 100;
});

// 實際禮物擁有者名稱（優先使用父組件傳入的實際結果）
const displayWinnerName = computed(() => {
  return props.actualResult?.giftOwnerName || winnerName.value;
});

// 實際抽獎者名稱（優先使用父組件傳入的實際結果）
const displayDrawerName = computed(() => {
  return props.actualResult?.drawerName || props.currentDrawer?.name || "-";
});

// 計算是否可以顯示下一位按鈕（默認為 true 以保持兼容性）
const canShowNextButton = computed(() => {
  return props.canShowNextButton ?? true;
});

// 擴展項目列表（用於無限滾動效果）
const extendedItems = ref<RouletteItem[]>([]);

// 抽獎動畫設定
const ITEM_GAP = 8; // 項目間距 (px)
const MIN_ITEMS = 120; // 最小項目數量（確保少人數時動畫效果一致）
const SPIN_DURATION = 5; // 主動畫持續時間 (秒) - 快速滾動
const FAKE_OUT_CHANCE = 0.175; // 假動作觸發機率 (17.5%)
const PAUSE_DURATION = 1.5; // 停頓揭曉時間 (秒)

// 動態計算項目寬度（根據螢幕尺寸）
function getItemWidth(): number {
  if (typeof window !== "undefined" && window.innerWidth <= 768) {
    return 80; // 手機版
  }
  return 100; // 桌面版
}

// 從實際 DOM 元素獲取精確寬度
function getActualItemWidth(): number {
  if (!trackRef.value) {
    return getItemWidth(); // fallback
  }
  const firstItem = trackRef.value.querySelector(
    ".roulette-item",
  ) as HTMLElement;
  if (firstItem) {
    const rect = firstItem.getBoundingClientRect();
    return rect.width;
  }
  return getItemWidth(); // fallback
}

function startDraw() {
  if (!props.canDraw) return;

  // 重置狀態
  showWinnerHighlight.value = false;
  trackStyle.value = {};

  // 階段轉換: before -> drawing
  state.value = "drawing";

  // 通知父組件動畫開始
  emit("animation-start");

  // 暫停背景動畫（如雪花）
  document.body.classList.add("animation-paused");

  // 呼叫父組件執行抽獎邏輯（先計算結果）
  emit("draw");

  // 延遲執行動畫，確保 actualResult prop 已更新
  setTimeout(() => {
    nextTick(() => {
      performDrawAnimation();
    });
  }, 50);
}

function performDrawAnimation() {
  // 準備滾動項目（不會透露獲勝者名字）
  prepareRouletteItems();

  // 等待 DOM 更新後獲取實際寬度
  nextTick(() => {
    const ITEM_WIDTH = getActualItemWidth();
    performDrawAnimationWithWidth(ITEM_WIDTH);
  });
}

function performDrawAnimationWithWidth(ITEM_WIDTH: number) {
  // 計算位置相關數值
  const winnerIndex = extendedItems.value.findIndex((item) => item.isWinner);
  const containerWidth = trackRef.value?.parentElement?.offsetWidth || 400;
  const centerOffset = containerWidth / 2 - ITEM_WIDTH / 2;
  const itemStep = ITEM_WIDTH + ITEM_GAP;
  const targetPosition = -(winnerIndex * itemStep) + centerOffset;

  // 使用單一流暢的減速動畫 - 從快到慢
  // cubic-bezier(0.1, 0.25, 0.1, 1) 產生快速開始、緩慢結束的效果
  trackStyle.value = {
    transform: `translateX(${targetPosition}px)`,
    transition: `transform ${SPIN_DURATION}s cubic-bezier(0.1, 0.25, 0.1, 1)`,
  };

  // 動畫結束後決定是否觸發假動作
  setTimeout(() => {
    const hasFakeOut = Math.random() < FAKE_OUT_CHANCE;

    if (hasFakeOut) {
      // 假動作：滑到下一格或部分下一格，然後回到原位
      // 偏移量：0.3~0.8 個格子（不會完全到下一格）
      const fakeOffset = (0.3 + Math.random() * 0.5) * itemStep;
      const fakePosition = targetPosition - fakeOffset; // 往前滑一點

      // 快速滑到假位置
      trackStyle.value = {
        transform: `translateX(${fakePosition}px)`,
        transition: `transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)`,
      };

      // 然後慢慢回到正確位置
      setTimeout(() => {
        trackStyle.value = {
          transform: `translateX(${targetPosition}px)`,
          transition: `transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)`,
        };

        // 回到位置後停頓揭曉
        setTimeout(() => {
          showWinnerHighlight.value = true;
        }, 600 + 300);

        setTimeout(
          () => {
            state.value = "after";
            emit("animation-end");
            document.body.classList.remove("animation-paused");
          },
          600 + PAUSE_DURATION * 1000,
        );
      }, 400);
    } else {
      // 無假動作：直接停頓揭曉
      setTimeout(() => {
        showWinnerHighlight.value = true;
      }, 300);

      setTimeout(() => {
        state.value = "after";
        emit("animation-end");
        document.body.classList.remove("animation-paused");
      }, PAUSE_DURATION * 1000);
    }
  }, SPIN_DURATION * 1000);
}

function prepareRouletteItems() {
  const items: RouletteItem[] = [];
  const emojis = ["🎁", "🎀", "🎊", "🎉", "🎈", "⭐", "💝", "🎄"];

  // 計算需要的克隆次數，確保至少有 MIN_ITEMS 個項目
  const participantCount = props.participants.length || 1;
  const cloneTimes = Math.max(Math.ceil(MIN_ITEMS / participantCount), 12);

  // 克隆參與者列表多次（打亂順序增加神秘感）
  for (let clone = 0; clone < cloneTimes; clone++) {
    // 每輪隨機打亂參與者順序
    const shuffled = [...props.participants].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, idx) => {
      items.push({
        id: p.id,
        name: p.name,
        emoji: emojis[idx % emojis.length],
        isWinner: false,
        isRare: Math.random() > 0.7, // 30% 機率是稀有
      });
    });
  }

  // 隨機選擇一個位置作為「視覺停止點」（在中間偏後的位置）
  const targetZoneStart = Math.floor(items.length * 0.55);
  const targetZoneEnd = Math.floor(items.length * 0.75);
  const winnerIdx =
    targetZoneStart +
    Math.floor(Math.random() * (targetZoneEnd - targetZoneStart));

  // 將 winner 位置的名字替換為實際結果
  // 這樣動畫停止時顯示的就是正確的禮物擁有者
  if (props.actualResult?.giftOwnerName) {
    items[winnerIdx].name = props.actualResult.giftOwnerName;
  }

  items[winnerIdx].isWinner = true;
  items[winnerIdx].isRare = true;

  extendedItems.value = items;
}

function handleNext() {
  if (props.isLastDraw) {
    emit("complete");
  } else {
    state.value = "before";
    trackStyle.value = {};
    extendedItems.value = [];
    showWinnerHighlight.value = false;
    emit("next");
  }
}

// 彩帶動畫樣式生成
function getConfettiStyle(index: number) {
  const colors = ["#BF092F", "#3B9797", "#62B6B7", "#F59E0B", "#FFD700"];
  return {
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 3}s`,
    backgroundColor: colors[index % colors.length],
    animationDuration: `${2 + Math.random() * 2}s`,
  };
}

// 暴露重置方法和開始動畫方法
defineExpose({
  reset: () => {
    state.value = "before";
    trackStyle.value = {};
    extendedItems.value = [];
    showWinnerHighlight.value = false;
  },
  // 讓父組件可以外部觸發動畫（用於同步多個客戶端）
  triggerAnimation: () => {
    if (state.value !== "drawing") {
      showWinnerHighlight.value = false;
      trackStyle.value = {};
      state.value = "drawing";
      emit("animation-start");
      document.body.classList.add("animation-paused");
      nextTick(() => {
        performDrawAnimation();
      });
    }
  },
});
</script>

<style scoped>
.roulette-container {
  width: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* ========== 階段 1: 抽獎前 ========== */
.before-draw {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  width: 100%;
  max-width: 500px;
  animation: fadeIn 0.5s ease;
}

.next-drawer-info {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 32px;
  background: var(--theme-surface);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 100%;
}

.drawer-avatar {
  font-size: 4rem;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
}

.drawer-details {
  flex: 1;
  text-align: left;
}

.label {
  font-size: 0.9rem;
  color: var(--theme-text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.drawer-name {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--theme-text);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.progress-info {
  width: 100%;
}

.progress-bar {
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--theme-accent) 0%,
    var(--theme-secondary) 100%
  );
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px var(--theme-accent);
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--theme-text);
}

.draw-button {
  width: 100%;
  padding: 20px 40px;
  font-size: 1.3rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* ========== 階段 2: 抽獎中 ========== */
.roulette-draw {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.roulette-wrapper {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(
    90deg,
    var(--theme-bg-deep) 0%,
    rgba(0, 0, 0, 0.8) 20%,
    rgba(0, 0, 0, 0.8) 80%,
    var(--theme-bg-deep) 100%
  );
  border: 2px solid var(--theme-accent);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 0 60px rgba(98, 182, 183, 0.1);
}

.roulette-pointer {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(98, 182, 183, 0.2) 20%,
    rgba(98, 182, 183, 0.4) 50%,
    rgba(98, 182, 183, 0.2) 80%,
    transparent 100%
  );
  border-left: 2px solid rgba(98, 182, 183, 0.6);
  border-right: 2px solid rgba(98, 182, 183, 0.6);
}

.pointer-arrow {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  color: var(--theme-accent);
  filter: drop-shadow(0 2px 8px var(--theme-accent));
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(8px);
  }
}

.roulette-track-container {
  position: relative;
  height: 100%;
  padding: 20px 0;
}

.roulette-track {
  display: flex;
  height: 100%;
  gap: 8px;
  will-change: transform;
}

.roulette-item {
  flex: 0 0 100px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--theme-surface);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.roulette-item.is-rare {
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.1) 0%,
    rgba(255, 165, 0, 0.1) 100%
  );
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(255, 215, 0, 0.3);
}

.roulette-item.is-winner {
  background: linear-gradient(
    135deg,
    var(--theme-primary) 0%,
    var(--theme-accent) 100%
  );
  border-color: #ffd700;
  transform: scale(1.1);
  box-shadow:
    0 8px 24px rgba(191, 9, 47, 0.6),
    0 0 40px rgba(255, 215, 0, 0.8);
  animation: winner-glow 1s infinite;
}

@keyframes winner-glow {
  0%,
  100% {
    box-shadow:
      0 8px 24px rgba(191, 9, 47, 0.6),
      0 0 40px rgba(255, 215, 0, 0.8);
  }
  50% {
    box-shadow:
      0 8px 32px rgba(191, 9, 47, 0.8),
      0 0 60px rgba(255, 215, 0, 1);
  }
}

.item-avatar {
  font-size: 2.5rem;
  margin-bottom: 4px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--theme-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 90%;
}

.roulette-mask {
  position: absolute;
  top: 0;
  width: 100px;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.roulette-mask-left {
  left: 0;
  background: linear-gradient(90deg, var(--theme-bg-deep) 0%, transparent 100%);
}

.roulette-mask-right {
  right: 0;
  background: linear-gradient(
    270deg,
    var(--theme-bg-deep) 0%,
    transparent 100%
  );
}

.drawing-hint {
  text-align: center;
  animation: fadeIn 0.5s ease;
}

.spinner {
  font-size: 3rem;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ========== 階段 3: 抽獎後 ========== */
.result-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    var(--theme-bg-start) 0%,
    var(--theme-bg-end) 100%
  );
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confetti-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -20px;
  animation: confetti-fall linear infinite;
}

@keyframes confetti-fall {
  to {
    transform: translateY(100vh) rotate(360deg);
  }
}

.result-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  max-width: 700px;
  width: 100%;
  z-index: 1;
}

.result-badge {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--theme-text);
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.result-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 40px;
  background: var(--theme-surface);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  width: 100%;
  animation: slide-up 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s backwards;
}

@keyframes slide-up {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.drawer-info,
.winner-info {
  flex: 1;
  text-align: center;
}

.avatar-large {
  font-size: 5rem;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.4));
}

.avatar-large.glow {
  animation: glow-pulse 2s infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.4))
      drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.4))
      drop-shadow(0 0 40px rgba(255, 215, 0, 1));
    transform: scale(1.1);
  }
}

.winner-name {
  font-size: 2rem;
  font-weight: 700;
  color: var(--theme-accent);
  text-shadow: 0 2px 12px rgba(98, 182, 183, 0.6);
  margin-bottom: 8px;
}

.result-card h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: 8px;
}

.role-label {
  font-size: 0.95rem;
  color: var(--theme-text-secondary);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.arrow-large {
  font-size: 3rem;
  animation: arrow-bounce 1s infinite;
}

@keyframes arrow-bounce {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(10px);
  }
}

.next-button {
  width: 100%;
  max-width: 400px;
  animation: slide-up 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.4s backwards;
}

/* 等待下一位提示 */
.waiting-next-hint {
  text-align: center;
  padding: 20px;
  opacity: 0.8;
  animation: pulse 2s ease-in-out infinite;
}

.waiting-next-hint p {
  font-size: 1.1rem;
  color: var(--theme-text-secondary, rgba(255, 255, 255, 0.8));
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* 轉場動畫 */
.result-reveal-enter-active {
  animation: reveal 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.result-reveal-leave-active {
  animation: reveal 0.3s reverse;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 響應式 */
@media (max-width: 768px) {
  .result-card {
    flex-direction: column;
    gap: 20px;
    padding: 30px 20px;
  }

  .arrow-large {
    transform: rotate(90deg);
    font-size: 2.5rem;
  }

  .drawer-name {
    font-size: 1.5rem;
  }

  .avatar-large {
    font-size: 4rem;
  }

  .result-badge {
    font-size: 1.2rem;
  }

  .roulette-item {
    flex: 0 0 80px;
  }

  .item-avatar {
    font-size: 2rem;
  }
}

/* 暫停其他動畫的全域類別 */
:global(body.animation-paused .snowflake) {
  animation-play-state: paused;
}

:global(body.animation-paused .app-layout::before) {
  animation-play-state: paused;
}
</style>
