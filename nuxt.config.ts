// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  dir: {
    app: 'app', // Default
  },

  runtimeConfig: {
    public: {
      // 基本設定
      siteTitle: process.env.NUXT_PUBLIC_SITE_TITLE || '聖誕交換禮物抽獎',
      siteSubtitle: process.env.NUXT_PUBLIC_SITE_SUBTITLE || '連鎖式抽獎 - 抽到誰的禮物，就換誰抽！',
      siteIconLeft: process.env.NUXT_PUBLIC_SITE_ICON_LEFT || '🎄',
      siteIconRight: process.env.NUXT_PUBLIC_SITE_ICON_RIGHT || '🎁',
      
      // 人數限制
      minPlayers: parseInt(process.env.NUXT_PUBLIC_MIN_PLAYERS || '2'),
      maxPlayers: parseInt(process.env.NUXT_PUBLIC_MAX_PLAYERS || '100'),
      onlineMaxPlayers: parseInt(process.env.NUXT_PUBLIC_ONLINE_MAX_PLAYERS || '50'),
      roomCodeLength: parseInt(process.env.NUXT_PUBLIC_ROOM_CODE_LENGTH || '6'),
      
      // 主題色彩
      themePrimary: process.env.NUXT_PUBLIC_THEME_PRIMARY || '#c41e3a',
      themeSecondary: process.env.NUXT_PUBLIC_THEME_SECONDARY || '#228b22',
      themeBgFrom: process.env.NUXT_PUBLIC_THEME_BG_FROM || '#1a472a',
      themeBgTo: process.env.NUXT_PUBLIC_THEME_BG_TO || '#2d1f1f',
      
      // 功能開關
      showSnowflakes: process.env.NUXT_PUBLIC_FEATURES_SNOWFLAKES !== 'false',
      passwordProtection: process.env.NUXT_PUBLIC_FEATURES_PASSWORD_PROTECTION !== 'false',
    }
  },

  ssr: false,

  app: {
    baseURL: "/",
    head: {
      title: process.env.NUXT_PUBLIC_SITE_ICON_LEFT + ' ' + (process.env.NUXT_PUBLIC_SITE_TITLE || '聖誕交換禮物抽獎'),
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'description', content: '連鎖式抽獎遊戲 - 支援單機與連線模式' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  modules: [
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      { code: 'zh-HK', name: '繁體中文 (香港)', file: 'zh-HK.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'zh-HK',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      alwaysRedirect: false,
      fallbackLocale: 'zh-HK'
    }
  },

  // 啟用 Nitro WebSocket
  nitro: {
    experimental: {
      websocket: true
    }
  },

  compatibilityDate: "2025-12-16",

  imports: {
    presets: []
  }
});