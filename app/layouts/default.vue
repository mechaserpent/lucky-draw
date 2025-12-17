<template>
  <div class="app-layout" :style="themeStyle">
    <!-- 雪花背景 -->
    <div v-if="settings.showSnowflakes" class="snowflakes" ref="snowflakesRef"></div>
    
    <!-- 全域設定按鈕（固定在右上角） -->
    <button class="settings-fab" @click="showAppSettingsModal = true" title="設定">
      ⚙️
    </button>
    
    <div class="container">
      <slot />
    </div>

    <!-- 全域設定面板 -->
    <div class="modal-overlay" v-if="showAppSettingsModal" @click.self="showAppSettingsModal = false">
      <div class="modal-content settings-modal">
        <div class="modal-header">
          <h3>⚙️ 設定</h3>
          <button class="modal-close" @click="showAppSettingsModal = false">✕</button>
        </div>
        <AppSettingsPanel 
          :readonly="isInGame"
          @close="showAppSettingsModal = false" 
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSettingsPanel from '~/components/AppSettingsPanel.vue'

const route = useRoute()
const { settings, themeStyle, initSettings } = useDynamicConfig()
const snowflakesRef = ref<HTMLElement | null>(null)
const showAppSettingsModal = ref(false)

// 檢測是否在遊戲進行中（solo 或 online 頁面）
const isInGame = computed(() => {
  const path = route.path
  return path === '/solo' || path === '/online'
})

onMounted(() => {
  initSettings()
  if (settings.value.showSnowflakes) {
    createSnowflakes()
  }
})

function createSnowflakes() {
  if (!snowflakesRef.value) return
  const container = snowflakesRef.value
  const snowflakeChars = ['❄', '❅', '❆', '✻', '✼']
  
  // 雪花數量固定為 30
  for (let i = 0; i < 30; i++) {
    const snowflake = document.createElement('div')
    snowflake.className = 'snowflake'
    snowflake.textContent = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)]
    snowflake.style.left = Math.random() * 100 + '%'
    snowflake.style.animationDuration = (Math.random() * 5 + 5) + 's'
    snowflake.style.animationDelay = (Math.random() * 10) + 's'
    snowflake.style.fontSize = (Math.random() * 1.5 + 0.8) + 'rem'
    container.appendChild(snowflake)
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

body {
  font-family: 'Microsoft JhengHei', 'Segoe UI', sans-serif;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  min-height: 100vh;
  color: #fff;
  overflow-x: hidden;
}

.app-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--theme-bg-start, #1a472a) 0%, var(--theme-bg-end, #2d5a3f) 50%, var(--theme-bg-start, #1a472a) 100%);
}

/* 雪花動畫 */
.snowflakes {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.snowflake {
  position: absolute;
  top: -20px;
  color: #fff;
  font-size: 1.5rem;
  opacity: 0.8;
  animation: fall linear infinite;
}

@keyframes fall {
  to {
    transform: translateY(100vh) rotate(360deg);
  }
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;  
}

@media (max-width: 1366px) {
  .container {
    aspect-ratio: auto;
    max-height: none;
  }
}

/* 卡片 */
.card {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.card h2 {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
}

/* 按鈕 */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-primary, #c41e3a), color-mix(in srgb, var(--theme-primary, #c41e3a), #000 20%));
  color: #fff;
  box-shadow: 0 4px 15px rgba(196, 30, 58, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(196, 30, 58, 0.5);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.25);
}

.btn-danger {
  background: #dc3545;
  color: #fff;
}

.btn-success {
  background: #28a745;
  color: #fff;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.2rem;
}

.btn-block {
  width: 100%;
}

.btn-link {
  background: transparent;
  color: rgba(255,255,255,0.7);
  padding: 8px 16px;
  font-size: 0.9rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.btn-link:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

/* 輸入框 */
.input {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 1rem;
  width: 100%;
}

.input::placeholder {
  color: rgba(255,255,255,0.5);
}

.input:focus {
  outline: none;
  background: rgba(255,255,255,0.25);
}

/* 模態框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: linear-gradient(135deg, #2d5a3f, #1a472a);
  padding: 30px;
  border-radius: 16px;
  max-width: 450px;
  width: 90%;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.modal-content.modal-lg {
  max-width: 550px;
}

.modal-content h3 {
  margin-bottom: 20px;
  font-size: 1.3rem;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

/* 標題 */
header {
  text-align: center;
  padding: 30px 0;
}

header h1 {
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  margin-bottom: 10px;
}

/* 全域設定按鈕 */
.settings-fab {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-size: 1.8rem;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-fab:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.settings-fab:active {
  transform: scale(0.95) rotate(90deg);
}

.settings-modal {
  max-width: 700px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  background: linear-gradient(135deg, #2d5a3f, #1a472a);
  z-index: 10;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.modal-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
  opacity: 0.7;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

@media (max-width: 768px) {
  .settings-fab {
    width: 48px;
    height: 48px;
    font-size: 1.5rem;
    top: 15px;
    right: 15px;
  }
}

header p {
  opacity: 0.9;
  font-size: 1.1rem;
}

/* 控制區 */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

/* 響應式 */
@media (max-width: 600px) {
  header h1 {
    font-size: 1.8rem;
  }

  .controls {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
