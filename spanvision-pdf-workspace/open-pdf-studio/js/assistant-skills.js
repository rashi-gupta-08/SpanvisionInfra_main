// Spanvision assistant skill set.
//
// Each skill is a capability the assistant can perform on the open PDF. Clicking
// a skill chip sends `invoke` as a user message; via the provider chain it reaches
// the brain (Claude Code over the MCP relay, or any AI provider) which executes
// it using the app's MCP tools. SKILLS_SYSTEM_PROMPT teaches the brain how.

import { PLATTEGROND_SKILL, PLATTEGROND_PROMPT } from './plattegrond/skill.js';

export const ASSISTANT_SKILLS = [
  {
    id: 'translate',
    icon: '🌐',
    label: 'Translate',
    hint: "Translate the document text into English",
    invoke: "Translate the text of the open document into English and present the translation clearly.",
  },
  {
    id: 'summarize',
    icon: '📝',
    label: 'Summarize',
    hint: "Summarize the document or drawing",
    invoke: "Summarize the open document or drawing in English, including its purpose, main components and points needing attention.",
  },
  {
    id: 'draw',
    icon: '✏️',
    label: 'Draw',
    hint: "Draw an element or annotation",
    invoke: "Draw on the document:",
    needsInput: true,
  },
  {
    id: 'detect-doors',
    icon: '🚪',
    label: 'Find doors',
    hint: "Detect and mark the doors on the floor plan",
    invoke: "Inspect the floor plan, identify the doors and mark each with an annotation and a short English label.",
  },
  {
    id: 'structural-layout',
    icon: '🏗️',
    label: 'Structural layout',
    hint: "Grid, columns, beams, floor panels, span directions and structural schedule",
    invoke: "Set out the structure on the drawing: grid, columns at grid nodes, beams along grid lines, span directions, level dimensions, position labels and a structural schedule. Brief:",
    needsInput: true,
  },
  PLATTEGROND_SKILL,
];

export const SKILLS_SYSTEM_PROMPT =
  'Je beschikt over een vaardigheden-set en kunt ACTIES uitvoeren op het geopende PDF-document via de MCP-tools van de app:\n' +
  '- Vertalen / samenvatten: gebruik app_screenshot_view (width 2000) om de pagina te bekijken en te lezen; geef het resultaat als tekst terug.\n' +
  '- Tekenen: gebruik app_create_annotation. Coordinaten zijn paginapunten op 100% zoom; haal de paginamaat op met app_get_viewport_state (pageW/pageH).\n' +
  '- Deuren herkennen: doe eerst app_fit_page, maak dan app_screenshot_view (width 2000), herken de deuren visueel en markeer elke deur met app_create_annotation (bijvoorbeeld een box of cloud rond de deur + een textbox-label). Reken screenshot-pixels om naar paginapunten via pageW/pageH.\n' +
  'Respond in English, concisely and practically. Execute requested actions and briefly report what you changed.\n' +
  '\n' +
  'CONSTRUCTIETEKENING — draagstructuur uitzetten:\n' +
  "- Gebruik app_structural_layout. Die zet in ÉÉN ongedaan-stap het hele plan neer: stramien (letters en cijfers, met bollen), kolommen op de rasterknopen, balken op de rasterlijnen, per vloerveld een overspanningspijl met de werkelijke overspanning, peilmaten, aanduidingen (positienummer / section / peil) en een constructiestaat gegroepeerd op IFC-categorie. Bouw zo'n plattegrond NOOIT uit losse app_create_annotation-aanroepen: dan klopt de maatvoering niet en is hij niet in één keer ongedaan te maken.\n" +
  '- Maten gaan erin als WERKELIJKE MILLIMETERS: baysX/baysY, bijvoorbeeld "3x5400" of [5400,5400,6000]. De app rekent ze om naar paginapunten op `scale` (standaard "1:100") en ijkt meteen de meetschaal, zodat metingen en app_get_takeoff in dezelfde werkelijkheid rekenen. Reken zelf NOOIT millimeters naar punten om.\n' +
  '- `origin` is het eerste rasterkruispunt in PAGINAPUNTEN op 100% zoom (linksboven = 0,0). Vraag de paginamaat op met app_get_viewport_state (viewport.pageW/pageH) en houd ruimte vrij voor de uitloop van de stramienlijnen (gridExtensionMm, standaard 1500 mm) en voor de staat eronder.\n' +
  "- Profielen: \"HE200B\", \"HEA 200\", \"IPE 300\", \"UNP 200\", \"Koker 100x100x5\", \"L 100x100x10\" (steel) of \"300x500\" (concrete, width x height in mm). Een maat die de bibliotheek niet kent wordt geweigerd en nooit stilzwijgend vervangen.\n" +
  '- Richtingen: beams.direction is x, y of both; floors.direction is x, y of shortest (overspannen over de kortste vakmaat). Peilen geef je in millimeters (levelMm: 3000 wordt "+3.000").\n' +
  '- Doe EERST een aanroep met dryRun: true. Die rekent alles door en meldt wat er zou komen zonder iets te tekenen. Klopt het, herhaal dan zonder dryRun.\n' +
  '- Controleer daarna met app_list_annotations (of app_get_takeoff voor de totalen) en meld de aantallen. Met app_undo verdwijnt het hele plan in één keer.\n' +
  '- De stramienbollen zijn GEKOPPELD: app_structural_layout koppelt alle bolzijden van één richting. Sleept de gebruiker één bol (de greep aan het uiteinde), dan schuiven de andere bollen van die richting evenveel mee, zodat ze op één lijn blijven. app_get_annotation op een stramienlijn meldt per uiteinde `gridAlignment` (start/end: group, locked, linkedEnds, canLock). Eén uiteinde los zetten: app_update_annotation met props { alignStart: false } (het begin, waar de bol staat) of { alignEnd: false }; met true koppel je het weer en schuift het terug op de lijn van de andere bollen. Losse stramienlijnen die op één lijn liggen, koppel je ook met alignStart/alignEnd: true. Een hele stramienlijn verplaatsen raakt de koppeling niet.\n' +
  "- Losse constructie-onderdelen teken je met app_create_annotation: type \"betonbalk\" (startX/startY/endX/endY + breedteMm/hoogteMm, tagTonen/tagTekst; hij verstekt zichzelf op de hoeken), of type \"parametricSymbol\" met symbolId \"wapeningsstaaf\", \"netwapening\", \"wapeningskorf\", \"wapeningVerdeling\" (params aantal/diameter), \"beugel\" (params diameter/afstand), \"oplegging\", \"puntlast\", \"q-last\", \"windverband\", \"scharnier-verbinding\", \"paal-aanzicht-type-1\", \"CPT\", \"paalpuntniveau\", \"peilmaat\" (params value), \"stramien\" (params label/orientation) of \"overspanningspijl-vloer\" (params length/tekst).\n" +
  '- Een schaal los zetten kan met app_set_measure_scale: op 1:100 is één werkelijke millimeter 0,0283465 paginapunt (72/25,4 gedeeld door 100).' +
  PLATTEGROND_PROMPT;
