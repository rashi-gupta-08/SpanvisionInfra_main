# Open Vision Studio — white-label architecture

Organization: **Spanvision infra**. Product: **Open Vision Studio**.

## Scope and source inspection

The supplied archive is a React 19 + TypeScript + Vite web application with a Tauri desktop shell. Its existing surfaces are the welcome flow, ribbon, project workspace, task grid, Gantt/creative canvas, project wizard, settings, resource panels, menus and help. It contains no marketing landing page, scan/suggestions workflow, authentication, sign-up or account pages, and no business photography. Those features are not fabricated during a presentation-only rebrand.

## Architecture before implementation

1. A small `src/config/brand.ts` owns the organization, product, initials and asset paths. Visible chrome, browser title and exported document identity use this source. Translation values and build metadata mirror the public product name.
2. Add `spanvision-mono` to the existing theme registry, persistence migration map and pre-paint mirror. Fresh installations default to this theme. Retain the existing light/dark/high-contrast/system preferences and `ops-` storage keys so stored choices and document compatibility survive.
3. Use semantic CSS tokens for page `#000000`, panels/ribbon `#121212`, canvas/inputs `#1B1B1B`, elevated surfaces `#202020`, selected controls `#333333`, white primary buttons, `#EEEEEE` primary text and `#999999` supporting text. Border, hover and focus use white at 16%, 9% and 65%. No filters are applied to images or drawing data.
4. Introduce an optional `--theme-canvas-bg` token in the renderer palette, with the existing surface as fallback. Only Spanvision Mono supplies it; stored alternative themes and task/resource drawing colors continue to behave as before. Print output remains paper-friendly.
5. Preserve component structures, typography roles, transitions and shortcuts. Add scoped small-screen rules: horizontal ribbon scrolling, bounded dialogs, compact header, stacked settings and an accessible properties drawer. The task grid and timeline keep intentional local scrolling.
6. Replace the public favicon, app mark and desktop icons with a new white architectural SV monogram. Remove upstream promotional branding from product chrome and docs; preserve LGPL/GPL license texts, copyright/source attribution and third-party legal notices in a dedicated open-source notice.
7. Upstream release/feedback/catalogue services must not represent this fork. Make external integrations explicitly configurable; omit upstream update signing configuration until Spanvision infrastructure exists.

## Validation and preview

Run production build/typechecking, lint, i18n and relevant theme/browser checks. Inspect fresh onboarding, workspace, new-project dialog, settings, examples/help and command dropdowns at 390px, 768px and 1440px. Check page and modal overflow, palette values, text contrast, focus/hover/selected/disabled states, theme persistence and retained drawing colors. Save representative screenshots and a concise QA report. Deliver a local running preview and source archive, excluding dependencies and Git internals.
