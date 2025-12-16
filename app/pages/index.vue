<template>
  <div>
    <header>
      <h1>{{ dynamicConfig.settings.value.siteIconLeft }} {{ dynamicConfig.settings.value.siteTitle }} {{ dynamicConfig.settings.value.siteIconRight }}</h1>
      <p>{{ dynamicConfig.settings.value.siteSubtitle }}</p>
    </header>

    <div class="card">
      <h2>🎮 選擇遊戲模式</h2>
      
      <div class="mode-grid">
        <div class="mode-card" @click="showSoloModal = true">
          <div class="mode-icon">🖥️</div>
          <h3>單機模式</h3>
          <p>由主持人操作所有抽獎流程，適合投影到大螢幕</p>
        </div>
        
        <div class="mode-card" @click="showOnlineModal = true">
          <div class="mode-icon">🌐</div>
          <h3>連線模式</h3>
          <p>每個人用自己的裝置加入房間，輪到時自己抽獎</p>
        </div>
      </div>
    </div>

    <div class="card" style="text-align: center;">
      <p style="opacity: 0.7; font-size: 0.9rem;">
        🔒 所有資料僅存在本地瀏覽器，不會上傳到任何伺服器
      </p>
      <button class="btn btn-link" @click="showSettingsModal = true">
        ⚙️ 自訂主題設定
      </button>
    </div>

    <!-- 單機模式彈窗 -->
    <div class="modal-overlay" v-if="showSoloModal" @click.self="showSoloModal = false">
      <div class="modal-content">
        <h3>🖥️ 單機模式設定</h3>
        
        <NumPad 
          v-model="soloPlayerCount"
          :min="dynamicConfig.fixedConfig.minPlayers"
          :max="dynamicConfig.fixedConfig.maxPlayers"
          label="參與人數"
          :hint="`可輸入 ${dynamicConfig.fixedConfig.minPlayers} ~ ${dynamicConfig.fixedConfig.maxPlayers} 人`"
          @confirm="startSoloMode"
        />
        
        <div class="modal-buttons" style="margin-top: 20px;">
          <button class="btn btn-secondary" @click="showSoloModal = false">取消</button>
          <button class="btn btn-primary" @click="startSoloMode">開始遊戲</button>
        </div>
      </div>
    </div>

    <!-- 連線模式彈窗 -->
    <div class="modal-overlay" v-if="showOnlineModal" @click.self="showOnlineModal = false">
      <div class="modal-content">
        <h3>🌐 連線模式</h3>
        
        <div class="online-options">
          <button class="btn btn-primary btn-block" @click="showCreateRoomModal = true; showOnlineModal = false">
            ➕ 建立新房間
          </button>
          
          <div style="text-align: center; margin: 15px 0; opacity: 0.7;">或</div>
          
          <button class="btn btn-secondary btn-block" @click="showJoinRoomModal = true; showOnlineModal = false">
            🚪 加入房間
          </button>
        </div>
        
        <div class="modal-buttons" style="margin-top: 20px;">
          <button class="btn btn-secondary" @click="showOnlineModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 建立房間彈窗 -->
    <div class="modal-overlay" v-if="showCreateRoomModal" @click.self="showCreateRoomModal = false">
      <div class="modal-content">
        <h3>➕ 建立新房間</h3>
        
        <div style="margin: 15px 0;">
          <label style="display: block; margin-bottom: 8px;">你的名字</label>
          <ClearableInput 
            v-model="hostName" 
            placeholder="輸入你的名字..."
          />
        </div>
        
        <NumPad 
          v-model="maxPlayers"
          :min="dynamicConfig.fixedConfig.minPlayers"
          :max="dynamicConfig.fixedConfig.onlineMaxPlayers"
          label="房間人數上限"
          :hint="`可輸入 ${dynamicConfig.fixedConfig.minPlayers} ~ ${dynamicConfig.fixedConfig.onlineMaxPlayers} 人`"
          @confirm="createRoom"
        />
        
        <div class="modal-buttons" style="margin-top: 20px;">
          <button class="btn btn-secondary" @click="showCreateRoomModal = false">取消</button>
          <button class="btn btn-primary" @click="createRoom">建立房間</button>
        </div>
      </div>
    </div>

    <!-- 加入房間彈窗 -->
    <div class="modal-overlay" v-if="showJoinRoomModal" @click.self="showJoinRoomModal = false">
      <div class="modal-content">
        <h3>🚪 加入房間</h3>
        
        <div style="margin: 15px 0;">
          <label style="display: block; margin-bottom: 8px;">房間代碼</label>
          <ClearableInput 
            v-model="joinRoomId" 
            placeholder="輸入房間代碼..."
            input-style="text-transform: uppercase;"
          />
        </div>
        
        <div style="margin: 15px 0;">
          <label style="display: block; margin-bottom: 8px;">你的名字</label>
          <ClearableInput 
            class="join-name-input"
            v-model="playerName" 
            placeholder="輸入你的名字..."
          />
        </div>
        
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showJoinRoomModal = false">取消</button>
          <button class="btn btn-primary" @click="joinRoom">加入房間</button>
        </div>
      </div>
    </div>

    <!-- 設定彈窗 -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content modal-lg">
        <h3>⚙️ 主題設定</h3>
        <SettingsPanel @close="showSettingsModal = false" @saved="onSettingsSaved" @needsRefresh="onNeedsRefresh" />
      </div>
    </div>

    <!-- 錯誤提示 Toast -->
    <Transition name="toast">
      <div v-if="showError" class="toast-error">
        ❌ {{ errorMessage }}
      </div>
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
const router = useRouter()
const route = useRoute()
const dynamicConfig = useDynamicConfig()
const { state, loadState, initGame, getPassword, setPassword } = useGameState()
const { connect, createRoom: wsCreateRoom, joinRoom: wsJoinRoom, on, roomState, error } = useWebSocket()

