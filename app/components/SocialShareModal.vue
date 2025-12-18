<template>
  <div class="modal-overlay" v-if="modelValue" @click.self="close">
    <div class="modal-content share-modal">
      <h3>📤 {{ $t('share.title') }}</h3>
      
      <div class="share-options">
        <button class="share-option-btn" @click="handleShareImage">
          <span class="icon">🖼️</span>
          <span class="text">{{ $t('share.image') }}</span>
        </button>
      </div>

      <div class="social-share-section">
        <p class="section-title">{{ $t('share.shareTo') }}</p>
        <div class="social-buttons">
          <button class="social-share-btn" @click="shareToSocial('facebook')" title="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('twitter')" title="X (Twitter)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('threads')" title="Threads">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.019-5.093.896-6.48 2.608-1.37 1.693-2.061 4.163-2.053 7.34-.008 3.177.684 5.648 2.054 7.342 1.387 1.711 3.57 2.588 6.479 2.607 2.24-.02 4.077-.543 5.458-1.553 1.304-1.014 1.955-2.395 1.936-4.1-.015-1.255-.427-2.23-1.226-2.898-.797-.667-1.885-1.006-3.235-.998h-.011c-1.255 0-2.283.325-3.056.966-.776.643-1.169 1.515-1.169 2.591 0 .869.24 1.56.714 2.053.474.494 1.13.74 1.95.74.819 0 1.476-.246 1.95-.74.475-.494.714-1.184.714-2.053 0-.439-.12-.827-.36-1.153a2.074 2.074 0 0 0-.975-.655c.215-.465.569-.846 1.028-1.106.481-.273 1.046-.411 1.683-.411 1.313 0 2.381.428 3.173 1.273.793.845 1.189 2.007 1.189 3.458 0 2.095-.84 3.749-2.497 4.915-1.659 1.167-3.863 1.755-6.546 1.755z"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('line')" title="LINE">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('telegram')" title="Telegram">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('whatsapp')" title="WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('instagram')" title="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </button>
          <button class="social-share-btn" @click="shareToSocial('copy')" :title="$t('share.copyLink')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-buttons" style="margin-top: 20px;">
        <button class="btn btn-secondary" @click="close">{{ $t('common.cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface Props {
  modelValue: boolean
  results: Array<{
    order: number
    drawerName: string
    giftOwnerName: string
  }>
  seed: number | string
  mode: 'solo' | 'online'
  playerName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'share-image'): void
  (e: 'download-image'): void
  (e: 'toast', message: string): void
}>()

// 取得分享相關函數
const { generateResultImage, shareImage, downloadImage, getSocialShareLinks } = useShareImage()

function close() {
  emit('update:modelValue', false)
}

// 分享圖片版
async function handleShareImage() {
  const blob = await generateResultImage(props.results, props.seed, props.mode, props.playerName)

  if (blob) {
    const success = await shareImage(
      blob,
      t('common.appName'),
      `🎁 ${t('share.title')}!`
    )

    if (success) {
      close()
    } else {
      // 如果分享失敗，嘗試下載
      downloadImage(blob, `lucky-draw-result_${props.seed}.png`)
      emit('toast', t('share.download'))
      close()
    }
  }
}

// 分享到社交媒體
async function shareToSocial(platform: string) {
  if (platform === 'copy') {
    await copyShareLink()
    return
  }

  if (platform === 'instagram') {
    await handleShareImage()
    return
  }

  const text = `🎁 ${t('common.appName')}！Seed: ${props.seed}`
  const url = window.location.href
  const links = getSocialShareLinks(text, url)

  const socialUrl = links[platform]
  if (socialUrl) {
    window.open(socialUrl, '_blank', 'width=600,height=400')
    close()
  }
}

// 複製分享連結
async function copyShareLink() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    emit('toast', t('share.copied'))
    close()
  } catch (e) {
    console.error('Copy failed:', e)
  }
}
</script>

<style scoped>
.modal-overlay {
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

.modal-content {
  background: linear-gradient(180deg, #1e3a4c 0%, #0f1e27 100%);
  border-radius: 15px;
  padding: 25px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
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

.share-modal h3 {
  margin: 0 0 20px 0;
  color: #fff;
  font-size: 1.4rem;
  text-align: center;
}

.share-options {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.share-option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 15px 25px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.share-option-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.share-option-btn .icon {
  font-size: 2rem;
}

.share-option-btn .text {
  font-size: 0.9rem;
}

.social-share-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 15px;
  text-align: center;
}

.social-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.social-share-btn {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.social-share-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.25);
}

.social-share-btn svg {
  width: 22px;
  height: 22px;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn {
  padding: 10px 25px;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 響應式設計 */
@media (max-width: 600px) {
  .modal-content {
    margin: 20px;
    padding: 20px;
  }

  .social-share-btn {
    width: 40px;
    height: 40px;
  }

  .social-share-btn svg {
    width: 18px;
    height: 18px;
  }
}
</style>
