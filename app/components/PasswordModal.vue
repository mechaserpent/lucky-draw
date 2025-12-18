<template>
  <div class="modal-overlay" v-if="modelValue" @click.self="close">
    <div class="modal-content">
      <h3>{{ icon }} {{ title }}</h3>
      <p v-if="description" class="modal-description">
        {{ description }}
      </p>
      <input 
        type="password" 
        class="input" 
        v-model="password" 
        :placeholder="placeholder"
        @keypress.enter="confirm" 
        autocomplete="new-password" 
        data-lpignore="true" 
        data-form-type="other"
        autofocus
      >
      <div class="modal-buttons">
        <button class="btn btn-secondary" @click="close">取消</button>
        <button class="btn" :class="confirmButtonClass" @click="confirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  description?: string
  icon?: string
  placeholder?: string
  confirmText?: string
  confirmButtonClass?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', password: string): void
}

const props = withDefaults(defineProps<Props>(), {
  icon: '🔐',
  placeholder: '輸入密碼...',
  confirmText: '確認',
  confirmButtonClass: 'btn-danger'
})

const emit = defineEmits<Emits>()

const password = ref('')

const close = () => {
  password.value = ''
  emit('update:modelValue', false)
}

const confirm = () => {
  if (password.value) {
    emit('confirm', password.value)
    password.value = ''
  }
}

// 當彈窗關閉時清空密碼
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    password.value = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 30px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content h3 {
  margin: 0 0 15px 0;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}

.modal-description {
  font-size: 0.9rem;
  margin-bottom: 15px;
  opacity: 0.8;
  text-align: center;
}

.input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  margin-bottom: 20px;
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px rgba(59, 151, 151, 0.2);
  background: rgba(255, 255, 255, 0.15);
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-danger {
  background: var(--theme-danger);
  color: #fff;
}

.btn-danger:hover {
  background: #a00820;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(191, 9, 47, 0.4);
}

.btn-primary {
  background: var(--theme-primary);
  color: #fff;
}

.btn-primary:hover {
  background: #a00820;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(191, 9, 47, 0.4);
}

@media (max-width: 600px) {
  .modal-content {
    padding: 25px 20px;
  }

  .modal-content h3 {
    font-size: 1.3rem;
  }

  .modal-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
