<template>
  <div class="language-switcher">
    <button 
      v-for="locale in availableLocales" 
      :key="locale.code"
      @click="switchLocale(locale.code)"
      :class="['lang-btn', { active: currentLocale === locale.code }]"
      :title="locale.name"
    >
      {{ locale.flag }} {{ locale.short }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const currentLocale = computed(() => locale.value)

const availableLocales = computed(() => {
  return (locales.value as any[]).map(loc => ({
    code: loc.code,
    name: loc.name,
    flag: loc.code === 'zh-HK' ? '🇭🇰' : '🇬🇧',
    short: loc.code === 'zh-HK' ? '中' : 'EN'
  }))
})

async function switchLocale(newLocale: string) {
  await setLocale(newLocale)
  // 確保 cookie 持久化
  if (process.client) {
    document.cookie = `i18n_locale=${newLocale};path=/;max-age=31536000`
  }
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  gap: 8px;
  align-items: center;
}

.lang-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 6px 12px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.lang-btn.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}
</style>
