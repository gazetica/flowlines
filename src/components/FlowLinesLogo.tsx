// FlowLinesLogo.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-015
//
// Reusable interlocking-lines logo (the same motif used elsewhere in the brand).

export function FlowLinesLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 32 Q32 6 54 32" stroke="#E24B4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M10 32 Q32 58 54 32" stroke="#378ADD" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M32 8 Q58 32 32 56" stroke="#639922" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M32 8 Q6 32 32 56" stroke="#EF9F27" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="32" r="6" fill="#7F77DD" />
      <circle cx="32" cy="32" r="3" fill="#ADA7F0" />
    </svg>
  );
}

export default FlowLinesLogo;
