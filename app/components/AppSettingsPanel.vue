<template>
  <div class="app-settings-panel">
    <!-- 標籤頁 -->
    <div class="settings-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- 一般設定 -->
    <div v-if="activeTab === 'general'" class="settings-section">
      <h4>👤 使用者資訊</h4>
      <div class="settings-item">
        <label>使用者身份</label>
        <div class="user-status">
          <span v-if="isLoggedIn" class="user-badge logged-in">
            {{ userInfo?.provider === 'google' ? '🔵' : '⚫' }} {{ userInfo?.name || '已登入' }}
          </span>
          <span v-else class="user-badge guest">👤 訪客模式</span>
        </div>
      </div>

      <div v-if="!isLoggedIn" class="social-login-section">
        <p class="hint">登入後可同步您的偏好設定</p>
        <div class="social-buttons">
          <button class="btn btn-social google" @click="loginWithGoogle" disabled>
            <svg class="social-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google 登入
            <span class="coming-soon">即將推出</span>
          </button>
          <button class="btn btn-social apple" @click="loginWithApple" disabled>
            <svg class="social-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Apple 登入
            <span class="coming-soon">即將推出</span>
          </button>
          <button class="btn btn-social facebook" @click="loginWithFacebook" disabled>
            <svg class="social-icon" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook 登入
            <span class="coming-soon">即將推出</span>
          </button>
          <button class="btn btn-social github" @click="loginWithGitHub" disabled>
            <svg class="social-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            GitHub 登入
            <span class="coming-soon">即將推出</span>
          </button>
          <button class="btn btn-social email" @click="loginWithEmail" disabled>
            <svg class="social-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            Email 連結
            <span class="coming-soon">即將推出</span>
          </button>
        </div>
      </div>

      <div v-else class="logout-section">
        <button class="btn btn-danger" @click="logout">
          🚪 登出帳號
        </button>
      </div>
    </div>

    <!-- 主題設定 -->
    <div v-if="activeTab === 'theme'" class="settings-section">
      <SettingsPanel 
        @close="$emit('close')" 
        @saved="$emit('saved')" 
        @needsRefresh="$emit('needsRefresh')" 
      />
    </div>

    <!-- 資料管理 -->
    <div v-if="activeTab === 'data'" class="settings-section">
      <h4>🗂️ 資料管理</h4>
      
      <div class="settings-item">
        <label>清理瀏覽器緩存</label>
        <p class="hint">清除本地儲存的遊戲資料和設定</p>
        <button class="btn btn-warning" @click="clearCache">
          🗑️ 清理緩存
        </button>
      </div>

      <div class="settings-item">
        <label>恢復預設主題與設定</label>
        <p class="hint">將主題和所有設定恢復為預設值</p>
        <button class="btn btn-secondary" @click="resetSettings">
          🔄 恢復預設
        </button>
      </div>

      <div class="settings-item">
        <label>重設管理員密碼</label>
        <p class="hint">重設用於進階選項的管理員密碼</p>
        <button class="btn btn-secondary" @click="showResetPasswordModal = true">
          🔐 重設密碼
        </button>
      </div>
    </div>

    <!-- 關於 -->
    <div v-if="activeTab === 'about'" class="settings-section">
      <h4>ℹ️ 關於</h4>
      
      <div class="about-info">
        <div class="app-logo">🎁</div>
        <h3>抽獎交換禮物系統</h3>
        <p class="version">版本 {{ appVersion }} (Build {{ buildNumber }})</p>
      </div>

      <div class="legal-links">
        <a href="#" @click.prevent="showTerms = true">📜 服務條款</a>
        <a href="#" @click.prevent="showPrivacy = true">🔒 隱私權政策</a>
      </div>

      <div class="copyright">
        <p>© {{ currentYear }} maverick.hlc</p>
        <p class="small">All rights reserved.</p>
      </div>
    </div>

    <!-- 服務條款彈窗 -->
    <div class="sub-modal" v-if="showTerms" @click.self="showTerms = false">
      <div class="sub-modal-content">
        <h3>📜 服務條款</h3>
        <div class="terms-content">
          <h4>1. 服務說明</h4>
          <p>本服務提供線上抽獎交換禮物功能，供使用者娛樂使用。</p>
          
          <h4>2. 使用規範</h4>
          <p>使用者應遵守相關法規，不得將本服務用於非法目的。</p>
          
          <h4>3. 免責聲明</h4>
          <p>本服務按「現狀」提供，不保證服務不會中斷或無錯誤。</p>
          
          <h4>4. 資料使用</h4>
          <p><strong>主持模式</strong>：遊戲資料僅存於您的瀏覽器本地。</p>
          <p><strong>連線模式</strong>：房間資料暫存於伺服器資料庫，房間關閉後 30 分鐘自動清除。</p>
          
          <h4>5. 條款修改</h4>
          <p>我們保留隨時修改本條款的權利。</p>
        </div>
        <button class="btn btn-primary" @click="showTerms = false">關閉</button>
      </div>
    </div>

    <!-- 隱私權政策彈窗 -->
    <div class="sub-modal" v-if="showPrivacy" @click.self="showPrivacy = false">
      <div class="sub-modal-content">
        <h3>🔒 隱私權政策</h3>
        <div class="privacy-content">
          <h4>1. 資料收集</h4>
          <p>我們僅收集必要的遊戲運作資料，如房間代碼、玩家暱稱等。不收集任何個人識別資訊。</p>
          
          <h4>2. 資料儲存</h4>
          <p><strong>主持模式</strong>：所有資料僅存於您的瀏覽器 localStorage，不會上傳至伺服器。</p>
          <p><strong>連線模式</strong>：房間資料暫存於伺服器 SQLite 資料庫，房間關閉後 30 分鐘自動清除。</p>
          <p><strong>主題設定</strong>：儲存於您的瀏覽器本地。</p>
          
          <h4>3. 資料分享</h4>
          <p>我們不會將您的資料分享給第三方。</p>
          
          <h4>4. Cookie 使用</h4>
          <p>本服務使用 localStorage 儲存偏好設定和重連令牌，不使用追蹤 Cookie。</p>
          
          <h4>5. 您的權利</h4>
          <p>您可以隨時使用「清理緩存」功能刪除本地儲存的所有資料。</p>
          
          <h4>6. 聯絡我們</h4>
          <p>如有任何隱私相關問題，請聯繫 maverick.hlc。</p>
        </div>
        <button class="btn btn-primary" @click="showPrivacy = false">關閉</button>
      </div>
    </div>

    <!-- 確認彈窗 -->
    <div class="sub-modal" v-if="showConfirmModal" @click.self="showConfirmModal = false">
      <div class="sub-modal-content confirm-modal">
        <h3>{{ confirmTitle }}</h3>
        <p>{{ confirmMessage }}</p>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showConfirmModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmAction">確認</button>
        </div>
      </div>
    </div>

    <!-- 重設密碼彈窗 -->
    <div class="sub-modal" v-if="showResetPasswordModal" @click.self="showResetPasswordModal = false">
      <div class="sub-modal-content">
        <h3>🔐 重設管理員密碼</h3>
        <div style="margin: 15px 0;">
          <label style="display: block; margin-bottom: 8px;">新密碼</label>
          <input 
            type="password" 
            class="input" 
            v-model="newAdminPassword"
            placeholder="輸入新密碼..."
            autocomplete="new-password"
          >
        </div>
        <div style="margin: 15px 0;">
          <label style="display: block; margin-bottom: 8px;">確認密碼</label>
          <input 
            type="password" 
            class="input" 
            v-model="confirmAdminPassword"
            placeholder="再次輸入密碼..."
            autocomplete="new-password"
            @keypress.enter="resetAdminPassword"
          >
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showResetPasswordModal = false">取消</button>
          <button class="btn btn-primary" @click="resetAdminPassword">設定密碼</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close', 'saved', 'needsRefresh'])

