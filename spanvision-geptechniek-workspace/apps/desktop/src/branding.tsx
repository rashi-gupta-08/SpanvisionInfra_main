import identity from '../brand.json';
export const BRAND = identity;
export function BrandMark({size = 32, onPaper = false}: {size?: number; onPaper?: boolean}) {
  return <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={BRAND.mark + ' — ' + BRAND.organization}>
    <rect x="1" y="1" width="62" height="62" rx="12" fill={onPaper ? '#FFFFFF' : '#000000'} stroke={onPaper ? '#202020' : '#FFFFFF'} strokeOpacity=".25" />
    <g fill="none" stroke={onPaper ? '#121212' : '#FFFFFF'} strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M26 22h-9l-5 5v11l5 5h9V32h-7" /><path d="m32 22 4 21 7-14 7 14 4-21" />
    </g>
  </svg>;
}
