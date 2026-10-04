/** Shared identity and deployment-owned destinations. */
export const BRAND = {
  organization: 'Spanvision Infra',
  product: 'Vision BIM Validator',
  applicationId: 'vision-bim-validator',
  initials: 'SI',
  theme: 'Spanvision Mono',
  version: '1.0.0',
  home: '/home',
  help: '/help',
  website: import.meta.env.VITE_ORGANIZATION_URL || '/home',
  feedbackUrl: import.meta.env.VITE_FEEDBACK_API_URL || '',
  signupUrl: import.meta.env.VITE_SIGNUP_URL || '',
  loginUrl: import.meta.env.VITE_LOGIN_URL || '',
  logoutUrl: import.meta.env.VITE_LOGOUT_URL || '',
  accountUrl: import.meta.env.VITE_ACCOUNT_URL || '',
} as const;
