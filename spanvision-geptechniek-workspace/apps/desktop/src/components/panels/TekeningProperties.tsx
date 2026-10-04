import { useEffect, useState } from "react";
import "./TekeningProperties.css";

/**
 * Right-panel Properties view for the Sonderingstekening tab.
 *
 * Communicates with SonderingstekeningView via window events instead of
 * a shared store — keeps the existing complex Leaflet state local to
 * the view, while the Properties panel stays a thin form that mirrors
 * whatever the view exposes.
 *
 * Event protocol:
 *   - This panel emits `ogs:tekening-request-snapshot` on mount.
 *   - SonderingstekeningView replies (and re-emits on any change) with
 *     `ogs:tekening-state-snapshot` carrying { titleBlock, selection,
 *     selectedRaster, selectedMarker } as detail.
 *   - User edits in this panel emit either
 *     `ogs:tekening-set-titleblock` { field, value } or
 *     `ogs:tekening-update-selected-raster` { patch }, which the view
 *     listens for and applies to its local state.
 */

interface TitleBlockData {
  project: string;
  projectNumber: string;
  address: string;
  drawingNumber: string;
  scale: string;
  date: string;
  drawnBy: string;
  checkedBy: string;
  version: string;
}

interface RasterSnapshot {
  id: string;
  rows: number;
  cols: number;
  spacingX: number;
  spacingY: number;
  rotation: number;
  /** Kleefmeting-streepje onder elke rastercel (NEN-symbool). */
  kleefmeting?: boolean;
  /** Verberg dit raster in de PDF-/DWG-export (blijft wél op scherm). */
  hideInExport?: boolean;
  /** Nummering-prefix voor de cellen (bv. "S" → S1, S2, …). */
  labelPrefix?: string;
  /** Startnummer voor de celnummering (default 1). */
  labelStart?: number;
}

interface OverlaySnapshot {
  id: string;
  name: string;
  widthMeters: number;
  /** True = overlay krijgt z-index 250 (boven lijnen/markers).
   *  False/undefined = default z-index 1 (achtergrond, klik valt door
   *  op leeg deel naar lijnen/markers). */
  foreground?: boolean;
}

interface Snapshot {
  titleBlock: TitleBlockData;
  paperSize: "A2" | "A3";
  /** Doel-schaal (gekozen preset of door gebruiker getypte custom
   *  waarde). Vroeger een vaste union (500|1000|2000|5000), nu een
   *  willekeurig positief getal zodat het titleblock een eigen
   *  schaal kan zetten. */
  scale: number;
  /** Werkelijke schaal afgeleid uit de huidige Leaflet zoom — verandert
   *  live als de gebruiker met het muiswiel in- of uitzoomt. */
  liveScale?: number;
  frozen?: boolean;
  selectionKind: "raster" | "marker" | "overlay" | "line" | "vlak" | "note" | null;
  selectionId: string | null;
  selectedRaster?: RasterSnapshot | null;
  selectedMarker?: { id: string; kleefmeting: boolean } | null;
  selectedVlak?: { id: string; fillColor: string; strokeColor: string } | null;
  selectedNote?: { id: string; text: string } | null;
  selectedOverlay?: OverlaySnapshot | null;
  /** Properties van de geselecteerde lijn — id + huidige override-
   *  kleur (undefined = kind-default). De kleur-picker in dit paneel
   *  dispatcht `ogs:tekening-set-line-color` om hem te wijzigen. */
  selectedLine?: { id: string; kind: "line" | "dimension"; color?: string } | null;
}

const TB_FIELDS: { key: keyof TitleBlockData; label: string }[] = [
  { key: "project",       label: "Project" },
  { key: "projectNumber", label: "Project no." },
  { key: "address",       label: "Endpoint" },
  { key: "drawingNumber", label: "Drawing no." },
  { key: "scale",         label: "Scale" },
  { key: "date",          label: "Date" },
  { key: "drawnBy",       label: "Drawn" },
  { key: "checkedBy",     label: "Checked" },
  { key: "version",       label: "Version" },
];

