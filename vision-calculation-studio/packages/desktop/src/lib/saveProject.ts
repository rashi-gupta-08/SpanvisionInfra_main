import { parse, evaluate, generateProjectIfcx, type EvaluatedNode, type IfcCalcSheet } from "@spanvision/calculations-core";
import { useProjectStore } from "../store/projectStore";
import { projectScope } from "../store/projectGegevens";
import { bouwProjectBestand, PROJECT_FORMAAT_VERSIE } from "../store/projectBestand";
import { saveCalculationFile } from "../tauri/fileOps";
import { calcpadIncludes, calcpadImageUrls } from "../templates/calcpad-includes";

/** One save path for the ribbon, quick action and keyboard shortcut. */
export async function saveProject() {
  try {
    const { projectNaam, gegevens, exemplaren } = useProjectStore.getState();
    const scope = projectScope(gegevens);
    const sheets: IfcCalcSheet[] = exemplaren.map((ex) => {
      let nodes: EvaluatedNode[] = [];
      try {
        nodes = evaluate(parse(ex.source, { includes: calcpadIncludes, imageUrls: calcpadImageUrls }), ex.waarden, scope);
      } catch (error) {
        console.error(`Sheet "${ex.naam}" could not be evaluated:`, error);
      }
      return { naam: ex.naam, nodes, elementen: ex.elementen };
    });
    const ifcx = sheets.length ? generateProjectIfcx(sheets, { projectName: projectNaam }) : null;
    const payload = bouwProjectBestand({ versie: PROJECT_FORMAAT_VERSIE, naam: projectNaam, gegevens, exemplaren }, ifcx);
    const path = await saveCalculationFile(payload, projectNaam);
    if (path) useProjectStore.getState().markeerOpgeslagen(path);
  } catch (error) {
    console.error("Save file failed:", error);
    alert(`Unable to save file:${(error as Error).message}`);
  }
}
