// Languages offered in the "Other languages" dropdown, by the primary language code the
// popup matches against the page's language (see resolveLocalizedSettings). Anything not
// listed can still be added with "Other" and a typed code.
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  el: 'Greek',
  tr: 'Turkish',
  ru: 'Russian',
  uk: 'Ukrainian',
  he: 'Hebrew',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
};

// "French", or the code itself for a language that isn't in the list.
export const languageName = (code: string): string => LANGUAGE_NAMES[code] ?? code;
