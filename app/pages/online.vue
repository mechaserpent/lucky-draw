<template>
  <div>
    <header>
      <h1>
        {{ dynamicConfig.settings.value.siteIconLeft }}
        {{ dynamicConfig.settings.value.siteTitle }}
        {{ dynamicConfig.settings.value.siteIconRight }}
      </h1>
      <p>
        <span class="mode-badge online">🌐 {{ $t("home.onlineMode") }}</span>
        {{ $t("online.ownDevice") }}
      </p>
    </header>

    <!-- 連線中 -->
    <div v-if="!isConnected" class="card" style="text-align: center">
      <p>⏳ {{ $t("online.connecting") }}</p>
      <p v-if="showConnectionTimeout" style="color: #ff6b6b; margin-top: 1rem">
        ⚠️ 連線時間較長，請檢查網路狀態
      </p>
      <button
        v-if="showConnectionTimeout"
        class="btn btn-secondary"
        @click="router.push('/')"
        style="margin-top: 1rem"
      >
        🏠 返回首頁
      </button>
    </div>

    <!-- 等待階段 -->
    <template v-else-if="roomState?.gameState === 'waiting'">
      <div class="card">
        <h2>🏠 {{ $t("online.roomInfo") }}</h2>

        <div class="room-info">
          <div class="room-code">
            <span class="label">{{ $t("modal.roomCode") }}</span>
            <span class="code">{{ roomState.id }}</span>
          </div>

          <div class="room-stats">
            <span
              >👥 {{ roomState.players.length }} /
              {{ roomState.settings.maxPlayers }}
              {{ $t("common.players") }}</span
            >
            <span>🎲 {{ $t("common.seed") }}: {{ roomState.seed }}</span>
          </div>
        </div>

        <div class="share-hint">
          <p>📱 {{ $t("online.shareHint") }}</p>
          <div class="share-buttons">
            <button class="btn btn-secondary" @click="copyRoomLink">
              📋 {{ $t("online.copyLink") }}
            </button>
            <!-- 觀眾連結按鈕暫時隱藏，功能即將推出 -->
            <!-- <button v-if="roomState.settings.allowSpectators" class="btn btn-secondary" @click="copySpectatorLink">
              👁️ {{ $t("online.spectatorLink") }}
            </button> -->
          </div>
        </div>
      </div>

      <div class="card">
        <h2>👥 {{ $t("online.playerList") }}</h2>

        <div class="players-list">
          <div
            v-for="player in roomState.players"
            :key="player.id"
            class="player-item"
            :class="{
              'is-me': player.id === playerId,
              'is-host': player.isHost,
              'is-creator': player.isCreator,
            }"
          >
            <span class="player-number">{{ player.participantId }}</span>
            <span class="player-name">
              {{ player.name }}
              <span
                v-if="player.isCreator"
                class="creator-badge"
                :title="$t('online.roomCreator')"
                >🏠</span
              >
              <span
                v-if="player.isHost"
                class="host-badge"
                :title="$t('online.currentHost')"
                >👑</span
              >
              <span v-if="player.id === playerId" class="me-badge"
                >({{ $t("online.you") }})</span
              >
              <button
                v-if="
                  player.id === playerId && roomState.gameState === 'waiting'
                "
                class="btn-edit-name"
                @click="openRenameModal"
                :title="$t('online.changeName')"
              >
                ✏️
              </button>
            </span>
            <span class="ready-status" :class="{ ready: player.isReady }">
              {{
                player.isReady
                  ? "✅ " + $t("online.ready")
                  : "⏳ " + $t("online.waiting")
              }}
            </span>
          </div>
        </div>
      </div>

      <div class="card" v-if="!isHost()">
        <h2>🎮 {{ $t("online.readyStatus") }}</h2>
        <div class="controls">
          <button
            class="btn btn-lg"
            :class="getCurrentPlayer()?.isReady ? 'btn-danger' : 'btn-success'"
            @click="toggleReady"
          >
            {{
              getCurrentPlayer()?.isReady
                ? "❌ " + $t("online.cancelReady")
                : "✅ " + $t("online.imReady")
            }}
          </button>
        </div>
      </div>

      <div class="card" v-if="isHost()">
        <h2>👑 {{ $t("online.hostControl") }}</h2>

        <!-- 人數顯示 -->
        <div class="room-player-count">
          👥 {{ $t("online.currentPlayers") }}: {{ roomState.players.length }} /
          {{ roomState.settings.maxPlayers }}
        </div>

        <!-- 協助加入玩家 -->
        <div class="add-player-section">
          <h4>➕ {{ $t("online.addPlayer") }}</h4>
          <div class="add-player-form">
            <input
              type="text"
              class="input"
              v-model="addPlayerName"
              :placeholder="$t('online.enterPlayerName')"
              autocomplete="off"
              @keypress.enter="handleAddPlayer"
            />
            <button
              class="btn btn-secondary"
              @click="handleAddPlayer"
              :disabled="!addPlayerName.trim()"
            >
              {{ $t("common.add") }}
            </button>
          </div>
        </div>

        <!-- 抽獎設定 -->
        <div class="draw-settings-section">
          <h4>⚙️ {{ $t("game.drawSettings") }}</h4>
          <div class="start-options">
            <label>
              <input type="radio" v-model="firstDrawerMode" value="random" />
              {{ $t("game.randomFirst") }}
            </label>
            <div class="manual-select-row">
              <label>
                <input type="radio" v-model="firstDrawerMode" value="manual" />
                {{ $t("game.manualFirst") }}：
              </label>
              <select
                v-model="firstDrawerId"
                :disabled="firstDrawerMode !== 'manual'"
              >
                <option :value="undefined">
                  {{ $t("game.selectParticipant") }}
                </option>
                <option
                  v-for="player in roomState.players"
                  :key="player.id"
                  :value="player.participantId"
                >
                  {{ player.participantId }}. {{ player.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 進階選項 -->
          <AdvancedSettings
            :participants="
              roomState.players.map((p) => ({
                id: p.participantId,
                name: p.name,
              }))
            "
            :fixed-pairs="fixedPairs"
            :is-open="showAdvanced"
            :show-index="true"
            @toggle="handleToggleAdvanced"
            @add-pair="handleAddFixedPair"
            @remove-pair="removeFixedPair"
          />

          <!-- 允許觀眾 - 暫時禁用，顯示即將推出 -->
          <div class="spectator-toggle coming-soon">
            <label>
              <input type="checkbox" v-model="allowSpectators" disabled />
              {{ $t("online.allowSpectators") }}
              <span class="coming-soon-badge">{{
                $t("common.comingSoon")
              }}</span>
            </label>
          </div>
        </div>

        <div class="host-buttons">
          <button
            class="btn btn-primary btn-lg"
            @click="handleStartGame"
            :disabled="roomState.players.length < 2 || isStartingGame"
          >
            <span v-if="isStartingGame" class="starting-game-indicator">
              ⏳ {{ $t("online.startingGame") || "遊戲準備中..." }}
            </span>
            <span v-else>
              🎲
              {{
                allPlayersReady
                  ? $t("common.startGame")
                  : $t("online.forceStart")
              }}
            </span>
          </button>
          <button class="btn btn-warning" @click="openSettingsModal">
            ⚙️ {{ $t("common.settings") }}
          </button>
          <button class="btn btn-danger" @click="showLeaveConfirmModal = true">
            🚪 {{ $t("online.leaveRoom") }}
          </button>
        </div>

        <p
          v-if="!allPlayersReady"
          style="opacity: 0.7; font-size: 0.85rem; margin-top: 10px"
        >
          ⚠️ {{ $t("online.notAllReady") }}
        </p>
      </div>

      <div class="controls" v-if="!isHost()">
        <button class="btn btn-secondary" @click="handleLeaveRoom">
          🚪 {{ $t("online.leaveRoom") }}
        </button>
      </div>
    </template>

    <!-- 遊戲進行中 -->
    <template v-else-if="roomState?.gameState === 'playing'">
      <div class="card">
        <RouletteAnimation
          ref="rouletteAnimationRef"
          :current-drawer="{
            id: getCurrentDrawerId(),
            name: currentDrawerName,
          }"
          :participants="
            roomState.players.map((p) => ({
              id: p.participantId,
              name: p.name,
            }))
          "
          :drawn-count="roomState.results.length"
          :total-count="roomState.players.length"
          :can-draw="
            (isCurrentDrawer() || isHost()) &&
            !hasDrawnCurrent &&
            !isAnimationPlaying
          "
          :is-last-draw="roomState.gameState === 'complete'"
          :actual-result="lastDrawResult"
          :can-show-next-button="isHost() || isCurrentDrawer()"
          :is-current-player="isCurrentDrawer()"
          @draw="isCurrentDrawer() ? handlePerformDraw() : handleHostDraw()"
          @next="handleNextDrawer"
          @complete="handleNextDrawer"
          @animation-start="onLocalAnimationStart"
          @animation-end="onAnimationEnd"
        />

        <!-- 提示訊息 -->
        <div v-if="isCurrentDrawer()" class="your-turn-hint">
          <p>🎯 {{ $t("online.yourTurn") }}</p>
        </div>
        <div v-else-if="isHost() && !isCurrentDrawer()" class="host-hint">
          <p>👑 {{ $t("online.hostCanDraw") }}</p>
        </div>
        <div v-else class="waiting-hint">
          <p>⏳ {{ $t("online.waitingFor", { name: currentDrawerName }) }}</p>
        </div>
      </div>

      <!-- 結果列表 -->
      <!-- 結果列表 -->
      <ResultsList
        :results="formattedResults"
        :is-drawing="isDrawing"
        :current-drawer-name="currentDrawerName"
      />

      <!-- 遊戲進行中控制按鈕 -->
      <div class="controls">
        <button class="btn btn-warning" @click="openSettingsModal">
          ⚙️ {{ $t("game.viewSettings") }}
        </button>
        <button
          class="btn btn-danger"
          @click="handleRestartGame"
          v-if="isHost()"
        >
          🔄 {{ $t("game.restart") }}
        </button>
      </div>
    </template>

    <!-- 遊戲完成 - 跳轉至結果頁面 -->
    <template v-else-if="roomState?.gameState === 'complete'">
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner">🎉</div>
          <h2>{{ $t("game.preparing") }}</h2>
        </div>
      </div>
    </template>

    <!-- 進度側邊面板 -->
    <ProgressPanel
      v-if="
        roomState?.gameState === 'playing' ||
        roomState?.gameState === 'complete'
      "
      :drawn-count="roomState?.results.length || 0"
      :total-count="roomState?.players.length || 0"
      :players="progressPlayers"
    />

    <!-- 離開確認彈窗 -->
    <div
      class="modal-overlay"
      v-if="showLeaveConfirmModal"
      @click.self="showLeaveConfirmModal = false"
    >
      <div class="modal-content">
        <h3>⚠️ {{ $t("modal.confirmLeave") }}</h3>
        <p style="margin: 15px 0">
          {{
            isHost()
              ? $t("online.hostLeaveWarning")
              : $t("online.confirmLeaveRoom")
          }}
        </p>
        <div class="modal-buttons">
          <button
            class="btn btn-secondary"
            @click="showLeaveConfirmModal = false"
          >
            {{ $t("common.cancel") }}
          </button>
          <button class="btn btn-danger" @click="confirmLeaveRoom">
            {{ $t("modal.confirmLeave") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 改名彈窗 -->
    <div
      class="modal-overlay"
      v-if="showRenameModal"
      @click.self="showRenameModal = false"
    >
      <div class="modal-content">
        <h3>✏️ {{ $t("online.changeName") }}</h3>
        <div style="margin: 15px 0">
          <input
            type="text"
            class="input"
            v-model="newPlayerName"
            :placeholder="$t('online.enterNewName')"
            maxlength="20"
            @keypress.enter="handleRename"
            autofocus
          />
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showRenameModal = false">
            {{ $t("common.cancel") }}
          </button>
          <button
            class="btn btn-primary"
            @click="handleRename"
            :disabled="!newPlayerName.trim()"
          >
            {{ $t("common.confirm") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 設定彈窗 - 權限分級 -->
    <div
      class="modal-overlay"
      v-if="showSettingsModal"
      @click.self="showSettingsModal = false"
    >
      <div class="modal-content settings-modal">
        <h3>
          {{
            isHost() && roomState?.gameState === "waiting"
              ? "⚙️ 房間設定"
              : "📋 查看設定"
          }}
        </h3>
        <div class="settings-content">
          <!-- 基本設定區域 (所有人可見) -->
          <div class="settings-section basic-settings">
            <div class="section-header">
              <h4>📋 基本資訊</h4>
            </div>

            <div class="setting-item">
              <span class="setting-label">🏠 {{ $t("modal.roomCode") }}:</span>
              <span class="setting-value">{{ roomState?.id }}</span>
            </div>

            <div class="setting-item">
              <span class="setting-label">🎲 {{ $t("common.seed") }}:</span>
              <span class="setting-value seed-value">{{
                roomState?.seed
              }}</span>
            </div>

            <div class="setting-item">
              <span class="setting-label"
                >👥 {{ $t("modal.playerCount") }}:</span
              >
              <span class="setting-value"
                >{{ roomState?.players.length }} /
                {{ roomState?.settings.maxPlayers }}
                {{ $t("common.players") }}</span
              >
            </div>

            <div class="setting-item">
              <span class="setting-label">🎯 {{ $t("game.startMode") }}:</span>
              <span class="setting-value">{{
                roomState?.settings.firstDrawerMode === "random"
                  ? $t("game.random")
                  : roomState?.settings.firstDrawerMode === "manual"
                    ? $t("game.manual")
                    : $t("online.hostFirst")
              }}</span>
            </div>

            <div class="setting-item">
              <span class="setting-label">📊 {{ $t("game.progress") }}:</span>
              <span class="setting-value"
                >{{ roomState?.results.length || 0 }} /
                {{ roomState?.players.length }}</span
              >
            </div>

            <div class="setting-item">
              <span class="setting-label"
                >👁️ {{ $t("online.allowSpectators") }}:</span
              >
              <span class="setting-value coming-soon-text">
                {{ $t("common.comingSoon") }}
              </span>
            </div>

            <!-- 觀眾連結按鈕 - 暫時隱藏，功能即將推出 -->
            <!-- <div v-if="roomState?.settings.allowSpectators" class="advanced-action">
              <button class="btn btn-secondary btn-sm" @click="copySpectatorLink">
                👁️ {{ $t("online.copySpectatorLink") }}
              </button>
            </div> -->

            <!-- 參與者名單 -->
            <div class="participants-list">
              <p class="list-title">👥 {{ $t("game.participants") }}:</p>
              <div class="participant-chips">
                <span
                  v-for="player in roomState?.players"
                  :key="player.id"
                  class="participant-chip"
                >
                  {{ player.participantId }}. {{ player.name }}
                  <span v-if="player.isHost" class="host-badge">👑</span>
                </span>
              </div>
            </div>
          </div>

          <!-- 進階設定區域 (僅主持人可見) -->
          <template v-if="isHost()">
            <div class="settings-divider"></div>

            <div class="settings-section advanced-settings">
              <div class="section-header">
                <h4>🔧 {{ $t("settings.advanced") }}</h4>
                <span class="section-badge host-only">{{
                  $t("online.hostOnly")
                }}</span>
              </div>

              <!-- 主機在等待階段可編輯人數上限 -->
              <template v-if="roomState?.gameState === 'waiting'">
                <div class="setting-item editable-setting">
                  <label class="setting-label"
                    >👥 {{ $t("modal.maxPlayers") }}:</label
                  >
                  <div class="max-players-control">
                    <button
                      class="control-btn"
                      @click="decreaseMaxPlayers"
                      :disabled="
                        newMaxPlayers <= (roomState?.players.length || 2)
                      "
                    >
                      -
                    </button>
                    <span class="control-value">{{ newMaxPlayers }}</span>
                    <button
                      class="control-btn"
                      @click="increaseMaxPlayers"
                      :disabled="newMaxPlayers >= 100"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p
                  v-if="newMaxPlayers < (roomState?.players.length || 0)"
                  class="warning-text"
                >
                  ⚠️
                  {{
                    $t("online.maxPlayersWarning", {
                      count: roomState?.players.length,
                    })
                  }}
                </p>
              </template>
            </div>
          </template>

          <!-- 非主持人提示 -->
          <template v-else>
            <div class="settings-divider"></div>
            <div class="non-host-notice">
              <div class="notice-icon">🔒</div>
              <div class="notice-text">
                <p class="notice-title">{{ $t("online.advancedHostOnly") }}</p>
                <p class="notice-desc">{{ $t("online.contactHost") }}</p>
              </div>
            </div>
          </template>
        </div>

        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showSettingsModal = false">
            {{
              isHost() && roomState?.gameState === "waiting"
                ? $t("common.cancel")
                : $t("common.close")
            }}
          </button>
          <button
            v-if="isHost() && roomState?.gameState === 'waiting'"
            class="btn btn-primary"
            @click="saveRoomSettings"
            :disabled="newMaxPlayers < (roomState?.players.length || 2)"
          >
            {{ $t("common.save") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 房間解散提示 -->
    <div class="modal-overlay" v-if="showRoomDisbandModal">
      <div class="modal-content">
        <h3>❌ {{ $t("modal.roomDisbanded") }}</h3>
        <p style="margin: 15px 0">{{ $t("modal.hostLeft") }}</p>
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="goHome">
            {{ $t("common.home") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 進階選項密碼驗證 -->
    <PasswordModal
      v-model="showAdvancedModal"
      :title="$t('modal.advancedVerify')"
      :confirm-text="$t('common.confirm')"
      confirm-button-class="btn-primary"
      @confirm="confirmAdvanced"
    />

    <!-- QR Code 彈窗 -->
    <div
      class="modal-overlay"
      v-if="showQRModal"
      @click.self="showQRModal = false"
    >
      <div class="modal-content qr-modal">
        <h3>📱 {{ $t("online.scanQR") }}</h3>
        <div class="qr-container">
          <canvas ref="qrCanvas" class="qr-code"></canvas>
        </div>
        <div class="qr-url">{{ qrCodeUrl }}</div>
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="showQRModal = false">
            {{ $t("common.close") }}
          </button>
        </div>
      </div>
    </div>

    <!-- URL 加入房間彈窗 -->
    <div
      class="modal-overlay"
      v-if="showJoinModal"
      @click.self="
        () => {
          showJoinModal = false;
          router.push('/');
        }
      "
    >
      <div class="modal-content">
        <h3>🚪 {{ $t("modal.joinRoom") }}</h3>
        <div style="margin: 15px 0">
          <label style="display: block; margin-bottom: 8px">{{
            $t("modal.roomCode")
          }}</label>
          <input
            type="text"
            class="input"
            v-model="joinRoomCode"
            :placeholder="$t('modal.enterRoomCode')"
            maxlength="4"
            style="text-transform: uppercase"
            @input="joinRoomCode = joinRoomCode.toUpperCase()"
          />
        </div>
        <div style="margin: 15px 0">
          <label style="display: block; margin-bottom: 8px">{{
            $t("modal.yourName")
          }}</label>
          <input
            type="text"
            class="input"
            v-model="joinPlayerName"
            :placeholder="$t('modal.enterName')"
            maxlength="20"
            @keypress.enter="confirmJoinRoom"
            autofocus
          />
        </div>
        <div class="modal-buttons">
          <button
            class="btn btn-secondary"
            @click="
              () => {
                showJoinModal = false;
                router.push('/');
              }
            "
          >
            {{ $t("common.cancel") }}
          </button>
          <button
            class="btn btn-primary"
            @click="confirmJoinRoom"
            :disabled="
              !joinPlayerName.trim() ||
              !joinRoomCode.trim() ||
              joinRoomCode.trim().length !== 4
            "
          >
            {{ $t("modal.joinRoom") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分享結果模態框 -->
    <SocialShareModal
      v-model="showShareModal"
      :results="formattedResults"
      :seed="roomState?.seed || 0"
      mode="online"
      :player-name="getCurrentPlayer()?.name"
      @toast="displayError"
    />

    <!-- 錯誤提示 -->
    <Transition name="toast">
      <div v-if="showErrorToast" class="toast-error">❌ {{ errorMessage }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const dynamicConfig = useDynamicConfig();
const { addRecord: addHistoryRecord } = useHistory();
const { copyToClipboard } = useClipboard();
const {
  isConnected,
  playerId,
  roomState,
  error,
  connect,
  disconnect,
  on,
  off,
  send,
  leaveRoom,
  setReady,
  renamePlayer,
  startGame,
  performDraw,
  hostPerformDraw,
  nextDrawer,
  getCurrentPlayer,
  isCurrentDrawer,
  isHost,
  isCreator, // v0.9.0: 添加創建者檢查
  joinRoom: wsJoinRoom,
  setSkipAutoReconnect,
  syncState,
  sendHeartbeat,
  preflightTest,
  validateState,
} = useWebSocket();

const {
  generateResultImage,
  downloadImage,
  shareImage,
  getSocialShareLinks,
  copyImageToClipboard,
} = useShareImage();

// 彈窗控制
const showLeaveConfirmModal = ref(false);
const showRenameModal = ref(false);
const newPlayerName = ref("");
const showSettingsModal = ref(false);
const showRoomDisbandModal = ref(false);
const showAdvancedSettings = ref(false);
const showShareModal = ref(false);
const showQRModal = ref(false);
const qrCodeUrl = ref("");
const qrCanvas = ref<HTMLCanvasElement | null>(null);

// 表單數據
const addPlayerName = ref("");
const newMaxPlayers = ref(20);

// 抽獎設定
const firstDrawerMode = ref<"random" | "manual">("random");
const firstDrawerId = ref<number | undefined>(undefined);
const allowSpectators = ref(true);

// 進階設定
const fixedDrawerId = ref<number | undefined>(undefined);
const fixedGiftId = ref<number | undefined>(undefined);
const fixedPairs = ref<{ drawerId: number; giftOwnerId: number }[]>([]);
const showAdvanced = ref(false);
const showAdvancedModal = ref(false);

// 錯誤提示
const showErrorToast = ref(false);
const errorMessage = ref("");

// RouletteAnimation 組件引用
const rouletteAnimationRef = ref<any>(null);

// ✅ 動畫相關狀態（由動畫組件控制，不是 UI 邏輯驅動）
// ❌ 已移除: isDrawing, hasDrawnCurrent, showResult, lastDrawResult（改用伺服器 isRevealed）
const autoProgressTimeout = ref<number | null>(null);
const drawBoxContent = ref("🎁");
const resultGiftOwner = ref("");
const hasAddedHistory = ref(false);
let animationTimeout: NodeJS.Timeout | null = null;

// 動畫狀態 - 用於同步所有客戶端的動畫播放
const isAnimationPlaying = ref(false); // 當前是否有動畫在播放（所有人同步）

// 定期同步機制
const syncInterval = ref<number | null>(null);
const heartbeatInterval = ref<number | null>(null);
const validateInterval = ref<number | null>(null);
const SYNC_INTERVAL_MS = 3000; // 每 3 秒同步一次
const HEARTBEAT_INTERVAL_MS = 10000; // 每 10 秒發送心跳
const VALIDATE_INTERVAL_MS = 5000; // 每 5 秒驗證狀態

// Pre-flight 檢查狀態
const preflightStatus = ref<"pending" | "testing" | "passed" | "failed">(
  "pending",
);
const preflightResults = ref<Map<string, boolean>>(new Map());
const preflightTestId = ref<string>("");
const isStartingGame = ref(false); // 遊戲正在啟動中

// 連線超時狀態
const connectionTimeout = ref(false);
const showConnectionTimeout = ref(false);

// 計算屬性
const allPlayersReady = computed(() => {
  if (!roomState.value) return false;
  return roomState.value.players.every((p) => p.isReady || p.isHost);
});
const canStartGame = computed(() => {
  if (!roomState.value) return false;
  return (
    roomState.value.players.length >= 2 &&
    roomState.value.players.every((p) => p.isReady || p.isHost)
  );
});

const currentDrawerName = computed(() => {
  if (!roomState.value) return "-";
  const currentId = roomState.value.drawOrder[roomState.value.currentIndex];
  const player = roomState.value.players.find(
    (p) => p.participantId === currentId,
  );
  return player?.name || "-";
});

function getCurrentDrawerId() {
  if (!roomState.value) return 0;
  return roomState.value.drawOrder[roomState.value.currentIndex] || 0;
}

// Computed properties for components
// 🆕 SSOT: 根據伺服器廣播的 isRevealed 狀態直接過濾
// ❌ 不再依賴本地 UI 標誌 (isDrawing, hasDrawnCurrent)
const formattedResults = computed(() => {
  if (!roomState.value) return [];

  // 只顯示已揭曉的結果（isRevealed=true）
  return roomState.value.results
    .filter((r: any) => r.isRevealed === true)
    .map((r: any) => ({
      order: r.order,
      drawerName: getPlayerName(r.drawerId),
      giftOwnerName: getPlayerName(r.giftOwnerId),
    }));
});

const progressPlayers = computed(() => {
  if (!roomState.value) return [];
  return roomState.value.players.map((p: any) => ({
    id: p.participantId,
    name: p.name,
    isCurrent:
      roomState.value!.drawOrder[roomState.value!.currentIndex] ===
      p.participantId,
    hasDrawn: roomState.value!.results.some(
      (r: any) => r.drawerId === p.participantId,
    ),
  }));
});

// WebSocket 事件處理函數（定義在外部以便清理）
function onWsDrawPerformed(result: any) {
  // 🆕 result 包含 drawerId 和 giftOwnerId（伺服器計算）
  console.log("[Online] Draw performed, starting animation", {
    drawerId: result.drawerId,
    giftOwnerId: result.giftOwnerId,
  });
  playDrawAnimation(result);
}

function onWsNextDrawer() {
  console.log("[Online] Next drawer event received");

  // 重置動畫狀態（但不需要重置其他 UI 變量）
  isAnimationPlaying.value = false;
  animationInProgress = false;
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }

  // ✅ 重置動畫組件
  nextTick(() => {
    if (rouletteAnimationRef.value?.reset) {
      rouletteAnimationRef.value.reset();
      console.log("[Online] RouletteAnimation reset completed");
    }
  });

  // formattedResults 會根據新的 results[].isRevealed 自動更新
}

function onWsGameComplete() {
  console.log("[Online] onWsGameComplete called");
  console.log("[Online] Room state:", {
    gameState: roomState.value?.gameState,
    resultsCount: roomState.value?.results?.length,
    playersCount: roomState.value?.players?.length,
  });

  // 延遲一點執行，確保 roomState 已經更新
  setTimeout(() => {
    celebrate();
  }, 500);
}

function onWsRoomDisbanded() {
  stopSync(); // 停止定期同步
  showRoomDisbandModal.value = true;
}

function onWsGameRestarted() {
  console.log("[Online] Game restarted");

  // 重置動畫狀態
  isAnimationPlaying.value = false;
  animationInProgress = false;
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
  drawBoxContent.value = "🎁";
  hasAddedHistory.value = false;

  // 重置 RouletteAnimation 組件狀態
  nextTick(() => {
    if (rouletteAnimationRef.value?.reset) {
      rouletteAnimationRef.value.reset();
    }
  });

  displayError("✅ 遊戲已重新開始！");
}

// RouletteAnimation 動畫結束回調
function onAnimationEnd() {
  console.log("[Online] Animation completed");
  isAnimationPlaying.value = false;
  animationInProgress = false;

  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }

  // ✅ 不需要手動設置 showResult 或 lastDrawResult
  // formattedResults 已根據伺服器廣播的 isRevealed 自動更新

  console.log("[Online] Animation end state", {
    isHost: isHost(),
    gameState: roomState.value?.gameState,
    canAutoProgress: isHost() && roomState.value?.gameState === "playing",
  });

  // Auto-progress to next drawer after a delay (only if host)
  if (isHost() && roomState.value && roomState.value.gameState === "playing") {
    console.log("[Online] Setting auto-progress timeout (2s)");
    autoProgressTimeout.value = window.setTimeout(() => {
      autoProgressTimeout.value = null;
      console.log("[Online] Auto-progressing to next drawer");
      // 無論是否為最後一位，都發送 next_drawer
      // 伺服器會判斷是否完成並回覆 game_complete 或 next_drawer
      handleNextDrawer();
    }, 2000);
  }
}

// 本地抽獎按鈕觸發的動畫開始（只有觸發者會走這個）
function onLocalAnimationStart() {
  console.log("[Online] Local animation start (triggered by button)");
  isAnimationPlaying.value = true;
}

function onWsError(msg: string) {
  displayError(msg);
}

// 加入房間的彈窗控制
const showJoinModal = ref(false);
const joinPlayerName = ref("");
const joinRoomCode = ref("");
const isJoiningFromUrl = ref(false);
const isReconnecting = ref(false); // 追蹤是否正在重連

// 生成隨機用戶名稱
function generateRandomUsername(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${t("common.user")}${randomNum}`;
}

// 處理 URL 加入
async function handleUrlJoin() {
  console.log("[URL Join] 🚀 Starting URL join process...");
  const roomCode = route.query.room as string;
  console.log("[URL Join] Room code from URL:", roomCode);

  if (!roomCode) {
    // 沒有房間代碼，返回首頁
    console.log("[URL Join] ❌ No room code, redirecting to home");
    router.push("/");
    return;
  }

  const code = roomCode.toUpperCase();
  const { getDeviceId, getReconnectInfo } = useDeviceId();
  const deviceId = getDeviceId();
  console.log("[URL Join] Device ID:", deviceId);
  console.log("[URL Join] Target room code:", code);

  // 先檢查是否有該房間的重連資訊
  const reconnectInfo = getReconnectInfo(code);
  console.log("[URL Join] Reconnect info:", reconnectInfo);

  if (reconnectInfo && reconnectInfo.expiresAt > Date.now()) {
    // 有有效的重連 token，發送重連請求
    console.log(
      "[URL Join] ✅ Found valid reconnect token, attempting reconnect...",
    );
    isReconnecting.value = true;
    send({
      type: "reconnect",
      payload: {
        roomId: code,
        reconnectToken: reconnectInfo.reconnectToken,
      },
    });
    // 等待重連結果
    return;
  }

  // 直接顯示加入彈窗，讓玩家手動確認加入
  // 不進行預先檢查，由伺服器在加入時進行驗證
  console.log("[URL Join] ✨ Showing join modal for room:", code);
  setSkipAutoReconnect(true);
  joinRoomCode.value = code;
  joinPlayerName.value = generateRandomUsername();
  isJoiningFromUrl.value = true;
  showJoinModal.value = true;
  console.log(
    "[URL Join] ✅ Join modal displayed with name:",
    joinPlayerName.value,
  );
}

// 確認加入房間
function confirmJoinRoom() {
  console.log("[Join] 🎯 confirmJoinRoom called");
  console.log("[Join] Player name:", joinPlayerName.value);
  console.log("[Join] Room code:", joinRoomCode.value);
  console.log("[Join] Is connected:", isConnected.value);

  // 驗證玩家名稱和房間代碼
  if (!joinPlayerName.value.trim()) {
    console.log("[Join] ❌ Missing player name, aborting");
    displayError(t("error.pleaseEnterName"));
    return;
  }

  if (!joinRoomCode.value || joinRoomCode.value.trim().length !== 4) {
    console.log("[Join] ❌ Invalid room code, aborting");
    displayError(t("error.invalidRoomCode"));
    return;
  }

  showJoinModal.value = false;
  isJoiningFromUrl.value = false;

  // 等待連線後加入
  const waitForConnection = () => {
    if (isConnected.value) {
      console.log("[Join] ✅ Connection ready, sending join request");
      wsJoinRoom(
        joinRoomCode.value.toUpperCase(),
        joinPlayerName.value.trim(),
        false,
      );
    } else {
      console.log("[Join] ⏳ Waiting for connection...");
      setTimeout(waitForConnection, 100);
    }
  };
  waitForConnection();
}

onMounted(async () => {
  console.log("[Online] 🎬 onMounted started");
  // 確保連線
  if (!isConnected.value) {
    console.log("[Online] 🔌 Initiating WebSocket connection...");
    connect();
  } else {
    console.log("[Online] ✅ Already connected");
  }

  // 檢查 URL 是否有房間代碼
  const roomCode = route.query.room as string;
  console.log("[Online] 🔍 URL room code:", roomCode);

  // 等待 WebSocket 連線完成
  console.log("[Online] ⏳ Waiting for WebSocket connection...");
  const waitForConnection = () =>
    new Promise<void>((resolve) => {
      if (isConnected.value) {
        console.log("[Online] Already connected");
        resolve();
        return;
      }
      let elapsed = 0;
      const checkInterval = setInterval(() => {
        elapsed += 100;
        if (isConnected.value) {
          console.log(`[Online] Connected after ${elapsed}ms`);
          clearInterval(checkInterval);
          connectionTimeout.value = false;
          showConnectionTimeout.value = false;
          resolve();
        }
      }, 100);
      // 5 秒後顯示 fallback 按鈕
      setTimeout(() => {
        if (!isConnected.value) {
          console.warn("[Online] Connection timeout after 5s");
          connectionTimeout.value = true;
          showConnectionTimeout.value = true;
        }
      }, 5000);
      // 10 秒完全超時
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isConnected.value) {
          console.error("[Online] Connection failed after 10s");
        }
        resolve();
      }, 10000);
    });

  await waitForConnection();
  console.log(
    "[Online] ✅ Connection wait complete, isConnected:",
    isConnected.value,
  );

  // 如果已經有房間狀態（自動重連成功），則不需要處理 URL 加入
  if (roomState.value) {
    console.log(
      "[Online] 🏠 Already have room state (auto-reconnected):",
      roomState.value.id,
    );
    // 如果 URL 有房間代碼且與當前房間不符，清除 URL 參數
    if (roomCode && roomCode.toUpperCase() !== roomState.value.id) {
      console.log("[Online] ⚠️ URL room code mismatch, clearing URL params");
      router.replace({ query: {} });
    }
    return;
  }

  console.log("[Online] 📭 No room state yet");

  if (roomCode) {
    // 有房間代碼但沒有房間狀態，需要處理 URL 加入
    console.log("[Online] 🚀 Calling handleUrlJoin for room:", roomCode);
    await handleUrlJoin();
    console.log("[Online] ✅ handleUrlJoin completed");
  }

  // 如果沒有房間狀態，等待一段時間後再檢查
  setTimeout(() => {
    // 只有在沒有房間狀態且不是正在加入/重連時才返回首頁
    if (!roomState.value && !showJoinModal.value && !isReconnecting.value) {
      router.push("/");
    }
  }, 3000);

  // 先清除舊的事件監聯器，再註冊新的
  off("roomUpdated");
  off("gameStarted");
  off("drawPerformed");
  off("nextDrawer");
  off("gameComplete");
  off("roomDisbanded");
  off("gameRestarted");
  off("playerDisconnected");
  off("stateSynced");
  off("preflightResponse");
  off("preflightBroadcast");
  off("stateValidated");
  off("error");
  off("reconnectSuccess");
  off("reconnectFailed");

  // 監聯事件
  on("roomUpdated", () => {
    console.log("[Online] 🔄 Room updated event received");
    console.log("[Online] 📊 Current room state:", roomState.value);
    // 房間狀態更新，同步設定
    if (roomState.value) {
      firstDrawerMode.value =
        roomState.value.settings.firstDrawerMode === "host"
          ? "random"
          : roomState.value.settings.firstDrawerMode;
      firstDrawerId.value = roomState.value.settings.firstDrawerId;
      allowSpectators.value = roomState.value.settings.allowSpectators;

      // 啟動定期同步（加入房間後）
      startSync();
    }
  });
  on("stateSynced", (room: any) => {
    console.log("[Sync] State synchronized from server (SSOT):", {
      gameState: room?.gameState,
      currentIndex: room?.currentIndex,
      resultsCount: room?.results?.length,
      revealedCount: room?.results?.filter((r: any) => r.isRevealed).length,
    });

    // ✅ 直接更新 roomState（SSOT）
    // formattedResults computed 會自動根據 results[].isRevealed 重新計算
    if (roomState.value) {
      roomState.value = room;
    }

    // ✅ 無需手動修改 UI 狀態變量（它們已被移除或由動畫組件管理）
  });

  on("preflightResponse", (payload: any) => {
    console.log(
      "[Preflight] Received response for test",
      payload.testId,
      "from",
      payload.odId,
    );
    if (payload.testId === preflightTestId.value && payload.odId) {
      // 找到對應的玩家 ID 並標記
      const player = roomState.value?.players.find(
        (p) => p.id === payload.odId,
      );
      if (player) {
        preflightResults.value.set(player.id, true);
        console.log(`[Preflight] Player ${player.name} responded successfully`);
      } else {
        // 可能是自己的回應（使用當前 playerId）
        preflightResults.value.set(playerId.value, true);
        console.log(`[Preflight] Self response received`);
      }
    }
  });
  on("preflightBroadcast", (payload: any) => {
    console.log("[Preflight] Broadcast received from", payload.fromOdId);
    // 其他玩家的測試訊息，標記該玩家已連線
    if (payload.testId === preflightTestId.value) {
      preflightResults.value.set(payload.fromOdId, true);
    }
  });
  on("stateValidated", (payload: any) => {
    console.log("[Validate] Validation result (SSOT):", {
      isValid: payload.isValid,
      validation: payload.validation,
      resultsCount: payload.correctState?.results?.length,
      revealedCount: payload.correctState?.results?.filter(
        (r: any) => r.isRevealed,
      ).length,
    });

    if (!payload.isValid) {
      console.warn("[Validate] State mismatch detected, correcting...");
      displayError("⚠️ 狀態不一致已自動修正");

      // ✅ 直接用伺服器狀態覆蓋（SSOT）
      roomState.value = payload.correctState;

      // formattedResults 會自動根據 results[].isRevealed 重新計算
      // 無需手動修改 UI 狀態變量
    }
  });

  on("gameStarted", () => {
    console.log("[Online] Game started event received");
    console.log("[Online] Room state after game start:", {
      gameState: roomState.value?.gameState,
      currentIndex: roomState.value?.currentIndex,
      drawOrder: roomState.value?.drawOrder,
      playersCount: roomState.value?.players.length,
    });

    // 遊戲開始，重置動畫狀態
    isAnimationPlaying.value = false;
    animationInProgress = false;
    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }
    drawBoxContent.value = "🎁";
    hasAddedHistory.value = false;

    // 重置 RouletteAnimation 組件狀態
    nextTick(() => {
      if (rouletteAnimationRef.value?.reset) {
        rouletteAnimationRef.value.reset();
      }
    });

    // 確保同步正在運行
    startSync();

    // 啟動狀態驗證
    startValidation();

    // 立即請求一次完整狀態同步，確保所有客戶端狀態一致
    setTimeout(() => {
      console.log("[Online] Forcing state sync after game start");
      syncState();
    }, 500);
  });

  on("drawPerformed", (result: any) => {
    console.log("[Online] Draw performed event received:", result);
    onWsDrawPerformed(result);
  });

  on("nextDrawer", () => {
    console.log("[Online] Next drawer event received");
    console.log("[Online] New room state:", {
      gameState: roomState.value?.gameState,
      currentIndex: roomState.value?.currentIndex,
      currentDrawerId:
        roomState.value?.drawOrder?.[roomState.value?.currentIndex ?? 0],
      resultsCount: roomState.value?.results?.length,
    });
    onWsNextDrawer();
  });

  on("gameComplete", () => {
    console.log("[Online] Game complete event received");
    console.log(
      "[Online] Final results count:",
      roomState.value?.results?.length,
    );
    // 停止驗證和同步
    stopSync();
    onWsGameComplete();
  });

  on("roomDisbanded", onWsRoomDisbanded);
  on("gameRestarted", onWsGameRestarted);

  on("playerDisconnected", (payload: any) => {
    if (payload.hostTransferred) {
      const newHost = roomState.value?.players.find(
        (p) => p.id === payload.newHostId,
      );
      if (newHost) {
        displayError(`⚠️ 原主機已斷線，主機權限已移交給 ${newHost.name}`);
      }
    } else if (payload.isHost) {
      displayError("⚠️ 主機已斷線，但房間保留，您可以繼續遊戲");
    }
  });
  on("error", onWsError);

  // 重連事件處理
  on("reconnectSuccess", (payload: any) => {
    isReconnecting.value = false;
    console.log("[Online] Reconnect success", {
      roomId: payload?.room?.id,
      gameState: payload?.room?.gameState,
      currentIndex: payload?.room?.currentIndex,
      resultsCount: payload?.room?.results?.length,
      playerId: payload?.player?.id,
      playerName: payload?.player?.name,
    });
    router.replace({ query: {} });

    // 重連成功後重置動畫狀態
    isAnimationPlaying.value = false;
    animationInProgress = false;

    // 重置 RouletteAnimation 組件狀態（讓它根據 actual-result 顯示正確內容）
    nextTick(() => {
      if (rouletteAnimationRef.value?.reset) {
        rouletteAnimationRef.value.reset();
      }
    });

    // 重連成功後啟動同步
    startSync();

    // 如果遊戲進行中，啟動驗證
    if (roomState.value?.gameState === "playing") {
      startValidation();
    }

    // 延遲請求完整狀態同步
    setTimeout(() => {
      console.log("[Online] Forcing state sync after reconnect");
      syncState();
    }, 300);
  });
  on("reconnectFailed", (message: string) => {
    isReconnecting.value = false;
    displayError(message || t("error.reconnectFailed"));
    // 延遲後跳轉首頁
    setTimeout(() => {
      if (!roomState.value) {
        router.push("/");
      }
    }, 2000);
  });
});

onUnmounted(() => {
  // 停止定期同步
  stopSync();

  // 清除自動進入下一位的計時器
  if (autoProgressTimeout.value) {
    clearTimeout(autoProgressTimeout.value);
    autoProgressTimeout.value = null;
  }

  // 清除事件監聯器
  off("roomUpdated");
  off("gameStarted");
  off("drawPerformed");
  off("nextDrawer");
  off("gameComplete");
  off("roomDisbanded");
  off("gameRestarted");
  off("stateSynced");
  off("preflightResponse");
  off("preflightBroadcast");
  off("stateValidated");
  off("error");
  off("reconnectSuccess");
  off("reconnectFailed");
});

// 顯示錯誤提示
function displayError(msg: string) {
  errorMessage.value = msg;
  showErrorToast.value = true;
  setTimeout(() => {
    showErrorToast.value = false;
  }, 3000);
}

// ==================== 定期狀態同步 ====================

/**
 * 啟動定期狀態同步
 */
function startSync() {
  // 避免重複啟動
  if (syncInterval.value || heartbeatInterval.value) {
    console.log("[Sync] Already running");
    return;
  }

  console.log("[Sync] Starting periodic state sync");

  // ✅ 即使動畫播放中也繼續同步（無條件跳過）
  // 事件監聽器會只更新必要的狀態（isRevealed 相關）
  syncInterval.value = window.setInterval(() => {
    if (isConnected.value && roomState.value) {
      console.log("[Sync] Requesting state update");
      syncState();
    }
  }, SYNC_INTERVAL_MS);

  // 定期發送心跳包
  heartbeatInterval.value = window.setInterval(() => {
    if (isConnected.value) {
      console.log("[Heartbeat] Sending heartbeat");
      sendHeartbeat();
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * 停止定期狀態同步
 */
function stopSync() {
  console.log("[Sync] Stopping periodic state sync");

  if (syncInterval.value) {
    clearInterval(syncInterval.value);
    syncInterval.value = null;
  }

  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value);
    heartbeatInterval.value = null;
  }

  if (validateInterval.value) {
    clearInterval(validateInterval.value);
    validateInterval.value = null;
  }
}

/**
 * Pre-flight 連線檢查
 * 在遊戲開始前測試所有玩家的連線狀態
 */
async function runPreflightCheck(): Promise<boolean> {
  if (!roomState.value) {
    console.error("[Preflight] No room state");
    return false;
  }

  console.log("[Preflight] Starting pre-flight check...");
  preflightStatus.value = "testing";
  preflightResults.value.clear();

  // 生成測試 ID
  preflightTestId.value = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 發送測試訊息
  preflightTest(preflightTestId.value);

  // 等待所有玩家回應（包括虛擬玩家自動回應）
  const timeout = 5000; // 5 秒超時
  const startTime = Date.now();

  // 虛擬玩家和已連線玩家立即標記為通過
  roomState.value.players.forEach((player) => {
    if (player.isVirtual || player.id === playerId.value) {
      preflightResults.value.set(player.id, true);
      console.log(
        `[Preflight] Player ${player.name} auto-passed (virtual: ${player.isVirtual}, self: ${player.id === playerId.value})`,
      );
    }
  });

  // 等待真實玩家回應
  while (Date.now() - startTime < timeout) {
    // 檢查是否所有玩家都已回應
    const allResponded = roomState.value.players.every((player) =>
      preflightResults.value.has(player.id),
    );

    if (allResponded) {
      console.log("[Preflight] All players responded");
      preflightStatus.value = "passed";
      return true;
    }

    // 等待 100ms 後再檢查
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 超時 - 靜默失敗
  const missingPlayers = roomState.value.players
    .filter((p) => !preflightResults.value.has(p.id))
    .map((p) => p.name);

  console.warn(
    "[Preflight] Timeout - missing responses from:",
    missingPlayers,
    "(continuing anyway)",
  );

  // 提示連線較弱的玩家
  if (missingPlayers.length > 0) {
    displayError(`⚠️ ${missingPlayers.join(", ")} 目前連線不穩定`);
  }

  preflightStatus.value = "passed"; // 靜默通過，不阻擋遊戲

  return true; // 允許遊戲繼續
}

/**
 * 啟動狀態驗證
 * 定期檢查客戶端與伺服器狀態是否一致
 */
function startValidation() {
  if (validateInterval.value) {
    console.log("[Validate] Already running");
    return;
  }

  console.log("[Validate] Starting periodic validation");

  validateInterval.value = window.setInterval(() => {
    if (
      isConnected.value &&
      roomState.value &&
      roomState.value.gameState === "playing"
    ) {
      console.log("[Validate] Running state validation");
      validateState();
    }
  }, VALIDATE_INTERVAL_MS);
}

// 返回首頁
function goHome() {
  showRoomDisbandModal.value = false;
  stopSync(); // 停止定期同步
  router.push("/");
}

// 獲取玩家名稱
function getPlayerName(participantId: number): string {
  const player = roomState.value?.players.find(
    (p) => p.participantId === participantId,
  );
  return player?.name || "?";
}

// 複製房間連結
async function copyRoomLink() {
  const url = `${window.location.origin}${window.location.pathname}?room=${roomState.value?.id}`;
  const success = await copyToClipboard(url);
  showQRCode(url);
  displayError(success ? "✅ 已複製連結！" : url);
}

// 複製觀眾連結
async function copySpectatorLink() {
  const url = `${window.location.origin}${window.location.pathname}?room=${roomState.value?.id}&spectator=true`;
  const success = await copyToClipboard(url);
  showQRCode(url);
  displayError(success ? "✅ 已複製觀眾連結！" : url);
}

// 顯示 QR Code
function showQRCode(url: string) {
  qrCodeUrl.value = url;
  showQRModal.value = true;

  // 等待 DOM 更新後生成 QR Code
  nextTick(() => {
    if (qrCanvas.value) {
      generateQRCode(url, qrCanvas.value);
    }
  });
}

// 生成 QR Code
function generateQRCode(text: string, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 簡易 QR Code 生成（使用第三方 API）
  const size = 300;
  canvas.width = size;
  canvas.height = size;

  // 使用 Google Charts API 生成 QR Code
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

// 切換準備狀態
function toggleReady() {
  const current = getCurrentPlayer();
  if (current) {
    setReady(!current.isReady);
  }
}

// 協助加入玩家
function handleAddPlayer() {
  if (!addPlayerName.value.trim()) return;

  send({
    type: "host_add_player",
    payload: { playerName: addPlayerName.value.trim() },
  });
  addPlayerName.value = "";
}

// 進階設定相關函數
function handleToggleAdvanced() {
  const config = useDynamicConfig();
  if (config.settings.value.passwordProtection) {
    showAdvancedModal.value = true;
  } else {
    showAdvanced.value = !showAdvanced.value;
  }
}

function confirmAdvanced(password: string) {
  // 驗證密碼
  const storedPassword = localStorage.getItem("christmas_draw_admin_pwd");
  if (!storedPassword) {
    alert(t("error.noPasswordSet"));
    return;
  }
  if (password !== storedPassword) {
    alert(t("error.wrongPassword"));
    return;
  }

  showAdvancedModal.value = false;
  showAdvanced.value = true;
}

function handleAddFixedPair(drawerId: number, giftId: number) {
  if (drawerId === giftId) {
    alert(t("errors.sameAB"));
    return;
  }

  // 檢查是否已存在
  const exists = fixedPairs.value.some((fp) => fp.drawerId === drawerId);
  if (exists) {
    alert(t("errors.alreadyExists"));
    return;
  }

  fixedPairs.value.push({ drawerId, giftOwnerId: giftId });
}

function removeFixedPair(drawerId: number) {
  fixedPairs.value = fixedPairs.value.filter((fp) => fp.drawerId !== drawerId);
}

// 開始遊戲（強制或正常）
async function handleStartGame() {
  // 防止重複點擊
  if (isStartingGame.value) {
    console.log("[Game] Already starting, ignoring duplicate click");
    return;
  }

  isStartingGame.value = true;

  try {
    // Pre-flight 靜默檢查（背景驗證，不阻擋遊戲）
    console.log("[Game] Running silent pre-flight check...");
    await runPreflightCheck(); // 靜默執行，總是返回 true

    console.log("[Game] Starting game");

    hasAddedHistory.value = false;

    // 啟動狀態驗證
    startValidation();

    // 傳入完整設定
    const seed = Date.now();
    startGame(seed);
  } finally {
    // 遊戲啟動後重置狀態（等待 gameStarted 事件後會改變 UI）
    // 延遲重置，讓使用者看到狀態變化
    setTimeout(() => {
      isStartingGame.value = false;
    }, 1000);
  }
}

// 執行抽獎
function handlePerformDraw() {
  performDraw();
}

// 主機代替抽獎
function handleHostDraw() {
  if (!roomState.value) return;
  const currentId = roomState.value.drawOrder[roomState.value.currentIndex];
  hostPerformDraw(currentId);
}

// 下一位（帶防抖機制）
const isProcessingNext = ref(false);

function handleNextDrawer() {
  // 防止重複點擊
  if (isProcessingNext.value) {
    console.log("[NextDrawer] Already processing, ignoring duplicate click");
    return;
  }

  // 清除自動進入下一位的計時器，避免重複觸發
  if (autoProgressTimeout.value) {
    clearTimeout(autoProgressTimeout.value);
    autoProgressTimeout.value = null;
  }

  isProcessingNext.value = true;
  nextDrawer();

  // 1秒後重置狀態（允許再次點擊）
  setTimeout(() => {
    isProcessingNext.value = false;
  }, 1000);
}

// 打開設定彈窗
function openSettingsModal() {
  if (roomState.value) {
    newMaxPlayers.value = roomState.value.settings.maxPlayers;
    firstDrawerMode.value =
      roomState.value.settings.firstDrawerMode === "host"
        ? "random"
        : roomState.value.settings.firstDrawerMode;
    firstDrawerId.value = roomState.value.settings.firstDrawerId;
    allowSpectators.value = roomState.value.settings.allowSpectators;
  }
  showSettingsModal.value = true;
}

// 離開房間（主機需確認）
function handleLeaveRoom() {
  if (isHost()) {
    showLeaveConfirmModal.value = true;
  } else {
    leaveRoom();
    router.push("/");
  }
}

// 確認離開房間
function confirmLeaveRoom() {
  showLeaveConfirmModal.value = false;
  stopSync(); // 停止定期同步
  leaveRoom();
  router.push("/");
}

// 打開改名彈窗
function openRenameModal() {
  const currentPlayer = getCurrentPlayer();
  newPlayerName.value = currentPlayer?.name || "";
  showRenameModal.value = true;
}

// 確認改名
function handleRename() {
  if (newPlayerName.value.trim()) {
    renamePlayer(newPlayerName.value.trim());
    showRenameModal.value = false;
  }
}

// 增加人數上限
function increaseMaxPlayers() {
  if (newMaxPlayers.value < 100) {
    newMaxPlayers.value++;
  }
}

// 減少人數上限
function decreaseMaxPlayers() {
  const minPlayers = roomState.value?.players.length || 2;
  if (newMaxPlayers.value > minPlayers) {
    newMaxPlayers.value--;
  }
}

// 儲存房間設定
function saveRoomSettings() {
  if (!roomState.value) return;

  // 遊戲開始後不可修改設定
  if (roomState.value.gameState !== "waiting") {
    displayError("遊戲進行中無法修改設定");
    return;
  }

  const minPlayers = roomState.value.players.length;
  if (newMaxPlayers.value < minPlayers) {
    displayError("人數上限不能小於目前人數");
    return;
  }

  send({
    type: "update_settings",
    payload: {
      maxPlayers: newMaxPlayers.value,
      firstDrawerMode: firstDrawerMode.value,
      firstDrawerId:
        firstDrawerMode.value === "manual" ? firstDrawerId.value : undefined,
      allowSpectators: allowSpectators.value,
    },
  });

  showSettingsModal.value = false;
}

// 防止重複觸發抽獎動畫
let animationInProgress = false;

// 播放抽獎動畫 - 所有客戶端都會執行這個函數
function playDrawAnimation(result: any) {
  console.log("[Online] playDrawAnimation called", {
    drawerId: result.drawerId,
    giftOwnerId: result.giftOwnerId,
    animationInProgress,
  });

  // 防止重複觸發
  if (animationInProgress) {
    console.log(
      "[Online] Animation already in progress, ignoring duplicate trigger",
    );
    return;
  }

  // 標記動畫正在進行
  animationInProgress = true;
  isAnimationPlaying.value = true;

  const drawerName = getPlayerName(result.drawerId);
  const giftOwnerName = getPlayerName(result.giftOwnerId);
  drawBoxContent.value = giftOwnerName.charAt(0);
  resultGiftOwner.value = giftOwnerName;

  console.log("[Online] Animation data prepared", {
    drawerName,
    giftOwnerName,
  });

  // 觸發所有客戶端的動畫
  nextTick(() => {
    setTimeout(() => {
      if (rouletteAnimationRef.value?.triggerAnimation) {
        console.log("[Online] Triggering RouletteAnimation with result:", {
          drawerName,
          giftOwnerName,
        });
        rouletteAnimationRef.value.triggerAnimation({
          drawerName,
          giftOwnerName,
        });
      } else {
        console.warn("[Online] RouletteAnimation ref not available");
        // 如果組件不可用，立即清理狀態
        animationInProgress = false;
        isAnimationPlaying.value = false;
      }
    }, 50);
  });

  // 設置超時看門狗（12 秒）
  if (animationTimeout) clearTimeout(animationTimeout);
  animationTimeout = setTimeout(() => {
    console.warn("[Online] Animation timeout - forcing reset");
    isAnimationPlaying.value = false;
    animationInProgress = false;
    animationTimeout = null;
  }, 12000);
}

// 重新開始遊戲（保持設定，更新 seed）
function handleRestartGame() {
  if (confirm("確定要重新開始遊戲嗎？所有抽獎記錄將會清空。")) {
    send({
      type: "restart_game",
      payload: {},
    });
  }
}

// 分享結果 - 打開分享選單
function shareResults() {
  showShareModal.value = true;
}

// 慶祝動畫
function celebrate() {
  console.log("[Celebrate] Starting celebration", {
    hasAddedHistory: hasAddedHistory.value,
    roomState: !!roomState.value,
    resultsCount: roomState.value?.results?.length,
  });

  // 防止重複添加歷史紀錄
  if (hasAddedHistory.value) {
    console.log("[Celebrate] Already added history, skipping");
    return;
  }
  hasAddedHistory.value = true;

  // 保存歷史紀錄和結果
  if (roomState.value && roomState.value.results.length > 0) {
    const resultsData = roomState.value.results.map((r) => ({
      order: r.order,
      drawerName: getPlayerName(r.drawerId),
      giftOwnerName: getPlayerName(r.giftOwnerId),
    }));

    console.log("[Celebrate] Saving history with results:", resultsData.length);

    addHistoryRecord({
      mode: "online",
      seed: roomState.value.seed,
      participantCount: roomState.value.players.length,
      results: resultsData,
    });

    // 保存結果到 localStorage 供 result 頁面使用
    const resultId = `online_${roomState.value.id}_${roomState.value.seed}_${Date.now()}`;
    const resultData = {
      id: resultId,
      mode: "online",
      roomId: roomState.value.id,
      seed: roomState.value.seed,
      participantCount: roomState.value.players.length,
      results: resultsData,
    };
    localStorage.setItem(`result_${resultId}`, JSON.stringify(resultData));
    console.log("[Celebrate] Saved result to localStorage:", resultId);

    // 跳轉到結果頁面
    console.log("[Celebrate] Will navigate to result page in 2 seconds");
    setTimeout(() => {
      console.log("[Celebrate] Navigating to result page now");
      router.push({ path: "/result", query: { id: resultId } });
    }, 2000); // 延遲 2 秒讓動畫播放
  } else {
    console.warn("[Celebrate] No results found, cannot save history");
    // 如果沒有結果，至少顯示一個提示
    displayError("🎉 遊戲完成！");
  }

  // 播放慶祝動畫（無論是否有結果都播放）

  const colors = [
    "#ffd700",
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#ffeaa7",
  ];
  const container = document.createElement("div");
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
.room-info {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
}

.room-code {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.room-code .label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.room-code .code {
  font-size: 2.5rem;
  font-weight: bold;
  font-family: monospace;
  color: #ffd700;
  letter-spacing: 5px;
}

.room-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.share-hint {
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.share-hint p {
  margin-bottom: 10px;
}

.share-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.2s;
}

.player-item.is-me {
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.player-item.is-host {
  border-left: 3px solid #ffd700;
}

.player-number {
  background: #c41e3a;
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.player-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* v0.9.0: 創建者標記樣式 */
.creator-badge {
  font-size: 1rem;
  opacity: 0.8;
}

.host-badge {
  font-size: 1.2rem;
}

.me-badge {
  font-size: 0.85rem;
  opacity: 0.7;
}

/* v0.9.0: 創建者玩家項目樣式 */
.player-item.is-creator {
  border-left: 3px solid #4caf50;
}

.btn-edit-name {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 5px;
  font-size: 0.9rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-edit-name:hover {
  opacity: 1;
}

.ready-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.1);
}

.ready-status.ready {
  background: rgba(40, 167, 69, 0.3);
  color: #7fff7f;
}

.your-turn {
  color: #ffd700;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
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

/* 主機控制區 */
.room-player-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.add-player-section {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.add-player-section h4 {
  margin-bottom: 10px;
  font-size: 0.95rem;
  opacity: 0.9;
}

.add-player-form {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.add-player-form .input {
  flex: 1;
  min-width: 120px;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 1rem;
}

.add-player-form .btn {
  min-height: 44px;
  width: 10vh;
  max-width: 15vw;
  padding: 10px 14px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 抽獎設定區 */
.draw-settings-section {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.draw-settings-section h4 {
  margin-bottom: 10px;
  font-size: 0.95rem;
  opacity: 0.9;
}

.start-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.start-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.start-options select {
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  margin-left: 20px;
}

.advanced-toggle {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.advanced-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* 進階設定 - 指定配對 */
.fixed-pair-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fixed-pair-item select {
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.fixed-pairs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fixed-pair-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 20px;
  font-size: 0.85rem;
}

.fixed-pair-tag .remove {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.fixed-pair-tag .remove:hover {
  opacity: 1;
}

.spectator-toggle {
  padding: 8px 0;
}

.spectator-toggle label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.spectator-toggle.coming-soon label {
  cursor: not-allowed;
  opacity: 0.6;
}

.spectator-toggle.coming-soon input {
  cursor: not-allowed;
}

.coming-soon-badge {
  font-size: 0.75rem;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
  font-weight: 600;
}

.host-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 遊戲啟動中指示器 */
.starting-game-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.btn-warning {
  background: #ffc107;
  color: #000;
}

.btn-warning:hover {
  background: #e0a800;
}

/* 進度面板 */
.progress-panel {
  position: fixed;
  right: 20px;
  top: 100px;
  width: 200px;
  background: rgba(26, 71, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 15px;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.progress-panel h4 {
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.progress-bar {
  background: rgba(255, 255, 255, 0.2);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  background: linear-gradient(90deg, #ffd700, #ff6b6b);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  margin-bottom: 12px;
  opacity: 0.8;
}

.player-status-list {
  max-height: 300px;
  overflow-y: auto;
}

.player-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.player-status-item.is-current {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.4);
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

/* 彈窗樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: linear-gradient(135deg, #1a472a, #2d5a3f);
  padding: 30px;
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* QR Code 彈窗樣式 */
.qr-modal {
  max-width: 400px;
}

.qr-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

.qr-code {
  max-width: 100%;
  height: auto;
}

.qr-url {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  word-break: break-all;
  margin: 15px 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

/* 設定面板特殊樣式 */
.modal-content.settings-modal {
  max-width: 600px;
  text-align: left;
}

.settings-content {
  margin: 20px 0;
  max-height: 500px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.section-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
}

.section-badge {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-badge.host-only {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #333;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
}

.setting-value {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
}

.seed-value {
  font-family: "Courier New", monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

.participants-list {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.list-title {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 10px;
}

.participant-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.participant-chip {
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.host-badge {
  font-size: 1rem;
}

.settings-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  margin: 20px 0;
}

.advanced-settings {
  background: rgba(255, 215, 0, 0.05);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.advanced-action {
  margin-top: 12px;
}

.editable-setting {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
}

.max-players-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-value {
  min-width: 40px;
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
}

.non-host-notice {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.08);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.notice-icon {
  font-size: 2.5rem;
  opacity: 0.7;
}

.notice-text {
  flex: 1;
}

.notice-title {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 5px 0;
  font-size: 1rem;
}

.notice-desc {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.85rem;
}

.warning-text {
  color: #ffeb3b;
  font-size: 0.85rem;
  margin: 8px 0 0 0;
  padding: 8px;
  background: rgba(255, 235, 59, 0.1);
  border-radius: 6px;
  border-left: 3px solid #ffeb3b;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

/* 人數上限設定 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.max-players-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.max-players-input .btn-sm {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
}

.max-players-input .btn-sm:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.max-players-input .btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.max-players-value {
  font-size: 1.5rem;
  font-weight: bold;
  min-width: 50px;
  text-align: center;
}

.warning-text {
  color: #ffc107;
  font-size: 0.85rem;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .progress-panel {
    position: static;
    width: 100%;
    margin-bottom: 20px;
  }

  /* 手機版輸入表單優化 */
  .add-player-form {
    flex-direction: row;
    gap: 8px;
  }

  .add-player-form .input {
    min-width: 100px;
    min-height: 46px;
    padding: 12px 14px;
    font-size: 1rem;
    flex: 1;
  }

  .add-player-form .btn {
    min-height: 46px;
    padding: 12px 12px;
    font-size: 0.9rem;
    flex-shrink: 0;
  }
}

@media (max-width: 600px) {
  .room-code .code {
    font-size: 2rem;
  }

  .draw-box {
    width: 150px;
    height: 150px;
    font-size: 3rem;
  }

  .host-buttons {
    flex-direction: column;
  }

  /* 更小屏幕的進一步優化 */
  .add-player-form .input {
    min-width: 90px;
    min-height: 48px;
    font-size: 1.05rem;
  }

  .add-player-form .btn {
    min-height: 48px;
    padding: 12px 10px;
    font-size: 0.85rem;
  }

  /* 手機版進度面板優化 */
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

/* 抽獎進度視覺化 */
.progress-bar {
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 20px;
}

.draw-order-visual {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.draw-order-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.draw-order-item.completed {
  background: rgba(76, 175, 80, 0.3);
  opacity: 0.8;
}

.draw-order-item.current {
  background: rgba(255, 193, 7, 0.3);
  border: 2px solid #ffc107;
  animation: pulse 1s infinite;
}

.draw-order-item.pending {
  opacity: 0.5;
}

.draw-order-item .order-num {
  background: rgba(255, 255, 255, 0.2);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.75rem;
}

.draw-order-item .order-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.02);
  }
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

/* 提示訊息樣式 */
.your-turn-hint,
.host-hint,
.waiting-hint {
  padding: 15px;
  margin-top: 20px;
  border-radius: 8px;
  text-align: center;
  font-size: 1rem;
  animation: pulse 2s infinite;
}

.your-turn-hint {
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.2),
    rgba(255, 140, 0, 0.2)
  );
  border: 2px solid rgba(255, 215, 0, 0.5);
}

.host-hint {
  background: linear-gradient(
    135deg,
    rgba(100, 200, 255, 0.2),
    rgba(70, 130, 255, 0.2)
  );
  border: 2px solid rgba(100, 200, 255, 0.5);
}

.waiting-hint {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.7;
}

.your-turn-hint p,
.host-hint p,
.waiting-hint p {
  margin: 0;
  font-weight: 600;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}
</style>
