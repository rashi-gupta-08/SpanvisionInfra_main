# FEM Vision Studio — Spanvision Infra

## Implementation plan

1. **Brand layer:** A shared `src/brand.ts` owns the organization, product name,
   initials and tagline. Replace visible marks in the title bar, file menu,
   About dialog, translated labels, browser metadata and generated reports.
   Keep dependency identifiers and original license/attribution documents intact.
2. **Theme layer:** Add `spanvision-mono.css` after existing styles. Map the
   existing semantic token families onto the supplied grayscale palette so
   ribbons, panels, dialogs, inputs, search suggestions and menus stay consistent.
   Keep the original typography, dimensions, transitions and engineering colors.
3. **Preference layer:** Centralize theme initialization, updates and subscription
   in `src/lib/theme.ts`. Use the existing storage key, migrate legacy dark values
   to Spanvision Mono, and retain the saved light option. Canvas tokens remain
   separate from UI tokens to preserve drawing and result colors.
4. **Responsive shell:** Keep the desktop arrangement. At tablet/phone widths,
   collapse dock panels by default, allow local ribbon scrolling, and open panels
   as overlays. Constrain dialogs, search and menus to the viewport; keep keyboard
   focus visible and controls reachable without page-level horizontal overflow.
5. **Verification and preview:** Run TypeScript and the production build. Inspect
   the actual editor, file menu, preferences, About, command suggestions, material
   and project dialogs at desktop (1440px), tablet (768px), and phone (390px).
   Check theme persistence, canvas colors, focus, hover, selection and report brand.

## Existing application boundaries

This archive contains an engineering workspace, not a marketing/account product.
There is no landing page, scan dialog, login, sign-up, account screen or business
photography to restyle. The implementation applies to the existing working app;
it does not add simulated authentication or a nonfunctional scan workflow.

## Ownership and licensing

This is a branded adaptation of the supplied open-source project. Original
copyright and license notices remain in the source distribution and attribution
file. Spanvision branding identifies this adaptation, not authorship of the
upstream solver. No changes are planned to FEM calculations or file formats.
