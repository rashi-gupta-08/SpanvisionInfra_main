import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCptStore } from "../../store/useCptStore";
import LocationMiniMap from "./LocationMiniMap";

const ROBERTSON_ZONES = [
  { number: 1, name: "Sensitive fine-grained",  color: "#00BCD4" },
  { number: 2, name: "Organic / peat",        color: "#795548" },
  { number: 3, name: "Clay",                    color: "#4CAF50" },
  { number: 4, name: "Silt mixtures",           color: "#8BC34A" },
  { number: 5, name: "Sand mixtures",           color: "#FFC107" },
  { number: 6, name: "Sand",                    color: "#FF9800" },
  { number: 7, name: "Coarse sand / gravel",       color: "#FF5722" },
  { number: 8, name: "Very stiff sand/clay",     color: "#F44336" },
  { number: 9, name: "Very stiff fine-grained", color: "#9C27B0" },
];

export default function RightPanel() {
  const { t } = useTranslation("cpt");
  const cptsMap = useCptStore((s) => s.cpts);
  const activeId = useCptStore((s) => s.activeCptId);
  const hiddenCptIds = useCptStore((s) => s.hiddenCptIds);
  const cpts = useMemo(
    () => Array.from(cptsMap.values()).filter((c) => !hiddenCptIds.has(c.id)),
    [cptsMap, hiddenCptIds],
  );

  return (
    <div className="right-panel-body">
      {(
        <section className="right-panel-section">
          <h3 className="right-panel-title">{t("location", "Locatie")}</h3>
          <LocationMiniMap cpts={cpts} activeId={activeId} />
        </section>
      )}
      <section className="right-panel-section">
        <h3 className="right-panel-title">{t("robertsonSbt", "Robertson SBT")}</h3>
        <ul className="sbt-legend">
          {ROBERTSON_ZONES.map((z) => (
            <li key={z.number}>
              <span className="sbt-swatch" style={{ background: z.color }} />
              <span className="sbt-num">{z.number}</span>
              <span className="sbt-name">{z.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
