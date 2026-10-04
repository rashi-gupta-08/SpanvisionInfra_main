# Vision BIM Validator

**Spanvision Infra · Spanvision Mono**

A browser workspace for inspecting IFC/IFCx models, validating IFC information against IDS requirements, and coordinating findings through BCF. This is the edited application from the supplied archive, with the original ribbon and desktop panels preserved.

## Preview

The current production preview uses `http://127.0.0.1:8018/home`; the development preview uses port 5188. Open `/viewer` for the three-panel BIM workspace and `/validate` for the upload/scan workflow. `/login`, `/signup`, `/account`, and `/help` provide branded account entry and product guidance.

`preview/` contains desktop, tablet, and mobile screenshots, the responsive audit, and a real validation response. `ARCHITECTURE-SPANVISION.md` records the implementation architecture.

## Run from source

Requires Node.js 22 or later and Python 3.11/3.12. From the project directory:

```powershell
python -m pip install -e .
python -m pip install -r server/requirements.txt
cd viewer
npm ci
npm run build
cd ..
.\start-preview.ps1
```

Open `http://127.0.0.1:5188/home`. The script serves the built frontend and real validation API together on localhost.

For frontend development, run the API on port 8000 and `npm run dev -- --port 5188` in `viewer`. Set `VISION_API_TARGET` when using a different backend port.

## Branding and preferences

`viewer/src/config/brand.ts` defines the organization, product, version, and configurable links. `viewer/src/themes.css` defines the exact palette. `styles/brand.css` retains aliases for existing controls, and `styles/mono.css` handles contrast, accessibility, and responsive workspace behavior.

The default canvas is #1B1B1B. Settings → Appearance allows a saved custom canvas color. Existing model materials, validation highlights, section-axis colors, typography, animation timings, model caching, and project formats are retained. Retired theme IDs migrate to Spanvision Mono without deleting their original records. Existing language and canvas preferences are copied into the Spanvision namespace. The original application contained no business photography.

## Connect organization services

Copy `viewer/.env.example` to `viewer/.env.local` and configure only services that your organization owns. Rebuild after changing frontend environment variables.

- **SSO:** Set `VITE_OIDC_AUTHORITY` and `VITE_OIDC_CLIENT_ID` for the existing OIDC flow, or set `VITE_LOGIN_URL` for a deployment authentication gateway. Configure `VITE_LOGOUT_URL` and `VITE_ACCOUNT_URL` for proxy-managed sessions.
- **Registration:** Set `VITE_SIGNUP_URL` to your identity provider’s registration flow. Without it, the sign-up page directs users to request an organization invitation.
- **Feedback:** Set `VITE_FEEDBACK_API_URL` to your feedback service. No feedback is transmitted to the former operator.
- **BCF:** Use the existing platform connection controls with your BCF endpoint. `VITE_BCF_PLATFORM_URL` configures the legacy platform client if used.
- **Nextcloud:** The default tenant configuration is empty. Adapt `config/tenants.example.json`, set `TENANTS_CONFIG`, and provide `NC_SERVICE_PASS_SPANVISION` on the backend to enable your organization’s cloud storage.

Login and sign-up are real provider gateways; this project does not pretend to create accounts locally. Local model viewing and file exports remain available without an account. Clash detection is still the existing unavailable feature.

## Verification

```powershell
cd viewer
npm run build
npx vitest run src/utils/settingsStore.test.ts src/components/chrome/Modal.test.tsx --maxWorkers=1
```

The production build and seven new preference/accessibility tests pass. See `VERIFICATION.md` for browser checks and inherited test-suite limitations.

## Source and licensing

See `THIRD_PARTY_NOTICES.md` for the supplied source attribution and dependency licensing. Original source notices are preserved there; branding changes do not transfer ownership of upstream libraries.
