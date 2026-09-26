export const THEMES = ['minimal', 'noir', 'amber', 'blossom', 'garden', 'sunset'] as const;
export type Theme = (typeof THEMES)[number];

// Every theme except Minimal is a Pro feature.
export const FREE_THEMES: readonly Theme[] = ['minimal'];
export const isProTheme = (theme: Theme): boolean => !FREE_THEMES.includes(theme);

export const VERIFICATION_METHODS = ['button', 'dob'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

// Which pages the gate runs on. Choosing specific pages is a Pro feature.
export const PAGE_TARGETING_MODES = ['all', 'specific'] as const;
export type PageTargetingMode = (typeof PAGE_TARGETING_MODES)[number];

// One path per line, e.g. "/shop" or "/shop/*" for everything under it.
function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '');
}

// True if the given pathname is covered by any of the target patterns.
export function matchesTargetPaths(pathname: string, targetPaths: string): boolean {
  const current = normalizePath(pathname);
  const patterns = targetPaths.split('\n').map((line) => line.trim()).filter(Boolean);
  return patterns.some((raw) => {
    if (raw.endsWith('/*')) {
      const prefix = normalizePath(raw.slice(0, -2));
      return current === prefix || current.startsWith(`${prefix === '/' ? '' : prefix}/`);
    }
    return current === normalizePath(raw);
  });
}

// Days a visitor stays verified. 0 means only for the current browser session.
export const MAX_VERIFICATION_DAYS = 3650;

// Reads a stored or attribute value, including the old '30-days' / 'session' choices.
export function parseVerificationDays(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return clampDays(value);
  if (typeof value !== 'string' || value === '') return fallback;
  if (value === 'session') return 0;
  if (value === '1-year') return 365;
  const match = /^(\d+)(?:-days?)?$/.exec(value);
  return match ? clampDays(Number(match[1])) : fallback;
}

function clampDays(days: number): number {
  return Math.min(MAX_VERIFICATION_DAYS, Math.max(0, Math.round(days)));
}

export interface AgeGateSettings {
  // Whether the age gate is shown on the site at all.
  enabled: boolean;
  // Always show the gate, ignoring any remembered verification. For testing the popup
  // itself; turn this off before real visitors rely on "Remember verification".
  previewMode: boolean;
  minimumAge: number;
  verificationMethod: VerificationMethod;
  verificationDays: number;
  // Whether the gate runs site-wide or only on chosen pages (Pro).
  pageTargeting: PageTargetingMode;
  // One path or "/prefix/*" pattern per line. Only used when pageTargeting is "specific".
  targetPaths: string;
  theme: Theme;
  // Static URL of the logo shown above the heading (Pro). Empty for none.
  logoUrl: string;
  footerText: string;
  headingText: string;
  bodyText: string;
  yesButtonText: string;
  noButtonText: string;
  redirectUrl: string;
  popupBackgroundColor: string;
  accentColor: string;
  noButtonColor: string;
  headingColor: string;
  bodyColor: string;
  primaryButtonTextColor: string;
  secondaryButtonTextColor: string;
  headingFontSize: number;
  buttonFontSize: number;
  footerFontSize: number;
  buttonBorderRadius: number;
  // Per-language text overrides for multilingual sites (Pro). Empty fields fall back to
  // the main text above.
  translations: Translation[];
  // Raw CSS injected into the popup's shadow root, after the built-in styles (Pro).
  customCss: string;
}

export interface Translation {
  // 2-letter language code, matching Wix Multilingual's visitor-facing language codes.
  code: string;
  headingText: string;
  bodyText: string;
  yesButtonText: string;
  noButtonText: string;
  footerText: string;
}

export const EMPTY_TRANSLATION: Translation = {
  code: '',
  headingText: '',
  bodyText: '',
  yesButtonText: '',
  noButtonText: '',
  footerText: '',
};

export const DEFAULT_SETTINGS: AgeGateSettings = {
  enabled: true,
  previewMode: false,
  minimumAge: 21,
  verificationMethod: 'button',
  verificationDays: 30,
  pageTargeting: 'all',
  targetPaths: '',
  theme: 'minimal',
  logoUrl: '',
  footerText: '',
  headingText: '',
  bodyText: '',
  yesButtonText: '',
  noButtonText: '',
  redirectUrl: '',
  // Empty means the theme's own background.
  popupBackgroundColor: '',
  // Empty means the theme's own button color.
  accentColor: '',
  // Empty keeps the theme's outlined No button; a colour makes it a filled button.
  noButtonColor: '',
  // Empty text colours follow the background automatically.
  headingColor: '',
  bodyColor: '',
  primaryButtonTextColor: '',
  secondaryButtonTextColor: '',
  headingFontSize: 22,
  buttonFontSize: 14,
  footerFontSize: 12,
  buttonBorderRadius: 8,
  translations: [],
  customCss: '',
};

