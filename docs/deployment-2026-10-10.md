# Spanvision Infra release — 10 October 2026

Release branch: **`version/V.1.0`**. Source repository: [SpanvisionInfra_main](https://github.com/spanvisioninfra-bot/SpanvisionInfra_main), with the same branch mirrored to [rashi-gupta-08's repository](https://github.com/rashi-gupta-08/SpanvisionInfra_main).

## Changes included

- Company logo in the site's dark/light palette, renamed tool labels, new tool icons and social footer links.
- Animated architecture drawing, replacing the globe; reduced-motion support remains available.
- A themed splash opens the chosen workspace directly. CAD, 2D CAD and Planner preserve recovery while skipping their introductory landing/welcome step on suite launch.
- Existing website opens Home first, with Pricing, FAQ, sign-in, sign-up, verification, recovery and account screens above the toolkit.
- Server-side account and hosted billing integrations, signed webhook handling and encrypted HttpOnly sessions.
- Protected user/plan dashboard for `spanvisioninfra.admin@gmail.com`, with verified identity/UUID binding and atomic PostgreSQL audit records.
- Render blueprint now matches the existing `version/V.1.0` service branch and includes shared browser assets in BIM/STL build filters.

## Deployment plan and status

The source commit and cloud refresh are being recorded with this release. Final deployment IDs, commit hashes, timestamps and live-check results will be added after completion.

| Application | Hosting |
| --- | --- |
| Main site, account/admin APIs | Existing `spanvision-infra` project on Vercel |
| CAD, 2D CAD, PDF, IFC, Calc, Planner, FEM frontend, Frame, Calculation, Geotech, Speech, Field, Pointcloud, Pile | Their existing Vercel projects |
| `spanvision-fem-engine` | Existing free Render service, Singapore |
| `spanvision-bim` | Existing free Render service, Singapore |
| `spanvision-stl` | Existing free Render service, Singapore |

Vercel uses explicit prebuilt application uploads; pushing Git alone does not rebuild those independent projects. Render builds the specified release commit from the canonical repository. No new hosting plan, database or payment account is created by this release. Render's temporary workspaces can reset during redeployment; downloaded project/results files remain the durable copy.

## Verification

- All **31** account/billing/admin and production URL-resolution tests passed on 10 October.
- The SQL migration/admin permission/atomic rollback test previously passed against isolated PGlite/PostgreSQL, as described in the [account guide](../commerce/README.md).
- Home and admin browser checks passed locally and on the live site in dark/light and mobile layouts. Authenticated provider paths use explicit mocks.
- All 16 themed workspace launches passed the 9 October live browser check. Planner's full required verification passed, including 333 browser tests; its compressed log accompanies this release.
- CAD's retained JavaScript/WASM engine was hash-checked against production; this release changes its browser loader and does not rebuild the unchanged Rust engine.

These checks cover the recorded flows and deployment behavior. They do not certify every button, engineering calculation or Windows installer as production ready. See [production readiness](production-readiness.md) for remaining application acceptance work.

## Setup still required

**Online accounts, actual admin activation and paid subscriptions are not active.** No Supabase project exists yet, and auth/payment credentials and approved prices are absent. The 16 anonymous workspaces remain accessible.

Create/configure Supabase, apply `commerce/schema.sql`, enable verified email/SMTP, register and verify the designated admin email, pin `SUPER_ADMIN_USER_ID`, and test real account recovery and authorization before activation. Finalize prices and provider plans, configure signed webhooks and complete genuine provider sandbox checks before enabling checkout. See [the activation guide](../commerce/README.md).

The local sample admin server at port 4232 is QA only. Its mock session, users and grants are excluded from production deployment packages.
