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
  background: linear-gradient(135deg, var(--theme-bg-start) 0%, var(--theme-bg-end) 50%, var(--theme-bg-deep) 100%);
  position: relative;
  overflow-x: hidden;
}

/* 背景光暈效果 */
.app-layout::before {
  content: '';
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle at 30% 40%,
    var(--theme-accent) 0%,
    transparent 40%
  ),
  radial-gradient(
    circle at 70% 80%,
    var(--theme-secondary) 0%,
    transparent 40%
  );
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(5deg); }
  66% { transform: translate(-20px, 20px) rotate(-5deg); }
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
  color: var(--theme-text);
  font-size: 1.5rem;
  opacity: 0.6;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
  animation: fall linear infinite;
}

@keyframes fall {
  to {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0.3;
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
  background: var(--theme-surface);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
}

.card:hover {
  background: var(--theme-surface-light);
  transform: translateY(-2px);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.card h2 {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  color: var(--theme-text);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 按鈕 */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--theme-primary) 0%, color-mix(in srgb, var(--theme-primary), #000 20%) 100%);
  color: var(--theme-text);
  box-shadow: 
    0 4px 15px rgba(191, 9, 47, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  transition: left 0.5s;
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 24px rgba(191, 9, 47, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  filter: grayscale(0.5);
}

.btn-secondary {
  background: var(--theme-surface-light);
  color: var(--theme-text);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-secondary:hover {
  background: var(--theme-surface-hover);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn-danger {
  background: linear-gradient(135deg, var(--theme-danger) 0%, color-mix(in srgb, var(--theme-danger), #000 20%) 100%);
  color: var(--theme-text);
  box-shadow: 0 4px 15px rgba(191, 9, 47, 0.4);
}

.btn-danger:hover {
  box-shadow: 0 6px 20px rgba(191, 9, 47, 0.6);
}

.btn-success {
  background: linear-gradient(135deg, var(--theme-success) 0%, color-mix(in srgb, var(--theme-success), #000 20%) 100%);
  color: var(--theme-text);
  box-shadow: 0 4px 15px rgba(59, 151, 151, 0.4);
}

.btn-success:hover {
  box-shadow: 0 6px 20px rgba(59, 151, 151, 0.6);
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.05rem;
}

.btn-block {
  width: 100%;
}

.btn-link {
  background: transparent;
  color: rgba(255,255,255,0.7);
  padding: 8px 16px;
  font-size: 0.8rem;
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: var(--theme-surface);
  color: var(--theme-text);
  font-size: 0.9rem;
  width: 100%;
  transition: all 0.3s;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.input::placeholder {
  color: var(--theme-text-muted);
}

.input:focus {
  outline: none;
  background: var(--theme-surface-light);
  border-color: var(--theme-accent);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(98, 182, 183, 0.15);
}

/* 模態框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: linear-gradient(135deg, var(--theme-bg-deep) 0%, var(--theme-bg-start) 100%);
  padding: 30px;
  border-radius: 20px;
  max-width: 450px;
  width: 90%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content.modal-lg {
  max-width: 550px;
}

.modal-content h3 {
  margin-bottom: 20px;
  font-size: 1.15rem;
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
  font-size: 2.2rem;
  color: var(--theme-text);
  text-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 4px 16px rgba(98, 182, 183, 0.3);
  margin-bottom: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* 全域設定按鈕 */
.settings-fab {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-secondary) 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  font-size: 1.8rem;
  color: var(--theme-text);
  cursor: pointer;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-fab::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-accent), var(--theme-secondary));
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
}

.settings-fab:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 
    0 8px 24px rgba(98, 182, 183, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.settings-fab:hover::before {
  opacity: 0.3;
  filter: blur(12px);
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

/* 自訂滾動條 */
.settings-modal::-webkit-scrollbar {
  width: 8px;
}

.settings-modal::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.settings-modal::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 4px;
}

.settings-modal::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--theme-accent), #fff 20%);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  background: linear-gradient(135deg, var(--theme-bg-deep) 0%, var(--theme-bg-start) 100%);
  backdrop-filter: blur(20px);
  z-index: 10;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
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
  font-size: 0.95rem;
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
    font-size: 1.6rem;
  }

  .controls {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
