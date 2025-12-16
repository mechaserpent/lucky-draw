<template>
  <div>
    <header>
      <h1>{{ dynamicConfig.settings.value.siteIconLeft }} {{ dynamicConfig.settings.value.siteTitle }} {{ dynamicConfig.settings.value.siteIconRight }}</h1>
      <p>
        <span class="mode-badge online">🌐 連線模式</span>
        用自己的裝置參與
      </p>      
    </header>

    <!-- 連線中 -->
    <div v-if="!isConnected" class="card" style="text-align: center;">
      <p>⏳ 正在連線...</p>
    </div>

    <!-- 等待階段 -->
    <template v-else-if="roomState?.gameState === 'waiting'">
      <div class="card">
        <h2>🏠 房間資訊</h2>
        
        <div class="room-info">
          <div class="room-code">
            <span class="label">房間代碼</span>
            <span class="code">{{ roomState.id }}</span>
          </div>
          
          <div class="room-stats">
            <span>👥 {{ roomState.players.length }} / {{ roomState.maxPlayers }} 人</span>
            <span>🎲 Seed: {{ roomState.seed }}</span>
          </div>
        </div>

        <div class="share-hint">
          <p>📱 分享房間代碼給朋友加入！</p>
          <button class="btn btn-secondary" @click="copyRoomLink">📋 複製連結</button>
        </div>
      </div>

      <div class="card">
        <h2>👥 玩家列表</h2>
        
        <div class="players-list">
          <div 
            v-for="player in roomState.players" 
            :key="player.id"
            class="player-item"
            :class="{ 'is-me': player.id === playerId, 'is-host': player.isHost }"
          >
            <span class="player-number">{{ player.participantId }}</span>
            <span class="player-name">
              {{ player.name }}
              <span v-if="player.isHost" class="host-badge">👑</span>
              <span v-if="player.id === playerId" class="me-badge">(你)</span>
            </span>
            <span class="ready-status" :class="{ ready: player.isReady }">
              {{ player.isReady ? '✅ 準備' : '⏳ 等待' }}
            </span>
          </div>
        </div>
      </div>

      <div class="card" v-if="!isHost()">
        <h2>🎮 準備狀態</h2>
        <div class="controls">
          <button 
            class="btn btn-lg"
            :class="getCurrentPlayer()?.isReady ? 'btn-danger' : 'btn-success'"
            @click="toggleReady"
          >
            {{ getCurrentPlayer()?.isReady ? '❌ 取消準備' : '✅ 我準備好了' }}
          </button>
        </div>
      </div>

      <div class="card" v-if="isHost()">
        <h2>👑 主機控制</h2>
        
        <!-- 人數顯示 -->
        <div class="room-player-count">
          👥 目前人數: {{ roomState.players.length }} / {{ roomState.maxPlayers }}
        </div>
        
        <!-- 協助加入玩家 -->
        <div class="add-player-section">
          <h4>➕ 協助加入玩家</h4>
          <div class="add-player-form">
            <input 
              type="text" 
              class="input" 
              v-model="addPlayerName" 
              placeholder="輸入玩家名字..."
              autocomplete="off"
              @keypress.enter="handleAddPlayer"
            >
            <button class="btn btn-secondary" @click="handleAddPlayer" :disabled="!addPlayerName.trim()">
              新增
            </button>
          </div>
        </div>
        
        <div class="host-buttons">
          <button 
            class="btn btn-primary btn-lg"
            @click="handleStartGame"
            :disabled="roomState.players.length < 2"
          >
            🎲 {{ allPlayersReady ? '開始遊戲' : '強制開始' }}
          </button>
          <button class="btn btn-warning" @click="openSettingsModal">
            ⚙️ 設定
          </button>
          <button class="btn btn-danger" @click="showLeaveConfirmModal = true">
            🚪 離開房間
          </button>
        </div>
        
        <p v-if="!allPlayersReady" style="opacity: 0.7; font-size: 0.85rem; margin-top: 10px;">
          ⚠️ 有玩家尚未準備，強制開始將忽略未準備狀態
        </p>
      </div>

      <div class="controls" v-if="!isHost()">
        <button class="btn btn-secondary" @click="handleLeaveRoom">
          🚪 離開房間
        </button>
      </div>
    </template>

    <!-- 遊戲進行中 -->
    <template v-else-if="roomState?.gameState === 'playing'">
      <!-- 抽獎進度視覺化 -->
      <div class="card">
        <h2>📊 抽獎進度</h2>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${(roomState.currentIndex / roomState.players.length) * 100}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ roomState.currentIndex }} / {{ roomState.players.length }} 人已完成抽獎
        </div>
        
        <div class="draw-order-visual">
          <div 
            v-for="(participantId, idx) in roomState.drawOrder" 
            :key="idx"
            class="draw-order-item"
            :class="{
              'completed': idx < roomState.currentIndex,
              'current': idx === roomState.currentIndex,
              'pending': idx > roomState.currentIndex
            }"
          >
            <span class="order-num">{{ idx + 1 }}</span>
            <span class="order-name">{{ getPlayerName(participantId) }}</span>
            <span class="order-status">
              {{ idx < roomState.currentIndex ? '✅' : idx === roomState.currentIndex ? '🎲' : '⏳' }}
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>
          🎰 抽獎進行中
          <span class="status-badge in-progress">
            {{ roomState.currentIndex + 1 }} / {{ roomState.players.length }}
          </span>
        </h2>
        
        <div class="draw-area">
          <div class="current-drawer">
            現在由 <span class="name">{{ currentDrawerName }}</span> 抽獎
            <span v-if="isCurrentDrawer()" class="your-turn">（輪到你了！）</span>
          </div>
          
          <div class="draw-box" :class="{ drawing: isDrawing }">
            <span class="content">{{ drawBoxContent }}</span>
          </div>
          
          <div class="draw-result" :class="{ show: showResult }">
            抽到了 <span class="gift-owner">{{ resultGiftOwner }}</span> 的禮物！
          </div>
          
          <!-- 自己是當前抽獎者 -->
          <button 
            v-if="isCurrentDrawer() && !hasDrawnCurrent" 
            class="btn btn-primary btn-lg" 
            @click="handlePerformDraw"
            :disabled="isDrawing"
          >
            🎲 抽獎！
          </button>
          
          <!-- 主機可以幫忙抽 -->
          <button 
            v-else-if="isHost() && !hasDrawnCurrent" 
            class="btn btn-secondary btn-lg" 
            @click="handleHostDraw"
            :disabled="isDrawing"
          >
            🎲 代替抽獎
          </button>
          
          <!-- 主機控制下一位 -->
          <button 
            v-if="isHost() && hasDrawnCurrent && roomState.currentIndex < roomState.players.length - 1"
            class="btn btn-success btn-lg" 
            @click="handleNextDrawer"
          >
            ➡️ 下一位
          </button>
        </div>
      </div>

      <!-- 結果列表 -->
      <div class="card">
        <h2>📋 抽獎結果</h2>
        <div class="results-list">
          <div v-if="roomState.results.length === 0" style="opacity: 0.6; text-align: center;">
            尚無抽獎結果
          </div>
          <div 
            v-for="r in roomState.results" 
            :key="r.order"
            class="result-item"
          >
            <span class="order">{{ r.order }}</span>
            <span class="drawer">{{ getPlayerName(r.drawerId) }}</span>
            <span class="arrow">➡️</span>
            <span class="gift">{{ getPlayerName(r.giftOwnerId) }} 的禮物</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 遊戲完成 -->
    <template v-else-if="roomState?.gameState === 'complete'">
      <div class="card" style="text-align: center;">
        <h2>🎉 抽獎完成！</h2>
        <p style="font-size: 1.2rem; margin: 20px 0;">所有人都已完成抽獎</p>
      </div>
      
      <div class="card">
        <h2>📋 最終結果</h2>
        <div class="results-list">
          <div 
            v-for="r in roomState.results" 
            :key="r.order"
            class="result-item"
          >
            <span class="order">{{ r.order }}</span>
            <span class="drawer">{{ getPlayerName(r.drawerId) }}</span>
            <span class="arrow">➡️</span>
            <span class="gift">{{ getPlayerName(r.giftOwnerId) }} 的禮物</span>
          </div>
        </div>
      </div>

      <div class="controls">
        <button v-if="isHost()" class="btn btn-primary" @click="handleRestartGame">
          🔄 重新開始（保持設定）
        </button>
        <button class="btn btn-secondary" @click="handleLeaveRoom">
          🏠 離開房間
        </button>
      </div>
    </template>

    <!-- 進度側邊面板 -->
    <div class="progress-panel" v-if="roomState?.gameState === 'playing' || roomState?.gameState === 'complete'">
      <h4>📊 抽獎進度</h4>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(roomState.results.length / roomState.players.length) * 100}%` }"
        ></div>
      </div>
      <div class="progress-text">
        {{ roomState.results.length }} / {{ roomState.players.length }}
      </div>
      <div class="player-status-list">
        <div 
          v-for="p in roomState.players" 
          :key="p.id"
          class="player-status-item"
          :class="{ 
            'is-current': roomState.drawOrder[roomState.currentIndex] === p.participantId,
            'has-drawn': roomState.results.some(r => r.drawerId === p.participantId)
          }"
        >
          <span class="status-icon">
            {{ roomState.results.some(r => r.drawerId === p.participantId) ? '✅' : 
               roomState.drawOrder[roomState.currentIndex] === p.participantId ? '🎯' : '⏳' }}
          </span>
          <span class="player-name">{{ p.name }}</span>
        </div>
      </div>
    </div>

    <!-- 離開確認彈窗 -->
    <div class="modal-overlay" v-if="showLeaveConfirmModal" @click.self="showLeaveConfirmModal = false">
      <div class="modal-content">
        <h3>⚠️ 確認離開</h3>
        <p style="margin: 15px 0;">
          {{ isHost() ? '你是主機，離開後房間將解散！' : '確定要離開房間嗎？' }}
        </p>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showLeaveConfirmModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmLeaveRoom">確認離開</button>
        </div>
      </div>
    </div>

    <!-- 設定彈窗 -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content">
        <h3>⚙️ 房間設定</h3>
        <div style="margin: 15px 0; text-align: left;">
          <p><strong>🎲 Seed:</strong> {{ roomState?.seed }}</p>
          <p><strong>🏠 房間代碼:</strong> {{ roomState?.id }}</p>
          
          <div class="setting-row" style="margin-top: 15px;">
            <label><strong>👥 人數上限:</strong></label>
            <div class="max-players-input">
              <button class="btn btn-sm" @click="decreaseMaxPlayers" :disabled="newMaxPlayers <= (roomState?.players.length || 2)">-</button>
              <span class="max-players-value">{{ newMaxPlayers }}</span>
              <button class="btn btn-sm" @click="increaseMaxPlayers" :disabled="newMaxPlayers >= 100">+</button>
            </div>
          </div>
          <p v-if="newMaxPlayers < (roomState?.players.length || 0)" class="warning-text">
            ⚠️ 人數上限不能小於目前人數 ({{ roomState?.players.length }})
          </p>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showSettingsModal = false">取消</button>
          <button class="btn btn-primary" @click="saveRoomSettings" :disabled="newMaxPlayers < (roomState?.players.length || 2)">儲存設定</button>
        </div>
      </div>
    </div>

    <!-- 房間解散提示 -->
    <div class="modal-overlay" v-if="showRoomDisbandModal">
      <div class="modal-content">
        <h3>❌ 房間已解散</h3>
        <p style="margin: 15px 0;">主機已離開，房間已解散。</p>
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="goHome">返回首頁</button>
        </div>
      </div>
    </div>

    <!-- 錯誤提示 -->
    <Transition name="toast">
      <div v-if="showErrorToast" class="toast-error">
        ❌ {{ errorMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const dynamicConfig = useDynamicConfig()
const { 
  isConnected, 
  playerId, 
  roomState, 
  error,
  connect,
  disconnect,
  on,
  send,
  leaveRoom,
  setReady,
  startGame,
  performDraw,
  hostPerformDraw,
  nextDrawer,
  getCurrentPlayer,
  isCurrentDrawer,
  isHost
} = useWebSocket()

// 彈窗控制
const showLeaveConfirmModal = ref(false)
const showSettingsModal = ref(false)
const showRoomDisbandModal = ref(false)

// 表單數據
const addPlayerName = ref('')
const newMaxPlayers = ref(20)

// 錯誤提示
const showErrorToast = ref(false)
const errorMessage = ref('')

// 抽獎動畫狀態
const isDrawing = ref(false)
const autoProgressTimeout = ref<number | null>(null)
const showResult = ref(false)
const drawBoxContent = ref('🎁')
const resultGiftOwner = ref('')
const hasDrawnCurrent = ref(false)

// 計算屬性
const allPlayersReady = computed(() => {
  if (!roomState.value) return false
  return roomState.value.players.every(p => p.isReady || p.isHost)
})
const canStartGame = computed(() => {
  if (!roomState.value) return false
  return roomState.value.players.length >= 2 && 
         roomState.value.players.every(p => p.isReady || p.isHost)
})

const currentDrawerName = computed(() => {
  if (!roomState.value) return '-'
  const currentId = roomState.value.drawOrder[roomState.value.currentIndex]
  const player = roomState.value.players.find(p => p.participantId === currentId)
  return player?.name || '-'
})

onMounted(() => {
  // 確保連線
  if (!isConnected.value) {
    connect()
  }
  
  // 如果沒有房間狀態，回到首頁
  setTimeout(() => {
    if (!roomState.value) {
      router.push('/')
    }
  }, 2000)
  
  // 監聽事件
  on('drawPerformed', (result: any) => {
    // 播放動畫
    playDrawAnimation(result)
  })
  
  on('nextDrawer', () => {
    hasDrawnCurrent.value = false
    showResult.value = false
    drawBoxContent.value = '🎁'
  })
  
  on('gameComplete', () => {
    celebrate()
  })
  
  // 監聽房間解散（主機離開）
  on('roomDisbanded', () => {
    showRoomDisbandModal.value = true
  })
  
  // 監聽遊戲重新開始
  on('gameRestarted', () => {
    // 重置抽獎狀態
    hasDrawnCurrent.value = false
    showResult.value = false
    drawBoxContent.value = '🎁'
    displayError('✅ 遊戲已重新開始！')
  })
  
  // 監聯錯誤
  on('error', (msg: string) => {
    displayError(msg)
  })
})

onUnmounted(() => {
  // 清除自動進入下一位的計時器
  if (autoProgressTimeout.value) {
    clearTimeout(autoProgressTimeout.value)
    autoProgressTimeout.value = null
  }
  // 不要自動離開房間，讓使用者可以重新整理
})

// 顯示錯誤提示
function displayError(msg: string) {
  errorMessage.value = msg
  showErrorToast.value = true
  setTimeout(() => {
    showErrorToast.value = false
  }, 3000)
}

// 返回首頁
function goHome() {
  showRoomDisbandModal.value = false
  router.push('/')
}

// 獲取玩家名稱
function getPlayerName(participantId: number): string {
  const player = roomState.value?.players.find(p => p.participantId === participantId)
  return player?.name || '?'
}

// 複製房間連結
function copyRoomLink() {
  const url = `${window.location.origin}?room=${roomState.value?.id}`
  navigator.clipboard.writeText(url)
  displayError('✅ 已複製連結！')
}

// 切換準備狀態
function toggleReady() {
  const current = getCurrentPlayer()
  if (current) {
    setReady(!current.isReady)
  }
}

// 協助加入玩家
function handleAddPlayer() {
  if (!addPlayerName.value.trim()) return
  
  send({
    type: 'host_add_player',
    payload: { playerName: addPlayerName.value.trim() }
  })
  addPlayerName.value = ''
}

// 開始遊戲（強制或正常）
function handleStartGame() {
  startGame()
}

// 執行抽獎
function handlePerformDraw() {
  performDraw()
}

// 主機代替抽獎
function handleHostDraw() {
  if (!roomState.value) return
  const currentId = roomState.value.drawOrder[roomState.value.currentIndex]
  hostPerformDraw(currentId)
}

// 下一位
function handleNextDrawer() {
  // 清除自動進入下一位的計時器，避免重複觸發
  if (autoProgressTimeout.value) {
    clearTimeout(autoProgressTimeout.value)
    autoProgressTimeout.value = null
  }
  nextDrawer()
}

// 打開設定彈窗
function openSettingsModal() {
  if (roomState.value) {
    newMaxPlayers.value = roomState.value.maxPlayers
  }
  showSettingsModal.value = true
}

// 離開房間（主機需確認）
function handleLeaveRoom() {
  if (isHost()) {
    showLeaveConfirmModal.value = true
  } else {
    leaveRoom()
    router.push('/')
  }
}

// 確認離開房間
function confirmLeaveRoom() {
  showLeaveConfirmModal.value = false
  leaveRoom()
  router.push('/')
}

// 增加人數上限
function increaseMaxPlayers() {
  if (newMaxPlayers.value < 100) {
    newMaxPlayers.value++
  }
}

// 減少人數上限
function decreaseMaxPlayers() {
  const minPlayers = roomState.value?.players.length || 2
  if (newMaxPlayers.value > minPlayers) {
    newMaxPlayers.value--
  }
}

// 儲存房間設定
function saveRoomSettings() {
  if (!roomState.value) return
  
  const minPlayers = roomState.value.players.length
  if (newMaxPlayers.value < minPlayers) {
    displayError('人數上限不能小於目前人數')
    return
  }
  
  send({
    type: 'update_max_players',
    payload: { maxPlayers: newMaxPlayers.value }
  })
  
  showSettingsModal.value = false
}

// 播放抽獎動畫
function playDrawAnimation(result: any) {
  isDrawing.value = true
  showResult.value = false
  
  let shuffleCount = 0
  const maxShuffles = 20
  
  const shuffleInterval = setInterval(() => {
    if (!roomState.value) return
    const randomP = roomState.value.players[Math.floor(Math.random() * roomState.value.players.length)]
    drawBoxContent.value = randomP.name.charAt(0)
    shuffleCount++
    
    if (shuffleCount >= maxShuffles) {
      clearInterval(shuffleInterval)
      
      const giftOwner = getPlayerName(result.giftOwnerId)
      drawBoxContent.value = giftOwner.charAt(0)
      resultGiftOwner.value = giftOwner
      
      isDrawing.value = false
      showResult.value = true
      hasDrawnCurrent.value = true
      
      // Auto-progress to next drawer after a delay (only if host)
      if (isHost() && roomState.value && roomState.value.currentIndex < roomState.value.players.length - 1) {
        autoProgressTimeout.value = window.setTimeout(() => {
          autoProgressTimeout.value = null
          handleNextDrawer()
        }, 2000) // 2 second delay to show the result
      }
    }
  }, 80)
}

// 重新開始遊戲（保持設定，更新 seed）
function handleRestartGame() {
  send({
    type: 'restart_game',
    payload: {}
  })
}

// 慶祝動畫
function celebrate() {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;'
  document.body.appendChild(container)

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div')
    confetti.style.cssText = `
      position:absolute;
      width:${Math.random() * 10 + 5}px;
      height:${Math.random() * 10 + 5}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}%;
      top:-20px;
      animation:confetti-fall 3s ease-out forwards;
      animation-delay:${Math.random() * 2}s;
    `
    container.appendChild(confetti)
  }

  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style')
    style.id = 'confetti-style'
    style.textContent = `
      @keyframes confetti-fall {
        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
      }
    `
    document.head.appendChild(style)
  }

  setTimeout(() => container.remove(), 5000)
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
  background: rgba(255,255,255,0.1);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.share-hint p {
  margin-bottom: 10px;
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
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  transition: all 0.2s;
}

.player-item.is-me {
  background: rgba(255,215,0,0.15);
  border: 1px solid rgba(255,215,0,0.3);
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

.host-badge {
  font-size: 1.2rem;
}

.me-badge {
  font-size: 0.85rem;
  opacity: 0.7;
}

.ready-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  background: rgba(255,255,255,0.1);
}

.ready-status.ready {
  background: rgba(40,167,69,0.3);
  color: #7fff7f;
}

.your-turn {
  color: #ffd700;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
}

.draw-box::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
  transform: rotate(45deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%) rotate(45deg); }
  100% { transform: translateX(100%) rotate(45deg); }
}

.draw-box .content {
  position: relative;
  z-index: 1;
}

.draw-box.drawing .content {
  animation: shuffle 0.08s ease-in-out infinite;
}

@keyframes shuffle {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.1); }
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
  background: rgba(255,255,255,0.05);
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
  background: rgba(255,255,255,0.1);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.add-player-section {
  background: rgba(255,255,255,0.05);
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
}

.add-player-form .input {
  flex: 1;
}

.host-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  padding: 15px;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.progress-panel h4 {
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.progress-bar {
  background: rgba(255,255,255,0.2);
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
  background: rgba(255,255,255,0.05);
  transition: all 0.2s;
}

.player-status-item.is-current {
  background: rgba(255,215,0,0.2);
  border: 1px solid rgba(255,215,0,0.4);
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
  background: rgba(0,0,0,0.7);
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
  border: 1px solid rgba(255,255,255,0.2);
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
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
}

.max-players-input .btn-sm:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
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
  background: rgba(255,255,255,0.1);
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
  background: rgba(255,255,255,0.05);
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
  background: rgba(255,255,255,0.2);
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
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
</style>
