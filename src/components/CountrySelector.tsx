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

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CN', name: 'China' },
  { code: 'EG', name: 'Egypt' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'TR', name: 'Turkey' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
].sort((a, b) => a.name.localeCompare(b.name));

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
  const filtered = COUNTRIES.filter((c) => c.name.toLowerCase().includes(ql) || c.code.toLowerCase().includes(ql));

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
