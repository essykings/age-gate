// "pt-BR", "pt_br" and "PT" all become "pt": matching is on the primary language only.
export const toLanguageCode = (value: string): string => value.trim().toLowerCase().split(/[-_]/)[0]!.slice(0, 3);
