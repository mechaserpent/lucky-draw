<template>
  <div class="numpad">
    <div class="numpad-display">
      <span class="display-value">{{ displayValue || '0' }}</span>
      <span v-if="label" class="display-label">{{ label }}</span>
    </div>
    <div class="numpad-keys">
      <button class="numpad-key" @click="pressKey('7')">7</button>
      <button class="numpad-key" @click="pressKey('8')">8</button>
      <button class="numpad-key" @click="pressKey('9')">9</button>
      <button class="numpad-key" @click="pressKey('4')">4</button>
      <button class="numpad-key" @click="pressKey('5')">5</button>
      <button class="numpad-key" @click="pressKey('6')">6</button>
      <button class="numpad-key" @click="pressKey('1')">1</button>
      <button class="numpad-key" @click="pressKey('2')">2</button>
      <button class="numpad-key" @click="pressKey('3')">3</button>
      <button class="numpad-key key-backspace" @click="backspace()">⌫</button>
      <button class="numpad-key" @click="pressKey('0')">0</button>
      <button class="numpad-key key-enter" @click="confirm()">✓</button>
    </div>
    <div v-if="hint" class="numpad-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  label?: string
  hint?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'confirm'): void
}>()

const inputString = ref(props.modelValue > 0 ? props.modelValue.toString() : '')

const displayValue = computed(() => inputString.value || '0')

watch(() => props.modelValue, (newVal) => {
  if (newVal > 0 && newVal.toString() !== inputString.value) {
    inputString.value = newVal.toString()
  }
})

function pressKey(key: string) {
  const newValue = inputString.value + key
  const numValue = parseInt(newValue)
  
  // 檢查最大值限制
  if (props.max !== undefined && numValue > props.max) {
    return
  }
  
  // 避免開頭是 0
  if (inputString.value === '0' || inputString.value === '') {
    inputString.value = key
  } else {
    inputString.value = newValue
  }
  
  emit('update:modelValue', parseInt(inputString.value) || 0)
}

function backspace() {
  if (inputString.value.length > 0) {
    inputString.value = inputString.value.slice(0, -1)
    emit('update:modelValue', parseInt(inputString.value) || 0)
  }
}

function confirm() {
  const value = parseInt(inputString.value) || 0
  
  // 檢查範圍
  if (props.min !== undefined && value < props.min) {
    inputString.value = props.min.toString()
    emit('update:modelValue', props.min)
    return
  }
  if (props.max !== undefined && value > props.max) {
    inputString.value = props.max.toString()
    emit('update:modelValue', props.max)
    return
  }
  
  emit('confirm')
}
</script>

<style scoped>
.numpad {
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.numpad-display {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px 20px;
  margin-bottom: 15px;
  text-align: center;
  position: relative;
}

.display-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #fff;
  font-family: 'Courier New', monospace;
}

.display-label {
  display: block;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 5px;
}

.numpad-keys {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.numpad-key {
  aspect-ratio: 1.2;
  font-size: 1.5rem;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.numpad-key:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.numpad-key:active {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.95);
}

.key-backspace {
  background: rgba(220, 53, 69, 0.5);
}

.key-backspace:hover {
  background: rgba(220, 53, 69, 0.7);
}

.key-enter {
  background: rgba(40, 167, 69, 0.5);
}

.key-enter:hover {
  background: rgba(40, 167, 69, 0.7);
}

.numpad-hint {
  text-align: center;
  margin-top: 10px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}
</style>
