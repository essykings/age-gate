import styles from './age-verify.module.css';
import { resolvePopupColors } from '../../../../settings/color';
import {
  DEFAULT_SETTINGS,
  THEMES,
  parseVerificationDays,
  VERIFICATION_METHODS,
  loadStoredSettings,
  type AgeGateSettings,
  type Theme,
  type VerificationMethod,
} from '../../../../settings/settings';

const STORAGE_KEY = 'age-verify-status';
// const EXPIRY_DAYS = 30;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Whole years of age as of today, or null if the date is missing/invalid/in the future.
function calculateAge(dobValue: string): number | null {
  const dob = new Date(`${dobValue}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  if (dob > today) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

class MyElement extends HTMLElement {

  static get observedAttributes() {
    return [
      'display-name',
      'minimum-age',
      'live-mode',
      'heading-text',
      'body-text',
      'accent-color',
      'no-button-color',
      'yes-button-text',
      'no-button-text',
      
      'redirect-url',
      'theme',
      'verification-method',

      //styling

      'button-border-radius',
      'popup-background-color',
      'heading-color',
      'body-color',
      'footer-text',
      'primary-button-text-color',
      'secondary-button-text-color',
      'heading-font-size',
      'button-font-size',

  // Verification
  'verification-duration',
    ];
  }

  overlayEl: HTMLDivElement | null = null;

  // Site-wide defaults saved from the dashboard; null until loaded or if none were saved.
  stored: AgeGateSettings | null = null;

  // A value set in the widget's own panel wins over the dashboard default.
  pref(attribute: string, storedValue: string): string {
    return this.getAttribute(attribute) || storedValue;
  }

  async loadStored() {
    try {
      this.stored = await loadStoredSettings();
    } catch (error) {
      console.error('Could not load age gate settings:', error);
      return;
    }
    if (this.stored) this.checkAndRender();
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this.checkAndRender();
    this.loadStored();
  }

  disconnectedCallback() {
    this.removeOverlay();
  }

  attributeChangedCallback() {
    this.checkAndRender();
  }

  removeOverlay() {
    if (this.overlayEl?.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
    this.overlayEl = null;
  }

  isLiveMode() {
    return this.getAttribute('live-mode') === 'true' || this.stored?.liveMode === true;
  }

  getTheme(): Theme {
    const theme = this.pref('theme', this.stored?.theme ?? DEFAULT_SETTINGS.theme);
    return (THEMES as readonly string[]).includes(theme) ? (theme as Theme) : 'minimal';
  }

  getVerificationMethod(): VerificationMethod {
    const method = this.pref('verification-method', this.stored?.verificationMethod ?? DEFAULT_SETTINGS.verificationMethod);
    return (VERIFICATION_METHODS as readonly string[]).includes(method) ? (method as VerificationMethod) : 'button';
  }
  // Days a visitor stays verified; 0 means only for the current browser session.
  getVerificationDays(): number {
    return parseVerificationDays(
      this.getAttribute('verification-duration'),
      this.stored?.verificationDays ?? DEFAULT_SETTINGS.verificationDays,
    );
  }

  isVerified() {
    try {
      const days = this.getVerificationDays();

      if (days === 0) {
        return sessionStorage.getItem(STORAGE_KEY) === 'verified';
      }

      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return false;

      const { verifiedAt } = JSON.parse(stored);

      return Date.now() - verifiedAt < days * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }

  setVerified() {
    try {
      const days = this.getVerificationDays();

      if (days === 0) {
        sessionStorage.setItem(STORAGE_KEY, 'verified');
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
  
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          verifiedAt: Date.now(),
        })
      );
  
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — gate will reappear on the next load.
    }
  }

  checkAndRender() {
    // Test mode (default): always show, ignore stored state entirely.
    // Live mode: skip the gate if there's a valid, unexpired verification.
    if (this.isLiveMode() && this.isVerified()) {
      this.removeOverlay();
      this.innerHTML = '';
      return;
    }
    this.renderOverlay();
  }

  // Shared "not old enough" view for both the button flow and the DOB flow.
  renderRestricted(themeClass: string, minimumAge: string) {
    if (!this.overlayEl) return;
    this.overlayEl.innerHTML = `
      <div class="${styles.container} ${themeClass}">
        <h2 class="${styles.heading}">Access Restricted</h2>
        <p class="${styles.body}">You must be ${minimumAge} or older to view this site.</p>
      </div>
    `;
  }

  renderOverlay() {

    this.removeOverlay();

    const st = this.stored ?? DEFAULT_SETTINGS;
    const minimumAge = this.pref('minimum-age', String(st.minimumAge));
    const liveMode = this.isLiveMode();
    const theme = this.getTheme();
    const method = this.getVerificationMethod();
    // Theme classnames use a hyphen, so they need bracket access on the CSS-module object.
    const themeClass = theme === 'minimal' ? '' : styles[`theme-${theme}`];

    const customHeading = this.pref('heading-text', st.headingText);
    const isNoir = theme === 'noir';
    const heading = customHeading || (method === 'dob'
      ? (isNoir ? 'Confirm your age' : 'Please confirm your date of birth')
      : `Are you ${minimumAge} or older?`);

    const customBody = this.pref('body-text', st.bodyText);
    const body = customBody || (isNoir && method === 'dob'
      ? 'Enter your date of birth to continue'
      : 'You must confirm your age to view this site.');
    const logoUrl = st.logoUrl.startsWith('https://') ? st.logoUrl : '';
    const footerText = this.pref('footer-text', st.footerText);
    const logoHtml = logoUrl ? `<img class="${styles.logo}" src="${escapeHtml(logoUrl)}" alt="" />` : '';
    const footerHtml = footerText ? `<p class="${styles.footer}">${escapeHtml(footerText)}</p>` : '';

    const accentColor = this.pref('accent-color', st.accentColor);
    const noButtonColor = this.pref('no-button-color', st.noButtonColor);
    const buttonBorderRadius = this.pref('button-border-radius', `${st.buttonBorderRadius}px`);
    const colorVars = resolvePopupColors({
      theme,
      popupBackground: this.pref('popup-background-color', st.popupBackgroundColor),
      accent: accentColor,
      noButton: noButtonColor,
      headingColor: this.pref('heading-color', st.headingColor),
      bodyColor: this.pref('body-color', st.bodyColor),
      primaryButtonTextColor: this.pref('primary-button-text-color', st.primaryButtonTextColor),
      secondaryButtonTextColor: this.pref('secondary-button-text-color', st.secondaryButtonTextColor),
    });
    const yesButtonText = this.pref('yes-button-text', st.yesButtonText) || `Yes, I am ${minimumAge}+`;
    const noButtonText = this.pref('no-button-text', st.noButtonText) || `No, I am ${minimumAge}`;
    
    
    const headingFontSize =
  this.pref('heading-font-size', `${st.headingFontSize}px`);

const buttonFontSize =
  this.pref('button-font-size', `${st.buttonFontSize}px`);
    const redirectUrl = this.pref('redirect-url', st.redirectUrl);

    const overlay = document.createElement('div');
    overlay.className = styles.overlay;

    const dobFields = isNoir
      ? `<div class="${styles.dobSegments}">
            <input class="${styles.dobSegment}" id="age-verify-dob-dd" inputmode="numeric" maxlength="2" placeholder="DD" aria-label="Day" autocomplete="bday-day" />
            <span class="${styles.dobSlash}">/</span>
            <input class="${styles.dobSegment}" id="age-verify-dob-mm" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="Month" autocomplete="bday-month" />
            <span class="${styles.dobSlash}">/</span>
            <input class="${styles.dobSegment}" id="age-verify-dob-yyyy" inputmode="numeric" maxlength="4" placeholder="YYYY" aria-label="Year" autocomplete="bday-year" />
          </div>`
      : `<label class="${styles.dobLabel}" for="age-verify-dob">Date of birth</label>
            <input class="${styles.dobInput}" type="date" id="age-verify-dob" max="${todayISO()}" />`;

    const actions = method === 'dob'
      ? `<div class="${styles.dobField}">
            ${dobFields}
            <p class="${styles.dobError}" id="age-verify-dob-error" hidden></p>
          </div>
          <div class="${styles.buttonRow}">
            <button class="${styles.primaryButton}" id="age-verify-submit">${isNoir ? 'Enter' : 'Confirm'}</button>
          </div>`
      : `<div class="${styles.buttonRow}">
            <button class="${styles.primaryButton}" id="age-verify-yes">${escapeHtml(yesButtonText)}</button>
            <button class="${styles.secondaryButton}" id="age-verify-no">${escapeHtml(noButtonText)}</button>
          </div>`;

    overlay.innerHTML = `
      <div class="${styles.container} ${themeClass}">
        ${logoHtml}
        <h2 class="${styles.heading}">${escapeHtml(heading)}</h2>
        <p class="${styles.body}">${escapeHtml(body)}</p>
        ${actions}
        ${footerHtml}
      </div>
    `;

    document.body.appendChild(overlay);
    for (const [name, value] of Object.entries(colorVars)) {
      overlay.style.setProperty(name, value);
    }

overlay.style.setProperty('--heading-font-size', headingFontSize);
overlay.style.setProperty('--button-font-size', buttonFontSize);

overlay.style.setProperty('--button-radius', buttonBorderRadius);


    this.overlayEl = overlay;

    const grantAccess = () => {
      if (liveMode) {
        this.setVerified(); // only actually persists once the site owner has gone live
      }
      this.removeOverlay();
      this.innerHTML = '';
    };

    const denyAccess = () => {
      // If a redirect URL is set, send underage visitors there instead of
      // showing the "Access Restricted" card — applies to both a "No" click
      // and a DOB check that comes back under the minimum age.
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      this.renderRestricted(themeClass, minimumAge);
    };

    // The Noir theme uses three boxes; the other themes use one date input.
    // Returns '' when empty, an ISO date when valid, or 'invalid' otherwise.
    const readDob = (): string => {
      if (!isNoir) return overlay.querySelector<HTMLInputElement>('#age-verify-dob')?.value ?? '';
      const [d, m, y] = ['dd', 'mm', 'yyyy'].map(
        (part) => overlay.querySelector<HTMLInputElement>(`#age-verify-dob-${part}`)?.value.trim() ?? '',
      );
      if (!d && !m && !y) return '';
      if (!/^\d{1,2}$/.test(d!) || !/^\d{1,2}$/.test(m!) || !/^\d{4}$/.test(y!)) return 'invalid';
      const iso = `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
      const check = new Date(`${iso}T00:00:00`);
      const real = !Number.isNaN(check.getTime()) && check.getDate() === Number(d) && check.getMonth() + 1 === Number(m);
      return real ? iso : 'invalid';
    };

    if (isNoir && method === 'dob') {
      // Move to the next box once one is full.
      const parts = ['dd', 'mm', 'yyyy'].map((part) => overlay.querySelector<HTMLInputElement>(`#age-verify-dob-${part}`));
      parts.forEach((input, index) => {
        input?.addEventListener('input', () => {
          if (input.value.length >= input.maxLength) parts[index + 1]?.focus();
        });
      });
    }

    if (method === 'dob') {
      overlay.querySelector('#age-verify-submit')?.addEventListener('click', () => {
        const errorEl = overlay.querySelector<HTMLParagraphElement>('#age-verify-dob-error');
        const dobValue = readDob();

        if (!dobValue) {
          if (errorEl) {
            errorEl.textContent = 'Please enter your date of birth.';
            errorEl.hidden = false;
          }
          return;
        }

        const age = calculateAge(dobValue);

        if (age === null) {
          if (errorEl) {
            errorEl.textContent = "That date doesn't look right — please check it.";
            errorEl.hidden = false;
          }
          return;
        }

        if (age >= Number(minimumAge)) {
          grantAccess();
        } else {
          denyAccess();
        }
      });
    } else {
      overlay.querySelector('#age-verify-yes')?.addEventListener('click', grantAccess);
      overlay.querySelector('#age-verify-no')?.addEventListener('click', denyAccess);
    }

    this.innerHTML = '';
  }
}

export default MyElement;