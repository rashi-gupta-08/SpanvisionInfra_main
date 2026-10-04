import { BRAND } from '../brand';

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label={BRAND.organization} role="img">
      <rect width="32" height="32" rx="6" fill="#FFFFFF" />
      <text x="16" y="21" textAnchor="middle" fill="#000000" fontSize="14"
        fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="-1">{BRAND.initials}</text>
    </svg>
  );
}
