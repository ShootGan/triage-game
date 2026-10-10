/** Pomocnicze funkcje językowe (polska odmiana) dla generatora pacjentów. */

export type Sex = 'm' | 'f';

/**
 * Szablon z formami rodzajowymi: „{m|f}" → forma męska albo żeńska.
 * Np. „Przytomn{y|a}" → „Przytomny" / „Przytomna"; „sam{|a}" → „sam" / „sama".
 */
export function gender(template: string, sex: Sex): string {
  return template.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, f: string) => (sex === 'm' ? m : f));
}

/**
 * Wiek po „ok." — „około" rządzi dopełniaczem: „ok. 7 lat", „ok. 22 lat", „ok. 9 miesięcy".
 * (Jedyny wyjątek, „ok. roku", nie występuje: niemowlęta mają 6–11 miesięcy, dzieci ≥ 2 lata.)
 */
export function ageText(years: number, months?: number): string {
  if (months !== undefined) return `ok. ${months} miesięcy`;
  return `ok. ${years} lat`;
}
