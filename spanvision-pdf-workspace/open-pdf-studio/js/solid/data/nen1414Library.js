// NEN 1414 Symbol Library — Dutch standard for safety symbols on technical drawings
// PNG assets bundled in /assets/nen1414/ (converted TIF→PNG)
// Categories by prefix: Tb=Brandbeveiliging, Td=Deuren, Tn=Noodverlichting, Tr=Rook/warmteafvoer, Tv=Ventilatie, Tw=Water/sprinkler

// Import all PNG assets via Vite glob
const pngModules = import.meta.glob('/assets/nen1414/*.png', { eager: true, query: '?url', import: 'default' });

function getAssetUrl(id) {
  const key = `/assets/nen1414/${id}.png`;
  return pngModules[key] || '';
}

// Helper: wrap a raster image URL in an SVG <image> tag for stamp tool compatibility
// Uses absolute URL so it works when the SVG is loaded from a blob: context
function rasterSvg(id) {
  const url = getAssetUrl(id);
  if (!url) return '';
  // Vite inlines PNGs <4KB as data: URIs; larger ones become /assets/*.png paths.
  // blob: context can't resolve relative paths, so only prepend origin for root-relative URLs.
  const absoluteUrl = url.startsWith('/') ? window.location.origin + url : url;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><image href="${absoluteUrl}" width="64" height="64"/></svg>`;
}

// Human-readable names for NEN 1414 symbols
const NAMES = {
  'Tb0.003': "Fire protection installation",
  'Tb01': "Fire alarm control panel (BMC)",
  'Tb02': "Fire alarm component",
  'Tb04': "Fire service entrance",
  'Tb05': "Fire service panel",
  'Tb1.001': "Automatic detector",
  'Tb1.002': "Heat detector",
  'Tb1.003': "Smoke detector",
  'Tb1.004': "Flame detector",
  'Tb1.004a': "Flame detector (alternative)",
  'Tb1.005': "Beam detector",
  'Tb1.006': "Aspirating smoke detection",
  'Tb1.007': "Gas detector",
  'Tb1.008': "Multisensor detector",
  'Tb1.009': "Manual call point",
  'Tb2.001': "Visual alarm (strobe)",
  'Tb2.002': "Audible alarm (siren)",
  'Tb2.003': "Visual and audible alarm",
  'Tb2.004': "Voice alarm system",
  'Tb2.005': "Voice message",
  'Tb2.021': "Door/window contact",
  'Tb2.022': "Holding magnet",
  'Tb2.023': "Door closer",
  'Tb2.041': "Fire damper",
  'Tb2.042': "Pressure relief damper",
  'Tb2.043': "Smoke damper",
  'Tb4.001': "Fire hose reel",
  'Tb4.002': "Dry riser",
  'Tb4.003': "Wet riser",
  'Tb4.021': "Sprinkler system",
  'Tb4.022': "Pendant sprinkler",
  'Tb4.023': "Upright sprinkler",
  'Tb4.024': "Sidewall sprinkler",
  'Tb4.025': "Flush sprinkler",
  'Tb5.001': "Fire suppression system",
  'Tbk5.001': "CO2 suppression system",
  'Tbk5.002': "Foam suppression system",
  'Tbk5.003': "Water suppression system",
  'Tbk5.004': "Powder suppression system",
  'Tbk7.001': "Fire protection network",
  'Tbk7.002': "Firefighting network",
  'Tbk7.003': "Ring network",
  'Tbk7.004': "Distribution network",
  'Td01': "Single door",
  'Td02': "Double door",
  'Td03': "Sliding door",
  'Td04': "Swing gate",
  'Td05': "Roller door (top)",
  'Td06': "Roller door (bottom)",
  'Td07': "Up-and-over door",
  'Td08': "Folding door",
  'Td09': "Serving hatch",
  'Td10': "Emergency exit door",
  'Tn01': "Emergency luminaire",
  'Tn02': "Self-contained emergency lighting",
  'Tn03': "Escape route sign",
  'Tn04': "Illuminated sign",
  'Tn05': "Central emergency lighting",
  'Tn06': "Anti-panic lighting",
  'Tn07': "Workplace lighting",
  'Tn08': "Safety lighting",
  'Tn09': "Emergency power supply",
  'Tn10': "Battery unit",
  'Tn11': "Generator",
  'Tn12': "UPS",
  'Tr01': "Smoke and heat exhaust system",
  'Tr02': "Roof smoke vent",
  'Tr03': "Facade smoke vent",
  'Tr04': "Duct smoke damper",
  'Tr05': "Smoke and heat exhaust",
  'Tr06': "Outside air supply",
  'Tr07': "Pressurization system",
  'Tr08': "Smoke exhaust control panel",
  'Tr09': "Smoke detector (smoke exhaust)",
  'Tr10': "Heat detector (smoke exhaust)",
  'Tr11': "Manual call point (smoke exhaust)",
  'Tr12': "Wind sensor",
  'Tr501': "Mechanical smoke and heat exhaust",
  'Tr502': "Smoke exhaust fan",
  'Tr503': "Supply fan",
  'Tr504': "Extract fan",
  'Tv017': "Ventilation system",
  'Tw01': "Water sprinkler system",
  'Tw02': "Pendant sprinkler head",
  'Tw03': "Upright sprinkler head",
  'Tw04': "Sidewall sprinkler head",
  'Tw05': "Flush sprinkler head",
  'Tw07': "Alarm valve",
  'Tw08': "Check valve",
  'Tw09': "Shutoff valve",
  'Tw10': "Underground fire hydrant",
  'Tw11': "Above-ground fire hydrant",
  'Tw12': "Pump connection",
  'Tw14': "Sprinkler control station",
  'Tw15': "Water supply",
  'Tw16': "Water tank",
  'Tw19': "Booster pump",
  'Tw2.001': "Open water mist system",
  'Tw2.002': "Closed water mist system",
  'Tw20': "Jockey pump",
  'Tw28': "Water motor gong",
};

// Build categories from prefix
const CATEGORY_META = {
  'Tb': { name: 'NL NEN 1414 — Brandbeveiliging', color: '#dc2626' },
  'Tbk': { name: 'NL NEN 1414 — Blussystemen', color: '#b91c1c' },
  'Td': { name: 'NL NEN 1414 — Deuren', color: '#92400e' },
  'Tn': { name: 'NL NEN 1414 — Noodverlichting', color: '#ca8a04' },
  'Tr': { name: 'NL NEN 1414 — Rook/Warmteafvoer', color: '#6b7280' },
  'Tv': { name: 'NL NEN 1414 — Ventilatie', color: '#059669' },
  'Tw': { name: 'NL NEN 1414 — Water/Sprinkler', color: '#2563eb' },
};

const ALL_IDS = Object.keys(NAMES);

function getPrefix(id) {
  // Tbk before Tb (longer prefix first)
  if (id.startsWith('Tbk')) return 'Tbk';
  if (id.startsWith('Tb')) return 'Tb';
  if (id.startsWith('Td')) return 'Td';
  if (id.startsWith('Tn')) return 'Tn';
  if (id.startsWith('Tr')) return 'Tr';
  if (id.startsWith('Tv')) return 'Tv';
  if (id.startsWith('Tw')) return 'Tw';
  return 'Tb'; // fallback
}

// Build categories
export const NEN1414_CATEGORIES = (() => {
  const catMap = new Map();
  for (const id of ALL_IDS) {
    const prefix = getPrefix(id);
    if (!catMap.has(prefix)) {
      const meta = CATEGORY_META[prefix] || { name: `NL NEN 1414 — ${prefix}`, color: '#666' };
      catMap.set(prefix, {
        id: `nen1414-${prefix.toLowerCase()}`,
        name: meta.name,
        industry: 'aec',
        country: 'nl',
        color: meta.color,
        icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/><text x="8" y="11" font-size="7" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle" font-family="sans-serif">N</text></svg>`,
        builtin: true,
        symbols: [],
      });
    }
    catMap.get(prefix).symbols.push({
      id: `nen1414-${id}`,
      name: NAMES[id] || id,
      svg: rasterSvg(id),
    });
  }
  return [...catMap.values()];
})();
