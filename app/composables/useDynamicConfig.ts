// 動態網站設定 - 可在執行時調整並儲存到 localStorage
const STORAGE_KEY = 'draw-site-settings'

interface SiteSettings {
  siteTitle: string
  siteSubtitle: string
  siteIconLeft: string
  siteIconRight: string
  themePrimary: string
  themeSecondary: string
  themeBgFrom: string
  themeBgTo: string
  showSnowflakes: boolean
}

export function useDynamicConfig() {
  const runtimeConfig = useRuntimeConfig()
  
  // 從 localStorage 讀取設定，如果沒有則使用環境變數預設值
  const getStoredSettings = (): SiteSettings | null => {
    if (!import.meta.client) return null
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }
  
  const getDefaultSettings = (): SiteSettings => ({
    siteTitle: runtimeConfig.public.siteTitle as string,
    siteSubtitle: runtimeConfig.public.siteSubtitle as string,
    siteIconLeft: runtimeConfig.public.siteIconLeft as string,
    siteIconRight: runtimeConfig.public.siteIconRight as string,
    themePrimary: runtimeConfig.public.themePrimary as string,
    themeSecondary: runtimeConfig.public.themeSecondary as string,
    themeBgFrom: runtimeConfig.public.themeBgFrom as string,
    themeBgTo: runtimeConfig.public.themeBgTo as string,
    showSnowflakes: runtimeConfig.public.showSnowflakes as boolean,
  })
  
  // 響應式設定
  const settings = useState<SiteSettings>('site-settings', () => {
    const stored = getStoredSettings()
    return stored || getDefaultSettings()
  })
  
  // 在客戶端初始化時載入
  const initSettings = () => {
    const stored = getStoredSettings()
    if (stored) {
      settings.value = stored
    }
  }
  
  // 儲存設定到 localStorage
  const saveSettings = () => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }
  
  // 重設為預設值
  const resetSettings = () => {
    settings.value = getDefaultSettings()
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  
  // 更新單一設定
  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    settings.value[key] = value
    saveSettings()
  }
  
  // 批次更新設定
  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()
  }
  
  // 計算 CSS 樣式
  const themeStyle = computed(() => ({
    '--theme-primary': settings.value.themePrimary,
    '--theme-secondary': settings.value.themeSecondary,
    '--theme-bg-start': settings.value.themeBgFrom,
    '--theme-bg-end': settings.value.themeBgTo,
  }))
  
  // 從環境變數讀取的固定設定（不可動態修改）
  const fixedConfig = {
    minPlayers: runtimeConfig.public.minPlayers as number,
    maxPlayers: runtimeConfig.public.maxPlayers as number,
    onlineMaxPlayers: runtimeConfig.public.onlineMaxPlayers as number,
    roomCodeLength: runtimeConfig.public.roomCodeLength as number,
    passwordProtection: runtimeConfig.public.passwordProtection as boolean,
  }
  
  return {
    settings,
    fixedConfig,
    themeStyle,
    initSettings,
    saveSettings,
    resetSettings,
    updateSetting,
    updateSettings,
    getDefaultSettings,
  }
}
