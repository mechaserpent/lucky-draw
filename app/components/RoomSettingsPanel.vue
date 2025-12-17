<template>
  <div class="room-settings-panel">
    <h3>⚙️ 房間設定</h3>
    
    <!-- 基本資訊 -->
    <div class="settings-section">
      <h4>📋 基本資訊</h4>
      <div class="info-row">
        <span class="label">房間代碼</span>
        <span class="value code">{{ roomId }}</span>
      </div>
      <div class="info-row">
        <span class="label">Seed</span>
        <span class="value">{{ seed }}</span>
      </div>
    </div>
    
    <!-- 人數設定 -->
    <div class="settings-section">
      <h4>👥 人數設定</h4>
      <div class="setting-row">
        <label>人數上限</label>
        <div class="number-input">
          <button 
            class="btn btn-sm" 
            @click="decreaseMaxPlayers" 
            :disabled="!canDecreaseMaxPlayers || disabled"
          >-</button>
          <span class="number-value">{{ localSettings.maxPlayers }}</span>
          <button 
            class="btn btn-sm" 
            @click="increaseMaxPlayers" 
            :disabled="localSettings.maxPlayers >= 100 || disabled"
          >+</button>
        </div>
      </div>
      <p v-if="!canDecreaseMaxPlayers" class="warning-text">
        ⚠️ 人數上限不能小於目前人數 ({{ currentPlayerCount }})
      </p>
      
      <div class="setting-row">
        <label>允許觀眾</label>
        <button 
          class="toggle-btn" 
          :class="{ active: localSettings.allowSpectators }"
          @click="toggleSpectators"
          :disabled="disabled"
        >
          {{ localSettings.allowSpectators ? '✅ 開啟' : '❌ 關閉' }}
        </button>
      </div>
    </div>
    
    <!-- 抽獎模式 -->
    <div class="settings-section">
      <h4>🎲 抽獎模式</h4>
      <div class="setting-row">
        <label>抽獎順序</label>
        <div class="radio-group">
          <label class="radio-option" :class="{ selected: localSettings.drawMode === 'chain' }">
            <input 
              type="radio" 
              value="chain" 
              v-model="localSettings.drawMode"
              :disabled="disabled"
            >
            <span class="radio-label">🔗 連鎖式</span>
            <span class="radio-desc">A 抽到 B → B 下一個抽</span>
          </label>
          <label class="radio-option" :class="{ selected: localSettings.drawMode === 'random' }">
            <input 
              type="radio" 
              value="random" 
              v-model="localSettings.drawMode"
              :disabled="disabled"
            >
            <span class="radio-label">🎰 隨機順序</span>
            <span class="radio-desc">隨機決定抽獎順序</span>
          </label>
        </div>
      </div>
    </div>
    
    <!-- 第一位抽獎者 -->
    <div class="settings-section">
      <h4>🥇 第一位抽獎者</h4>
      <div class="setting-row">
        <div class="radio-group vertical">
          <label class="radio-option" :class="{ selected: localSettings.firstDrawerMode === 'random' }">
            <input 
              type="radio" 
              value="random" 
              v-model="localSettings.firstDrawerMode"
              :disabled="disabled"
            >
            <span class="radio-label">🎲 隨機決定</span>
          </label>
          <label class="radio-option" :class="{ selected: localSettings.firstDrawerMode === 'host' }">
            <input 
              type="radio" 
              value="host" 
              v-model="localSettings.firstDrawerMode"
              :disabled="disabled"
            >
            <span class="radio-label">👑 主機先抽</span>
          </label>
          <label class="radio-option" :class="{ selected: localSettings.firstDrawerMode === 'manual' }">
            <input 
              type="radio" 
              value="manual" 
              v-model="localSettings.firstDrawerMode"
              :disabled="disabled"
            >
            <span class="radio-label">✋ 手動指定</span>
          </label>
        </div>
      </div>
      
      <!-- 手動指定時的選擇器 -->
      <div v-if="localSettings.firstDrawerMode === 'manual'" class="setting-row">
        <label>選擇玩家</label>
        <select 
          v-model="localSettings.firstDrawerId" 
          class="select-input"
          :disabled="disabled"
        >
          <option v-for="player in players" :key="player.participantId" :value="player.participantId">
            {{ player.participantId }}. {{ player.name }}
            {{ player.isHost ? '(主機)' : '' }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- 按鈕 -->
    <div class="settings-buttons" v-if="showButtons">
      <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>
      <button 
        class="btn btn-primary" 
        @click="saveSettings"
        :disabled="!hasChanges || disabled"
      >
        儲存設定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomSettings, RoomPlayer } from '../../shared/types'

