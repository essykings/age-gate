import { matchesTargetPaths, normalizeRedirectUrl, type AgeGateSettings } from '../settings/settings';
import { buildPopup, buildRestrictedHtml, isSegmentedDobTheme } from './render';
import { POPUP_CSS } from './styles';

const STORAGE_KEY = 'age-gate-verified';
const DAY_MS = 24 * 60 * 60 * 1000;

// Whole years of age as of today, or null if the date is missing, invalid or in the future.
function calculateAge(dobValue: string): number | null {
  const dob = new Date(`${dobValue}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  if (dob > today) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function isVerified(days: number): boolean {
  try {
    if (days === 0) {
      return sessionStorage.getItem(STORAGE_KEY) === 'verified';
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const { verifiedAt } = JSON.parse(stored) as { verifiedAt: number };
    return Date.now() - verifiedAt < days * DAY_MS;
  } catch {
    return false;
  }
}

function setVerified(days: number): void {
  try {
    if (days === 0) {
      sessionStorage.setItem(STORAGE_KEY, 'verified');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ verifiedAt: Date.now() }));
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the gate will simply show again on the next visit.
  }
}

// Only http(s) redirects, so a saved setting can't run script.
function safeRedirect(url: string): string {
  // Also fixes values saved before the dashboard added https:// itself (e.g. "google.com").
  const normalized = normalizeRedirectUrl(url);
  // An empty value means "no redirect"; it must not resolve to the current page.
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized, window.location.href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch {
    return '';
  }
}

// Returns '' when empty, an ISO date when valid, or 'invalid' otherwise.
function readDob(root: ShadowRoot, segmented: boolean): string {
  if (!segmented) {
    return root.querySelector<HTMLInputElement>('#age-gate-dob')?.value ?? '';
  }
  const [d = '', m = '', y = ''] = ['dd', 'mm', 'yyyy'].map(
    (part) => root.querySelector<HTMLInputElement>(`#age-gate-dob-${part}`)?.value.trim() ?? '',
  );
  if (!d && !m && !y) return '';
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return 'invalid';
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const check = new Date(`${iso}T00:00:00`);
  const real =
    !Number.isNaN(check.getTime()) && check.getDate() === Number(d) && check.getMonth() + 1 === Number(m);
  return real ? iso : 'invalid';
}

export interface GateOptions {
  // Show the gate even if this browser already verified, e.g. to test it.
  ignoreStoredVerification?: boolean;
}

// Shows the age gate over the whole page. Runs in the site's own page, in a shadow root
// so the site's styles can't break the popup.
export function mountAgeGate(settings: AgeGateSettings, options: GateOptions = {}): void {
  if (!settings.enabled) return;
  if (settings.pageTargeting === 'specific' && !matchesTargetPaths(window.location.pathname, settings.targetPaths)) {
    return;
  }
  const bypassStored = options.ignoreStoredVerification || settings.previewMode;
  if (!bypassStored && isVerified(settings.verificationDays)) return;
  if (document.querySelector('[data-age-gate]')) return;

  const host = document.createElement('div');
  host.setAttribute('data-age-gate', '');
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = POPUP_CSS;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const popup = buildPopup(settings);
  for (const [name, value] of Object.entries(popup.cssVars)) {
    overlay.style.setProperty(name, value);
  }
  overlay.innerHTML = popup.html;

  root.append(style, overlay);

  // Custom CSS is appended last so it can override the built-in styles above.
  if (settings.customCss) {
    const customStyle = document.createElement('style');
    customStyle.textContent = settings.customCss;
    root.append(customStyle);
  }

  document.body.appendChild(host);

  // Keep the page behind the gate from scrolling while it's up.
  const previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  const close = () => {
    host.remove();
    document.documentElement.style.overflow = previousOverflow;
  };

  const grantAccess = () => {
    setVerified(settings.verificationDays);
    close();
  };

  const denyAccess = () => {
    const redirect = safeRedirect(settings.redirectUrl);
    if (redirect) {
      window.location.href = redirect;
      return;
    }
    overlay.innerHTML = buildRestrictedHtml(settings);
  };

  const segmented = isSegmentedDobTheme(settings.theme);

  if (settings.verificationMethod === 'dob') {
    if (segmented) {
      // Move to the next box once one is full.
      const parts = ['dd', 'mm', 'yyyy'].map((part) => root.querySelector<HTMLInputElement>(`#age-gate-dob-${part}`));
      parts.forEach((input, index) => {
        input?.addEventListener('input', () => {
          if (input.value.length >= input.maxLength) parts[index + 1]?.focus();
        });
      });
    }

    const submit = () => {
      const errorEl = root.querySelector<HTMLParagraphElement>('#age-gate-dob-error');
      const showError = (message: string) => {
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.hidden = false;
      };

      const dobValue = readDob(root, segmented);
      if (!dobValue) return showError('Please enter your date of birth.');

      const age = calculateAge(dobValue);
      if (age === null) return showError("That date doesn't look right — please check it.");

      if (age >= settings.minimumAge) grantAccess();
      else denyAccess();
    };

    root.querySelector('#age-gate-submit')?.addEventListener('click', submit);
    root.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') submit();
    });
  } else {
    root.querySelector('#age-gate-yes')?.addEventListener('click', grantAccess);
    root.querySelector('#age-gate-no')?.addEventListener('click', denyAccess);
  }

  // Put keyboard focus in the popup.
  root.querySelector<HTMLElement>('input, button')?.focus();
}
