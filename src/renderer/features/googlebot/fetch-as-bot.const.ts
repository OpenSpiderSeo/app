/** Presets for "fetch as bot / browser" checks. */
export const FetchAsBotProfile = {
  GooglebotDesktop: 'googlebot-desktop',
  GooglebotSmart: 'googlebot-smart',
  ChromeDesktop: 'chrome-desktop',
  ChromeMobile: 'chrome-mobile',
  Custom: 'custom',
} as const;

export type FetchAsBotProfileId =
  (typeof FetchAsBotProfile)[keyof typeof FetchAsBotProfile];

export type FetchAsBotDevice = 'desktop' | 'mobile';

export interface FetchAsBotProfileDef {
  id: FetchAsBotProfileId;
  device: FetchAsBotDevice;
  /** i18n key suffix under googlebot.profile.* */
  labelKey: string;
  userAgent: string;
  viewportWidth: number;
}

export interface FetchAsBotLanguageDef {
  id: string;
  /** BCP47 / Accept-Language primary */
  acceptLanguage: string;
  labelKey: string;
}

/** Languages for Accept-Language negotiation checks. */
export const FETCH_AS_BOT_LANGUAGES: FetchAsBotLanguageDef[] = [
  { id: 'ru', acceptLanguage: 'ru-RU,ru;q=0.9,en;q=0.5', labelKey: 'ru' },
  { id: 'en', acceptLanguage: 'en-US,en;q=0.9', labelKey: 'en' },
  { id: 'de', acceptLanguage: 'de-DE,de;q=0.9,en;q=0.5', labelKey: 'de' },
  { id: 'fr', acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.5', labelKey: 'fr' },
  { id: 'es', acceptLanguage: 'es-ES,es;q=0.9,en;q=0.5', labelKey: 'es' },
  { id: 'pt', acceptLanguage: 'pt-BR,pt;q=0.9,en;q=0.5', labelKey: 'pt' },
  { id: 'it', acceptLanguage: 'it-IT,it;q=0.9,en;q=0.5', labelKey: 'it' },
  { id: 'pl', acceptLanguage: 'pl-PL,pl;q=0.9,en;q=0.5', labelKey: 'pl' },
  { id: 'uk', acceptLanguage: 'uk-UA,uk;q=0.9,ru;q=0.6,en;q=0.4', labelKey: 'uk' },
  { id: 'tr', acceptLanguage: 'tr-TR,tr;q=0.9,en;q=0.5', labelKey: 'tr' },
  { id: 'zh', acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.5', labelKey: 'zh' },
  { id: 'ja', acceptLanguage: 'ja-JP,ja;q=0.9,en;q=0.5', labelKey: 'ja' },
  { id: 'ko', acceptLanguage: 'ko-KR,ko;q=0.9,en;q=0.5', labelKey: 'ko' },
  { id: 'ar', acceptLanguage: 'ar-SA,ar;q=0.9,en;q=0.5', labelKey: 'ar' },
];

export const DEFAULT_COMPARE_LANGUAGES = ['ru', 'en', 'de'] as const;

/** Real-ish Google / Chrome UAs used for differential crawling checks. */
export const FETCH_AS_BOT_PROFILES: FetchAsBotProfileDef[] = [
  {
    id: FetchAsBotProfile.GooglebotDesktop,
    device: 'desktop',
    labelKey: 'googlebotDesktop',
    userAgent:
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    viewportWidth: 1280,
  },
  {
    id: FetchAsBotProfile.GooglebotSmart,
    device: 'mobile',
    labelKey: 'googlebotSmart',
    userAgent:
      'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    viewportWidth: 412,
  },
  {
    id: FetchAsBotProfile.ChromeDesktop,
    device: 'desktop',
    labelKey: 'chromeDesktop',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewportWidth: 1280,
  },
  {
    id: FetchAsBotProfile.ChromeMobile,
    device: 'mobile',
    labelKey: 'chromeMobile',
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    viewportWidth: 412,
  },
];

export function resolveFetchAsBotProfile(
  profileId?: FetchAsBotProfileId | string | null,
  customUa?: string,
): { id: FetchAsBotProfileId; device: FetchAsBotDevice; userAgent: string; viewportWidth: number } {
  if (profileId === FetchAsBotProfile.Custom) {
    const ua = customUa?.trim() || FETCH_AS_BOT_PROFILES[0].userAgent;
    const mobile = /mobile|android|iphone|ipad/i.test(ua);
    return {
      id: FetchAsBotProfile.Custom,
      device: mobile ? 'mobile' : 'desktop',
      userAgent: ua,
      viewportWidth: mobile ? 412 : 1280,
    };
  }

  const found =
    FETCH_AS_BOT_PROFILES.find((p) => p.id === profileId) ?? FETCH_AS_BOT_PROFILES[0];
  return {
    id: found.id,
    device: found.device,
    userAgent: found.userAgent,
    viewportWidth: found.viewportWidth,
  };
}
