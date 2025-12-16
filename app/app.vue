<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// 動態標題
const { settings } = useDynamicConfig()

useHead({
  title: computed(() => `${settings.value.siteIconLeft} ${settings.value.siteTitle}`),
  meta: [
    { name: 'description', content: computed(() => settings.value.siteSubtitle) }
  ]
})
</script>
