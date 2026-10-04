import type { CalcModule } from "../types";

export function ComingSoonPanel({ module }: { module: CalcModule }) {
  return (
    <div className="calc-coming-soon">
      <div className="calc-coming-soon-icon">🔜</div>
      <h2>{module.name}</h2>
      <p className="calc-coming-soon-norm">{module.norm}</p>
      <p className="calc-coming-soon-desc">{module.subtitle}</p>
      <p className="calc-coming-soon-hint">
        This module is under development. It remains experimental until engineering verification is complete.
      </p>
    </div>
  );
}