// 彈窗控制
const showSoloModal = ref(false)
const showOnlineModal = ref(false)
const showCreateRoomModal = ref(false)
const showJoinRoomModal = ref(false)
const showSettingsModal = ref(false)

// 表單數據
const soloPlayerCount = ref(20)
const hostName = ref('')
const maxPlayers = ref(20)
const joinRoomId = ref('')
const playerName = ref('')

// 錯誤提示
const errorMessage = ref('')
const showError = ref(false)
const isCheckingRoom = ref(false)

// 資訊提示
const infoMessage = ref('')
const showInfoToast = ref(false)

function showErrorToast(msg: string) {
  errorMessage.value = msg
  showError.value = true
  setTimeout(() => {
    showError.value = false
  }, 3000)
}

function showInfo(msg: string) {
  infoMessage.value = msg
  showInfoToast.value = true
  setTimeout(() => {
    showInfoToast.value = false
  }, 5000)
}

onMounted(async () => {
  loadState()
  
  // 檢查 URL 參數是否有房間代碼
  const roomCode = route.query.room as string
  if (roomCode) {
    const code = roomCode.toUpperCase()
    isCheckingRoom.value = true
    
    try {
      // 先檢查房間是否存在
      const response = await $fetch(`/api/room/${code}`)
      
      if (response.exists) {
        joinRoomId.value = code
        showJoinRoomModal.value = true
        // 延遲聚焦到名字輸入框
        setTimeout(() => {
          const nameInput = document.querySelector('.join-name-input') as HTMLInputElement
          if (nameInput) nameInput.focus()
        }, 100)
      } else {
        showErrorToast(`房間 ${code} 不存在或已解散`)
      }
    } catch (e) {
      showErrorToast(`無法檢查房間狀態`)
    } finally {
      isCheckingRoom.value = false
    }
  }
})

// 設定儲存回調
function onSettingsSaved() {
  // 可以在這裡添加提示訊息
}

// 主題變更需要重新整理頁面
function onNeedsRefresh() {
  showInfo('💡 部分效果需要重新整理頁面才能生效，請按 F5 或重新整理')
}

// 單機模式
function startSoloMode() {
  const { fixedConfig } = dynamicConfig
  if (soloPlayerCount.value < fixedConfig.minPlayers || soloPlayerCount.value > fixedConfig.maxPlayers) {
    alert(`人數須在 ${fixedConfig.minPlayers}-${fixedConfig.maxPlayers} 之間`)
    return
  }
  
  initGame(soloPlayerCount.value)
  showSoloModal.value = false
  router.push('/solo')
}

// 建立房間
function createRoom() {
  const { fixedConfig } = dynamicConfig
  if (!hostName.value.trim()) {
    alert('請輸入你的名字')
    return
  }
  if (maxPlayers.value < fixedConfig.minPlayers || maxPlayers.value > fixedConfig.onlineMaxPlayers) {
    alert(`人數須在 ${fixedConfig.minPlayers}-${fixedConfig.onlineMaxPlayers} 之間`)
    return
  }
  
  connect()
  
  // 等待連接後建立房間
  setTimeout(() => {
    wsCreateRoom(hostName.value.trim(), maxPlayers.value)
  }, 500)
  
  // 監聽房間建立成功
  on('roomUpdated', () => {
    if (roomState.value) {
      showCreateRoomModal.value = false
      router.push('/online')
    }
  })
}

// 加入房間
function joinRoom() {
  if (!joinRoomId.value.trim()) {
    alert('請輸入房間代碼')
    return
  }
  if (!playerName.value.trim()) {
    alert('請輸入你的名字')
    return
  }
  
  connect()
  
  setTimeout(() => {
    wsJoinRoom(joinRoomId.value.trim().toUpperCase(), playerName.value.trim())
  }, 500)
  
  on('roomUpdated', () => {
    if (roomState.value) {
      showJoinRoomModal.value = false
      router.push('/online')
    }
  })
  
  on('error', (msg: string) => {
    showErrorToast(msg)
  })
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
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.mode-card:hover {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.3);
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
</style>
