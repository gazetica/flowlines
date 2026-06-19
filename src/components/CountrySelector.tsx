// CountrySelector.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016 · FL-UX-D-001
//
// Standalone /country picker (used from Settings). Its country data now comes
// from the shared src/data/countries.ts (170-list). flagOf / COUNTRIES /
// filterCountries / Country are re-exported here so existing importers
// (Settings/Result/Daily/Leaderboard) keep working unchanged.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { COUNTRIES, flagOf, filterCountries, type Country } from '../data/countries';

export { COUNTRIES, flagOf, filterCountries };
export type { Country };

const GOLD = '#FFD700';

export default function CountrySelector() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>{t('language.select_country')}</span>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('language.search_countries')}
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
