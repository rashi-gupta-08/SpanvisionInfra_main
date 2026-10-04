# @spanvision-infra/calc-workspace

[Calc workspace]() — open-source
construction cost estimating — as an embeddable React component and as a
library. The same code that runs in the desktop app and the
[online demo](), packaged so you can
put an estimate inside your own site or application.

- Interface in 39 languages, reports in your report language
- Reads and writes `.ifcCalc` (open JSON, IFC-linked), FIEBDC-3 `.bc3`
  (Spain), ÖNORM A 2063 `.onlv`/`.onlb` (Austria), CUF-XML, IBIS-TRAD, RSX,
  Excel/CSV and more
- Calculator, markups (staart), VAT high/low, subsheets, reports (HTML print)

Not included in the browser package: PDF via the Rust/Typst engine, native
file dialogs and the REST/MCP API — those need the desktop app.

## Install

```sh
npm install @spanvision-infra/calc-workspace react react-dom
```

## React component

```tsx
import { CalcWorkspace } from '@spanvision-infra/calc-workspace';
import '@spanvision-infra/calc-workspace/style.css';

export function EstimatePage() {
  return (
    <div style={{ height: 720 }}>
      <CalcWorkspace
        lang="en"
        theme="spanvision-mono"
        sample
        onChange={(project, json) => save(json)}
      />
    </div>
  );
}
```

The component fills its parent; give the parent a height. Props:

| Prop | Type | Description |
| --- | --- | --- |
| `theme` | `spanvision-mono` \| `light` \| `dark` \| `blue` \| `amber-navy` \| `warm-ember` \| `highContrast` \| `system` | Colour theme (default `spanvision-mono`). |
| `lang` | language code or `auto` | Interface language: `en`, `nl`, `de`, `es`, `fr`, … (39). |
| `project` | `string` \| `Blob` \| `ProjectFile` | An `.ifcCalc`/`.ocs` document to open; each new value opens a tab. |
| `fileName` | `string` | Tab name (defaults to the file name). |
| `sample` | `boolean` | Open the bundled sample estimate when nothing is loaded. |
| `onChange` | `(project, json) => void` | Called (debounced) after every change with the full project. |
| `onChangeDelay` | `number` | Debounce in ms (default 300). |
| `className`, `style` | | Applied to the wrapper. |

### Without React

```html
<div id="estimate" style="height: 720px"></div>
<script type="module">
  import { mount } from '@spanvision-infra/calc-workspace';
  import '@spanvision-infra/calc-workspace/style.css';
  const ocs = mount(document.getElementById('estimate'), { lang: 'de', sample: true });
  // later: ocs.update({ theme: 'dark' }); ocs.unmount();
</script>
```

`mount` still uses React under the hood (it is a peer dependency); your
bundler resolves it.

## Library without UI

Everything the app uses to read, write and calculate is exported:

```ts
import {
  importBc3File, importOnlvFile, importCuf,
  buildBc3Bytes, buildOnlv,
  recalculateItems, getKostprijs, getStaartBreakdown,
  serializeProject, deserializeProject,
  type ProjectFile, type CostItem,
} from '@spanvision-infra/calc-workspace';

const result = importBc3File(await file.arrayBuffer());   // FIEBDC-3
const items = recalculateItems(result.items);
console.log(getKostprijs(items), result.warnings);
```

To open an import result in a mounted component: `openImportResult(result, 'name')`;
to read the current document: `getProjectJson()`; the Zustand store itself is
available as `useOpenCalcStore` for advanced use.

## How it fits in a page

- All CSS is scoped under `.ocs-embed`; nothing is applied to `html`,
  `body` or your own classes. Dialogs are rendered under `<body>` inside
  their own `.ocs-embed` wrapper.
- Keyboard shortcuts (Ctrl+Z, Ctrl+F, Delete, …) only react when the focus
  is inside the component.
- Theme, language and text direction are set on the wrapper, not on `<html>`.
- Fonts are not bundled. Load Inter yourself (e.g. Google Fonts) for the
  same look as the app; otherwise the system UI font is used.
- Settings (theme, language, zoom) persist in `localStorage` of your origin.
- One instance per page: the component uses a single global store.
- Full-screen overlays (file menu, dialogs) are `position: fixed` and cover
  the viewport, like a modal.

## Versions

The package version follows the app: `0.13.x` of the package is built from
the same source as Calc workspace v0.13.x. Every GitHub release ships the
package as `spanvision-infra-calc-workspace-<version>.tgz` as well.

## Licence

MIT — see the repository.

## Compatibility and notices

`OpenCalcStudio` and `OpenCalcStudioProps` remain aliases for compatibility. New integrations should use `CalcWorkspace` and `CalcWorkspaceProps`. Existing technical schema and storage identifiers are retained. Source attributions are in `NOTICE.md`; inherited cloud and catalog endpoints are disabled in this edition.
