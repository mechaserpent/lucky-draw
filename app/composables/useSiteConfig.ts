// 網站配置 - 從環境變數讀取
export function useSiteConfig() {
  const config = useRuntimeConfig();

  return {
    // 基本設定
    siteTitle: config.public.siteTitle as string,
    siteSubtitle: config.public.siteSubtitle as string,
    siteIconLeft: config.public.siteIconLeft as string,
    siteIconRight: config.public.siteIconRight as string,
    // Repository
    appRepo: config.public.appRepo as string,

    // 人數限制
    minPlayers: config.public.minPlayers as number,
    maxPlayers: config.public.maxPlayers as number,
    onlineMaxPlayers: config.public.onlineMaxPlayers as number,
    roomCodeLength: config.public.roomCodeLength as number,

    // 主題色彩
    themePrimary: config.public.themePrimary as string,
    themeSecondary: config.public.themeSecondary as string,
    themeBgFrom: config.public.themeBgFrom as string,
    themeBgTo: config.public.themeBgTo as string,

    // 功能開關
    showSnowflakes: config.public.showSnowflakes as boolean,
    passwordProtection: config.public.passwordProtection as boolean,
  };
}
