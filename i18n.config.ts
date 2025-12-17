/**
 * i18n 配置
 * 多語言支援：繁體中文（預設）、英文
 */

export default {
  legacy: false,
  locale: 'zh-TW',
  fallbackLocale: 'zh-TW',
  messages: {
    'zh-TW': () => import('./locales/zh-TW.json'),
    'en': () => import('./locales/en.json')
  },
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'i18n_redirected',
    redirectOn: 'root',
    alwaysRedirect: false,
    fallbackLocale: 'zh-TW'
  }
}
