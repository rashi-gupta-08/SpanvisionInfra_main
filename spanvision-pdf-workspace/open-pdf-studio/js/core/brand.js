import configuration from '../../../brand.json' with { type: 'json' };
export const BRAND = Object.freeze(configuration);
export const PREFERENCES_KEY = `${BRAND.packageName}.preferences`;
export function configuredUrl(value) { return typeof value === 'string' && /^https:\/\//.test(value) ? value : null; }
