/// <reference types="vite/client" />
export interface OidcConfig {
  enabled: boolean;
  authority: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  authorizationEndpoint: string;
}
let cached: OidcConfig | null = null;
export async function getOidcConfig(): Promise<OidcConfig> {
  if (cached) return cached;
  try {
    const response = await fetch('/api/auth/oidc/config');
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      cached = await response.json();
      return cached!;
    }
  } catch { /* Local workspace works without an identity provider. */ }
  const authority = import.meta.env.VITE_OIDC_AUTHORITY || '';
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || '';
  cached = {
    enabled: Boolean(authority && clientId), authority, clientId,
    redirectUri: import.meta.env.VITE_OIDC_REDIRECT_URI || window.location.origin + '/',
    scopes: import.meta.env.VITE_OIDC_SCOPES || 'openid profile email',
    authorizationEndpoint: '',
  };
  return cached;
}
export function isOidcPossiblyEnabled(): boolean {
  return cached?.enabled ?? Boolean(import.meta.env.VITE_OIDC_AUTHORITY && import.meta.env.VITE_OIDC_CLIENT_ID);
}
