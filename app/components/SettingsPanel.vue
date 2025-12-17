<template>
  <div class="settings-panel">
    <div class="settings-section">
      <h4>📝 網站標題</h4>
      <div class="setting-row">
        <label>左側圖示</label>
        <input type="text" v-model="localSettings.siteIconLeft" class="input input-small" maxlength="4" />
      </div>
      <div class="setting-row">
        <label>標題</label>
        <input type="text" v-model="localSettings.siteTitle" class="input" />
      </div>
      <div class="setting-row">
        <label>右側圖示</label>
        <input type="text" v-model="localSettings.siteIconRight" class="input input-small" maxlength="4" />
      </div>
      <div class="setting-row">
        <label>副標題</label>
        <input type="text" v-model="localSettings.siteSubtitle" class="input" />
      </div>
    </div>
    
    <div class="settings-section">
      <h4>🎨 主題色彩</h4>
      <div class="color-grid">
        <div class="color-item">
          <label>主色調</label>
          <input type="color" v-model="localSettings.themePrimary" />
          <span class="color-code">{{ localSettings.themePrimary }}</span>
        </div>
        <div class="color-item">
          <label>輔助色</label>
          <input type="color" v-model="localSettings.themeSecondary" />
          <span class="color-code">{{ localSettings.themeSecondary }}</span>
        </div>
        <div class="color-item">
          <label>背景起始</label>
          <input type="color" v-model="localSettings.themeBgFrom" />
          <span class="color-code">{{ localSettings.themeBgFrom }}</span>
        </div>
        <div class="color-item">
          <label>背景結束</label>
          <input type="color" v-model="localSettings.themeBgTo" />
          <span class="color-code">{{ localSettings.themeBgTo }}</span>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>✨ 動畫效果</h4>
      <div class="setting-row toggle-row">
        <label>雪花動畫</label>
        <button 
          class="toggle-btn" 
          :class="{ active: localSettings.showSnowflakes }"
          @click="localSettings.showSnowflakes = !localSettings.showSnowflakes"
        >
          {{ localSettings.showSnowflakes ? '開啟' : '關閉' }}
        </button>
      </div>
    </div>
    
    <div class="settings-section">
      <h4>🎭 快速主題</h4>
      <div class="theme-presets">
        <button class="preset-btn christmas" @click="applyPreset('christmas')">🎄 聖誕節</button>
        <button class="preset-btn valentine" @click="applyPreset('valentine')">💕 情人節</button>
        <button class="preset-btn newyear" @click="applyPreset('newyear')">🧧 新年</button>
        <button class="preset-btn party" @click="applyPreset('party')">🎉 派對</button>
      </div>
    </div>
    
    <div class="settings-actions">
      <button class="btn btn-secondary" @click="resetToDefault">重設為預設</button>
      <button class="btn btn-primary" @click="saveAndClose">儲存設定</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
  (e: 'needsRefresh'): void
}>()

const { settings, updateSettings, resetSettings, getDefaultSettings } = useDynamicConfig()

// 本地編輯用的設定副本
const localSettings = reactive({
  siteTitle: settings.value.siteTitle,
  siteSubtitle: settings.value.siteSubtitle,
  siteIconLeft: settings.value.siteIconLeft,
  siteIconRight: settings.value.siteIconRight,
  themePrimary: settings.value.themePrimary,
  themeSecondary: settings.value.themeSecondary,
  themeBgFrom: settings.value.themeBgFrom,
  themeBgTo: settings.value.themeBgTo,
  showSnowflakes: settings.value.showSnowflakes,
})

// 預設主題
const presets = {
  christmas: {
    siteTitle: '聖誕交換禮物抽獎',
    siteSubtitle: '連鎖式抽獎 - 抽到誰的禮物，就換誰抽！',
    siteIconLeft: '🎄',
    siteIconRight: '🎁',
    themePrimary: '#c41e3a',
    themeSecondary: '#228b22',
    themeBgFrom: '#1a472a',
    themeBgTo: '#2d1f1f',
    showSnowflakes: true,
  },
  valentine: {
    siteTitle: '情人節交換禮物',
    siteSubtitle: '甜蜜抽獎時間！',
    siteIconLeft: '💕',
    siteIconRight: '🎀',
    themePrimary: '#e91e63',
    themeSecondary: '#ff4081',
    themeBgFrom: '#2d1f2d',
    themeBgTo: '#1a1a2e',
    showSnowflakes: false,
  },
  newyear: {
    siteTitle: '新年交換禮物',
    siteSubtitle: '新年快樂！一起來抽禮物吧！',
    siteIconLeft: '🧧',
    siteIconRight: '🎆',
    themePrimary: '#d4af37',
    themeSecondary: '#c41e3a',
    themeBgFrom: '#8b0000',
    themeBgTo: '#2d0a0a',
    showSnowflakes: false,
  },
  party: {
    siteTitle: '派對交換禮物',
    siteSubtitle: '來抽獎囉！',
    siteIconLeft: '🎊',
    siteIconRight: '🎉',
    themePrimary: '#9c27b0',
    themeSecondary: '#673ab7',
    themeBgFrom: '#1a1a2e',
    themeBgTo: '#16213e',
    showSnowflakes: false,
  },
}

function applyPreset(preset: keyof typeof presets) {
  Object.assign(localSettings, presets[preset])
}

function resetToDefault() {
  const defaults = getDefaultSettings()
  Object.assign(localSettings, defaults)
}

function saveAndClose() {
  // 檢查雪花設定是否改變（必須在 updateSettings 之前）
  const snowflakeChanged = localSettings.showSnowflakes !== settings.value.showSnowflakes
  
  updateSettings({ ...localSettings })
  emit('saved')
  emit('close')
  
  // 如果雪花設定改變，提示用戶重新整理
  if (snowflakeChanged) {
    emit('needsRefresh')
  }
}
</script>

<style scoped>
.settings-panel {
  max-height: 70vh;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.settings-section:last-of-type {
  border-bottom: none;
}

.settings-section h4 {
  margin-bottom: 12px;
  font-size: 1rem;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.setting-row label {
  min-width: 80px;
  font-size: 0.9rem;
}

.setting-row .input {
  flex: 1;
}

.input-small {
  max-width: 80px;
  text-align: center;
}

.toggle-row {
  justify-content: space-between;
}

.toggle-btn {
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-btn.active {
  background: #28a745;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-item label {
  font-size: 0.85rem;
  min-width: 70px;
}

.color-item input[type="color"] {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: none;
}

.color-code {
  font-size: 0.75rem;
  font-family: monospace;
  opacity: 0.7;
}

.theme-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-btn {
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.preset-btn:hover {
  transform: scale(1.02);
}

.preset-btn.christmas {
  background: linear-gradient(135deg, #1a472a, #c41e3a);
  color: #fff;
}

.preset-btn.valentine {
  background: linear-gradient(135deg, #e91e63, #ff4081);
  color: #fff;
}

.preset-btn.newyear {
  background: linear-gradient(135deg, #8b0000, #d4af37);
  color: #fff;
}

.preset-btn.party {
  background: linear-gradient(135deg, #9c27b0, #673ab7);
  color: #fff;
}

.settings-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.settings-actions .btn {
  flex: 1;
}
</style>