function pick<T extends readonly string[]>(allowed: T, value: unknown, fallback: T[number]): T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTranslations(value: unknown): Translation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      code: text(item.code, '').trim().toLowerCase().slice(0, 5),
      headingText: text(item.headingText, ''),
      bodyText: text(item.bodyText, ''),
      yesButtonText: text(item.yesButtonText, ''),
      noButtonText: text(item.noButtonText, ''),
      footerText: text(item.footerText, ''),
    }))
    .filter((t) => t.code);
}

// Merges a stored row over the defaults, ignoring missing or wrongly typed fields.
export function normalizeSettings(row: Record<string, unknown> | null | undefined): AgeGateSettings {
  const d = DEFAULT_SETTINGS;
  const r = row ?? {};
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    previewMode: typeof r.previewMode === 'boolean' ? r.previewMode : d.previewMode,
    minimumAge: num(r.minimumAge, d.minimumAge),
    verificationMethod: pick(VERIFICATION_METHODS, r.verificationMethod, d.verificationMethod),
    verificationDays: parseVerificationDays(r.verificationDays, d.verificationDays),
    pageTargeting: pick(PAGE_TARGETING_MODES, r.pageTargeting, d.pageTargeting),
    targetPaths: text(r.targetPaths, d.targetPaths),
    theme: pick(THEMES, r.theme, d.theme),
    logoUrl: text(r.logoUrl, d.logoUrl),
    footerText: text(r.footerText, d.footerText),
    headingText: text(r.headingText, d.headingText),
    bodyText: text(r.bodyText, d.bodyText),
    yesButtonText: text(r.yesButtonText, d.yesButtonText),
    noButtonText: text(r.noButtonText, d.noButtonText),
    redirectUrl: text(r.redirectUrl, d.redirectUrl),
    popupBackgroundColor: text(r.popupBackgroundColor, d.popupBackgroundColor),
    accentColor: text(r.accentColor, d.accentColor),
    noButtonColor: text(r.noButtonColor, d.noButtonColor),
    headingColor: text(r.headingColor, d.headingColor),
    bodyColor: text(r.bodyColor, d.bodyColor),
    primaryButtonTextColor: text(r.primaryButtonTextColor, d.primaryButtonTextColor),
    secondaryButtonTextColor: text(r.secondaryButtonTextColor, d.secondaryButtonTextColor),
    headingFontSize: num(r.headingFontSize, d.headingFontSize),
    buttonFontSize: num(r.buttonFontSize, d.buttonFontSize),
    footerFontSize: num(r.footerFontSize, d.footerFontSize),
    buttonBorderRadius: num(r.buttonBorderRadius, d.buttonBorderRadius),
    translations: normalizeTranslations(r.translations),
    customCss: text(r.customCss, d.customCss),
  };
}

// Overrides the gate's text with a visitor's current-language translation, if one is
// saved for it. Missing fields in that translation fall back to the main text above.
export function resolveLocalizedSettings(
  settings: AgeGateSettings,
  languageCode: string | null | undefined,
): AgeGateSettings {
  // "en-US" and similar full locale tags match on their primary subtag, "en".
  const code = languageCode?.trim().toLowerCase().split('-')[0];
  if (!code) return settings;
  const translation = settings.translations.find((t) => t.code === code);
  if (!translation) return settings;
  return {
    ...settings,
    headingText: translation.headingText || settings.headingText,
    bodyText: translation.bodyText || settings.bodyText,
    yesButtonText: translation.yesButtonText || settings.yesButtonText,
    noButtonText: translation.noButtonText || settings.noButtonText,
    footerText: translation.footerText || settings.footerText,
  };
}

// The embedded script receives all settings as one string. Base64url keeps the value
// safe inside an HTML attribute whatever escaping Wix applies, and a single parameter
// means adding a setting later doesn't change the app's dynamic parameters.
export function encodeConfig(settings: AgeGateSettings): string {
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Falls back to the defaults if the value is missing or damaged.
export function decodeConfig(value: string | null | undefined): AgeGateSettings {
  if (!value) return DEFAULT_SETTINGS;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return normalizeSettings(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    console.error('Could not read the age gate settings:', error);
    return DEFAULT_SETTINGS;
  }
}
