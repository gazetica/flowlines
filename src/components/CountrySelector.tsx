// CountrySelector.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016
//
// Country picker (30 common countries for now; Sprint 4 expands to 155).
// Replaces the Numtap @ts-nocheck version — clean, no Numtap imports.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';

const GOLD = '#FFD700';

export type Country = { code: string; name: string };

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
  { code: 'KR', name: 'South Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'CN', name: 'China' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AR', name: 'Argentina' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PH', name: 'Philippines' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'EG', name: 'Egypt' },
];

/** Regional-indicator flag emoji from an ISO-2 code (avoids hardcoding emoji). */
export function flagOf(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export function filterCountries(list: Country[], query: string): Country[] {
  const q = query.trim().toLowerCase();
  return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
}

export default function CountrySelector() {
  const navigate = useNavigate();
  const country = useFlowSettingsStore((s) => s.country);
  const setCountry = useFlowSettingsStore((s) => s.setCountry);
  const [query, setQuery] = useState('');

  const filtered = filterCountries(COUNTRIES, query);

  const select = (code: string) => {
    void setCountry(code); // persists to Capacitor Preferences FL_COUNTRY
    navigate(-1);
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>SELECT COUNTRY</span>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(127,119,221,0.25)',
            borderRadius: 8,
            padding: '10px 12px',
            color: skin.white,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {filtered.map((c) => {
          const selected = c.code === country;
          return (
            <button
              key={c.code}
              onClick={() => select(c.code)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 8px',
                background: selected ? 'rgba(255,215,0,0.1)' : 'none',
                border: 'none',
                borderBottom: '1px solid rgba(127,119,221,0.12)',
                cursor: 'pointer',
                color: skin.white,
                fontSize: 14,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18 }}>{flagOf(c.code)}</span>
              <span>{c.name}</span>
              {selected && <span style={{ marginLeft: 'auto', color: GOLD }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
