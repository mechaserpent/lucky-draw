<template>
  <div class="advanced-settings">
    <div class="advanced-toggle" @click="$emit('toggle')">
      🔧 進階選項
    </div>

    <div v-if="isOpen" class="advanced-section">
      <div class="fixed-pair-item">
        <select v-model="localDrawerId">
          <option :value="null">選擇 A</option>
          <option v-for="participant in participants" :key="participant.id" :value="participant.id">
            {{ getParticipantLabel(participant) }}
          </option>
        </select>
        <span>→</span>
        <select v-model="localGiftId">
          <option :value="null">選擇 B</option>
          <option v-for="participant in participants" :key="participant.id" :value="participant.id">
            {{ getParticipantLabel(participant) }}
          </option>
        </select>
        <button class="btn btn-secondary" @click="addPair">➕</button>
      </div>

      <div class="fixed-pairs-list">
        <span v-for="pair in fixedPairs" :key="pair.drawerId" class="fixed-pair-tag">
          {{ getParticipantLabel(getParticipantById(pair.drawerId)) }} → 
          {{ getParticipantLabel(getParticipantById(pair.giftOwnerId)) }}
          <span class="remove" @click="$emit('remove-pair', pair.drawerId)">✕</span>
        </span>
        <p v-if="fixedPairs.length === 0" class="empty-hint">無設定</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Participant {
  id: number
  name: string
  participantId?: number
}

interface FixedPair {
  drawerId: number
  giftOwnerId: number
}

interface Props {
  participants: Participant[]
  fixedPairs: FixedPair[]
  isOpen: boolean
  showIndex?: boolean
}

interface Emits {
  (e: 'toggle'): void
  (e: 'add-pair', drawerId: number, giftId: number): void
  (e: 'remove-pair', drawerId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showIndex: true
})

const emit = defineEmits<Emits>()

const localDrawerId = ref<number | null>(null)
const localGiftId = ref<number | null>(null)

const getParticipantLabel = (participant: Participant | undefined) => {
  if (!participant) return '?'
  if (props.showIndex) {
    const index = props.participants.findIndex(p => p.id === participant.id) + 1
    return `#${index}`
  }
  return participant.name
}

const getParticipantById = (id: number) => {
  return props.participants.find(p => p.id === id || p.participantId === id)
}

const addPair = () => {
  if (localDrawerId.value !== null && localGiftId.value !== null) {
    emit('add-pair', localDrawerId.value, localGiftId.value)
    localDrawerId.value = null
    localGiftId.value = null
  }
}
</script>

<style scoped>
.advanced-settings {
  margin: 15px 0;
}

.advanced-toggle {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  font-weight: 500;
}

.advanced-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.advanced-section {
  margin-top: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.fixed-pair-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.fixed-pair-item select {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 0.95rem;
}

.fixed-pair-item select:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px rgba(59, 151, 151, 0.2);
}

.fixed-pair-item span {
  font-size: 1.2rem;
  opacity: 0.7;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.fixed-pairs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
  align-items: center;
}

.fixed-pair-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(59, 151, 151, 0.2);
  border: 1px solid rgba(59, 151, 151, 0.4);
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.fixed-pair-tag .remove {
  cursor: pointer;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 0, 0, 0.3);
  border-radius: 50%;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.fixed-pair-tag .remove:hover {
  background: rgba(255, 0, 0, 0.5);
  transform: scale(1.1);
}

.empty-hint {
  opacity: 0.6;
  font-size: 0.9rem;
  margin: 0;
  font-style: italic;
}

@media (max-width: 600px) {
  .fixed-pair-item {
    flex-direction: column;
    align-items: stretch;
  }

  .fixed-pair-item select {
    width: 100%;
  }

  .fixed-pair-item span {
    text-align: center;
  }
}
</style>