export default function TekeningProperties() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  // Subscribe to state snapshots from SonderingstekeningView.
  useEffect(() => {
    const onSnap = (e: Event) => {
      const ce = e as CustomEvent<Snapshot>;
      setSnap(ce.detail);
    };
    window.addEventListener("ogs:tekening-state-snapshot", onSnap as EventListener);
    // Ask the view to publish its current state now that we're listening.
    window.dispatchEvent(new CustomEvent("ogs:tekening-request-snapshot"));
    return () =>
      window.removeEventListener("ogs:tekening-state-snapshot", onSnap as EventListener);
  }, []);

  const setTb = (field: keyof TitleBlockData, value: string) => {
    window.dispatchEvent(
      new CustomEvent("ogs:tekening-set-titleblock", {
        detail: { field, value },
      }),
    );
  };

  const updateRaster = (patch: Partial<RasterSnapshot>) => {
    window.dispatchEvent(
      new CustomEvent("ogs:tekening-update-selected-raster", {
        detail: { patch },
      }),
    );
  };

  const deleteSelection = () => {
    window.dispatchEvent(new CustomEvent("ogs:tekening-delete"));
  };

  if (!snap) {
    return (
      <div className="tekprops">
        <p className="tekprops-empty">Loading properties…</p>
      </div>
    );
  }

  return (
    <div className="tekprops">
      {/* ── Paper + scale (moved from view topbar) ───────────── */}
      <section className="tekprops-section">
        <header className="tekprops-section-header">
          <span>Paper &amp; scale</span>
        </header>
        <div className="tekprops-body">
          <label className="tekprops-field tekprops-field-wide">
            <span>Paper</span>
            <select
              value={snap.paperSize}
              onChange={(e) =>
                window.dispatchEvent(
                  new CustomEvent("ogs:tekening-set-papersize", {
                    detail: { paperSize: e.target.value as "A2" | "A3" },
                  }),
                )
              }
            >
              <option value="A2">A2 landscape</option>
              <option value="A3">A3 landscape</option>
            </select>
          </label>
          {/* Schaal als getal-input — geen dropdown meer. Typ "850" of
              "1000" en klik buiten / Enter; de tekening zoomt direct
              naar 1:dat-getal. Voorgevuld met de live-berekende schaal
              zodat je ziet wat er nu op het papier staat. */}
          <ScaleNumberField
            scale={snap.scale}
            liveScale={snap.liveScale}
          />
          {/* Snel-presets voor de gangbare bouwkundige drukschalen.
              Klik op een chip = exacte 1:N (zelfde event als de
              getypte waarde). Active-state op chip die matcht de
              huidige requested scale (snap.scale, niet liveScale —
              anders flikkert het bij zoom-correcties). */}
          <div className="tekprops-scale-presets" role="group" aria-label={"Scale presets"}>
            {[500, 1000, 2000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`tekprops-scale-chip${snap.scale === preset ? " active" : ""}`}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-set-scale", {
                      detail: { scale: preset },
                    }),
                  )
                }
                title={`Set scale to 1:${preset}`}
              >
                1:{preset}
              </button>
            ))}
          </div>
          {/* Freeze viewport — checkbox-vorm in het paneel. De ribbon-
              knop blijft ook bestaan; ze schrijven naar dezelfde state
              via `ogs:tekening-toggle-freeze`. */}
          <label className="tekprops-field tekprops-field-wide">
            <span>Freeze viewport</span>
            <input
              type="checkbox"
              checked={!!snap.frozen}
              onChange={() =>
                window.dispatchEvent(
                  new CustomEvent("ogs:tekening-toggle-freeze"),
                )
              }
              title="Lock pan and zoom to keep the drawing fixed"
            />
          </label>
        </div>
      </section>

      {/* ── Selected object ─────────────────────────────────── */}
      <section className="tekprops-section">
        <header className="tekprops-section-header">
          {snap.selectionKind === "raster" && snap.selectedRaster && (
            <span>Grid {snap.selectedRaster.id}</span>
          )}
          {snap.selectionKind === "marker" && snap.selectionId && (
            <span>CPT {snap.selectionId}</span>
          )}
          {snap.selectionKind === "overlay" && snap.selectedOverlay && (
            <span>Background</span>
          )}
          {!snap.selectionKind && <span>No selection</span>}
        </header>

        {snap.selectionKind === "raster" && snap.selectedRaster && (
          <div className="tekprops-body">
            <div className="tekprops-row">
              <label className="tekprops-field">
                <span>Rows</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={snap.selectedRaster.rows}
                  onChange={(e) =>
                    updateRaster({
                      rows: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>
              <label className="tekprops-field">
                <span>Columns</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={snap.selectedRaster.cols}
                  onChange={(e) =>
                    updateRaster({
                      cols: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>
            </div>
            <div className="tekprops-row">
              <label className="tekprops-field">
                <span>H.o.h. X (m)</span>
                <input
                  type="number"
                  min={0.5}
                  max={500}
                  step={0.5}
                  value={Number(snap.selectedRaster.spacingX.toFixed(2))}
                  onChange={(e) =>
                    updateRaster({
                      spacingX: Math.max(0.5, Number(e.target.value) || 0.5),
                    })
                  }
                />
              </label>
              <label className="tekprops-field">
                <span>H.o.h. Y (m)</span>
                <input
                  type="number"
                  min={0.5}
                  max={500}
                  step={0.5}
                  value={Number(snap.selectedRaster.spacingY.toFixed(2))}
                  onChange={(e) =>
                    updateRaster({
                      spacingY: Math.max(0.5, Number(e.target.value) || 0.5),
                    })
                  }
                />
              </label>
            </div>
            <label className="tekprops-field tekprops-field-wide">
              <span>Rotation (°)</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={Math.round(snap.selectedRaster.rotation)}
                onChange={(e) =>
                  updateRaster({ rotation: Number(e.target.value) })
                }
              />
              <span className="tekprops-num-val">
                {`${Math.round(snap.selectedRaster.rotation)}°`}
              </span>
            </label>
            <div className="tekprops-row">
              <label className="tekprops-field">
                <span>Numbering</span>
                <input
                  type="text"
                  value={snap.selectedRaster.labelPrefix ?? ""}
                  placeholder={"e.g. S"}
                  title="Cell numbering prefix, e.g. S gives S1, S2, … Leave empty for R01-S01 notation."
                  onChange={(e) =>
                    updateRaster({ labelPrefix: e.target.value })
                  }
                />
              </label>
              <label className="tekprops-field">
                <span>Start no.</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={snap.selectedRaster.labelStart ?? 1}
                  onChange={(e) =>
                    updateRaster({
                      labelStart: Math.max(0, Math.min(999, Number(e.target.value) || 0)),
                    })
                  }
                />
              </label>
            </div>
            <label className="tekprops-field tekprops-field-wide tekprops-checkbox">
              <input
                type="checkbox"
                checked={!!snap.selectedRaster.kleefmeting}
                onChange={(e) => updateRaster({ kleefmeting: e.target.checked })}
              />
              <span>Sleeve friction (line below symbol)</span>
            </label>
            <label className="tekprops-field tekprops-field-wide tekprops-checkbox">
              <input
                type="checkbox"
                checked={!!snap.selectedRaster.hideInExport}
                onChange={(e) => updateRaster({ hideInExport: e.target.checked })}
              />
              <span>Hide grid in PDF/DWG export</span>
            </label>
            <button
              type="button"
              className="tekprops-btn tekprops-btn-danger"
              onClick={deleteSelection}
            >
              Delete grid
            </button>
          </div>
        )}

        {snap.selectionKind === "marker" && snap.selectionId && (
          <div className="tekprops-body">
            <label className="tekprops-field tekprops-field-wide">
              <span>CPT no.</span>
              <input
                type="text"
                value={snap.selectionId}
                onChange={(e) => {
                  const newId = e.target.value.trim();
                  if (!newId) return;
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-set-placed-id", {
                      detail: { oldId: snap.selectionId!, newId },
                    }),
                  );
                }}
              />
            </label>
            <label className="tekprops-field tekprops-field-wide">
              <span>Sleeve friction measurement</span>
              <input
                type="checkbox"
                checked={!!snap.selectedMarker?.kleefmeting}
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-set-kleefmeting", {
                      detail: {
                        id: snap.selectionId!,
                        kleefmeting: e.target.checked,
                      },
                    }),
                  )
                }
              />
            </label>
            <p className="tekprops-hint">
              Drag the map marker to move it.
            </p>
            <button
              type="button"
              className="tekprops-btn tekprops-btn-danger"
              onClick={deleteSelection}
            >
              Delete CPT
            </button>
          </div>
        )}

        {snap.selectionKind === "line" && snap.selectedLine && (
          <div className="tekprops-body">
            <p className="tekprops-hint">
              {snap.selectedLine.kind === "dimension" ? "Dimension" : "Line"} {snap.selectedLine.id}
            </p>
            <label className="tekprops-field tekprops-field-wide">
              <span>Color</span>
              <input
                type="color"
                value={
                  snap.selectedLine.color ??
                  (snap.selectedLine.kind === "dimension" ? "#d97706" : "#36363e")
                }
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-set-line-color", {
                      detail: { id: snap.selectionId!, color: e.target.value },
                    }),
                  )
                }
              />
            </label>
            {snap.selectedLine.color && (
              <button
                type="button"
                className="tekprops-btn"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-set-line-color", {
                      detail: { id: snap.selectionId!, color: null },
                    }),
                  )
                }
              >
                Reset to defaults
              </button>
            )}
            <button
              type="button"
              className="tekprops-btn tekprops-btn-danger"
              onClick={deleteSelection}
            >
              Delete line
            </button>
          </div>
        )}

        {snap.selectionKind === "vlak" && snap.selectedVlak && (
          <div className="tekprops-body">
            <p className="tekprops-hint">Area {snap.selectedVlak.id}</p>
            <label className="tekprops-field tekprops-field-wide">
              <span>Fill Color</span>
              <input
                type="color"
                value={snap.selectedVlak.fillColor}
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-update-vlak", {
                      detail: { id: snap.selectionId!, patch: { fillColor: e.target.value } },
                    }),
                  )
                }
              />
            </label>
            <label className="tekprops-field tekprops-field-wide">
              <span>Border color</span>
              <input
                type="color"
                value={snap.selectedVlak.strokeColor}
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-update-vlak", {
                      detail: { id: snap.selectionId!, patch: { strokeColor: e.target.value } },
                    }),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="tekprops-btn tekprops-btn-danger"
              onClick={deleteSelection}
            >
              Delete area
            </button>
          </div>
        )}

        {snap.selectionKind === "note" && snap.selectedNote && (
          <div className="tekprops-body">
            <p className="tekprops-hint">Note {snap.selectedNote.id}</p>
            <label className="tekprops-field tekprops-field-wide">
              <span>Text</span>
              <textarea
                rows={3}
                value={snap.selectedNote.text}
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-update-note", {
                      detail: { id: snap.selectionId!, text: e.target.value },
                    }),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="tekprops-btn tekprops-btn-danger"
              onClick={deleteSelection}
            >
              Delete comment
            </button>
          </div>
        )}

        {snap.selectionKind === "overlay" && snap.selectedOverlay && (
          <div className="tekprops-body">
            <p className="tekprops-hint">
              {snap.selectedOverlay.name}
            </p>
            <label className="tekprops-field tekprops-field-wide">
              <span>Width (m)</span>
              <input
                type="number"
                min={1}
                max={5000}
                step={1}
                value={Math.round(snap.selectedOverlay.widthMeters)}
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-update-selected-overlay", {
                      detail: { widthMeters: Number(e.target.value) || 1 },
                    }),
                  )
                }
              />
            </label>
            <label className="tekprops-field tekprops-field-wide">
              <span>Low</span>
              <select
                value={snap.selectedOverlay.foreground ? "foreground" : "background"}
                onChange={(e) =>
                  window.dispatchEvent(
                    new CustomEvent("ogs:tekening-set-overlay-layer", {
                      detail: { foreground: e.target.value === "foreground" },
                    }),
                  )
                }
              >
                <option value="background">Background (below lines and markers)</option>
                <option value="foreground">Foreground (above all objects)</option>
              </select>
            </label>
            <p className="tekprops-hint">
              Tip: press <kbd>M</kbd> or <kbd>G</kbd> to move (follows the cursor; click to place, Esc to cancel). Drag a corner handle to resize.
            </p>
            <button
              type="button"
              className="tekprops-btn tekprops-btn-danger"
              onClick={deleteSelection}
            >
              Remove background
            </button>
          </div>
        )}

        {!snap.selectionKind && (
          <div className="tekprops-body">
            <p className="tekprops-hint">
              Click a CPT, grid or object on the drawing to edit its properties.
            </p>
          </div>
        )}
      </section>

      {/* ── Tekeningkader / titleblock ──────────────────────── */}
      <section className="tekprops-section">
        <header className="tekprops-section-header">
          <span>Drawing border</span>
        </header>
        <div className="tekprops-body">
          {TB_FIELDS.map(({ key, label }) => (
            <label key={key} className="tekprops-field tekprops-field-wide">
              <span>{label}</span>
              <input
                type="text"
                value={snap.titleBlock[key] ?? ""}
                onChange={(e) => setTb(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Schaal-veld in TekeningProperties — een tekstinput met de live
 * waarde als placeholder. De gebruiker typt een geheel getal (of
 * "1:N") en bevestigt met Enter of blur; dat dispatcht
 * `ogs:tekening-set-scale` met de nieuwe schaal, waarop de view
 * de Leaflet-zoom naar die exacte 1:N stelt.
 */
function ScaleNumberField({
  scale,
  liveScale,
}: {
  scale: number;
  liveScale?: number;
}) {
  // Live schaal wint zolang de gebruiker niet aan het typen is.
  // Snap naar de gevraagde scale wanneer liveScale binnen ±2 zit —
  // anders krijgt de gebruiker 1:498 te zien terwijl ze 1:500 typten
  // (de iteratieve scale-setter convergeert binnen 0.1% maar één
  // pixel-rounding kan nog steeds ±1-2 opleveren in de read-out).
  // Bij grotere drift (b.v. wanneer de gebruiker zelf met het
  // muiswiel zoomt) verschijnt wel de echte live-waarde.
  const displayed =
    liveScale != null && Math.abs(liveScale - scale) <= 2
      ? scale
      : (liveScale ?? scale);
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(displayed);

  const commit = () => {
    if (draft === null) return;
    const m = draft.match(/(\d+)\s*$/);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (Number.isFinite(n) && n >= 50 && n <= 100000) {
      window.dispatchEvent(
        new CustomEvent("ogs:tekening-set-scale", { detail: { scale: n } }),
      );
    }
    setDraft(null);
  };

  return (
    <label
      className="tekprops-field tekprops-field-wide"
      title="Enter a scale (e.g. 1000 for 1:1000) and press Enter to update the drawing"
    >
      <span>Scale 1:</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          if (draft === null) setDraft(String(displayed));
          e.currentTarget.select();
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
