# Third-party notices — Spanvision infra workspace edition

This customized edition is based on the supplied Open Geotechniek Studio archive. Original technical dependency names, data-schema keys and compatibility identifiers remain where required for interoperability. Spanvision infra branding does not change ownership of the upstream code.

## Source provenance
- Input: open-geotechniek-studio.zip supplied by the user.
- The input README states that the application code is MIT-licensed. The input About screen refers to CC BY-SA 4.0 content. The supplied archive contained no standalone application LICENSE file; these statements are recorded without inventing a replacement license.
- Original application attribution: OpenAEC Foundation and upstream contributors.
- Required engineering/report libraries: https://github.com/OpenAEC-Foundation/crates-warehouse at commit 6e8738c075719e2fc8fcf918d969406f98927b07. The upstream MIT license is reproduced verbatim in legal/crates-warehouse-MIT.txt.
- The warehouse changes in this edition concern presentation, report configuration and branding adapters; engineering classification, chart plotting and calculations retain the pinned source behavior.
- See vendor/PROVENANCE.md and vendor/PATCHES.patch for the local changes.

## Fonts
The bundled, unchanged Space Grotesk, Inter and JetBrains Mono font files retain their original authorship. The SIL Open Font License notices are included in legal/SpaceGrotesk-OFL.txt, legal/Inter-OFL.txt and legal/JetBrainsMono-OFL.txt and in the native tenant resources.
- Space Grotesk: https://github.com/floriankarsten/space-grotesk
- Inter: https://github.com/rsms/inter
- JetBrains Mono: https://github.com/JetBrains/JetBrainsMono

## Other dependencies
React, Tauri, Leaflet, Vite, Zustand, i18next, Rust crates and other dependencies retain their package names, lockfiles, licenses and copyright notices. Install dependencies from the committed lockfiles to obtain their license files. The source edition uses no hosted upstream feedback or account service.

## Branding changes
The organization, GW mark, product presentation, default UI palette, generated report covers/footers and new export creator metadata belong to the Spanvision workspace edition. Existing customer-uploaded logos and engineering graphics remain user content. The black/grayscale design direction references https://agenciy.framer.website/ without copying its template assets, text or photographs.
