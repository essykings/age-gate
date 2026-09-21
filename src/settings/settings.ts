export const THEMES = ['minimal', 'midnight', 'bold', 'noir', 'amber'] as const;
export type Theme = (typeof THEMES)[number];

// Every theme except Minimal is a Pro feature.
export const FREE_THEMES: readonly Theme[] = ['minimal'];
export const isProTheme = (theme: Theme): boolean => !FREE_THEMES.includes(theme);

export const VERIFICATION_METHODS = ['button', 'dob'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

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
  minimumAge: number;
  verificationMethod: VerificationMethod;
  verificationDays: number;
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
  buttonBorderRadius: number;
}

export const DEFAULT_SETTINGS: AgeGateSettings = {
  enabled: false,
  minimumAge: 21,
  verificationMethod: 'button',
  verificationDays: 30,
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
  buttonBorderRadius: 8,
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

// Merges a stored row over the defaults, ignoring missing or wrongly typed fields.
export function normalizeSettings(row: Record<string, unknown> | null | undefined): AgeGateSettings {
  const d = DEFAULT_SETTINGS;
  const r = row ?? {};
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    minimumAge: num(r.minimumAge, d.minimumAge),
    verificationMethod: pick(VERIFICATION_METHODS, r.verificationMethod, d.verificationMethod),
    verificationDays: parseVerificationDays(r.verificationDays, d.verificationDays),
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
    buttonBorderRadius: num(r.buttonBorderRadius, d.buttonBorderRadius),
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
