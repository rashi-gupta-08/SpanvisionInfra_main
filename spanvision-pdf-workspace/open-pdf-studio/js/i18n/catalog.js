// English captions retain the original catalog identifiers.
const labels = {
  "NL IFC Bouw": "NL IFC Construction",
  "NL Elektra": "NL Electrical",
  "NL Bouwplaats": "NL Construction site",
  "NL Sanitair": "NL Plumbing",
  "NL Keuken": "NL Kitchen",
  "NL NEN 1414 — Brandbeveiliging": "NL NEN 1414 — Fire protection",
  "NL NEN 1414 — Blussystemen": "NL NEN 1414 — Fire suppression",
  "NL NEN 1414 — Deuren": "NL NEN 1414 — Doors",
  "NL NEN 1414 — Noodverlichting": "NL NEN 1414 — Emergency lighting",
  "NL NEN 1414 — Rook/Warmteafvoer": "NL NEN 1414 — Smoke/heat exhaust",
  "NL NEN 1414 — Ventilatie": "NL NEN 1414 — Ventilation"
};
export function catalogLabel(value) { return Object.hasOwn(labels, value) ? labels[value] : value; }
