import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

// ISO's official long form reads oddly as a page title; override the display
// name for the countries where common usage diverges from it.
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  KR: "South Korea",
  KP: "North Korea",
  RU: "Russia",
  VN: "Vietnam",
  IR: "Iran",
  SY: "Syria",
  LA: "Laos",
  TZ: "Tanzania",
  BO: "Bolivia",
  VE: "Venezuela",
  MD: "Moldova",
  CZ: "Czechia",
  CI: "Ivory Coast",
  CD: "DR Congo",
  CG: "Congo",
  BN: "Brunei",
  FM: "Micronesia",
  TW: "Taiwan",
};

export function countryDisplayName(alpha2: string): string {
  return (
    DISPLAY_NAME_OVERRIDES[alpha2] ?? countries.getName(alpha2, "en") ?? alpha2
  );
}

export function countrySlug(alpha2: string): string {
  return countryDisplayName(alpha2)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalizes an alpha-2, alpha-3, or English country name to ISO-3166-1 alpha-2. */
export function normalizeToAlpha2(
  identifier: string | null | undefined,
): string | null {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    return countries.isValid(upper) ? upper : null;
  }
  if (trimmed.length === 3) {
    return countries.alpha3ToAlpha2(trimmed.toUpperCase()) ?? null;
  }
  return countries.getAlpha2Code(trimmed, "en") ?? null;
}

/** Resolves a URL slug ("india", "united-states", "in") to an ISO alpha-2 code and display name. */
export function resolveCountrySlug(
  slug: string,
): { code: string; name: string } | null {
  const code = normalizeToAlpha2(slug.replace(/-/g, " "));
  if (!code) return null;
  return { code, name: countryDisplayName(code) };
}
