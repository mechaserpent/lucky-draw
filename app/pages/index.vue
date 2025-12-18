<template>
  <div>
    <header>
      <h1>
        {{ dynamicConfig.settings.value.siteIconLeft }}
        {{ dynamicConfig.settings.value.siteTitle }}
        {{ dynamicConfig.settings.value.siteIconRight }}
      </h1>
      <p>{{ dynamicConfig.settings.value.siteSubtitle }}</p>
    </header>

    <div class="card">
      <h2>🎮 {{ $t("home.title") }}</h2>

      <div class="mode-grid">
        <div class="mode-card" @click="showSoloModal = true">
          <div class="mode-icon">🖥️</div>
          <h3>{{ $t("home.soloMode") }}</h3>
          <p>{{ $t("home.soloDesc") }}</p>
        </div>

        <div class="mode-card" @click="showOnlineModal = true">
          <div class="mode-icon">🌐</div>
          <h3>{{ $t("home.onlineMode") }}</h3>
          <p>{{ $t("home.onlineDesc") }}</p>
        </div>
      </div>
    </div>

    <div class="card privacy-info" style="text-align: center">
      <p style="opacity: 0.7; font-size: 0.9rem">
        🔒 <strong>{{ $t("home.soloMode") }}</strong
        >：{{ $t("home.privacyInfo.solo").split("：")[1] }}
      </p>
      <p style="opacity: 0.7; font-size: 0.9rem">
        🌐 <strong>{{ $t("home.onlineMode") }}</strong
        >：{{ $t("home.privacyInfo.online").split("：")[1] }}
      </p>
    </div>

    <!-- 歷史紀錄 -->
    <div class="card" v-if="historyRecords.length > 0">
      <div class="history-header">
        <h2>📜 {{ $t("home.history.title") }}</h2>
        <button
          class="btn btn-sm btn-danger"
          @click="showClearHistoryConfirm = true"
        >
          🗑️ {{ $t("home.history.clearAll") }}
        </button>
      </div>

      <div class="history-list">
        <div
          v-for="record in historyRecords.slice(
            0,
            showAllHistory ? undefined : 5,
          )"
          :key="record.id"
          class="history-item"
          @click="toggleHistoryExpand(record.id)"
        >
          <div class="history-summary">
            <span class="history-mode">{{
              record.mode === "solo" ? "🖥️" : "🌐"
            }}</span>
            <span class="history-info">
              {{ record.participantCount }} {{ $t("common.players") }} ·
              {{ formatHistoryTime(record.timestamp) }}
            </span>
            <span class="history-expand">{{
              expandedHistory === record.id ? "▼" : "▶"
            }}</span>
          </div>

          <div v-if="expandedHistory === record.id" class="history-details">
            <div class="history-results">
              <div
                v-for="r in record.results"
                :key="r.order"
                class="history-result-item"
              >
                {{ r.order }}. {{ r.drawerName }} ➡️ {{ r.giftOwnerName }}
              </div>
            </div>
            <div class="history-seed">
              🎲 {{ $t("common.seed") }}: {{ record.seed }}
            </div>
          </div>
        </div>

        <button
          v-if="historyRecords.length > 5 && !showAllHistory"
          class="btn btn-sm btn-secondary"
          style="width: 100%; margin-top: 10px"
          @click.stop="showAllHistory = true"
        >
          {{ $t("home.history.showMore") }} ({{ historyRecords.length - 5 }})
        </button>

        <button
          v-if="showAllHistory && historyRecords.length > 5"
          class="btn btn-sm btn-secondary"
          style="width: 100%; margin-top: 10px"
          @click.stop="showAllHistory = false"
        >
          {{ $t("home.history.collapse") }}
        </button>
      </div>
    </div>

    <!-- 清除歷史確認彈窗 -->
    <div
      class="modal-overlay"
      v-if="showClearHistoryConfirm"
      @click.self="showClearHistoryConfirm = false"
    >
      <div class="modal-content">
        <h3>⚠️ {{ $t("modal.confirmClear") }}</h3>
        <p style="margin: 15px 0">{{ $t("home.history.confirmClear") }}</p>
        <div class="modal-buttons">
          <button
            class="btn btn-secondary"
            @click="showClearHistoryConfirm = false"
          >
            {{ $t("common.cancel") }}
          </button>
          <button class="btn btn-danger" @click="handleClearHistory">
            {{ $t("common.confirm") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主持模式彈窗 -->
    <div
      class="modal-overlay"
      v-if="showSoloModal"
      @click.self="showSoloModal = false"
    >
      <div class="modal-content">
        <h3>🖥️ {{ $t("modal.soloSetup") }}</h3>

        <NumPad
          v-model="soloPlayerCount"
          :min="dynamicConfig.fixedConfig.minPlayers"
          :max="dynamicConfig.fixedConfig.maxPlayers"
          :label="$t('modal.playerCount')"
          :hint="
            $t('modal.playerCountHint', {
              min: dynamicConfig.fixedConfig.minPlayers,
              max: dynamicConfig.fixedConfig.maxPlayers,
            })
          "
          @confirm="startSoloMode"
        />

        <div class="modal-buttons" style="margin-top: 20px">
          <button class="btn btn-secondary" @click="showSoloModal = false">
            {{ $t("common.cancel") }}
          </button>
          <button class="btn btn-primary" @click="startSoloMode">
            {{ $t("common.startGame") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 連線模式彈窗 -->
    <div
      class="modal-overlay"
      v-if="showOnlineModal"
      @click.self="showOnlineModal = false"
    >
      <div class="modal-content">
        <h3>🌐 {{ $t("home.onlineMode") }}</h3>

        <div class="online-options">
          <button
            class="btn btn-primary btn-block"
            @click="
              showCreateRoomModal = true;
              showOnlineModal = false;
            "
          >
            ➕ {{ $t("modal.createRoom") }}
          </button>

          <div style="text-align: center; margin: 15px 0; opacity: 0.7">
            {{ $t("common.or") }}
          </div>

          <button
            class="btn btn-secondary btn-block"
            @click="
              showJoinRoomModal = true;
              showOnlineModal = false;
            "
          >
            🚪 {{ $t("modal.joinRoom") }}
          </button>
        </div>

        <div class="modal-buttons" style="margin-top: 20px">
          <button class="btn btn-secondary" @click="showOnlineModal = false">
            {{ $t("common.cancel") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 建立房間彈窗 -->
    <div
      class="modal-overlay"
      v-if="showCreateRoomModal"
      @click.self="showCreateRoomModal = false"
    >
      <div class="modal-content">
        <h3>➕ {{ $t("modal.createRoom") }}</h3>

        <div style="margin: 15px 0">
          <label style="display: block; margin-bottom: 8px">{{
            $t("modal.yourName")
          }}</label>
          <ClearableInput
            v-model="hostName"
            :placeholder="$t('modal.enterName')"
            ref="createRoomNameInput"
          />
        </div>

        <NumPad
          v-model="maxPlayers"
          :min="dynamicConfig.fixedConfig.minPlayers"
          :max="dynamicConfig.fixedConfig.onlineMaxPlayers"
          :label="$t('modal.maxPlayers')"
          :hint="
            $t('modal.playerCountHint', {
              min: dynamicConfig.fixedConfig.minPlayers,
              max: dynamicConfig.fixedConfig.onlineMaxPlayers,
            })
          "
          @confirm="createRoom"
        />

        <div class="modal-buttons" style="margin-top: 20px">
          <button
            class="btn btn-secondary"
            @click="showCreateRoomModal = false"
            :disabled="isCreatingRoom"
          >
            {{ $t("common.cancel") }}
          </button>
          <button
            class="btn btn-primary"
            @click="createRoom"
            :disabled="isCreatingRoom"
          >
            {{ isCreatingRoom ? $t("modal.creating") : $t("modal.createRoom") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加入房間彈窗 -->
    <div
      class="modal-overlay"
      v-if="showJoinRoomModal"
      @click.self="showJoinRoomModal = false"
    >
      <div class="modal-content">
        <h3>
          {{
            joinAsSpectator
              ? "👁️ " + $t("modal.watchRoom")
              : "🚪 " + $t("modal.joinRoom")
          }}
        </h3>

        <div v-if="joinAsSpectator" class="spectator-notice">
          <p>👁️ {{ $t("modal.spectatorNotice") }}</p>
        </div>

        <div style="margin: 15px 0">
          <label style="display: block; margin-bottom: 8px">{{
            $t("modal.roomCode")
          }}</label>
          <ClearableInput
            v-model="joinRoomId"
            :placeholder="$t('modal.enterRoomCode')"
            input-style="text-transform: uppercase;"
          />
        </div>

        <div style="margin: 15px 0">
          <label style="display: block; margin-bottom: 8px">{{
            $t("modal.yourName")
          }}</label>
          <ClearableInput
            class="join-name-input"
            v-model="playerName"
            :placeholder="$t('modal.enterName')"
          />
        </div>

        <div class="modal-buttons">
          <button
            class="btn btn-secondary"
            @click="
              showJoinRoomModal = false;
              joinAsSpectator = false;
            "
            :disabled="isJoiningRoom"
          >
            {{ $t("common.cancel") }}
          </button>
          <button
            class="btn btn-primary"
            @click="joinRoom"
            :disabled="isJoiningRoom"
          >
            {{
              isJoiningRoom
                ? $t("modal.joining")
                : joinAsSpectator
                  ? "👁️ " + $t("modal.startWatching")
                  : $t("modal.joinRoom")
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- 舊版主題設定彈窗（保留兼容） -->
    <div
      class="modal-overlay"
      v-if="showSettingsModal"
      @click.self="showSettingsModal = false"
    >
      <div class="modal-content modal-lg">
        <h3>⚙️ {{ $t("settings.theme") }}</h3>
        <SettingsPanel
          @close="showSettingsModal = false"
          @saved="onSettingsSaved"
          @needsRefresh="onNeedsRefresh"
        />
      </div>
    </div>

    <!-- 錯誤提示 Toast -->
    <Transition name="toast">
      <div v-if="showError" class="toast-error">❌ {{ errorMessage }}</div>
    </Transition>

    <!-- 成功/提示 Toast -->
    <Transition name="toast">
      <div v-if="showInfoToast" class="toast-info">
        {{ infoMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const dynamicConfig = useDynamicConfig();
const { state, loadState, initGame, getPassword, setPassword } = useGameState();
const {
  connect,
  createRoom: wsCreateRoom,
  joinRoom: wsJoinRoom,
  on,
  off,
  roomState,
  error,
  isConnected,
  setSkipAutoReconnect,
} = useWebSocket();
const {
  history: historyRecords,
  formatTime: formatHistoryTime,
  clearHistory,
} = useHistory();

// 生成隨機用戶名稱
function generateRandomUsername(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `${t("common.user")}${randomNum}`;
}

// 彈窗控制
const showSoloModal = ref(false);
const showOnlineModal = ref(false);
const showCreateRoomModal = ref(false);
const showJoinRoomModal = ref(false);
const showSettingsModal = ref(false);
const showClearHistoryConfirm = ref(false);

// 輸入框引用
const createRoomNameInput = ref<any>(null);

// 歷史紀錄控制
const showAllHistory = ref(false);
const expandedHistory = ref<string | null>(null);

// 表單數據
const soloPlayerCount = ref(20);
const hostName = ref(generateRandomUsername());
const maxPlayers = ref(20);
const joinRoomId = ref("");
const playerName = ref(generateRandomUsername());
const joinAsSpectator = ref(false);

// 錯誤提示
const errorMessage = ref("");
const showError = ref(false);
const isCheckingRoom = ref(false);

// 資訊提示
const infoMessage = ref("");
const showInfoToast = ref(false);

// 防重複點擊
const isCreatingRoom = ref(false);
const isJoiningRoom = ref(false);

function showErrorToast(msg: string) {
  errorMessage.value = msg;
  showError.value = true;
  setTimeout(() => {
    showError.value = false;
  }, 3000);
}

function showInfo(msg: string) {
  infoMessage.value = msg;
  showInfoToast.value = true;
  setTimeout(() => {
    showInfoToast.value = false;
  }, 10000);
}

// 監視彈窗開啟，自動聚焦輸入框
watch(showCreateRoomModal, (newVal) => {
  if (newVal) {
    nextTick(() => {
      const input = createRoomNameInput.value?.$el?.querySelector("input");
      if (input) input.focus();
    });
  }
});

onMounted(async () => {
  loadState();

  // 檢查 URL 參數是否有房間代碼
  const roomCode = route.query.room as string;
  const isSpectator = route.query.spectator === "true";

  if (roomCode) {
    const code = roomCode.toUpperCase();
    isCheckingRoom.value = true;

    // 設置跳過自動重連，因為使用 URL 加入時應該直接加入而不是重連
    setSkipAutoReconnect(true);

    try {
      // 先檢查房間是否存在
      const response = await $fetch(`/api/room/${code}`);

      if (response.exists) {
        // 檢查是否可以加入
        if (!response.canJoin) {
          showErrorToast(`${response.reason || t("error.cannotJoinRoom")}`);
          return;
        }

        joinRoomId.value = code;
        joinAsSpectator.value = isSpectator;
        showJoinRoomModal.value = true;
        // 延遲聚焦到名字輸入框
        setTimeout(() => {
          const nameInput = document.querySelector(
            ".join-name-input",
          ) as HTMLInputElement;
          if (nameInput) nameInput.focus();
        }, 100);
      } else {
        showErrorToast(t("error.roomNotExists", { code }));
      }
    } catch (e) {
      showErrorToast(t("error.cannotCheckRoom"));
    } finally {
      isCheckingRoom.value = false;
    }
  }
});

// 設定儲存回調
function onSettingsSaved() {
  // 可以在這裡添加提示訊息
}

// 主題變更需要重新整理頁面
function onNeedsRefresh() {
  showInfo("💡 " + t("common.needsRefresh"));
}

// 歷史紀錄操作
function toggleHistoryExpand(id: string) {
  expandedHistory.value = expandedHistory.value === id ? null : id;
}

function handleClearHistory() {
  clearHistory();
  showClearHistoryConfirm.value = false;
}

// 主持模式
function startSoloMode() {
  const { fixedConfig } = dynamicConfig;
  if (
    soloPlayerCount.value < fixedConfig.minPlayers ||
    soloPlayerCount.value > fixedConfig.maxPlayers
  ) {
    alert(
      t("error.playerCountRange", {
        min: fixedConfig.minPlayers,
        max: fixedConfig.maxPlayers,
      }),
    );
    return;
  }

  initGame(soloPlayerCount.value);
  showSoloModal.value = false;
  router.push("/solo");
}

// 建立房間
function createRoom() {
  if (isCreatingRoom.value) return; // 防止重複點擊

  const { fixedConfig } = dynamicConfig;
  if (!hostName.value.trim()) {
    alert(t("error.pleaseEnterName"));
    return;
  }
  if (
    maxPlayers.value < fixedConfig.minPlayers ||
    maxPlayers.value > fixedConfig.onlineMaxPlayers
  ) {
    alert(
      t("error.playerCountRange", {
        min: fixedConfig.minPlayers,
        max: fixedConfig.onlineMaxPlayers,
      }),
    );
    return;
  }

  isCreatingRoom.value = true;

  // 清理舊的事件監聽器
  off("roomUpdated");
  off("error");
  off("room_created");

  // 註冊新的事件監聽器
  const handleRoomCreated = () => {
    if (roomState.value) {
      showCreateRoomModal.value = false;
      isCreatingRoom.value = false;
      off("roomUpdated", handleRoomCreated);
      off("error", handleError);
      off("room_created", handleRoomCreated);
      router.push("/online");
    }
  };

  const handleError = (msg: string) => {
    isCreatingRoom.value = false;
    showErrorToast(msg);
    off("roomUpdated", handleRoomCreated);
    off("error", handleError);
    off("room_created", handleRoomCreated);
  };

  on("roomUpdated", handleRoomCreated);
  on("room_created", handleRoomCreated);
  on("error", handleError);

  // 連接並建立房間
  connect();

  // 等待連接建立後再創建房間
  const waitForConnection = () => {
    const checkInterval = setInterval(() => {
      if (isConnected.value) {
        clearInterval(checkInterval);
        wsCreateRoom(hostName.value.trim(), { maxPlayers: maxPlayers.value });
      }
    }, 100);

    // 連接超時後停止檢查
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
  };

  // 如果已經連接，直接創建；否則等待
  if (isConnected.value) {
    wsCreateRoom(hostName.value.trim(), { maxPlayers: maxPlayers.value });
  } else {
    waitForConnection();
  }

  // 超時處理
  setTimeout(() => {
    if (isCreatingRoom.value) {
      isCreatingRoom.value = false;
      off("roomUpdated", handleRoomCreated);
      off("error", handleError);
      off("room_created", handleRoomCreated);
      showErrorToast(t("error.createRoomTimeout"));
    }
  }, 5000);
}

// 加入房間
function joinRoom() {
  if (isJoiningRoom.value) return; // 防止重複點擊

  if (!joinRoomId.value.trim()) {
    alert(t("error.pleaseEnterRoomCode"));
    return;
  }
  if (!playerName.value.trim()) {
    alert(t("error.pleaseEnterName"));
    return;
  }

  isJoiningRoom.value = true;

  // 清理舊的事件監聽器
  off("roomUpdated");
  off("error");
  off("room_joined");

  // 註冊新的事件監聽器
  const handleRoomJoined = () => {
    if (roomState.value) {
      showJoinRoomModal.value = false;
      joinAsSpectator.value = false; // 重置
      isJoiningRoom.value = false;
      off("roomUpdated", handleRoomJoined);
      off("error", handleError);
      off("room_joined", handleRoomJoined);
      router.push("/online");
    }
  };

  const handleError = (msg: string) => {
    isJoiningRoom.value = false;
    showErrorToast(msg);
    off("roomUpdated", handleRoomJoined);
    off("error", handleError);
    off("room_joined", handleRoomJoined);
  };

  on("roomUpdated", handleRoomJoined);
  on("room_joined", handleRoomJoined);
  on("error", handleError);

  // 連接並加入房間
  connect();

  // 等待連接建立後再加入房間
  const waitForConnection = () => {
    const checkInterval = setInterval(() => {
      if (isConnected.value) {
        clearInterval(checkInterval);
        wsJoinRoom(
          joinRoomId.value.trim().toUpperCase(),
          playerName.value.trim(),
          joinAsSpectator.value,
        );
      }
    }, 100);

    // 連接超時後停止檢查
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
  };

  // 如果已經連接，直接加入；否則等待
  if (isConnected.value) {
    wsJoinRoom(
      joinRoomId.value.trim().toUpperCase(),
      playerName.value.trim(),
      joinAsSpectator.value,
    );
  } else {
    waitForConnection();
  }

  // 超時處理
  setTimeout(() => {
    if (isJoiningRoom.value) {
      isJoiningRoom.value = false;
      off("roomUpdated", handleRoomJoined);
      off("error", handleError);
      off("room_joined", handleRoomJoined);
      showErrorToast(t("error.joinRoomTimeout"));
    }
  }, 5000);
}
</script>

<style scoped>
.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.mode-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.mode-card:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-5px);
}

.mode-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.mode-card h3 {
  margin-bottom: 10px;
}

.mode-card p {
  font-size: 0.9rem;
  opacity: 0.8;
}

.online-options {
  margin: 20px 0;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px 10px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

/* Toast 錯誤提示樣式 */
.toast-error {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc3545;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Toast 資訊提示樣式 */
.toast-info {
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: #17a2b8;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* 觀眾提示 */
.spectator-notice {
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  text-align: center;
}

.spectator-notice p {
  margin: 0;
  color: #ffc107;
  font-size: 0.9rem;
}

/* 歷史紀錄 */
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.history-header h2 {
  margin: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.history-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-mode {
  font-size: 1.2rem;
}

.history-info {
  flex: 1;
  font-size: 0.9rem;
  opacity: 0.9;
}

.history-expand {
  font-size: 0.8rem;
  opacity: 0.5;
}

.history-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.history-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  opacity: 0.8;
}

.history-result-item {
  padding: 4px 0;
}

.history-seed {
  margin-top: 10px;
  font-size: 0.8rem;
  opacity: 0.6;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}
</style>
