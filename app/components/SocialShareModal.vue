<template>
  <div class="social-share-modal" v-if="show" @click.self="$emit('close')">
    <div class="share-panel">
      <div class="share-header">
        <h3>📤 分享到...</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div class="share-grid">
        <!-- Instagram -->
        <button class="share-btn instagram" @click="shareToInstagram" :disabled="!canShareImage">
          <span class="share-icon">📷</span>
          <span class="share-label">Instagram</span>
        </button>
        
        <!-- Threads -->
        <button class="share-btn threads" @click="shareToThreads">
          <span class="share-icon">🧵</span>
          <span class="share-label">Threads</span>
        </button>
        
        <!-- Facebook -->
        <button class="share-btn facebook" @click="shareToFacebook">
          <span class="share-icon">👥</span>
          <span class="share-label">Facebook</span>
        </button>
        
        <!-- X (Twitter) -->
        <button class="share-btn twitter" @click="shareToX">
          <span class="share-icon">🐦</span>
          <span class="share-label">X</span>
        </button>
        
        <!-- WhatsApp -->
        <button class="share-btn whatsapp" @click="shareToWhatsApp">
          <span class="share-icon">💬</span>
          <span class="share-label">WhatsApp</span>
        </button>
        
        <!-- Telegram -->
        <button class="share-btn telegram" @click="shareToTelegram">
          <span class="share-icon">✈️</span>
          <span class="share-label">Telegram</span>
        </button>
        
        <!-- LINE -->
        <button class="share-btn line" @click="shareToLine">
          <span class="share-icon">💚</span>
          <span class="share-label">LINE</span>
        </button>
        
        <!-- 複製連結 -->
        <button class="share-btn copy" @click="copyLink">
          <span class="share-icon">🔗</span>
          <span class="share-label">複製連結</span>
        </button>
      </div>
      
      <div class="share-footer" v-if="shareText">
        <div class="share-preview">
          <strong>分享內容：</strong>
          <p>{{ shareText }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show: boolean
  shareText: string
  shareUrl?: string
  imageBlob?: Blob
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'shared'])

// 檢查是否可以分享圖片
const canShareImage = computed(() => {
  return props.imageBlob && navigator.share
})

// 獲取完整的分享文本
const getFullShareText = () => {
  let text = props.shareText
  if (props.shareUrl) {
    text += `\n${props.shareUrl}`
  }
  return text
}

// Instagram - 需要使用 Web Share API（僅支援移動設備）
async function shareToInstagram() {
  if (!props.imageBlob) {
    showToast('無法分享圖片')
    return
  }
  
  try {
    const file = new File([props.imageBlob], 'lucky-draw.png', { type: 'image/png' })
    
    if (navigator.share) {
      await navigator.share({
        files: [file],
        text: props.shareText
      })
      emit('shared', 'instagram')
    } else {
      // 桌面版：下載圖片並提示用戶手動上傳
      const url = URL.createObjectURL(props.imageBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'lucky-draw.png'
      link.click()
      URL.revokeObjectURL(url)
      showToast('圖片已下載，請手動上傳到 Instagram')
    }
  } catch (e) {
    console.error('Share to Instagram failed:', e)
  }
}

// Threads
function shareToThreads() {
  const text = encodeURIComponent(getFullShareText())
  window.open(`https://www.threads.net/intent/post?text=${text}`, '_blank')
  emit('shared', 'threads')
}

// Facebook
function shareToFacebook() {
  const url = encodeURIComponent(props.shareUrl || window.location.href)
  const text = encodeURIComponent(props.shareText)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank')
  emit('shared', 'facebook')
}

// X (Twitter)
function shareToX() {
  const text = encodeURIComponent(getFullShareText())
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  emit('shared', 'twitter')
}

// WhatsApp
function shareToWhatsApp() {
  const text = encodeURIComponent(getFullShareText())
  window.open(`https://wa.me/?text=${text}`, '_blank')
  emit('shared', 'whatsapp')
}

// Telegram
function shareToTelegram() {
  const text = encodeURIComponent(getFullShareText())
  window.open(`https://t.me/share/url?url=${encodeURIComponent(props.shareUrl || '')}&text=${text}`, '_blank')
  emit('shared', 'telegram')
}

// LINE
function shareToLine() {
  const text = encodeURIComponent(getFullShareText())
  window.open(`https://line.me/R/msg/text/?${text}`, '_blank')
  emit('shared', 'line')
}

// 複製連結
async function copyLink() {
  try {
    const textToCopy = getFullShareText()
    await navigator.clipboard.writeText(textToCopy)
    showToast('✅ 已複製到剪貼簿！')
    emit('shared', 'copy')
  } catch (e) {
    showToast('複製失敗')
  }
}

function showToast(message: string) {
  // 可以使用父組件的 toast 或創建臨時提示
  console.log(message)
}
</script>

<style scoped>
.social-share-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.share-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.share-header h3 {
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  font-size: 1.5rem;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.share-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.share-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 15px 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.share-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.share-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-icon {
  font-size: 2rem;
}

.share-label {
  font-size: 0.75rem;
  color: #fff;
  font-weight: 500;
}

.share-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.share-preview {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  color: #fff;
  font-size: 0.85rem;
}

.share-preview strong {
  display: block;
  margin-bottom: 8px;
}

.share-preview p {
  margin: 0;
  opacity: 0.9;
  line-height: 1.4;
  white-space: pre-wrap;
}

/* 特定平台顏色 */
.share-btn.instagram:hover:not(:disabled) {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  border-color: transparent;
}

.share-btn.threads:hover:not(:disabled) {
  background: #000;
  border-color: transparent;
}

.share-btn.facebook:hover:not(:disabled) {
  background: #1877f2;
  border-color: transparent;
}

.share-btn.twitter:hover:not(:disabled) {
  background: #000;
  border-color: transparent;
}

.share-btn.whatsapp:hover:not(:disabled) {
  background: #25d366;
  border-color: transparent;
}

.share-btn.telegram:hover:not(:disabled) {
  background: #0088cc;
  border-color: transparent;
}

.share-btn.line:hover:not(:disabled) {
  background: #00b900;
  border-color: transparent;
}

.share-btn.copy:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 響應式設計 */
@media (max-width: 600px) {
  .share-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  
  .share-btn {
    padding: 12px 8px;
  }
  
  .share-icon {
    font-size: 1.5rem;
  }
  
  .share-label {
    font-size: 0.65rem;
  }
}
</style>
