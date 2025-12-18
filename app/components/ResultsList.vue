<template>
  <div class="card">
    <h2>📋 抽獎結果</h2>
    <div class="results-list">
      <div v-if="results.length === 0" class="empty-state">
        尚無抽獎結果
      </div>
      <div v-for="r in results" :key="r.order" class="result-item">
        <span class="order">{{ r.order }}</span>
        <span class="drawer">{{ r.drawerName }}</span>
        <span class="arrow">➡️</span>
        <span class="gift">{{ r.giftOwnerName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Result {
  order: number
  drawerName: string
  giftOwnerName: string
}

interface Props {
  results: Result[]
}

defineProps<Props>()
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.card h2 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
}

.empty-state {
  opacity: 0.6;
  text-align: center;
  padding: 40px 20px;
  font-size: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.result-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(5px);
}

.order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.drawer,
.gift {
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
}

.drawer {
  color: var(--theme-text);
}

.gift {
  color: var(--theme-accent);
  font-weight: 600;
}

.arrow {
  font-size: 1.2rem;
  opacity: 0.6;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .result-item {
    padding: 12px 15px;
    gap: 10px;
  }

  .order {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
  }

  .drawer,
  .gift {
    font-size: 0.9rem;
  }
}
</style>
