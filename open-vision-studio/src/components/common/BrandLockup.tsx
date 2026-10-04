import { STUDIO_BRAND } from '@/config/brand';

/** Merknamen zijn eigennamen; alle werkstroomteksten blijven via i18n lopen. */
export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`studio-brand${compact ? ' studio-brand--compact' : ''}`}>
      <img src={STUDIO_BRAND.mark} alt="" aria-hidden="true" />
      <div className="studio-brand-copy">
        <span className="studio-brand-organization">{STUDIO_BRAND.organization}</span>
        {!compact && <span className="studio-brand-product">{STUDIO_BRAND.product}</span>}
      </div>
    </div>
  );
}
