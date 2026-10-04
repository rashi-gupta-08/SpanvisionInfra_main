/** Publieke identiteit van de Spanvision-editie; opslag- en IFC-sleutels blijven compatibel. */
export const STUDIO_BRAND = {
  organization: 'Spanvision Infra',
  product: 'Open Vision Studio',
  initials: 'SV',
  mark: '/brand/spanvision-mark.svg',
  defaultTheme: 'spanvision-mono',
} as const;

/** Externe diensten worden pas actief zodra de eigenaar zijn eigen endpoints configureert. */
export const BRAND_SERVICES = {
  githubRepository: import.meta.env?.VITE_SPANVISION_GITHUB_REPO?.trim() ?? '',
  extensionCatalog: import.meta.env?.VITE_SPANVISION_EXTENSION_CATALOG?.trim() ?? '',
  publicBaseUrl: import.meta.env?.VITE_SPANVISION_PUBLIC_URL?.replace(/\/$/, '') ?? '',
  updatesEnabled: import.meta.env?.VITE_SPANVISION_UPDATES_ENABLED === 'true',
} as const;
