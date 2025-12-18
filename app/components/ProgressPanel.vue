<template>
  <div class="progress-panel">
    <h4>📊 抽獎進度</h4>
    <div class="progress-content">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <div class="progress-text">
        {{ drawnCount }} / {{ totalCount }}
      </div>
      <div class="player-status-list">
        <div 
          v-for="player in players" 
          :key="player.id" 
          class="player-status-item" 
          :class="{
            'is-current': player.isCurrent,
            'has-drawn': player.hasDrawn
          }"
        >
          <span class="status-icon">
            {{ player.hasDrawn ? '✅' : player.isCurrent ? '🎯' : '⏳' }}
          </span>
          <span class="player-name">{{ player.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Player {
  id: number
  name: string
  isCurrent: boolean
  hasDrawn: boolean
}

interface Props {
  drawnCount: number
  totalCount: number
  players: Player[]
}

const props = defineProps<Props>()

const progressPercentage = computed(() => {
  if (props.totalCount === 0) return 0
  return (props.drawnCount / props.totalCount) * 100
})
</script>

<style scoped>
.progress-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 280px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  z-index: 50;
}

.progress-panel h4 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-secondary));
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--theme-accent);
}

.player-status-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.player-status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s;
}

.player-status-item.is-current {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.4);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.player-status-item.has-drawn {
  opacity: 0.6;
}

.status-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.player-name {
  flex: 1;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .progress-panel {
    position: static;
    width: 100%;
    margin: 20px 0;
    max-height: none;
  }
}
</style>
