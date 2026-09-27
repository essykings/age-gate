import { resolvePopupColors } from '../settings/color';
import type { AgeGateSettings } from '../settings/settings';

export interface PopupMarkup {
  // The popup card (inside the .overlay element).
  html: string;
  // CSS custom properties to set on the .overlay element.
  cssVars: Record<string, string>;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

// Theme class names use a hyphen, e.g. "theme-noir". Minimal has no extra class.
function themeClass(settings: AgeGateSettings): string {
  return settings.theme === 'minimal' ? '' : `theme-${settings.theme}`;
}

// Only https images are accepted for the logo.
function safeLogoUrl(url: string): string {
  return url.startsWith('https://') ? url : '';
}

// Themes with a segmented DD / MM / YYYY date-of-birth field instead of a native date
// picker, plus what their submit button says and its default copy.
const SEGMENTED_DOB_THEMES: Partial<Record<string, { submitLabel: string; heading: string; body: string }>> = {
  noir: { submitLabel: 'Enter', heading: 'Confirm your age', body: 'Enter your date of birth to continue' },
  blossom: { submitLabel: 'Confirm →', heading: 'Confirm your age', body: 'Enter your date of birth to continue' },
};

// Whether a theme uses the segmented DD / MM / YYYY fields (also used client-side in
// gate.ts, to read the right input group and move focus between segments).
export function isSegmentedDobTheme(theme: string): boolean {
  return theme in SEGMENTED_DOB_THEMES;
}

// Builds the popup markup and styling variables. Shared by the live script and the
// dashboard preview, so the preview always matches what visitors see.
export function buildPopup(settings: AgeGateSettings): PopupMarkup {
  const { minimumAge, verificationMethod, theme } = settings;
  const isDob = verificationMethod === 'dob';
  const segmentedDob = SEGMENTED_DOB_THEMES[theme];

  const heading =
    settings.headingText ||
    (isDob ? (segmentedDob?.heading ?? 'Please confirm your date of birth') : `Are you ${minimumAge} or older?`);
  const body =
    settings.bodyText ||
    (isDob ? (segmentedDob?.body ?? 'You must confirm your age to view this site.') : 'You must confirm your age to view this site.');
  const yesText = settings.yesButtonText || `Yes, I am ${minimumAge}+`;
  const noText = settings.noButtonText || `No, I am under ${minimumAge}`;

  const logoUrl = safeLogoUrl(settings.logoUrl);
  const logoHtml = logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />` : '';
  const footerHtml = settings.footerText ? `<p class="footer">${escapeHtml(settings.footerText)}</p>` : '';
  const previewNoteHtml = settings.previewMode
    ? `<p class="previewNote">Always shown during testing</p>`
    : '';

  const dobFields = segmentedDob
    ? `<div class="dobSegments">
          <input class="dobSegment" id="age-gate-dob-dd" inputmode="numeric" maxlength="2" placeholder="DD" aria-label="Day" autocomplete="bday-day" />
          <span class="dobSlash">/</span>
          <input class="dobSegment" id="age-gate-dob-mm" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="Month" autocomplete="bday-month" />
          <span class="dobSlash">/</span>
          <input class="dobSegment" id="age-gate-dob-yyyy" inputmode="numeric" maxlength="4" placeholder="YYYY" aria-label="Year" autocomplete="bday-year" />
        </div>`
    : `<label class="dobLabel" for="age-gate-dob">Date of birth</label>
        <input class="dobInput" type="date" id="age-gate-dob" max="${todayISO()}" />`;

  const actions = isDob
    ? `<div class="dobField">
          ${dobFields}
          <p class="dobError" id="age-gate-dob-error" hidden></p>
        </div>
        <div class="buttonRow">
          <button type="button" class="primaryButton" id="age-gate-submit">${segmentedDob?.submitLabel ?? 'Confirm'}</button>
        </div>`
    : `<div class="buttonRow">
          <button type="button" class="primaryButton" id="age-gate-yes">${escapeHtml(yesText)}</button>
          <button type="button" class="secondaryButton" id="age-gate-no">${escapeHtml(noText)}</button>
        </div>`;

  const html = `<div class="container ${themeClass(settings)}" role="dialog" aria-modal="true" aria-labelledby="age-gate-heading">
      ${previewNoteHtml}
      ${logoHtml}
      <h2 class="heading" id="age-gate-heading">${escapeHtml(heading)}</h2>
      <p class="body">${escapeHtml(body)}</p>
      ${actions}
      ${footerHtml}
    </div>`;

  const cssVars: Record<string, string> = {
    '--heading-font-size': `${settings.headingFontSize}px`,
    '--button-font-size': `${settings.buttonFontSize}px`,
    '--footer-font-size': `${settings.footerFontSize}px`,
    '--button-radius': `${settings.buttonBorderRadius}px`,
    ...resolvePopupColors({
      theme,
      popupBackground: settings.popupBackgroundColor,
      accent: settings.accentColor,
      noButton: settings.noButtonColor,
      headingColor: settings.headingColor,
      bodyColor: settings.bodyColor,
      primaryButtonTextColor: settings.primaryButtonTextColor,
      secondaryButtonTextColor: settings.secondaryButtonTextColor,
    }),
  };

  return { html, cssVars };
}

// Shown when a visitor doesn't meet the minimum age.
export function buildRestrictedHtml(settings: AgeGateSettings): string {
  const previewNoteHtml = settings.previewMode
    ? `<p class="previewNote">Always shown during testing</p>`
    : '';
  return `<div class="container ${themeClass(settings)}" role="alertdialog" aria-modal="true" aria-labelledby="age-gate-heading">
      ${previewNoteHtml}
      <h2 class="heading" id="age-gate-heading">Access Restricted</h2>
      <p class="body">You must be ${escapeHtml(String(settings.minimumAge))} or older to view this site.</p>
    </div>`;
}
