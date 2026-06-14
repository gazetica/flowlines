// countries.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-001
//
// Shared country data — the single source of truth for the LanguageScreen
// onboarding country sheet AND the standalone CountrySelector (/country).
//
// The app's country identity is the ISO-3166 alpha-2 CODE (store.country = 'IN',
// Supabase score rows store the code, and Result/Daily/Leaderboard/Settings all
// render flags via flagOf(code)). So each entry carries `code`; the emoji `flag`
// is DERIVED from the code (regional-indicator pair) rather than hardcoded — this
// keeps the whole code-based model intact and avoids any emoji-encoding issues.

/** Regional-indicator flag emoji from an ISO-2 code (avoids hardcoding emoji). */
export function flagOf(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export interface Country {
  name: string;
  code: string; // ISO-3166 alpha-2
  flag: string; // emoji, derived from code
}

// Alphabetical by name. (code, name) pairs; flag is computed below.
const RAW: Array<{ name: string; code: string }> = [
  { name: 'Afghanistan', code: 'AF' }, { name: 'Albania', code: 'AL' },
  { name: 'Algeria', code: 'DZ' }, { name: 'Andorra', code: 'AD' },
  { name: 'Angola', code: 'AO' }, { name: 'Argentina', code: 'AR' },
  { name: 'Armenia', code: 'AM' }, { name: 'Australia', code: 'AU' },
  { name: 'Austria', code: 'AT' }, { name: 'Azerbaijan', code: 'AZ' },
  { name: 'Bahrain', code: 'BH' }, { name: 'Bangladesh', code: 'BD' },
  { name: 'Belarus', code: 'BY' }, { name: 'Belgium', code: 'BE' },
  { name: 'Bolivia', code: 'BO' }, { name: 'Bosnia and Herzegovina', code: 'BA' },
  { name: 'Botswana', code: 'BW' }, { name: 'Brazil', code: 'BR' },
  { name: 'Bulgaria', code: 'BG' }, { name: 'Cambodia', code: 'KH' },
  { name: 'Cameroon', code: 'CM' }, { name: 'Canada', code: 'CA' },
  { name: 'Chile', code: 'CL' }, { name: 'China', code: 'CN' },
  { name: 'Colombia', code: 'CO' }, { name: 'Costa Rica', code: 'CR' },
  { name: 'Croatia', code: 'HR' }, { name: 'Cuba', code: 'CU' },
  { name: 'Cyprus', code: 'CY' }, { name: 'Czech Republic', code: 'CZ' },
  { name: 'Denmark', code: 'DK' }, { name: 'Dominican Republic', code: 'DO' },
  { name: 'Ecuador', code: 'EC' }, { name: 'Egypt', code: 'EG' },
  { name: 'El Salvador', code: 'SV' }, { name: 'Estonia', code: 'EE' },
  { name: 'Ethiopia', code: 'ET' }, { name: 'Finland', code: 'FI' },
  { name: 'France', code: 'FR' }, { name: 'Georgia', code: 'GE' },
  { name: 'Germany', code: 'DE' }, { name: 'Ghana', code: 'GH' },
  { name: 'Greece', code: 'GR' }, { name: 'Guatemala', code: 'GT' },
  { name: 'Honduras', code: 'HN' }, { name: 'Hong Kong', code: 'HK' },
  { name: 'Hungary', code: 'HU' }, { name: 'Iceland', code: 'IS' },
  { name: 'India', code: 'IN' }, { name: 'Indonesia', code: 'ID' },
  { name: 'Iran', code: 'IR' }, { name: 'Iraq', code: 'IQ' },
  { name: 'Ireland', code: 'IE' }, { name: 'Israel', code: 'IL' },
  { name: 'Italy', code: 'IT' }, { name: 'Jamaica', code: 'JM' },
  { name: 'Japan', code: 'JP' }, { name: 'Jordan', code: 'JO' },
  { name: 'Kazakhstan', code: 'KZ' }, { name: 'Kenya', code: 'KE' },
  { name: 'Kuwait', code: 'KW' }, { name: 'Kyrgyzstan', code: 'KG' },
  { name: 'Laos', code: 'LA' }, { name: 'Latvia', code: 'LV' },
  { name: 'Lebanon', code: 'LB' }, { name: 'Libya', code: 'LY' },
  { name: 'Lithuania', code: 'LT' }, { name: 'Luxembourg', code: 'LU' },
  { name: 'Malaysia', code: 'MY' }, { name: 'Maldives', code: 'MV' },
  { name: 'Malta', code: 'MT' }, { name: 'Mexico', code: 'MX' },
  { name: 'Moldova', code: 'MD' }, { name: 'Mongolia', code: 'MN' },
  { name: 'Montenegro', code: 'ME' }, { name: 'Morocco', code: 'MA' },
  { name: 'Mozambique', code: 'MZ' }, { name: 'Myanmar', code: 'MM' },
  { name: 'Namibia', code: 'NA' }, { name: 'Nepal', code: 'NP' },
  { name: 'Netherlands', code: 'NL' }, { name: 'New Zealand', code: 'NZ' },
  { name: 'Nicaragua', code: 'NI' }, { name: 'Nigeria', code: 'NG' },
  { name: 'North Korea', code: 'KP' }, { name: 'North Macedonia', code: 'MK' },
  { name: 'Norway', code: 'NO' }, { name: 'Oman', code: 'OM' },
  { name: 'Pakistan', code: 'PK' }, { name: 'Palestine', code: 'PS' },
  { name: 'Panama', code: 'PA' }, { name: 'Paraguay', code: 'PY' },
  { name: 'Peru', code: 'PE' }, { name: 'Philippines', code: 'PH' },
  { name: 'Poland', code: 'PL' }, { name: 'Portugal', code: 'PT' },
  { name: 'Qatar', code: 'QA' }, { name: 'Romania', code: 'RO' },
  { name: 'Russia', code: 'RU' }, { name: 'Rwanda', code: 'RW' },
  { name: 'Saudi Arabia', code: 'SA' }, { name: 'Senegal', code: 'SN' },
  { name: 'Serbia', code: 'RS' }, { name: 'Singapore', code: 'SG' },
  { name: 'Slovakia', code: 'SK' }, { name: 'Slovenia', code: 'SI' },
  { name: 'Somalia', code: 'SO' }, { name: 'South Africa', code: 'ZA' },
  { name: 'South Korea', code: 'KR' }, { name: 'South Sudan', code: 'SS' },
  { name: 'Spain', code: 'ES' }, { name: 'Sri Lanka', code: 'LK' },
  { name: 'Sudan', code: 'SD' }, { name: 'Sweden', code: 'SE' },
  { name: 'Switzerland', code: 'CH' }, { name: 'Syria', code: 'SY' },
  { name: 'Taiwan', code: 'TW' }, { name: 'Tajikistan', code: 'TJ' },
  { name: 'Tanzania', code: 'TZ' }, { name: 'Thailand', code: 'TH' },
  { name: 'Trinidad and Tobago', code: 'TT' }, { name: 'Tunisia', code: 'TN' },
  { name: 'Turkey', code: 'TR' }, { name: 'Turkmenistan', code: 'TM' },
  { name: 'Uganda', code: 'UG' }, { name: 'Ukraine', code: 'UA' },
  { name: 'United Arab Emirates', code: 'AE' }, { name: 'United Kingdom', code: 'GB' },
  { name: 'United States', code: 'US' }, { name: 'Uruguay', code: 'UY' },
  { name: 'Uzbekistan', code: 'UZ' }, { name: 'Venezuela', code: 'VE' },
  { name: 'Vietnam', code: 'VN' }, { name: 'Yemen', code: 'YE' },
  { name: 'Zambia', code: 'ZM' }, { name: 'Zimbabwe', code: 'ZW' },
];

export const COUNTRIES: Country[] = RAW.map((c) => ({ ...c, flag: flagOf(c.code) }));

/** Case-insensitive substring filter on country name. */
export function filterCountries(list: Country[], query: string): Country[] {
  const q = query.trim().toLowerCase();
  return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
}
