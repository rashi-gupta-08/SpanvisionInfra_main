/** Optional organization services. The browser edition works without them. */
export const ORGANIZATION_SERVICES = {
  extensionCatalog: import.meta.env.VITE_SPANVISION_EXTENSION_CATALOG_URL || null,
  feedback: import.meta.env.VITE_SPANVISION_FEEDBACK_URL || null,
} as const;