const props = defineProps<{
  roomId: string
  seed: number
  settings: RoomSettings
  players: RoomPlayer[]
  currentPlayerCount: number
  showButtons?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', settings: Partial<RoomSettings>): void
  (e: 'cancel'): void
}>()

// 本地設定副本
const localSettings = reactive<RoomSettings>({
  maxPlayers: props.settings.maxPlayers,
  allowSpectators: props.settings.allowSpectators,
  drawMode: props.settings.drawMode,
  firstDrawerMode: props.settings.firstDrawerMode,
  firstDrawerId: props.settings.firstDrawerId
})

// 監聽 props 變化
watch(() => props.settings, (newSettings) => {
  localSettings.maxPlayers = newSettings.maxPlayers
  localSettings.allowSpectators = newSettings.allowSpectators
  localSettings.drawMode = newSettings.drawMode
  localSettings.firstDrawerMode = newSettings.firstDrawerMode
  localSettings.firstDrawerId = newSettings.firstDrawerId
}, { deep: true })

// 計算是否有變更
const hasChanges = computed(() => {
  return localSettings.maxPlayers !== props.settings.maxPlayers ||
         localSettings.allowSpectators !== props.settings.allowSpectators ||
         localSettings.drawMode !== props.settings.drawMode ||
         localSettings.firstDrawerMode !== props.settings.firstDrawerMode ||
         localSettings.firstDrawerId !== props.settings.firstDrawerId
})

// 能否減少人數上限
const canDecreaseMaxPlayers = computed(() => {
  return localSettings.maxPlayers > props.currentPlayerCount && localSettings.maxPlayers > 2
})

function increaseMaxPlayers() {
  if (localSettings.maxPlayers < 100) {
    localSettings.maxPlayers++
    emitChange()
  }
}

function decreaseMaxPlayers() {
  if (canDecreaseMaxPlayers.value) {
    localSettings.maxPlayers--
    emitChange()
  }
}

function toggleSpectators() {
  localSettings.allowSpectators = !localSettings.allowSpectators
  emitChange()
}

function emitChange() {
  if (!props.showButtons) {
    // 即時更新模式
    emit('update', { ...localSettings })
  }
}

function saveSettings() {
  emit('update', { ...localSettings })
}

// 監聯設定變化（非按鈕模式時即時更新）
watch(localSettings, () => {
  if (!props.showButtons) {
    emit('update', { ...localSettings })
  }
}, { deep: true })
</script>

<style scoped>
.room-settings-panel {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
}

.room-settings-panel h3 {
  margin-bottom: 20px;
  font-size: 1.2rem;
}

.settings-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.settings-section h4 {
  font-size: 0.95rem;
  margin-bottom: 12px;
  opacity: 0.9;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-row .label {
  opacity: 0.7;
}

.info-row .value.code {
  font-family: monospace;
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
  letter-spacing: 2px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
  gap: 15px;
}

.setting-row > label {
  flex-shrink: 0;
  padding-top: 8px;
}

.number-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.number-input .btn-sm {
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
  transition: all 0.2s;
}

.number-input .btn-sm:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.number-input .btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.number-value {
  font-size: 1.3rem;
  font-weight: bold;
  min-width: 50px;
  text-align: center;
}

.toggle-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.toggle-btn.active {
  background: rgba(40, 167, 69, 0.4);
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.radio-group.vertical {
  flex-direction: column;
}

.radio-option {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  flex: 1;
  min-width: 140px;
}

.radio-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.radio-option.selected {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.5);
}

.radio-option input[type="radio"] {
  display: none;
}

.radio-label {
  font-weight: bold;
  margin-bottom: 4px;
}

.radio-desc {
  font-size: 0.8rem;
  opacity: 0.7;
}

.select-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 1rem;
}

.select-input:focus {
  outline: none;
  border-color: #ffd700;
}

.warning-text {
  color: #ffc107;
  font-size: 0.85rem;
  margin-top: 5px;
}

.settings-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a472a;
  font-weight: bold;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
