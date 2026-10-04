import brandManifest from '../../../brands/spanvision/brand.json';

export interface BrandConfig {
  id: string;
  organizationName: string;
  productName: string;
  ownershipLabel: string;
  description: string;
  version: string;
  bundleIdentifier: string;
  executableName: string;
  windowTitle: string;
  mark: string;
  theme: string;
}

export const brand = brandManifest satisfies BrandConfig;
