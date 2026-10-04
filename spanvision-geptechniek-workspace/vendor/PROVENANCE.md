# Engineering library provenance

Source: https://github.com/OpenAEC-Foundation/crates-warehouse

Pinned revision: `6e8738c075719e2fc8fcf918d969406f98927b07`.

The distribution includes the required cpt-core, openaec-core, openaec-layout and openaec-engine workspace members and their original license. The desktop dependency lockfile is preserved. `PATCHES.patch` records tracked changes against that revision. The added brand.json and cpt-core/src/spanvision_identity.rs are identity adapters generated or consumed by the Spanvision suite.

Local changes replace promotional report identity and export presentation, add a configured in-memory report entrypoint, map generic report font aliases to the existing Inter files, and retain the source library names for dependency compatibility. Chart colors, soil classification, parsers, geometry, measurements and calculations retain the pinned implementations. Existing IFC/GIS compatibility property names remain.

Report presentation repairs fit long single-CPT cover titles, separate cover metadata from the title, omit headings for unnamed chart sections and honor existing section page-break flags. These changes do not alter engineering data or calculations.

The desktop Cargo.lock changes only the root application package name. Original library versions and dependency resolution remain locked. Attribution is retained in ../THIRD_PARTY_NOTICES.md and the original warehouse LICENSE.
