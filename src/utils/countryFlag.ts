// countryFlag.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-005 Part 4
//
// ISO 3166-1 alpha-2 country code → Unicode flag emoji (pure Unicode, no assets).
// 'XX' / empty / invalid → 🌐 globe.

export function countryFlag(code: string): string {
  if (!code || code === 'XX' || code.length !== 2) return '🌐';
  const offset = 127397; // regional-indicator offset: 'A'(65) → 🇦(127462)
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join('');
}