const tabs = [
  { id: 'general', icon: '👤', label: '一般' },
  { id: 'theme', icon: '🎨', label: '主題' },
  { id: 'data', icon: '🗂️', label: '資料' },
  { id: 'about', icon: 'ℹ️', label: '關於' }
]

const activeTab = ref('general')

// 使用者狀態
const isLoggedIn = ref(false)
const userInfo = ref<{ name: string; email?: string; provider: string } | null>(null)

// 彈窗控制
const showTerms = ref(false)
const showPrivacy = ref(false)
const showConfirmModal = ref(false)
const showResetPasswordModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let pendingAction: (() => void) | null = null

// 重設密碼
const newAdminPassword = ref('')
const confirmAdminPassword = ref('')

// 應用資訊
const appVersion = '0.3.0'
const buildNumber = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
})
const currentYear = new Date().getFullYear()

// 社交登入（預留）
function loginWithGoogle() {
  // TODO: 實現 Google OAuth 登入
  alert('Google 登入功能即將推出')
}

function loginWithApple() {
  // TODO: 實現 Apple OAuth 登入
  alert('Apple 登入功能即將推出')
}

function loginWithFacebook() {
  // TODO: 實現 Facebook OAuth 登入
  alert('Facebook 登入功能即將推出')
}

function loginWithGitHub() {
  // TODO: 實現 GitHub OAuth 登入
  alert('GitHub 登入功能即將推出')
}

function loginWithEmail() {
  // TODO: 實現 Email Magic Link 登入
  // 可考慮使用免費服務如 Supabase Auth 或 Firebase Auth
  alert('Email 一次性連結登入功能即將推出')
}

function logout() {
  isLoggedIn.value = false
  userInfo.value = null
  localStorage.removeItem('user-session')
}

