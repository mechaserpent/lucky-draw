// 動態網站設定 - 可在執行時調整並儲存到 localStorage
const STORAGE_KEY = "draw-site-settings";

interface SiteSettings {
  siteTitle: string;
  siteSubtitle: string;
  siteIconLeft: string;
  siteIconRight: string;
  // 主要色彩
  themePrimary: string; // 主要品牌色
  themeSecondary: string; // 次要品牌色
  themeAccent: string; // 強調色
  // 背景色彩
  themeBgFrom: string; // 背景漸層起始
  themeBgTo: string; // 背景漸層結束
  themeBgDeep: string; // 深色背景
  // 表面色彩
  themeSurface: string; // 卡片/表面顏色
  themeSurfaceLight: string; // 淺色表面
  themeSurfaceHover: string; // 懸停表面
  // 文字色彩
  themeText: string; // 主要文字
  themeTextSecondary: string; // 次要文字
  themeTextMuted: string; // 弱化文字
  // 效果色彩
  themeSuccess: string; // 成功色
  themeWarning: string; // 警告色
  themeDanger: string; // 危險色
  themeInfo: string; // 資訊色
  // 特效
  showSnowflakes: boolean;
  passwordProtection: boolean; // 密碼保護功能
}

export function useDynamicConfig() {
  const runtimeConfig = useRuntimeConfig();

  // 從 localStorage 讀取設定，如果沒有則使用環境變數預設值
  const getStoredSettings = (): SiteSettings | null => {
    if (!import.meta.client) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const getDefaultSettings = (): SiteSettings => ({
    siteTitle: runtimeConfig.public.siteTitle as string,
    siteSubtitle: runtimeConfig.public.siteSubtitle as string,
    siteIconLeft: runtimeConfig.public.siteIconLeft as string,
    siteIconRight: runtimeConfig.public.siteIconRight as string,
    // 主要色彩 - 從環境變數讀取，有預設值
    themePrimary: (runtimeConfig.public.themePrimary as string) || "#BF092F",
    themeSecondary:
      (runtimeConfig.public.themeSecondary as string) || "#3B9797",
    themeAccent: (runtimeConfig.public.themeAccent as string) || "#62B6B7",
    // 背景色彩 - 從環境變數讀取，有預設值
    themeBgFrom: (runtimeConfig.public.themeBgFrom as string) || "#102A43",
    themeBgTo: (runtimeConfig.public.themeBgTo as string) || "#16476A",
    themeBgDeep: (runtimeConfig.public.themeBgDeep as string) || "#132440",
    // 表面色彩 - 從環境變數讀取，有預設值
    themeSurface:
      (runtimeConfig.public.themeSurface as string) ||
      "rgba(255, 255, 255, 0.08)",
    themeSurfaceLight:
      (runtimeConfig.public.themeSurfaceLight as string) ||
      "rgba(255, 255, 255, 0.12)",
    themeSurfaceHover:
      (runtimeConfig.public.themeSurfaceHover as string) ||
      "rgba(255, 255, 255, 0.16)",
    // 文字色彩 - 從環境變數讀取，有預設值
    themeText: (runtimeConfig.public.themeText as string) || "#FFFFFF",
    themeTextSecondary:
      (runtimeConfig.public.themeTextSecondary as string) ||
      "rgba(255, 255, 255, 0.8)",
    themeTextMuted:
      (runtimeConfig.public.themeTextMuted as string) ||
      "rgba(255, 255, 255, 0.5)",
    // 效果色彩 - 從環境變數讀取，有預設值
    themeSuccess: (runtimeConfig.public.themeSuccess as string) || "#3B9797",
    themeWarning: (runtimeConfig.public.themeWarning as string) || "#F59E0B",
    themeDanger: (runtimeConfig.public.themeDanger as string) || "#BF092F",
    themeInfo: (runtimeConfig.public.themeInfo as string) || "#62B6B7",
    // 特效
    showSnowflakes: runtimeConfig.public.showSnowflakes as boolean,
    passwordProtection: (runtimeConfig.public.passwordProtection ??
      false) as boolean,
  });

  // 響應式設定
  const settings = useState<SiteSettings>("site-settings", () => {
    const stored = getStoredSettings();
    return stored || getDefaultSettings();
  });

  // 在客戶端初始化時載入
  const initSettings = () => {
    const stored = getStoredSettings();
    if (stored) {
      settings.value = stored;
    }
  };

  // 儲存設定到 localStorage
  const saveSettings = () => {
    if (!import.meta.client) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  // 重設為預設值
  const resetSettings = () => {
    settings.value = getDefaultSettings();
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // 更新單一設定
  const updateSetting = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => {
    settings.value[key] = value;
    saveSettings();
  };

  // 批次更新設定
  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    settings.value = { ...settings.value, ...newSettings };
    saveSettings();
  };

  // 計算 CSS 樣式
  const themeStyle = computed(() => ({
    // 主要色彩
    "--theme-primary": settings.value.themePrimary,
    "--theme-secondary": settings.value.themeSecondary,
    "--theme-accent": settings.value.themeAccent,
    // 背景色彩
    "--theme-bg-start": settings.value.themeBgFrom,
    "--theme-bg-end": settings.value.themeBgTo,
    "--theme-bg-deep": settings.value.themeBgDeep,
    // 表面色彩
    "--theme-surface": settings.value.themeSurface,
    "--theme-surface-light": settings.value.themeSurfaceLight,
    "--theme-surface-hover": settings.value.themeSurfaceHover,
    // 文字色彩
    "--theme-text": settings.value.themeText,
    "--theme-text-secondary": settings.value.themeTextSecondary,
    "--theme-text-muted": settings.value.themeTextMuted,
    // 效果色彩
    "--theme-success": settings.value.themeSuccess,
    "--theme-warning": settings.value.themeWarning,
    "--theme-danger": settings.value.themeDanger,
    "--theme-info": settings.value.themeInfo,
  }));

  // 從環境變數讀取的固定設定（不可動態修改）
  const fixedConfig = {
    minPlayers: runtimeConfig.public.minPlayers as number,
    maxPlayers: runtimeConfig.public.maxPlayers as number,
    onlineMaxPlayers: runtimeConfig.public.onlineMaxPlayers as number,
    roomCodeLength: runtimeConfig.public.roomCodeLength as number,
    passwordProtection: runtimeConfig.public.passwordProtection as boolean,
  };

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
  };
}
