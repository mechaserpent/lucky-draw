<template>
  <div>
    <header>
      <h1>{{ dynamicConfig.settings.value.siteIconLeft }} {{ dynamicConfig.settings.value.siteTitle }} {{
        dynamicConfig.settings.value.siteIconRight }}</h1>
      <p>
        <span class="mode-badge solo">🖥️ 主持模式</span>
        主持人控制
      </p>
    </header>

    <!-- 設定階段 -->
    <template v-if="state.phase === 'setup'">
      <!-- 參與者管理 -->
      <div class="card">
        <h2>👥 參與者名單 <span class="count-badge">({{ state.participants.length }}人)</span></h2>

        <div class="participants-grid">
          <div v-for="(p, idx) in state.participants" :key="p.id" class="participant-item">
            <span class="number">{{ idx + 1 }}</span>
            <input type="text" :value="p.name"
              @change="(e) => updateParticipant(p.id, (e.target as HTMLInputElement).value)" autocomplete="off">
            <button class="btn-icon" @click="removeParticipant(p.id)" title="刪除">🗑️</button>
          </div>
        </div>

        <div class="add-participant">
          <input type="text" class="input" v-model="newParticipantName" placeholder="輸入新參與者姓名..."
            @keypress.enter="handleAddParticipant" autocomplete="off">
          <button class="btn btn-secondary" @click="handleAddParticipant">➕ 新增</button>
        </div>
      </div>

      <!-- 抽獎設定 -->
      <div class="card">
        <h2>⚙️ 抽獎設定</h2>

        <div class="start-options">
          <label>
            <input type="radio" v-model="state.startMode" value="random">
            隨機決定第一位抽獎者
          </label>
          <label>
            <input type="radio" v-model="state.startMode" value="manual">
            手動指定：
          </label>
          <select v-model="state.manualStarterId" :disabled="state.startMode !== 'manual'">
            <option :value="null">選擇參與者</option>
            <option v-for="(p, idx) in state.participants" :key="p.id" :value="p.id">
              {{ idx + 1 }}. {{ p.name }}
            </option>
          </select>
        </div>

        <!-- 進階選項入口 -->
        <div class="advanced-toggle" @click="showAdvancedModal = true">
          🔧 進階選項
        </div>

        <!-- 進階選項區（隱藏） -->
        <div class="advanced-section" v-if="showAdvanced">
          <div class="fixed-pair-item">
            <select v-model="fixedDrawerId">
              <option :value="null">選擇 A</option>
              <option v-for="(p, idx) in state.participants" :key="p.id" :value="p.id">
                #{{ idx + 1 }}
              </option>
            </select>
            <span>→</span>
            <select v-model="fixedGiftId">
              <option :value="null">選擇 B</option>
              <option v-for="(p, idx) in state.participants" :key="p.id" :value="p.id">
                #{{ idx + 1 }}
              </option>
            </select>
            <button class="btn btn-secondary" @click="handleAddFixedPair">➕</button>
          </div>

          <div class="fixed-pairs-list">
            <span v-for="fp in state.fixedPairs" :key="fp.drawerId" class="fixed-pair-tag">
              #{{ getParticipantIndex(fp.drawerId) }} → #{{ getParticipantIndex(fp.giftOwnerId) }}
              <span class="remove" @click="removeFixedPair(fp.drawerId)">✕</span>
            </span>
            <p v-if="state.fixedPairs.length === 0" style="opacity: 0.6; font-size: 0.9rem;">無設定</p>
          </div>
        </div>

        <div class="seed-display">
          🎲 Seed: {{ state.seed }}
          <button class="btn btn-secondary btn-sm" @click="showResetSeedModal = true">重設 Seed</button>
        </div>

        <div class="controls">
          <button class="btn btn-primary" @click="handleStartDraw">
            🎲 開始抽獎
          </button>
          <button class="btn btn-danger" @click="showResetAllModal = true">
            🗑️ 重置全部
          </button>
          <button class="btn btn-secondary" @click="showClearCacheModal = true">
            🧹 清除緩存
          </button>
          <button class="btn btn-secondary" @click="router.push('/')">
            🏠 返回首頁
          </button>
        </div>
      </div>
    </template>

    <!-- 抽獎階段 -->
    <template v-if="state.phase === 'drawing'">
      <div class="card">
        <h2>
          🎰 抽獎進行中
          <span class="status-badge in-progress">
            {{ state.currentIndex + 1 }} / {{ state.participants.length }}
          </span>
        </h2>

        <div class="draw-area">
          <div class="current-drawer">
            現在由 <span class="name">{{ getCurrentDrawer()?.name || '-' }}</span> 抽獎
          </div>

          <div class="draw-box" :class="{ drawing: isDrawing }">
            <span class="content">{{ drawBoxContent }}</span>
          </div>

          <div class="draw-result" :class="{ show: showResult }">
            抽到了 <span class="gift-owner">{{ resultGiftOwner }}</span> 的禮物！
          </div>

          <button v-if="!hasDrawnCurrent" class="btn btn-primary btn-lg" @click="handlePerformDraw"
            :disabled="isDrawing">
            🎲 抽獎！
          </button>
          <button v-else-if="state.currentIndex < state.participants.length - 1" class="btn btn-success btn-lg"
            @click="handleNextDraw">
            ➡️ 下一位
          </button>
        </div>
      </div>

      <!-- 結果列表 -->
      <div class="card">
        <h2>📋 抽獎結果</h2>
        <div class="results-list">
          <div v-if="state.results.length === 0" style="opacity: 0.6; text-align: center;">
            尚無抽獎結果
          </div>
          <div v-for="r in state.results" :key="r.order" class="result-item">
            <span class="order">{{ r.order }}</span>
            <span class="drawer">{{ getParticipant(r.drawerId)?.name }}</span>
            <span class="arrow">➡️</span>
            <span class="gift">{{ getParticipant(r.giftOwnerId)?.name }} 的禮物</span>
          </div>
        </div>
      </div>

      <div class="controls">
        <button class="btn btn-secondary" @click="showViewSettingsModal = true">
          👁️ 查看設定
        </button>
        <button class="btn btn-danger" @click="showResetAllModal = true">
          🔄 重新開始
        </button>
      </div>
    </template>

    <!-- 進度側邊面板 -->
    <div class="progress-panel" v-if="state.phase === 'drawing' || state.phase === 'complete'">
      <h4>📊 抽獎進度</h4>
      <div class="progress-content">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${(state.results.length / state.participants.length) * 100}%` }">
          </div>
        </div>
        <div class="progress-text">
          {{ state.results.length }} / {{ state.participants.length }}
        </div>
        <div class="player-status-list">
          <div v-for="(p, idx) in state.participants" :key="p.id" class="player-status-item" :class="{
            'is-current': state.drawOrder[state.currentIndex] === p.id,
            'has-drawn': state.results.some(r => r.drawerId === p.id)
          }">
            <span class="status-icon">
              {{state.results.some(r => r.drawerId === p.id) ? '✅' :
                state.drawOrder[state.currentIndex] === p.id ? '🎯' : '⏳'}}
            </span>
            <span class="player-name">{{ idx + 1 }}. {{ p.name }}</span>
          </div>
        </div>
      </div>
    </div> <!-- 完成階段 - 跳轉至結果頁面 -->
    <template v-if="state.phase === 'complete'">
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner">🎉</div>
          <h2>正在準備結果頁面...</h2>
        </div>
      </div>
    </template>

    <!-- 彈窗們 -->

    <!-- 進階選項密碼驗證 -->
    <div class="modal-overlay" v-if="showAdvancedModal" @click.self="showAdvancedModal = false">
      <div class="modal-content">
        <h3>🔐 進階選項驗證</h3>
        <input type="password" class="input" v-model="advancedPassword" placeholder="輸入密碼..."
          @keypress.enter="confirmAdvanced" autocomplete="new-password" data-lpignore="true" data-form-type="other"
          autofocus>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showAdvancedModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmAdvanced">確認</button>
        </div>
      </div>
    </div>

    <!-- 重設 Seed -->
    <div class="modal-overlay" v-if="showResetSeedModal" @click.self="showResetSeedModal = false">
      <div class="modal-content">
        <h3>🔐 重設 Seed</h3>
        <input type="password" class="input" v-model="resetPassword" placeholder="輸入密碼..."
          @keypress.enter="confirmResetSeed" autocomplete="new-password" data-lpignore="true" data-form-type="other">
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showResetSeedModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmResetSeed">確認重設</button>
        </div>
      </div>
    </div>

    <!-- 重置全部 -->
    <div class="modal-overlay" v-if="showResetAllModal" @click.self="showResetAllModal = false">
      <div class="modal-content">
        <h3>🔐 重置全部</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8;">
          這將清除所有資料並回到設定頁面
        </p>
        <input type="password" class="input" v-model="resetPassword" placeholder="輸入密碼..."
          @keypress.enter="confirmResetAll" autocomplete="new-password" data-lpignore="true" data-form-type="other">
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showResetAllModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmResetAll">確認重置</button>
        </div>
      </div>
    </div>

    <!-- 清除緩存 -->
    <div class="modal-overlay" v-if="showClearCacheModal" @click.self="showClearCacheModal = false">
      <div class="modal-content">
        <h3>🧹 清除緩存</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8;">
          這將清除所有本地儲存資料，包括密碼設定。
        </p>
        <input type="password" class="input" v-model="resetPassword" placeholder="輸入密碼..."
          @keypress.enter="confirmClearCache" autocomplete="new-password" data-lpignore="true" data-form-type="other">
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showClearCacheModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmClearCache">確認清除</button>
        </div>
      </div>
    </div>

    <!-- 查看設定 -->
    <div class="modal-overlay" v-if="showViewSettingsModal" @click.self="showViewSettingsModal = false">
      <div class="modal-content" style="max-width: 600px;">
        <h3>📋 目前設定</h3>
        <div style="text-align: left; max-height: 400px; overflow-y: auto; margin: 20px 0;">
          <p><strong>🎲 Seed:</strong> {{ state.seed }}</p>
          <p><strong>👥 參與者 ({{ state.participants.length }}人):</strong></p>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0;">
            <span v-for="(p, i) in state.participants" :key="p.id"
              style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">
              {{ i + 1 }}. {{ p.name }}
            </span>
          </div>
          <p><strong>🎯 起始模式:</strong> {{ state.startMode === 'random' ? '隨機' : '手動指定' }}</p>
          <p><strong>📊 目前進度:</strong> {{ state.results.length }} / {{ state.participants.length }}</p>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="showViewSettingsModal = false">返回抽獎</button>
        </div>
      </div>
    </div>

    <!-- 首次使用設定密碼 -->
    <div class="modal-overlay" v-if="showPasswordSetup">
      <div class="modal-content">
        <h3>🔐 設定管理員密碼</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8;">
          此密碼用於保護重置功能，防止誤操作
        </p>

        <input type="password" class="input" v-model="newPassword" placeholder="設定新密碼..." style="margin-bottom: 10px;"
          autocomplete="new-password" data-lpignore="true" data-form-type="other">
        <input type="password" class="input" v-model="confirmPassword" placeholder="確認密碼..."
          @keypress.enter="setupPassword" autocomplete="new-password" data-lpignore="true" data-form-type="other">

        <div class="modal-buttons">
          <button class="btn btn-primary" @click="setupPassword">設定密碼</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const dynamicConfig = useDynamicConfig()
const { addRecord: addHistoryRecord } = useHistory()
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
  setPassword
} = useGameState()

const { generateResultImage, downloadImage, shareImage, getSocialShareLinks, copyImageToClipboard } = useShareImage()

// 彈窗控制
const showAdvancedModal = ref(false)
const showResetSeedModal = ref(false)
const showResetAllModal = ref(false)
const showClearCacheModal = ref(false)
const showViewSettingsModal = ref(false)
const showAdvanced = ref(false)
const showPasswordSetup = ref(false)
const showShareModal = ref(false)

// 表單數據
const newParticipantName = ref('')
const fixedDrawerId = ref<number | null>(null)
const fixedGiftId = ref<number | null>(null)
const advancedPassword = ref('')
const resetPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 抽獎動畫
const isDrawing = ref(false)
const showResult = ref(false)
const drawBoxContent = ref('🎁')
const resultGiftOwner = ref('')
const hasDrawnCurrent = ref(false)

onMounted(() => {
  loadState()

  // 檢查是否需要設定密碼
  if (!getPassword()) {
    showPasswordSetup.value = true
  }

  // 恢復抽獎狀態
  if (state.value.phase === 'drawing' && state.value.results.length > state.value.currentIndex) {
    hasDrawnCurrent.value = true
    const lastResult = state.value.results[state.value.currentIndex]
    const giftOwner = getParticipant(lastResult.giftOwnerId)
    if (giftOwner) {
      drawBoxContent.value = giftOwner.name.charAt(0)
      resultGiftOwner.value = giftOwner.name
      showResult.value = true
    }
  }
})

// 設定密碼
function setupPassword() {
  if (!newPassword.value) {
    alert('請輸入密碼！')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    alert('兩次密碼不一致！')
    return
  }

  setPassword(newPassword.value)
  showPasswordSetup.value = false
  alert('密碼設定成功！')
}

// 獲取參與者索引
function getParticipantIndex(id: number): number {
  return state.value.participants.findIndex(p => p.id === id) + 1
}

// 新增參與者
function handleAddParticipant() {
  if (!newParticipantName.value.trim()) return
  addParticipant(newParticipantName.value.trim())
  newParticipantName.value = ''
}

// 新增進階配對
function handleAddFixedPair() {
  if (!fixedDrawerId.value || !fixedGiftId.value) {
    alert('請選擇 A 和 B')
    return
  }
  if (fixedDrawerId.value === fixedGiftId.value) {
    alert('A 和 B 不能相同！')
    return
  }

  if (!addFixedPair(fixedDrawerId.value, fixedGiftId.value)) {
    alert('此項目已存在設定')
    return
  }

  fixedDrawerId.value = null
  fixedGiftId.value = null
}

// 確認進階選項
function confirmAdvanced() {
  if (!verifyPassword(advancedPassword.value)) {
    alert('密碼錯誤！')
    advancedPassword.value = ''
    return
  }

  showAdvancedModal.value = false
  showAdvanced.value = true
  advancedPassword.value = ''
}

// 確認重設 Seed
function confirmResetSeed() {
  if (!verifyPassword(resetPassword.value)) {
    alert('密碼錯誤！')
    resetPassword.value = ''
    return
  }

  resetSeed()
  showResetSeedModal.value = false
  resetPassword.value = ''
  alert('Seed 已重設為: ' + state.value.seed)
}

// 確認重置全部
function confirmResetAll() {
  if (!verifyPassword(resetPassword.value)) {
    alert('密碼錯誤！')
    resetPassword.value = ''
    return
  }

  resetAll()
  showResetAllModal.value = false
  showAdvanced.value = false
  resetPassword.value = ''

  // 重置抽獎 UI 狀態
  isDrawing.value = false
  showResult.value = false
  drawBoxContent.value = '🎁'
  hasDrawnCurrent.value = false
}

// 確認清除緩存
function confirmClearCache() {
  if (!verifyPassword(resetPassword.value)) {
    alert('密碼錯誤！')
    resetPassword.value = ''
    return
  }

  clearAllCache()
  showClearCacheModal.value = false
  alert('緩存已清除！頁面將重新載入。')
  window.location.reload()
}

// 開始抽獎
function handleStartDraw() {
  if (state.value.participants.length < 2) {
    alert('至少需要 2 位參與者！')
    return
  }

  if (state.value.startMode === 'manual' && !state.value.manualStarterId) {
    alert('請選擇起始抽獎者！')
    return
  }

  if (!startDraw()) {
    alert('無法生成有效的抽獎序列，請檢查進階設定是否造成衝突')
    return
  }

  hasDrawnCurrent.value = false
  showResult.value = false
  drawBoxContent.value = '🎁'
}

// 執行抽獎
function handlePerformDraw() {
  if (isDrawing.value) return

  isDrawing.value = true
  showResult.value = false

  // 動畫：快速切換名字
  let shuffleCount = 0
  const maxShuffles = 20

  const shuffleInterval = setInterval(() => {
    const randomP = state.value.participants[Math.floor(Math.random() * state.value.participants.length)]
    drawBoxContent.value = randomP.name.charAt(0)
    shuffleCount++

    if (shuffleCount >= maxShuffles) {
      clearInterval(shuffleInterval)

      // 記錄結果
      const result = performDraw()
      if (result) {
        const giftOwner = getParticipant(result.giftOwnerId)
        if (giftOwner) {
          drawBoxContent.value = giftOwner.name.charAt(0)
          resultGiftOwner.value = giftOwner.name
        }
      }

      isDrawing.value = false
      showResult.value = true
      hasDrawnCurrent.value = true

      // 如果是最後一個人，自動觸發完成特效
      if (state.value.currentIndex >= state.value.participants.length - 1) {
        // 延遲一下讓結果先顯示
        setTimeout(() => {
          state.value.phase = 'complete'
          celebrate()
        }, 500)
      }
    }
  }, 80)
}

// 下一位抽獎
function handleNextDraw() {
  if (nextDraw()) {
    hasDrawnCurrent.value = false
    showResult.value = false
    drawBoxContent.value = '🎁'
  } else {
    // 遊戲完成，觸發慶祝動畫
    celebrate()
  }
}

// 分享結果
// 分享結果 - 打開分享選單
async function shareResults() {
  showShareModal.value = true
}

// 分享文字版
async function handleShareText() {
  // 產生文字結果
  const lines = ['🎁 交換禮物抽籤結果 🎁', '']
  state.value.results.forEach(r => {
    const drawer = getParticipant(r.drawerId)?.name || '?'
    const giftOwner = getParticipant(r.giftOwnerId)?.name || '?'
    lines.push(`${r.order}. ${drawer} ➡️ ${giftOwner} 的禮物`)
  })
  lines.push('')
  lines.push(`🎲 Seed: ${state.value.seed}`)

  const text = lines.join('\n')

  // 直接複製到剪貼簿
  try {
    await navigator.clipboard.writeText(text)
    alert('✅ 結果已複製到剪貼簿！')
    showShareModal.value = false
  } catch (e) {
    alert('❌ 複製失敗，請手動複製')
  }
}

// 分享圖片版
async function handleShareImage() {
  const results = state.value.results.map(r => ({
    order: r.order,
    drawerName: getParticipant(r.drawerId)?.name || '?',
    giftOwnerName: getParticipant(r.giftOwnerId)?.name || '?'
  }))

  const blob = await generateResultImage(results, state.value.seed, 'solo')

  if (blob) {
    const success = await shareImage(
      blob,
      '交換禮物抽籤結果',
      '🎁 看看我的交換禮物抽籤結果！'
    )

    if (success) {
      showShareModal.value = false
    } else {
      alert('分享失敗，請嘗試下載圖片')
    }
  }
}

// 下載圖片
async function handleDownloadImage() {
  const results = state.value.results.map(r => ({
    order: r.order,
    drawerName: getParticipant(r.drawerId)?.name || '?',
    giftOwnerName: getParticipant(r.giftOwnerId)?.name || '?'
  }))

  const blob = await generateResultImage(results, state.value.seed, 'solo')

  if (blob) {
    downloadImage(blob, `交換禮物結果_${state.value.seed}.png`)
    alert('圖片已下載！')
    showShareModal.value = false
  }
}

// 分享到社交媒體
async function shareToSocial(platform: string) {
  if (platform === 'copy') {
    await copyShareLink()
    return
  }

  if (platform === 'instagram') {
    // Instagram 需要通過圖片分享
    await handleShareImage()
    return
  }

  const text = `🎁 交換禮物抽籤結果！Seed: ${state.value.seed}`
  const url = window.location.href
  const links = getSocialShareLinks(text, url)

  const socialUrl = links[platform]
  if (socialUrl) {
    window.open(socialUrl, '_blank', 'width=600,height=400')
    showShareModal.value = false
  }
}

// 複製分享連結
async function copyShareLink() {
  const url = window.location.href
  await navigator.clipboard.writeText(url)
  alert('連結已複製！')
  showShareModal.value = false
}

// 慶祝動畫
function celebrate() {
  // 保存歷史紀錄和結果
  if (state.value.results.length > 0) {
    const resultsData = state.value.results.map(r => ({
      order: r.order,
      drawerName: getParticipant(r.drawerId)?.name || '?',
      giftOwnerName: getParticipant(r.giftOwnerId)?.name || '?'
    }))

    addHistoryRecord({
      mode: 'solo',
      seed: state.value.seed,
      participantCount: state.value.participants.length,
      results: resultsData
    })

    // 保存結果到 localStorage 供 result 頁面使用
    const resultId = `solo_${state.value.seed}_${Date.now()}`
    const resultData = {
      id: resultId,
      mode: 'solo',
      seed: state.value.seed,
      participantCount: state.value.participants.length,
      results: resultsData
    }
    localStorage.setItem(`result_${resultId}`, JSON.stringify(resultData))

    // 跳轉到結果頁面
    setTimeout(() => {
      router.push({ path: '/result', query: { id: resultId } })
    }, 2000) // 延遲 2 秒讓動畫播放
  }

  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
  const container = document.createElement('div')
  container.className = 'celebration'
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

  // 添加動畫 keyframes
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

.draw-box::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
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
