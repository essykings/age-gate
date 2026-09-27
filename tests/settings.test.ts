import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  decodeConfig,
  encodeConfig,
  matchesTargetPaths,
  normalizeRedirectUrl,
  normalizeSettings,
  normalizeTargetPath,
  redirectUrlIssue,
  resolveLocalizedSettings,
  stripProFeatures,
  toLanguageCode,
  translationsIssue,
  usesProFeatures,
  EMPTY_TRANSLATION,
  type AgeGateSettings,
} from '../src/settings/settings';

describe('matchesTargetPaths', () => {
  it('matches exact pages and /* prefixes', () => {
    expect(matchesTargetPaths('/shop', '/shop')).toBe(true);
    expect(matchesTargetPaths('/shop/wine', '/shop')).toBe(false);
    expect(matchesTargetPaths('/shop/wine', '/shop/*')).toBe(true);
    expect(matchesTargetPaths('/shop', '/shop/*')).toBe(true);
    expect(matchesTargetPaths('/shopping', '/shop/*')).toBe(false);
  });

  it('ignores case, trailing slashes and URL escapes', () => {
    expect(matchesTargetPaths('/Shop/', '/shop')).toBe(true);
    expect(matchesTargetPaths('/caf%C3%A9', '/café')).toBe(true);
  });

  it('strips the free Wix site-name prefix from the page and from typed patterns', () => {
    const context = { hostname: 'kaistudiocoo.wixstudio.com' };
    expect(matchesTargetPaths('/my-site-1/reserve-a-place', '/reserve-a-place', context)).toBe(true);
    expect(matchesTargetPaths('/my-site-1/reserve-a-place', '/my-site-1/reserve-a-place', context)).toBe(true);
    expect(matchesTargetPaths('/my-site-1', '/', context)).toBe(true);
    expect(matchesTargetPaths('/my-site-1/our-menu', '/', context)).toBe(false);
  });

  it('keeps the first folder on custom domains', () => {
    expect(matchesTargetPaths('/my-site-1/shop', '/shop', { hostname: 'example.com' })).toBe(false);
  });

  it('ignores a leading language folder for the language being viewed', () => {
    expect(matchesTargetPaths('/fr/shop', '/shop', { language: 'fr' })).toBe(true);
    expect(matchesTargetPaths('/fr-ca/shop', '/shop', { language: 'fr-CA' })).toBe(true);
    expect(matchesTargetPaths('/fr/shop', '/shop', { language: 'en' })).toBe(false);
  });

  it('accepts full addresses as patterns', () => {
    expect(matchesTargetPaths('/shop', 'https://example.com/Shop/')).toBe(true);
  });
});

describe('normalizeTargetPath', () => {
  it('tidies typed pages into paths', () => {
    expect(normalizeTargetPath('  https://site.com/Shop/?a=1 ')).toBe('/shop');
    expect(normalizeTargetPath('shop')).toBe('/shop');
    expect(normalizeTargetPath('/shop/*')).toBe('/shop/*');
    expect(normalizeTargetPath('/*')).toBe('/*');
    expect(normalizeTargetPath('   ')).toBe('');
  });
});

describe('redirect URLs', () => {
  it('adds https:// and keeps paths', () => {
    expect(normalizeRedirectUrl('google.com')).toBe('https://google.com');
    expect(normalizeRedirectUrl('/sorry')).toBe('/sorry');
    expect(normalizeRedirectUrl('//x.com')).toBe('https://x.com');
  });

  it('rejects scripts and incomplete addresses', () => {
    expect(redirectUrlIssue('javascript:alert(1)')).not.toBeNull();
    expect(redirectUrlIssue('localhost')).not.toBeNull();
    expect(redirectUrlIssue('https://example.com')).toBeNull();
    expect(redirectUrlIssue('')).toBeNull();
  });
});

describe('translations', () => {
  it('reduces language codes to the primary language', () => {
    expect(toLanguageCode('pt-BR')).toBe('pt');
    expect(toLanguageCode(' FR_ca ')).toBe('fr');
  });

  it('uses a matching translation and falls back field by field', () => {
    const settings: AgeGateSettings = {
      ...DEFAULT_SETTINGS,
      headingText: 'Main heading',
      bodyText: 'Main body',
      translations: [{ ...EMPTY_TRANSLATION, code: 'fr', headingText: 'Titre', restrictedHeadingText: 'Accès refusé' }],
    };
    const french = resolveLocalizedSettings(settings, 'fr-FR');
    expect(french.headingText).toBe('Titre');
    expect(french.bodyText).toBe('Main body');
    expect(french.restrictedHeadingText).toBe('Accès refusé');
    expect(resolveLocalizedSettings(settings, 'de').headingText).toBe('Main heading');
  });

  it('reports missing and duplicate codes', () => {
    expect(translationsIssue([{ ...EMPTY_TRANSLATION, code: '' }])).toMatch(/Choose a language/);
    expect(
      translationsIssue([
        { ...EMPTY_TRANSLATION, code: 'fr' },
        { ...EMPTY_TRANSLATION, code: 'FR-ca' },
      ]),
    ).toMatch(/added twice/);
    expect(translationsIssue([{ ...EMPTY_TRANSLATION, code: 'fr' }])).toBeNull();
  });
});

describe('stored settings', () => {
  it('round-trips through the encoded config, including non-ASCII text', () => {
    const settings: AgeGateSettings = { ...DEFAULT_SETTINGS, headingText: 'Avez-vous 18 ans ou plus ? 🍷' };
    expect(decodeConfig(encodeConfig(settings))).toEqual(settings);
  });

  it('falls back to defaults for damaged configs', () => {
    expect(decodeConfig('not-base64!!')).toEqual(DEFAULT_SETTINGS);
  });

  it('treats fields missing from older saves as their old behaviour', () => {
    const old = normalizeSettings({ enabled: true, minimumAge: 18 });
    expect(old.previewMode).toBe(false);
    expect(old.backdrop).toBe('dim');
  });
});

describe('Pro options', () => {
  it('strips every Pro-only option and nothing else', () => {
    const pro: AgeGateSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'noir',
      verificationMethod: 'dob',
      customCss: '.heading{}',
      translations: [{ ...EMPTY_TRANSLATION, code: 'fr' }],
      headingText: 'Kept',
    };
    const stripped = stripProFeatures(pro);
    expect(stripped.theme).toBe('minimal');
    expect(stripped.verificationMethod).toBe('button');
    expect(stripped.customCss).toBe('');
    expect(stripped.translations).toEqual([]);
    expect(stripped.headingText).toBe('Kept');
    expect(usesProFeatures(pro)).toBe(true);
    expect(usesProFeatures(stripped)).toBe(false);
    expect(usesProFeatures(DEFAULT_SETTINGS)).toBe(false);
  });
});
