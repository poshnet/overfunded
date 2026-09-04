/**
 * The Overfunded mark: a gauge whose arc climbs past the FULL notch at the top.
 * The gap is a real break in the arc rather than a background-coloured overlay,
 * so the mark sits correctly on any surface, and currentColor lets it inherit
 * whatever accent its brand context uses.
 */
export function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" strokeWidth="9" opacity="0.22" />
      <path d="M 28.35 52.68 A 21 21 0 0 1 29.08 11.20" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      <path d="M 34.92 11.20 A 21 21 0 0 1 45.50 15.91" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
