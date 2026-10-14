# Account verification: 14 October 2026

The live website is `https://www.spanvisioninfra.com`. The production account update is deployed as `dpl_BW1wHCu8YYL6a1mVK9quV7ABV129`.

## Results

- 47 account, authorization, billing, password-policy and provisioning tests pass.
- 2 isolated PostgreSQL tests pass, including migration replay, restricted database permissions and atomic plan/audit writes. These run against a local PGlite database, not production.
- 16 account-flow browser checks pass with controlled provider responses on desktop dark and mobile light layouts.
- 18 connection-recovery browser checks pass with controlled network failures on both layouts.
- 11 production checks pass: configured Neon sign-in, protected administration, apex-domain redirect, eight-character form policy, server password validation, actual administrator password login, automatic admin redirect, all-plan session and sign-out.
- 11 bridge prototype geometry/motion checks pass. The live landing page continues using its existing image cover; the stored Three.js prototype is not mounted by the current homepage.
- The hub production build passes. Browser reports recorded no uncaught JavaScript errors.

Sanitized browser reports and screenshots are in `results/`. These contain no passwords or session tokens. The operator's setup notes and private credentials stay outside this commit.

## Repeating checks

From the repository root, after installing dependencies:

```sh
npm ci
npm ci --prefix commerce
npm ci --prefix suite-hub
node --test commerce/server.test.mjs commerce/neon.test.mjs commerce/provision-admin.test.mjs suite-hub/test/bridge.test.mjs
npm --prefix suite-hub run build
node qa/neon-auth-2026-10-14/verify-browser.mjs
node qa/neon-auth-2026-10-14/verify-account-connection.mjs
```

Browser checks require Google Chrome, as selected by `channel: 'chrome'`. Set `NEON_QA_OUTPUT` to a writable local output directory; otherwise the scripts use the operator's configured Windows QA location. The controlled browser checks start and stop only their own local preview process.

The production script `verify-live-admin.mjs` requires the owner's protected local provisioning record. It signs in and signs out using that record without printing the password. It checks new-password field attributes and rejects a short password before account creation; it does not change the administrator's password or send password-reset emails. Do not add that private record to Git or attach it to test artifacts.

The SQL checks need a separate installed PGlite runtime. Set `PGLITE_MODULE` to its absolute `dist/index.js` path, then run:

```sh
node --wasm-num-compilation-tasks=1 --no-wasm-tier-up --test commerce/neon-schema.test.mjs
```

## Remaining production configuration

Administrator authentication is active. User listing and plan editing still require the production account schema and restricted, server-only database connection. The admin screen explains that requirement. Payment checkout remains disabled while prices are provisional. Real password recovery and payment-provider workflows require separate owner-initiated live acceptance checks.
