import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);
const appVersion = packageJson.version || "0.0.0";
const calTime = new Date();
calTime.setUTCHours(calTime.getUTCHours() + 8);
const calculatedTime = calTime.toISOString();
const buildTimestamp = process.env.BUILD_TIMESTAMP || calculatedTime;
const buildNumber =
  process.env.BUILD_NUMBER ||
  process.env.BUILD_ID ||
  buildTimestamp.replace(/[^0-9]/g, "").slice(0, 12);

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  dir: {
    app: "app", // Default
  },

  runtimeConfig: {
    public: {
      // 基本設定
      siteTitle: process.env.NUXT_PUBLIC_SITE_TITLE || "聖誕交換禮物抽獎",
      siteSubtitle:
        process.env.NUXT_PUBLIC_SITE_SUBTITLE ||
        "連鎖式抽獎 - 抽到誰的禮物，就換誰抽！",
      siteIconLeft: process.env.NUXT_PUBLIC_SITE_ICON_LEFT || "🎄",
      siteIconRight: process.env.NUXT_PUBLIC_SITE_ICON_RIGHT || "🎁",

      // 版本資訊
      appVersion,
      buildNumber,
      buildTimestamp,

      // 人數限制
      minPlayers: parseInt(process.env.NUXT_PUBLIC_MIN_PLAYERS || "2"),
      maxPlayers: parseInt(process.env.NUXT_PUBLIC_MAX_PLAYERS || "100"),
      onlineMaxPlayers: parseInt(
        process.env.NUXT_PUBLIC_ONLINE_MAX_PLAYERS || "50",
      ),
      roomCodeLength: parseInt(process.env.NUXT_PUBLIC_ROOM_CODE_LENGTH || "6"),

      // 主題色彩 - 主要色彩
      themePrimary: process.env.NUXT_PUBLIC_THEME_PRIMARY || "#BF092F",
      themeSecondary: process.env.NUXT_PUBLIC_THEME_SECONDARY || "#3B9797",
      themeAccent: process.env.NUXT_PUBLIC_THEME_ACCENT || "#62B6B7",
      // 主題色彩 - 背景色彩
      themeBgFrom: process.env.NUXT_PUBLIC_THEME_BG_FROM || "#102A43",
      themeBgTo: process.env.NUXT_PUBLIC_THEME_BG_TO || "#16476A",
      themeBgDeep: process.env.NUXT_PUBLIC_THEME_BG_DEEP || "#132440",
      // 主題色彩 - 表面色彩
      themeSurface:
        process.env.NUXT_PUBLIC_THEME_SURFACE || "rgba(255, 255, 255, 0.08)",
      themeSurfaceLight:
        process.env.NUXT_PUBLIC_THEME_SURFACE_LIGHT ||
        "rgba(255, 255, 255, 0.12)",
      themeSurfaceHover:
        process.env.NUXT_PUBLIC_THEME_SURFACE_HOVER ||
        "rgba(255, 255, 255, 0.16)",
      // 主題色彩 - 文字色彩
      themeText: process.env.NUXT_PUBLIC_THEME_TEXT || "#FFFFFF",
      themeTextSecondary:
        process.env.NUXT_PUBLIC_THEME_TEXT_SECONDARY ||
        "rgba(255, 255, 255, 0.8)",
      themeTextMuted:
        process.env.NUXT_PUBLIC_THEME_TEXT_MUTED || "rgba(255, 255, 255, 0.5)",
      // 主題色彩 - 狀態色彩
      themeSuccess: process.env.NUXT_PUBLIC_THEME_SUCCESS || "#3B9797",
      themeWarning: process.env.NUXT_PUBLIC_THEME_WARNING || "#F59E0B",
      themeDanger: process.env.NUXT_PUBLIC_THEME_DANGER || "#BF092F",
      themeInfo: process.env.NUXT_PUBLIC_THEME_INFO || "#62B6B7",

      // 功能開關
      showSnowflakes: process.env.NUXT_PUBLIC_FEATURES_SNOWFLAKES !== "false",
      passwordProtection:
        process.env.NUXT_PUBLIC_FEATURES_PASSWORD_PROTECTION !== "false",
    },
  },

  ssr: false,

  app: {
    baseURL: "/",
    head: {
      title:
        process.env.NUXT_PUBLIC_SITE_ICON_LEFT +
        " " +
        (process.env.NUXT_PUBLIC_SITE_TITLE || "聖誕交換禮物抽獎"),
      meta: [
        { name: "robots", content: "noindex, nofollow" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "description", content: "連鎖式抽獎遊戲 - 支援單機與連線模式" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },

  modules: ["@nuxtjs/i18n"],

  i18n: {
    locales: [
      { code: "zh-HK", name: "繁體中文 (香港)", file: "zh-HK.json" },
      { code: "en", name: "English", file: "en.json" },
    ],
    lazy: true,
    langDir: "locales",
    defaultLocale: "zh-HK",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_locale",
      alwaysRedirect: false,
      fallbackLocale: "zh-HK",
    },
  },

  // 啟用 Nitro WebSocket
  nitro: {
    experimental: {
      websocket: true,
    },
  },

  compatibilityDate: "2025-12-16",

  imports: {
    dirs: ["app/composables"],
  },
});
