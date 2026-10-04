// apps/desktop/src/calc/modules/kalendering/ui/InputPanel.tsx
import type { KalenderingInput, KalenderingResult, KalenderingPaalSoort } from "../types";
import { VALBLOK_CATALOG, CUSTOM_VALBLOK_ID, computeEBlokKnm } from "../catalog";
import "./styles.css";

interface Props {
  input: KalenderingInput;
  result: KalenderingResult;
  onChange?: (next: KalenderingInput) => void;
}

export function InputPanel({ input, onChange }: Props) {
  const set = <K extends keyof KalenderingInput>(key: K, value: KalenderingInput[K]) => {
    if (!onChange) return;
    onChange({ ...input, [key]: value });
  };

  const isCustom = input.valblokId === CUSTOM_VALBLOK_ID;
  const customEBlok = computeEBlokKnm(input.customMassaKg, input.customValhoogteM);

  return (
    <div className="kalendering-input">
      <fieldset>
        <legend>Drop hammer</legend>
        <label>Selection
          <select
            value={input.valblokId}
            onChange={(e) => set("valblokId", e.target.value)}
          >
            {VALBLOK_CATALOG.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value={CUSTOM_VALBLOK_ID}>Custom — user values</option>
          </select>
        </label>
        {isCustom ? (
          <>
            <label>Mass [kg]
              <input
                type="number"
                step="1"
                min={0}
                value={input.customMassaKg}
                onChange={(e) => set("customMassaKg", +e.target.value)}
              />
            </label>
            <label>Drop height [m]
              <input
                type="number"
                step="0.05"
                min={0}
                value={input.customValhoogteM}
                onChange={(e) => set("customValhoogteM", +e.target.value)}
              />
            </label>
            <label>E_blok [kNm]
              <input
                type="number"
                className="kalendering-readonly"
                value={customEBlok.toFixed(2)}
                readOnly
              />
            </label>
            <p className="kalendering-hint">
              E = m · g · h = {input.customMassaKg} · 9,81 · {input.customValhoogteM} / 1000
            </p>
          </>
        ) : (
          <label>E_blok [kNm]
            <input
              type="number"
              className="kalendering-readonly"
              value={(
                VALBLOK_CATALOG.find((v) => v.id === input.valblokId)?.eBlokKnm ?? 0
              ).toFixed(2)}
              readOnly
            />
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Pile cross-section</legend>
        <div className="kalendering-radio-row">
          {(["rond", "rechthoekig"] as KalenderingPaalSoort[]).map((soort) => (
            <label key={soort}>
              <input
                type="radio"
                name="paalSoort"
                value={soort}
                checked={input.paalSoort === soort}
                onChange={() => set("paalSoort", soort)}
              />
              {soort === "rond" ? "Round" : "Rectangular"}
            </label>
          ))}
        </div>
        {input.paalSoort === "rond" ? (
          <label>Diameter [mm]
            <input
              type="number"
              step="1"
              min={0}
              value={input.diameterMm}
              onChange={(e) => set("diameterMm", +e.target.value)}
            />
          </label>
        ) : (
          <>
            <label>Side a [mm]
              <input
                type="number"
                step="1"
                min={0}
                value={input.diameterMm}
                onChange={(e) => set("diameterMm", +e.target.value)}
              />
            </label>
            <label>Side b [mm]
              <input
                type="number"
                step="1"
                min={0}
                value={input.zijdeBMm}
                onChange={(e) => set("zijdeBMm", +e.target.value)}
              />
            </label>
            <p className="kalendering-hint">
              D_eq = √(a · b) — geometric mean for a rectangular section.
            </p>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Soil reaction</legend>
        <label>q_c at pile tip [MPa]
          <input
            type="number"
            step="0.1"
            min={0}
            value={input.conusweerstandMpa}
            onChange={(e) => set("conusweerstandMpa", +e.target.value)}
          />
        </label>
        <p className="kalendering-hint">
          Cone resistance at pile tip level, read from the CPT chart. Future project calculations can obtain this value automatically from the foundation pile module.
        </p>
      </fieldset>

      <fieldset>
        <legend>Penetration per set</legend>
        <label>Penetration distance [mm]
          <input
            type="number"
            step="10"
            min={0}
            value={input.slagSetMm}
            onChange={(e) => set("slagSetMm", +e.target.value)}
          />
        </label>
        <p className="kalendering-hint">
          The default penetration distance is 400 mm (40 cm), as in the project template. The result gives the number of blows required to drive the pile this distance into the ground.
        </p>
      </fieldset>
    </div>
  );
}
