import { hasBuiltInWording } from '../popup/i18n';
import { toLanguageCode } from './language';

export { toLanguageCode };

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

// Free Wix addresses put the site's name in front of every page, e.g.
// "user.wixstudio.com/my-site-1/shop". Pages are matched without that prefix.
const FREE_WIX_HOST = /(^|\.)(wixsite\.com|wixstudio\.com|wixstudio\.io|editorx\.io)$/i;

export interface PageContext {
  // The address's host name, used to recognise free Wix addresses.
  hostname?: string;
  // The language the visitor is viewing (e.g. "fr"), so "/fr/shop" also matches "/shop".
  language?: string;
}

function pathSegments(value: string): string[] {
  let path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      // Not a real URL; treat it as a path below.
    }
  }
  path = path.split(/[?#]/)[0] ?? '';
  try {
    path = decodeURIComponent(path);
  } catch {
    // Leave malformed escapes as typed.
  }
  return path.toLowerCase().split('/').filter(Boolean);
}

const isLanguageSegment = (segment: string, language: string | undefined): boolean =>
  !!language && /^[a-z]{2,3}(-[a-z0-9]{2,4})?$/.test(segment) && toLanguageCode(segment) === toLanguageCode(language);

// The page's path as the owner thinks of it: lower case, decoded, without the free Wix
// site-name prefix or a leading language folder, and without a trailing slash.
function sitePath(segments: string[], siteSlug: string | null, language: string | undefined): string {
  let rest = segments;
  if (siteSlug && rest[0] === siteSlug) rest = rest.slice(1);
  if (rest[0] && isLanguageSegment(rest[0], language)) rest = rest.slice(1);
  return `/${rest.join('/')}`;
}

function targetPatterns(targetPaths: string): string[] {
  return targetPaths.split('\n').map((line) => line.trim()).filter(Boolean);
}

// Whether at least one page has actually been entered.
export const hasTargetPaths = (targetPaths: string): boolean => targetPatterns(targetPaths).length > 0;

// Tidies one typed page into a path, e.g. "https://site.com/Shop/" -> "/shop". Keeps a
// trailing "/*" (everything under the page) and leaves an empty entry empty.
export function normalizeTargetPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const wildcard = /\/\*$/.test(trimmed);
  const segments = pathSegments(wildcard ? trimmed.slice(0, -2) : trimmed);
  const path = `/${segments.join('/')}`;
  return wildcard ? `${path === '/' ? '' : path}/*` : path;
}

// True if the given pathname is covered by any of the target patterns, e.g. "/shop" or
// "/shop/*" for everything under it. Case, URL escapes, trailing slashes, the free Wix
// site-name prefix and a leading language folder ("/fr/shop") are all ignored.
export function matchesTargetPaths(pathname: string, targetPaths: string, context: PageContext = {}): boolean {
  const currentSegments = pathSegments(pathname);
  const siteSlug = context.hostname && FREE_WIX_HOST.test(context.hostname) ? currentSegments[0] ?? null : null;
  const current = sitePath(currentSegments, siteSlug, context.language);

  return targetPatterns(targetPaths).some((raw) => {
    const wildcard = /\/\*$/.test(raw);
    const pattern = sitePath(pathSegments(wildcard ? raw.slice(0, -2) : raw), siteSlug, context.language);
    if (wildcard) {
      return current === pattern || current.startsWith(`${pattern === '/' ? '' : pattern}/`);
    }
    return current === pattern;
  });
}

// Turns what an owner typed into a usable redirect: "google.com" becomes
// "https://google.com" (left as-is it would resolve to a broken page on their own site).
// Paths like "/sorry" stay as they are, and anything with a scheme is left for validation.
export function normalizeRedirectUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^(javascript|data|vbscript|mailto|tel):/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
}

// A plain-language problem with a redirect URL, or null if it's fine (or empty).
export function redirectUrlIssue(value: string): string | null {
  const url = normalizeRedirectUrl(value);
  if (!url || url.startsWith('/')) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'Use a web address that starts with https://, for example https://example.com.';
    }
    if (!parsed.hostname.includes('.')) {
      return "That doesn't look like a full web address. Try something like https://example.com.";
    }
    return null;
  } catch {
    return 'Enter a full web address, for example https://example.com.';
  }
}


// How the page behind the popup looks: dimmed or blurred.
export const BACKDROPS = ['dim', 'blur'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

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
  // Whether we've already asked this site owner to leave a review. Stored here (rather
  // than the browser) so it survives across devices and doesn't ask more than once.
  reviewPrompted: boolean;
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
  // Shown instead of the popup when a visitor doesn't meet the minimum age. Empty uses the
  // built-in text in the visitor's language.
  restrictedHeadingText: string;
  restrictedBodyText: string;
  // How much of the site shows through behind the popup.
  backdrop: Backdrop;
}

export interface Translation {
  // Primary language code, e.g. "fr" (regional tags like "fr-CA" are reduced to it).
  code: string;
  headingText: string;
  bodyText: string;
  yesButtonText: string;
  noButtonText: string;
  footerText: string;
  restrictedHeadingText: string;
  restrictedBodyText: string;
}

