<template>
  <div class="input-with-clear">
    <input 
      :type="type"
      class="input" 
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :placeholder="placeholder"
      :style="inputStyle"
      autocomplete="off"
      v-bind="$attrs"
    >
    <button 
      v-if="modelValue && showClear" 
      class="clear-btn" 
      type="button"
      @click="$emit('update:modelValue', '')"
      title="清除"
    >
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  type?: string
  inputStyle?: string
  showClear?: boolean
}>(), {
  type: 'text',
  showClear: true
})

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped>
.input-with-clear {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-clear .input {
  flex: 1;
  padding-right: 35px;
}

.clear-btn {
  position: absolute;
  right: 10px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>
