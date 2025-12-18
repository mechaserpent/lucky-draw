<template>
  <div>
    <header>
      <h1>
        {{ dynamicConfig.settings.value.siteIconLeft }}
        {{ dynamicConfig.settings.value.siteTitle }}
        {{ dynamicConfig.settings.value.siteIconRight }}
      </h1>
      <p>
        <span class="mode-badge solo">🖥️ {{ $t("home.soloMode") }}</span>
        {{ $t("game.hostControl") }}
      </p>
    </header>

    <!-- 設定階段 -->
    <template v-if="state.phase === 'setup'">
      <!-- 參與者管理 -->
      <div class="card">
        <h2>
          👥 {{ $t("game.participants") }}
          <span class="count-badge"
            >({{ state.participants.length }}{{ $t("common.players") }})</span
          >
        </h2>

        <div class="participants-grid">
          <div
            v-for="(p, idx) in state.participants"
            :key="p.id"
            class="participant-item"
          >
            <span class="number">{{ idx + 1 }}</span>
            <input
              type="text"
              :value="p.name"
              @change="
                (e) =>
                  updateParticipant(p.id, (e.target as HTMLInputElement).value)
              "
              autocomplete="off"
            />
            <button
              class="btn-icon"
              @click="removeParticipant(p.id)"
              :title="$t('common.delete')"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="add-participant">
          <input
            type="text"
            class="input"
            v-model="newParticipantName"
            :placeholder="$t('game.addParticipant')"
            @keypress.enter="handleAddParticipant"
            autocomplete="off"
          />
          <button class="btn btn-secondary" @click="handleAddParticipant">
            ➕ {{ $t("common.add") }}
          </button>
        </div>
      </div>

      <!-- 抽獎設定 -->
      <div class="card">
        <h2>⚙️ {{ $t("game.drawSettings") }}</h2>

        <div class="start-options">
          <label>
            <input type="radio" v-model="state.startMode" value="random" />
            {{ $t("game.randomFirst") }}
          </label>
          <label>
            <input type="radio" v-model="state.startMode" value="manual" />
            {{ $t("game.manualFirst") }}：
          </label>
          <select
            v-model="state.manualStarterId"
            :disabled="state.startMode !== 'manual'"
          >
            <option :value="null">{{ $t("game.selectParticipant") }}</option>
            <option
              v-for="(p, idx) in state.participants"
              :key="p.id"
              :value="p.id"
            >
              {{ idx + 1 }}. {{ p.name }}
            </option>
          </select>
        </div>

        <!-- 進階選項 -->
        <AdvancedSettings
          :participants="state.participants"
          :fixed-pairs="state.fixedPairs"
          :is-open="showAdvanced"
          @toggle="handleAdvancedToggle"
          @add-pair="handleAddFixedPair"
          @remove-pair="removeFixedPair"
        />

        <div class="seed-display">
          🎲 {{ $t("common.seed") }}: {{ state.seed }}
          <button
            class="btn btn-secondary btn-sm"
            @click="showResetSeedModal = true"
          >
            {{ $t("game.resetSeed") }}
          </button>
        </div>

        <div class="controls">
          <button class="btn btn-primary" @click="handleStartDraw">
            🎲 {{ $t("game.startGame") }}
          </button>
          <button class="btn btn-danger" @click="handleResetAll">
            🗑️ {{ $t("game.resetAll") }}
          </button>
          <button class="btn btn-secondary" @click="handleClearCache">
            🧹 {{ $t("game.clearCache") }}
          </button>
          <button class="btn btn-secondary" @click="router.push('/')">
            🏠 {{ $t("common.home") }}
          </button>
        </div>
      </div>
    </template>

    <!-- 抽獎階段 -->
    <template v-if="state.phase === 'drawing'">
      <div class="card">
        <RouletteAnimation
          :current-drawer="getCurrentDrawer()"
          :participants="state.participants"
          :drawn-count="state.results.length"
          :total-count="state.participants.length"
          :can-draw="!hasDrawnCurrent"
          :is-last-draw="state.currentIndex >= state.participants.length - 1"
          :actual-result="lastDrawResult"
          @draw="handlePerformDraw"
          @next="handleNextDraw"
          @complete="handleComplete"
          @animation-start="isDrawing = true"
          @animation-end="isDrawing = false"
        />
      </div>

      <!-- 結果列表 -->
      <ResultsList
        :results="formattedResults"
        :is-drawing="isDrawing"
        :current-drawer-name="getCurrentDrawer()?.name"
      />

      <div class="controls">
        <button class="btn btn-secondary" @click="showViewSettingsModal = true">
          👁️ {{ $t("game.viewSettings") }}
        </button>
        <button class="btn btn-danger" @click="handleResetAll">
          🔄 {{ $t("game.restart") }}
        </button>
      </div>
    </template>

    <!-- 進度側邊面板 -->
    <ProgressPanel
      v-if="state.phase === 'drawing' || state.phase === 'complete'"
      :drawn-count="state.results.length"
      :total-count="state.participants.length"
      :players="progressPlayers"
    />
    <!-- 完成階段 - 跳轉至結果頁面 -->
    <template v-if="state.phase === 'complete'">
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner">🎉</div>
          <h2>{{ $t("game.preparing") }}</h2>
        </div>
      </div>
    </template>

    <!-- 彈窗們 -->

    <!-- 進階選項密碼驗證 -->
    <PasswordModal
      v-model="showAdvancedModal"
      :title="$t('modal.advancedVerify')"
      :confirm-text="$t('common.confirm')"
      confirm-button-class="btn-primary"
      @confirm="confirmAdvanced"
    />

    <!-- 重設 Seed -->
    <PasswordModal
      v-model="showResetSeedModal"
      :title="$t('modal.resetSeedTitle')"
      :confirm-text="$t('modal.confirmReset')"
      @confirm="confirmResetSeed"
    />

    <!-- 重置全部 -->
    <PasswordModal
      v-model="showResetAllModal"
      :title="$t('modal.resetAllTitle')"
      :description="$t('modal.resetAllDesc')"
      :confirm-text="$t('modal.confirmReset')"
      @confirm="confirmResetAll"
    />

    <!-- 清除緩存 -->
    <PasswordModal
      v-model="showClearCacheModal"
      :title="$t('modal.clearCacheTitle')"
      icon="🧹"
      :description="$t('modal.clearCacheDesc')"
      :confirm-text="$t('modal.confirmClear')"
      @confirm="confirmClearCache"
    />

    <!-- 查看設定 -->
    <div
      class="modal-overlay"
      v-if="showViewSettingsModal"
      @click.self="showViewSettingsModal = false"
    >
      <div class="modal-content" style="max-width: 600px">
        <h3>📋 {{ $t("game.currentSettings") }}</h3>
        <div
          style="
            text-align: left;
            max-height: 400px;
            overflow-y: auto;
            margin: 20px 0;
          "
        >
          <p>
            <strong>🎲 {{ $t("common.seed") }}:</strong> {{ state.seed }}
          </p>
          <p>
            <strong
              >👥 {{ $t("game.participants") }} ({{ state.participants.length
              }}{{ $t("common.players") }}):</strong
            >
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0">
            <span
              v-for="(p, i) in state.participants"
              :key="p.id"
              style="
                background: rgba(255, 255, 255, 0.1);
                padding: 4px 8px;
                border-radius: 4px;
              "
            >
              {{ i + 1 }}. {{ p.name }}
            </span>
          </div>
          <p>
            <strong>🎯 {{ $t("game.startMode") }}:</strong>
            {{
              state.startMode === "random"
                ? $t("game.random")
                : $t("game.manual")
            }}
          </p>
          <p>
            <strong>📊 {{ $t("game.progress") }}:</strong>
            {{ state.results.length }} / {{ state.participants.length }}
          </p>
        </div>
        <div class="modal-buttons">
          <button
            class="btn btn-primary"
            @click="showViewSettingsModal = false"
          >
            {{ $t("game.backToDraw") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 首次使用設定密碼 -->
    <div class="modal-overlay" v-if="showPasswordSetup">
      <div class="modal-content">
        <h3>🔐 {{ $t("settings.setPassword") }}</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8">
          {{ $t("settings.passwordHint") }}
        </p>

        <input
          type="password"
          class="input"
          v-model="newPassword"
          :placeholder="$t('settings.setPassword') + '...'"
          style="margin-bottom: 10px"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        />
        <input
          type="password"
          class="input"
          v-model="confirmPassword"
          :placeholder="$t('settings.confirmPassword') + '...'"
          @keypress.enter="setupPassword"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        />

        <div class="modal-buttons">
          <button class="btn btn-primary" @click="setupPassword">
            {{ $t("settings.setPassword") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分享結果模態框 -->
    <SocialShareModal
      v-model="showShareModal"
      :results="formattedResults"
      :seed="state.seed"
      mode="solo"
      @toast="handleToast"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const { t } = useI18n();
const router = useRouter();
const dynamicConfig = useDynamicConfig();
const { addRecord: addHistoryRecord } = useHistory();
const {
  state,
  loadState,
  saveState,
  addParticipant,
  updateParticipant,
  removeParticipant,
  addFixedPair,
  removeFixedPair,
  startDraw,
  performDraw,
  nextDraw,
  getCurrentDrawer,
  getParticipant,
  resetSeed,
  resetAll,
  clearAllCache,
  verifyPassword,
  getPassword,
  setPassword,
} = useGameState();

const {
  generateResultImage,
  downloadImage,
  shareImage,
  getSocialShareLinks,
  copyImageToClipboard,
} = useShareImage();

// 彈窗控制
const showAdvancedModal = ref(false);
const showResetSeedModal = ref(false);
const showResetAllModal = ref(false);
const showClearCacheModal = ref(false);
const showViewSettingsModal = ref(false);
const showAdvanced = ref(false);
const showPasswordSetup = ref(false);
const showShareModal = ref(false);

// 表單數據
const newParticipantName = ref("");
const fixedDrawerId = ref<number | null>(null);
const fixedGiftId = ref<number | null>(null);
const advancedPassword = ref("");
const resetPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

// 抽獎動畫
const isDrawing = ref(false);
const showResult = ref(false);
const drawBoxContent = ref("🎁");
const resultGiftOwner = ref("");
const hasDrawnCurrent = ref(false);
const hasAddedHistory = ref(false);
const lastDrawResult = ref<{
  drawerName: string;
  giftOwnerName: string;
} | null>(null);

onMounted(() => {
  loadState();

  // 檢查是否需要設定密碼（僅在啟用密碼保護時）
  if (dynamicConfig.settings.value.passwordProtection && !getPassword()) {
    showPasswordSetup.value = true;
  }

  // 恢復抽獎狀態
  if (
    state.value.phase === "drawing" &&
    state.value.results.length > state.value.currentIndex
  ) {
    hasDrawnCurrent.value = true;
    const lastResult = state.value.results[state.value.currentIndex];
    const giftOwner = getParticipant(lastResult.giftOwnerId);
    if (giftOwner) {
      drawBoxContent.value = giftOwner.name.charAt(0);
      resultGiftOwner.value = giftOwner.name;
      showResult.value = true;
    }
  }
});

// 設定密碼
function setupPassword() {
  if (!newPassword.value) {
    alert(t("error.pleaseEnterPassword"));
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    alert(t("error.passwordMismatch"));
    return;
  }

  setPassword(newPassword.value);
  showPasswordSetup.value = false;
  alert(t("notifications.passwordSet"));
}

// 獲取參與者索引
function getParticipantIndex(id: number): number {
  return state.value.participants.findIndex((p) => p.id === id) + 1;
}

// 新增參與者
function handleAddParticipant() {
  if (!newParticipantName.value.trim()) return;
  addParticipant(newParticipantName.value.trim());
  newParticipantName.value = "";
}

// 新增進階配對
function handleAddFixedPair(drawerId: number, giftId: number) {
  if (drawerId === giftId) {
    alert(t("errors.sameAB"));
    return;
  }

  if (!addFixedPair(drawerId, giftId)) {
    alert(t("errors.alreadyExists"));
    return;
  }
}

// Computed properties for components
const formattedResults = computed(() => {
  return state.value.results.map((r) => ({
    order: r.order,
    drawerName: getParticipant(r.drawerId)?.name || "?",
    giftOwnerName: getParticipant(r.giftOwnerId)?.name || "?",
  }));
});

const progressPlayers = computed(() => {
  return state.value.participants.map((p, idx) => ({
    id: p.id,
    name: `${idx + 1}. ${p.name}`,
    isCurrent: state.value.drawOrder[state.value.currentIndex] === p.id,
    hasDrawn: state.value.results.some((r: any) => r.drawerId === p.id),
  }));
});

// 處理進階選項開關
function handleAdvancedToggle() {
  // 如果密碼保護已關閉，直接打開進階設定
  if (!dynamicConfig.settings.value.passwordProtection) {
    showAdvanced.value = !showAdvanced.value;
    return;
  }
  // 否則顯示密碼驗證彈窗
  showAdvancedModal.value = true;
}

// 確認進階選項
function confirmAdvanced(password: string) {
  if (!verifyPassword(password)) {
    alert(t("error.wrongPassword"));
    return;
  }

  showAdvancedModal.value = false;
  showAdvanced.value = true;
}

// 確認重設 Seed
function confirmResetSeed(password: string) {
  // 密碼保護關閉時跳過驗證
  if (
    dynamicConfig.settings.value.passwordProtection &&
    !verifyPassword(password)
  ) {
    alert(t("error.wrongPassword"));
    return;
  }

  resetSeed();
  showResetSeedModal.value = false;
  alert(t("notifications.seedReset", { seed: state.value.seed }));
}

// 處理重置全部（檢查是否需要密碼）
function handleResetAll() {
  if (dynamicConfig.settings.value.passwordProtection) {
    showResetAllModal.value = true;
  } else {
    // 密碼保護關閉，直接執行
    doResetAll();
  }
}

// 處理清除緩存（檢查是否需要密碼）
function handleClearCache() {
  if (dynamicConfig.settings.value.passwordProtection) {
    showClearCacheModal.value = true;
  } else {
    // 密碼保護關閉，直接執行
    doClearCache();
  }
}

// 執行重置全部
function doResetAll() {
  resetAll();
  showResetAllModal.value = false;
  showAdvanced.value = false;

  // 重置抽獎 UI 狀態
  isDrawing.value = false;
  showResult.value = false;
  drawBoxContent.value = "🎁";
  hasDrawnCurrent.value = false;
}

// 執行清除緩存
function doClearCache() {
  clearAllCache();
  showClearCacheModal.value = false;
  alert(t("notifications.cacheCleared"));
  window.location.reload();
}

// 確認重置全部
function confirmResetAll(password: string) {
  if (!verifyPassword(password)) {
    alert(t("error.wrongPassword"));
    return;
  }
  doResetAll();
}

// 確認清除緩存
function confirmClearCache(password: string) {
  if (!verifyPassword(password)) {
    alert(t("error.wrongPassword"));
    return;
  }
  doClearCache();
}

// 開始抽獎
function handleStartDraw() {
  if (state.value.participants.length < 2) {
    alert(t("error.minParticipants"));
    return;
  }

  if (state.value.startMode === "manual" && !state.value.manualStarterId) {
    alert(t("error.selectStarter"));
    return;
  }

  if (!startDraw()) {
    alert(t("error.cannotGenerateSequence"));
    return;
  }

  hasDrawnCurrent.value = false;
  showResult.value = false;
  drawBoxContent.value = "🎁";
  lastDrawResult.value = null;
  hasAddedHistory.value = false;
}

// 執行抽獎 - 由 RouletteAnimation 組件調用
function handlePerformDraw() {
  // 記錄結果（動畫由 RouletteAnimation 組件處理）
  const result = performDraw();
  if (result) {
    const drawer = getParticipant(result.drawerId);
    const giftOwner = getParticipant(result.giftOwnerId);
    if (giftOwner) {
      resultGiftOwner.value = giftOwner.name;
    }
    // 儲存實際抽獎結果供動畫組件使用
    lastDrawResult.value = {
      drawerName: drawer?.name || "?",
      giftOwnerName: giftOwner?.name || "?",
    };
  }

  hasDrawnCurrent.value = true;
}

// 下一位抽獎 - 由 RouletteAnimation 組件調用
function handleNextDraw() {
  if (nextDraw()) {
    hasDrawnCurrent.value = false;
    lastDrawResult.value = null;
  }
}

// 分享結果 - 打開分享選單
function shareResults() {
  showShareModal.value = true;
}

// Toast 提示處理
function handleToast(message: string) {
  alert(message);
}

// 處理完成抽獎（防止重複添加歷史紀錄）
function handleComplete() {
  if (hasAddedHistory.value) {
    // 已經添加過歷史紀錄，直接跳轉
    const resultId = `solo_${state.value.seed}_${Date.now()}`;
    router.push({ path: "/result", query: { id: resultId } });
    return;
  }
  celebrate();
}

// 慶祝動畫
function celebrate() {
  // 防止重複添加
  if (hasAddedHistory.value) return;
  hasAddedHistory.value = true;

  // 保存歷史紀錄和結果
  if (state.value.results.length > 0) {
    const resultsData = state.value.results.map((r) => ({
      order: r.order,
      drawerName: getParticipant(r.drawerId)?.name || "?",
      giftOwnerName: getParticipant(r.giftOwnerId)?.name || "?",
    }));

    addHistoryRecord({
      mode: "solo",
      seed: state.value.seed,
      participantCount: state.value.participants.length,
      results: resultsData,
    });

    // 保存結果到 localStorage 供 result 頁面使用
    const resultId = `solo_${state.value.seed}_${Date.now()}`;
    const resultData = {
      id: resultId,
      mode: "solo",
      seed: state.value.seed,
      participantCount: state.value.participants.length,
      results: resultsData,
    };
    localStorage.setItem(`result_${resultId}`, JSON.stringify(resultData));

    // 跳轉到結果頁面
    setTimeout(() => {
      router.push({ path: "/result", query: { id: resultId } });
    }, 2000); // 延遲 2 秒讓動畫播放
  }

  const colors = [
    "#ffd700",
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#ffeaa7",
  ];
  const container = document.createElement("div");
  container.className = "celebration";
  container.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;";
  document.body.appendChild(container);

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.style.cssText = `
      position:absolute;
      width:${Math.random() * 10 + 5}px;
      height:${Math.random() * 10 + 5}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}%;
      top:-20px;
      animation:confetti-fall 3s ease-out forwards;
      animation-delay:${Math.random() * 2}s;
    `;
    container.appendChild(confetti);
  }

  // 添加動畫 keyframes
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confetti-fall {
        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 5000);
}
</script>

<style scoped>
/* 模式標記 */
.mode-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  margin-right: 8px;
}

.mode-badge.online {
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: #fff;
}

.mode-badge.solo {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #fff;
}

.count-badge {
  font-size: 0.9rem;
  opacity: 0.8;
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 0;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.participant-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.participant-item .number {
  background: #c41e3a;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.participant-item input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.95rem;
  padding: 4px;
  border-bottom: 1px solid transparent;
  min-width: 0;
}

.participant-item input:focus {
  outline: none;
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

.btn-icon {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  font-size: 1rem;
  transition: color 0.2s;
}

.btn-icon:hover {
  color: #ff6b6b;
}

.add-participant {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.start-options {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}

.start-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.start-options input[type="radio"] {
  accent-color: #c41e3a;
  width: 18px;
  height: 18px;
}

.start-options select {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1rem;
}

.start-options select option {
  background: #2d5a3f;
  color: #fff;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  opacity: 0.7;
  font-size: 0.9rem;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.advanced-toggle:hover {
  opacity: 1;
}

.advanced-section {
  margin-top: 15px;
}

.fixed-pair-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.fixed-pair-item select {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 0.9rem;
}

.fixed-pair-item select option {
  background: #2d5a3f;
}

.fixed-pairs-list {
  margin-top: 10px;
}

.fixed-pair-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(196, 30, 58, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  margin: 4px;
  font-size: 0.9rem;
}

.fixed-pair-tag .remove {
  cursor: pointer;
  opacity: 0.7;
}

.fixed-pair-tag .remove:hover {
  opacity: 1;
}

.seed-display {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 0.8rem;
}

/* 抽獎區 */
.draw-area {
  text-align: center;
  padding: 40px 20px;
}

.draw-box {
  background: linear-gradient(135deg, #c41e3a, #8b1528);
  width: 200px;
  height: 200px;
  margin: 0 auto 30px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.draw-box.drawing {
  animation: shake 0.5s ease-in-out infinite;
}

.draw-box::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transform: rotate(45deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% {
    transform: translateX(-100%) rotate(45deg);
  }

  100% {
    transform: translateX(100%) rotate(45deg);
  }
}

.draw-box .content {
  position: relative;
  z-index: 1;
}

.draw-box.drawing .content {
  animation: shuffle 0.08s ease-in-out infinite;
}

@keyframes shuffle {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-10px) scale(1.1);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px) rotate(-2deg);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px) rotate(2deg);
  }
}

.current-drawer {
  font-size: 1.5rem;
  margin-bottom: 20px;
}

.current-drawer .name {
  color: #ffd700;
  font-weight: bold;
}

.draw-result {
  font-size: 1.8rem;
  margin: 20px 0;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.draw-result.show {
  opacity: 1;
  transform: scale(1);
}

.draw-result .gift-owner {
  color: #ffd700;
  font-weight: bold;
}

/* 結果列表 */
.results-list {
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.result-item .order {
  background: #ffd700;
  color: #1a472a;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.result-item .arrow {
  font-size: 1.5rem;
}

.result-item .drawer,
.result-item .gift {
  padding: 4px 12px;
  border-radius: 6px;
}

.result-item .drawer {
  background: rgba(196, 30, 58, 0.3);
}

.result-item .gift {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  margin-left: 10px;
}

.status-badge.in-progress {
  background: #ffc107;
  color: #000;
}

@media (max-width: 600px) {
  .participants-grid {
    grid-template-columns: 1fr;
  }

  .draw-box {
    width: 150px;
    height: 150px;
    font-size: 3rem;
  }

  .progress-panel {
    position: fixed;
    right: 10px;
    top: auto;
    bottom: 20px;
    width: auto;
    min-width: 50px;
    max-width: 90%;
    background: rgba(0, 0, 0, 0.9);
    opacity: 0.85;
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .progress-panel:hover {
    opacity: 1;
  }

  .progress-panel h4 {
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .progress-panel .player-status-list {
    max-height: 150px;
    overflow-y: auto;
  }
}

/* 進度側邊面板 */
.progress-panel {
  display: none;
  position: fixed;
  right: 10px;
  top: auto;
  bottom: 20px;
  width: auto;
  min-width: 50px;
  max-width: 90%;
  background: rgba(0, 0, 0, 0.9);
  opacity: 0.85;
  transition: all 0.3s ease;
  z-index: 1000;
}

.progress-panel h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
}

.progress-panel .progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-panel .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.5s ease;
}

.progress-panel .progress-text {
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 10px;
  opacity: 0.8;
}

.player-status-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 300px;
  overflow-y: auto;
}

.player-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.player-status-item.is-current {
  background: rgba(255, 193, 7, 0.3);
  border: 1px solid #ffc107;
}

.player-status-item.has-drawn {
  opacity: 0.6;
}

.player-status-item .status-icon {
  font-size: 0.9rem;
}

.player-status-item .player-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 分享模態框 */
.share-modal {
  max-width: 500px;
}

.share-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.share-option-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: white;
}

.share-option-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.share-option-btn .icon {
  font-size: 2rem;
}

.share-option-btn .text {
  font-size: 0.9rem;
  font-weight: 500;
}

.social-share-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  margin-top: 10px;
}

.section-title {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 15px;
  text-align: center;
}

.social-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.social-share-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.social-share-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.social-share-btn svg {
  width: 24px;
  height: 24px;
}

@media (max-width: 600px) {
  .share-options {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .share-option-btn {
    padding: 15px;
  }

  .social-buttons {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 完成階段加載樣式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  color: #fff;
}

.loading-content .loading-spinner {
  font-size: 5rem;
  animation: bounce 1s infinite ease-in-out;
  margin-bottom: 20px;
}

.loading-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  25% {
    transform: translateY(-20px) rotate(-10deg);
  }

  75% {
    transform: translateY(-15px) rotate(10deg);
  }
}
</style>