// 資料管理
function clearCache() {
  confirmTitle.value = '確認清理緩存'
  confirmMessage.value = '這將清除所有本地儲存的遊戲資料和設定，確定要繼續嗎？'
  pendingAction = () => {
    // 清除所有 localStorage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('lucky-draw') || key.startsWith('dynamic-config'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    alert('緩存已清理完成，頁面將重新載入')
    window.location.reload()
  }
  showConfirmModal.value = true
}

function resetSettings() {
  confirmTitle.value = '確認恢復默認設置'
  confirmMessage.value = '這將重置所有主題設定為預設值，確定要繼續嗎？'
  pendingAction = () => {
    localStorage.removeItem('dynamic-config')
    localStorage.removeItem('adminPassword')
    alert('設定已恢復為默認值，頁面將重新載入')
    window.location.reload()
  }
  showConfirmModal.value = true
}

function resetAdminPassword() {
  if (!newAdminPassword.value) {
    alert('請輸入新密碼')
    return
  }
  if (newAdminPassword.value !== confirmAdminPassword.value) {
    alert('兩次輸入的密碼不一致')
    return
  }
  
  localStorage.setItem('adminPassword', newAdminPassword.value)
  alert('管理員密碼已重設')
  showResetPasswordModal.value = false
  newAdminPassword.value = ''
  confirmAdminPassword.value = ''
}

function confirmAction() {
  if (pendingAction) {
    pendingAction()
    pendingAction = null
  }
  showConfirmModal.value = false
}

// 載入使用者狀態
onMounted(() => {
  try {
    const session = localStorage.getItem('user-session')
    if (session) {
      const data = JSON.parse(session)
      isLoggedIn.value = true
      userInfo.value = data
    }
  } catch (e) {
    // 忽略解析錯誤
  }
})
</script>

<style scoped>
.app-settings-panel {
  max-height: 70vh;
  overflow-y: auto;
}

.settings-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  padding-bottom: 10px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.tab-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.tab-btn.active {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.settings-section {
  padding: 10px 0;
}

.settings-section h4 {
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.settings-item {
  margin-bottom: 20px;
}

.settings-item label {
  display: block;
  font-weight: 500;
  margin-bottom: 5px;
}

.settings-item .hint {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-bottom: 10px;
}

.user-status {
  margin: 10px 0;
}

.user-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.user-badge.guest {
  background: rgba(255,255,255,0.1);
}

.user-badge.logged-in {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
}

.social-login-section {
  margin-top: 15px;
}

.social-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.btn-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.btn-social .social-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.btn-social.google {
  background: rgba(66, 133, 244, 0.2);
  border: 1px solid rgba(66, 133, 244, 0.5);
  color: #fff;
}

.btn-social.apple {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
}

.btn-social.facebook {
  background: rgba(24, 119, 242, 0.2);
  border: 1px solid rgba(24, 119, 242, 0.5);
  color: #fff;
}

.btn-social.github {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
}

.btn-social.email {
  background: rgba(234, 67, 53, 0.2);
  border: 1px solid rgba(234, 67, 53, 0.5);
  color: #fff;
}

.btn-social:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-social .coming-soon {
  position: absolute;
  right: 10px;
  font-size: 0.7rem;
  background: rgba(255,193,7,0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.logout-section {
  margin-top: 15px;
}

/* 關於頁面 */
.about-info {
  text-align: center;
  padding: 20px 0;
}

.app-logo {
  font-size: 4rem;
  margin-bottom: 10px;
}

.about-info h3 {
  margin-bottom: 5px;
}

.version {
  font-size: 0.85rem;
  opacity: 0.7;
}

.legal-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.legal-links a {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  transition: color 0.2s;
}

.legal-links a:hover {
  color: #fff;
  text-decoration: underline;
}

.copyright {
  text-align: center;
  padding: 20px 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin-top: 20px;
}

.copyright .small {
  font-size: 0.8rem;
  opacity: 0.6;
}

/* 子彈窗 */
.sub-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.sub-modal-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 30px;
  border-radius: 16px;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.sub-modal-content h3 {
  margin-bottom: 20px;
}

.terms-content, .privacy-content {
  margin-bottom: 20px;
}

.terms-content h4, .privacy-content h4 {
  margin: 15px 0 8px;
  font-size: 1rem;
}

.terms-content p, .privacy-content p {
  font-size: 0.9rem;
  opacity: 0.85;
  line-height: 1.5;
}

.confirm-modal {
  text-align: center;
}

.confirm-modal p {
  margin: 15px 0 25px;
  opacity: 0.9;
}

.btn-warning {
  background: rgba(255, 193, 7, 0.3);
  border: 1px solid rgba(255, 193, 7, 0.5);
  color: #fff;
}

.btn-warning:hover {
  background: rgba(255, 193, 7, 0.5);
}

.btn-danger {
  background: rgba(220, 53, 69, 0.3);
  border: 1px solid rgba(220, 53, 69, 0.5);
  color: #fff;
}

.btn-danger:hover {
  background: rgba(220, 53, 69, 0.5);
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style>
