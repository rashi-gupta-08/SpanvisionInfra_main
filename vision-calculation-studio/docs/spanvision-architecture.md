# Spanvision Infra — Vision Calculation Studio

## Implementation architecture

1. **One workspace for web and desktop.** The web entry renders the existing React calculation application. Tauri integrations keep their browser fallbacks. The calculation engine, project model, document syntax, IFC file formats, typography, and ribbon animations remain intact.
2. **Brand identity.** Shared branding constants supply the organization, product name, version, default theme, and a new SI span monogram. Apply these to titles, About screens, file dialogs, report footers, IFC export metadata, favicons, and native application assets. Upstream dependency names and attribution belong in technical/legal documentation, not product identity.
3. **Spanvision Mono tokens.** Introduce a complete `spanvision-mono` theme mapping the existing component variables onto the requested palette. Page: `#000000`; panels/ribbon: `#121212`; inputs/drawing surface: `#1B1B1B`; dialogs/dropdowns: `#202020`; selection: `#333333`; primary controls: white with black text; text: `#EEEEEE` / `#999999`. Borders, hover, and focus use translucent white. Scope overrides to this theme so saved legacy theme choices continue to work.
4. **Preferences.** Preserve the existing Tauri preferences file and keys. Add persistent browser storage as a fallback, and apply the default theme before first paint. Preserve existing canvas settings; do not recolor engineering drawings, status semantics, maps, photographs, or printed paper.
5. **Responsive workspace.** Retain the desktop split-pane layout. At tablet/mobile widths, provide a collapsible project drawer. Tablet panes stack and remain resizable; phone users switch between full-height design/code and results panes. Ribbon commands scroll within their own region. Designer controls wrap using container queries, dialogs fit the viewport, and touch/keyboard users can reach controls and see focus.
6. **Verification and preview.** Build core, desktop frontend, and web frontend. Run the existing calculation regression checks. Inspect workspace, designer, editor, settings, theme suggestions/dropdowns, file menu, About, and report preview at desktop (1440px), tablet (768px), and mobile (390px). Verify overflow, theme persistence/cancel behavior, branding and export metadata. Provide a running local preview and a source archive.

## Source screen inventory

The supplied archive contains a calculation workspace, file menu, preferences/About dialogs, project details, visual calculation designers, editor, calculation preview, print preview, and IFC viewer. It has no standalone landing page, scan dialog, authentication/sign-up/account screens, or business photography. These are outside this rebranding implementation; no mock authentication flows are introduced.

## Attribution

Keep the upstream README and factual license/provenance notices in the source distribution. Branding changes do not transfer upstream authorship. The optional report engine retains its original dependency identity.