export const EMPTY_TRANSLATION: Translation = {
  code: '',
  headingText: '',
  bodyText: '',
  yesButtonText: '',
  noButtonText: '',
  footerText: '',
  restrictedHeadingText: '',
  restrictedBodyText: '',
};

// Longest custom CSS accepted, so the saved settings stay a sensible size.
export const MAX_CUSTOM_CSS_LENGTH = 10000;

export const DEFAULT_SETTINGS: AgeGateSettings = {
  enabled: true,
  // Defaults on so a new owner sees the gate reappear while they're testing, instead of
  // wondering why it "stopped working" after they click Yes once. The warning banner (see
  // my-page.tsx) reminds them to turn it off before real visitors arrive.
  previewMode: true,
  reviewPrompted: false,
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
  restrictedHeadingText: '',
  restrictedBodyText: '',
  backdrop: 'blur',
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
      code: toLanguageCode(text(item.code, '')),
      headingText: text(item.headingText, ''),
      bodyText: text(item.bodyText, ''),
      yesButtonText: text(item.yesButtonText, ''),
      noButtonText: text(item.noButtonText, ''),
      footerText: text(item.footerText, ''),
      restrictedHeadingText: text(item.restrictedHeadingText, ''),
      restrictedBodyText: text(item.restrictedBodyText, ''),
    }))
    .filter((t) => t.code);
}

// Merges a stored row over the defaults, ignoring missing or wrongly typed fields.
export function normalizeSettings(row: Record<string, unknown> | null | undefined): AgeGateSettings {
  const d = DEFAULT_SETTINGS;
  const r = row ?? {};
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    // Settings saved before testing mode existed never had it on, so a missing value means
    // off here -- only a site that has never saved starts in testing mode (DEFAULT_SETTINGS).
    previewMode: typeof r.previewMode === 'boolean' ? r.previewMode : false,
    reviewPrompted: typeof r.reviewPrompted === 'boolean' ? r.reviewPrompted : d.reviewPrompted,
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
    restrictedHeadingText: text(r.restrictedHeadingText, d.restrictedHeadingText),
    restrictedBodyText: text(r.restrictedBodyText, d.restrictedBodyText),
    // Sites saved before this option existed keep the dimmed look they already had.
    // "solid" (hidden completely) was removed; its closest remaining look is blurred.
    backdrop: r.backdrop === 'solid' ? 'blur' : pick(BACKDROPS, r.backdrop, 'dim'),
  };
}

// The same settings with every Pro-only option put back to its Free value. Used when a
// Free site saves, and to switch Pro options off after a site leaves the Pro plan.
export function stripProFeatures(settings: AgeGateSettings): AgeGateSettings {
  return {
    ...settings,
    verificationMethod: settings.verificationMethod === 'dob' ? 'button' : settings.verificationMethod,
    theme: isProTheme(settings.theme) ? 'minimal' : settings.theme,
    pageTargeting: 'all',
    targetPaths: '',
    translations: [],
    customCss: '',
    logoUrl: '',
    popupBackgroundColor: '',
    accentColor: '',
    noButtonColor: '',
    buttonBorderRadius: DEFAULT_SETTINGS.buttonBorderRadius,
  };
}

// Whether any Pro-only option is in use.
export const usesProFeatures = (settings: AgeGateSettings): boolean =>
  JSON.stringify(stripProFeatures(settings)) !== JSON.stringify(settings);

// A plain-language problem with the translations, or null if they're fine to save.
export function translationsIssue(translations: Translation[]): string | null {
  const seen = new Set<string>();
  for (const translation of translations) {
    const code = toLanguageCode(translation.code);
    if (!code) return 'Choose a language for each language you added, or remove it.';
    if (seen.has(code)) return `The same language ("${code}") is added twice. Remove one of them.`;
    seen.add(code);
  }
  return null;
}

// Overrides the gate's text with a visitor's current-language translation, if one is
// saved for it. A field left empty in that translation uses the built-in wording in that
// language (by leaving it empty for buildPopup), so the popup never mixes languages; only
// languages without built-in wording fall back to the main text. The footer has no
// built-in wording, so it always falls back to the main footer rather than disappearing.
export function resolveLocalizedSettings(
  settings: AgeGateSettings,
  languageCode: string | null | undefined,
): AgeGateSettings {
  // "en-US" and similar full locale tags match on their primary subtag, "en".
  const code = languageCode ? toLanguageCode(languageCode) : '';
  if (!code) return settings;
  const translation = settings.translations.find((t) => t.code === code);
  if (!translation) return settings;
  const builtIn = hasBuiltInWording(code);
  const text = (own: string, main: string) => own || (builtIn ? '' : main);
  return {
    ...settings,
    headingText: text(translation.headingText, settings.headingText),
    bodyText: text(translation.bodyText, settings.bodyText),
    yesButtonText: text(translation.yesButtonText, settings.yesButtonText),
    noButtonText: text(translation.noButtonText, settings.noButtonText),
    footerText: translation.footerText || settings.footerText,
    restrictedHeadingText: text(translation.restrictedHeadingText, settings.restrictedHeadingText),
    restrictedBodyText: text(translation.restrictedBodyText, settings.restrictedBodyText),
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
