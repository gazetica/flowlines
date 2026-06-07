// CountrySelector.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-005 Part 3.3
//
// Full-screen overlay country picker: search box + scrollable flag list +
// "prefer not to say" (XX). Opened from the Language and Settings screens.

import { useState } from 'react';
import { countryFlag } from '../utils/countryFlag';
import { SKIN } from '../styles/skin';
// B-001a: countryName() is a plain exported function (not a component), so it
// reads the "prefer not to say" label from the i18n singleton directly.
import i18n from '../i18n';

export interface Country {
  code: string; // ISO 3166-1 alpha-2 (drives the flag emoji via countryFlag())
  name: string; // English display name
}

// B-006: full Play Console distribution list (140+). Flag emojis are derived
// from the code at render time (countryFlag()), so only code+name are stored.
// `China` (CN) is kept from the original list even though it is not in the B-006
// brief — removing it would strip the flag/name for existing CN-set players.
// Sorted alphabetically by English name (locale-independent) — the .sort() makes
// the source order irrelevant.
export const COUNTRIES: Country[] = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MK', name: 'Macedonia' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TG', name: 'Togo' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
].sort((a, b) => a.name.localeCompare(b.name));

// Pure search filter: matches English name or ISO code, case-insensitive. Empty
// query returns the full list. Single source of truth for the selector's filter;
// exported for unit tests (B-006).
export function filterCountries(query: string): Country[] {
  const ql = query.trim().toLowerCase();
  if (!ql) return COUNTRIES;
  return COUNTRIES.filter((c) => c.name.toLowerCase().includes(ql) || c.code.toLowerCase().includes(ql));
}

export function countryName(code: string): string {
  if (!code || code === 'XX') return i18n.t('country.prefer_not');
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function CountrySelector({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const filtered = filterCountries(q);

  const pick = (code: string) => {
    onSelect(code);
    onClose();
  };

  const Row = ({ code, flag, name }: { code: string; flag: string; name: string }) => (
    <button
      onClick={() => pick(code)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 16px',
        background: value === code ? 'rgba(255,215,0,0.08)' : 'transparent',
        border: 'none',
        borderBottom: `1px solid ${SKIN.navBorder}`,
        borderLeft: `3px solid ${value === code ? SKIN.gold : 'transparent'}`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 22 }}>{flag}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: value === code ? SKIN.gold : SKIN.white }}>{name}</span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '48px 20px 16px', borderBottom: '1px solid rgba(30,139,195,0.2)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2 }}>SELECT COUNTRY</h1>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search country…"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: SKIN.cardBg,
            border: `1px solid ${SKIN.cardBorder}`,
            borderRadius: 8,
            outline: 'none',
            color: SKIN.white,
            fontFamily: "'Space Mono', monospace",
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((c) => (
          <Row key={c.code} code={c.code} flag={countryFlag(c.code)} name={c.name} />
        ))}
        {ql === '' && <Row code="XX" flag="🌐" name={i18n.t('country.prefer_not')} />}
      </div>
    </div>
  );
}
