/** A white SI monogram, built from structural lines. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={className} width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M27 7H10v13h14v13H7M33 7v26" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>;
}
