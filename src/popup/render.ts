import { resolvePopupColors } from '../settings/color';
import type { AgeGateSettings } from '../settings/settings';
import { uiStrings, type UiStrings } from './i18n';

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

// Today's date in the visitor's own time zone (toISOString would give the UTC date, which
// is a day off near midnight for anyone not on UTC).
export function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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
// picker, and what their submit button says.
const SEGMENTED_DOB_THEMES: Partial<Record<string, { submitLabel: (strings: UiStrings) => string }>> = {
  noir: { submitLabel: (strings) => strings.enter },
  blossom: { submitLabel: (strings) => `${strings.confirm} →` },
};

// Whether a theme uses the segmented DD / MM / YYYY fields (also used client-side in
// gate.ts, to read the right input group and move focus between segments).
export function isSegmentedDobTheme(theme: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEGMENTED_DOB_THEMES, theme);
}

function previewNote(settings: AgeGateSettings, strings: UiStrings): string {
  return settings.previewMode ? `<p class="previewNote">${escapeHtml(strings.testingNote)}</p>` : '';
}

// Builds the popup markup and styling variables. Shared by the live script and the
// dashboard preview, so the preview always matches what visitors see. `language` is the
// language the visitor is viewing the page in; it picks the built-in wording for anything
// the owner left blank.
export function buildPopup(settings: AgeGateSettings, language?: string | null): PopupMarkup {
  const { minimumAge, verificationMethod, theme } = settings;
  const strings = uiStrings(language);
  const isDob = verificationMethod === 'dob';
  const segmentedDob = SEGMENTED_DOB_THEMES[theme];

  const heading =
    settings.headingText ||
    (isDob ? (segmentedDob ? strings.segmentedHeading : strings.dobHeading) : strings.heading(minimumAge));
  const body = settings.bodyText || (isDob && segmentedDob ? strings.segmentedBody : strings.body);
  const yesText = settings.yesButtonText || strings.yes(minimumAge);
  const noText = settings.noButtonText || strings.no(minimumAge);

  const logoUrl = safeLogoUrl(settings.logoUrl);
  const logoHtml = logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />` : '';
  const footerHtml = settings.footerText ? `<p class="footer">${escapeHtml(settings.footerText)}</p>` : '';
  const previewNoteHtml = previewNote(settings, strings);

  const dobFields = segmentedDob
    ? `<div class="dobSegments">
          <input class="dobSegment" id="age-gate-dob-dd" inputmode="numeric" maxlength="2" placeholder="${escapeHtml(strings.dayPlaceholder)}" aria-label="${escapeHtml(strings.day)}" autocomplete="bday-day" />
          <span class="dobSlash">/</span>
          <input class="dobSegment" id="age-gate-dob-mm" inputmode="numeric" maxlength="2" placeholder="${escapeHtml(strings.monthPlaceholder)}" aria-label="${escapeHtml(strings.month)}" autocomplete="bday-month" />
          <span class="dobSlash">/</span>
          <input class="dobSegment" id="age-gate-dob-yyyy" inputmode="numeric" maxlength="4" placeholder="${escapeHtml(strings.yearPlaceholder)}" aria-label="${escapeHtml(strings.year)}" autocomplete="bday-year" />
        </div>`
    : `<label class="dobLabel" for="age-gate-dob">${escapeHtml(strings.dobLabel)}</label>
        <input class="dobInput" type="date" id="age-gate-dob" max="${todayISO()}" />`;

  const actions = isDob
    ? `<div class="dobField">
          ${dobFields}
          <p class="dobError" id="age-gate-dob-error" hidden></p>
        </div>
        <div class="buttonRow">
          <button type="button" class="primaryButton" id="age-gate-submit">${escapeHtml(segmentedDob ? segmentedDob.submitLabel(strings) : strings.confirm)}</button>
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
export function buildRestrictedHtml(settings: AgeGateSettings, language?: string | null): string {
  const strings = uiStrings(language);
  const heading = settings.restrictedHeadingText || strings.restrictedHeading;
  const body = settings.restrictedBodyText || strings.restrictedBody(settings.minimumAge);
  return `<div class="container ${themeClass(settings)}" role="alertdialog" aria-modal="true" aria-labelledby="age-gate-heading">
      ${previewNote(settings, strings)}
      <h2 class="heading" id="age-gate-heading">${escapeHtml(heading)}</h2>
      <p class="body">${escapeHtml(body)}</p>
    </div>`;
}
