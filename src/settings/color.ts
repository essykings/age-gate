// Black or white, whichever reads better on the given #rgb / #rrggbb background.
export function readableTextColor(background: string): string {
  const hex = background.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#111111';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#ffffff';
}

export interface PopupColorInputs {
  theme: string;
  popupBackground: string;
  accent: string;
  noButton: string;
  headingColor: string;
  bodyColor: string;
  primaryButtonTextColor: string;
  secondaryButtonTextColor: string;
}

// Colours each theme uses when nothing is set (mirrors age-verify.module.css).
interface ThemeColors {
  background: string;
  heading: string;
  body: string;
  secondaryText: string;
  primaryBackground: string;
  primaryText: string;
}

const THEME_DEFAULTS: Record<string, ThemeColors> = {
  minimal: { background: '#ffffff', heading: '#111111', body: '#666666', secondaryText: '#666666', primaryBackground: '#111111', primaryText: '#ffffff' },
  midnight: { background: '#1a1a1f', heading: '#f4f3f1', body: '#9d9da3', secondaryText: '#9d9da3', primaryBackground: '#111111', primaryText: '#ffffff' },
  bold: { background: '#ffffff', heading: '#111111', body: '#666666', secondaryText: '#666666', primaryBackground: '#111111', primaryText: '#ffffff' },
  amber: { background: '#ffffff', heading: '#1a1a1a', body: '#444444', secondaryText: '#1a1a1a', primaryBackground: '#ffc400', primaryText: '#1a1a1a' },
  noir: { background: '#0a0a0a', heading: '#ffffff', body: '#8a8a8f', secondaryText: '#8a8a8f', primaryBackground: '#d9c5b8', primaryText: '#2a211d' },
};

function themeDefaults(theme: string) {
  return THEME_DEFAULTS[theme] ?? THEME_DEFAULTS.minimal!;
}

// CSS custom properties to set on the popup. Text colours that aren't chosen follow the
// background, so a custom background never leaves unreadable text.
export function resolvePopupColors(i: PopupColorInputs): Record<string, string> {
  const vars: Record<string, string> = {};
  if (i.accent) vars['--accent-color'] = i.accent;
  const autoText = i.popupBackground ? readableTextColor(i.popupBackground) : '';

  if (i.popupBackground) vars['--popup-background'] = i.popupBackground;
  const heading = i.headingColor || autoText;
  if (heading) vars['--heading-color'] = heading;
  const body = i.bodyColor || autoText;
  if (body) vars['--body-color'] = body;

  const primaryText = i.primaryButtonTextColor || (i.accent ? readableTextColor(i.accent) : '');
  if (primaryText) vars['--primary-text'] = primaryText;

  if (i.noButton) {
    vars['--secondary-bg'] = i.noButton;
    vars['--secondary-border'] = i.noButton;
    vars['--secondary-text'] = i.secondaryButtonTextColor || readableTextColor(i.noButton);
  } else {
    const secondaryText = i.secondaryButtonTextColor || autoText;
    if (secondaryText) vars['--secondary-text'] = secondaryText;
  }
  return vars;
}

function luminance(color: string): number | null {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

// WCAG contrast ratio (1 to 21), or null if either colour isn't a hex value.
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Plain-language warnings for text that falls below WCAG AA (4.5:1).
export function contrastIssues(i: PopupColorInputs): string[] {
  const t = themeDefaults(i.theme);
  const vars = resolvePopupColors(i);
  const background = i.popupBackground || t.background;
  const checks: [string, string, string][] = [
    ['Heading', vars['--heading-color'] ?? t.heading, background],
    ['Body text', vars['--body-color'] ?? t.body, background],
    ['Yes button text', vars['--primary-text'] ?? t.primaryText, i.accent || t.primaryBackground],
    ['No button text', vars['--secondary-text'] ?? t.secondaryText, i.noButton || background],
  ];
  return checks.flatMap(([label, text, bg]) => {
    const ratio = contrastRatio(text, bg);
    return ratio !== null && ratio < 4.5
      ? [`${label} is hard to read on its background (contrast ${ratio.toFixed(1)}:1, aim for 4.5:1 or more).`]
      : [];
  });
}
