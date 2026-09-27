import { describe, expect, it } from 'vitest';
import { buildPopup, buildRestrictedHtml, todayISO } from '../src/popup/render';
import { uiStrings } from '../src/popup/i18n';
import { DEFAULT_SETTINGS, type AgeGateSettings } from '../src/settings/settings';

const base: AgeGateSettings = { ...DEFAULT_SETTINGS, previewMode: false, minimumAge: 18 };

describe('buildPopup', () => {
  it('uses built-in wording in the visitor language for blank fields', () => {
    const { html } = buildPopup(base, 'fr');
    expect(html).toContain('Avez-vous 18 ans ou plus ?');
    expect(html).toContain('Non, j’ai moins de 18 ans');
  });

  it('falls back to English for languages without built-in wording', () => {
    expect(buildPopup(base, 'ja').html).toContain('Are you 18 or older?');
  });

  it("prefers the owner's own text", () => {
    expect(buildPopup({ ...base, yesButtonText: 'Enter' }, 'fr').html).toContain('>Enter<');
  });

  it('escapes owner text', () => {
    const { html } = buildPopup({ ...base, headingText: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('localises date-of-birth labels and buttons', () => {
    const { html } = buildPopup({ ...base, verificationMethod: 'dob', theme: 'noir' }, 'de');
    expect(html).toContain('placeholder="TT"');
    expect(html).toContain('>Weiter<');
  });

  it('shows the testing note in the visitor language', () => {
    expect(buildPopup({ ...base, previewMode: true }, 'es').html).toContain(uiStrings('es').testingNote);
  });
});

describe('buildRestrictedHtml', () => {
  it('uses built-in wording, or the owner text when set', () => {
    expect(buildRestrictedHtml(base, 'it')).toContain('Accesso limitato');
    expect(buildRestrictedHtml({ ...base, restrictedHeadingText: 'Come back later' }, 'it')).toContain('Come back later');
  });
});

describe('todayISO', () => {
  it("returns today's local date", () => {
    const now = new Date();
    expect(todayISO()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    );
  });
});
