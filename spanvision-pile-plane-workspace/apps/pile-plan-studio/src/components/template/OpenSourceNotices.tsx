import {useState} from "react";
import {useTranslation} from "react-i18next";
import Modal from "./Modal";
import notices from "../../../../../legal/UPSTREAM-NOTICES.md?raw";
import lgpl from "../../../../../legal/LGPL-3.0.txt?raw";
import gpl from "../../../../../legal/GPL-3.0.txt?raw";
import dependencyNotices from "../../../../../legal/DEPENDENCY-NOTICES.md?raw";
import inventory from "../../../../../legal/DEPENDENCY-INVENTORY.json";
import interLicense from "../../../../../legal/INTER-OFL.txt?raw";
import spaceLicense from "../../../../../legal/SPACE-GROTESK-OFL.txt?raw";

export default function OpenSourceNotices() {
  const [open,setOpen]=useState(false);
  const [texts,setTexts]=useState<Record<string,string>>({});
  const {t}=useTranslation("backstage");
  const label=t("aboutPanel.notices");
  return <><button className="settings-btn settings-btn-secondary" onClick={()=>setOpen(true)}>{label}</button>
    <Modal open={open} onClose={()=>setOpen(false)} title={label} width={700}>
      <div className="legal-notices"><pre>{notices}</pre><details><summary>GNU LGPL v3</summary><pre>{lgpl}</pre></details><details><summary>GNU GPL v3</summary><pre>{gpl}</pre></details>
        <details><summary>Inter · SIL OFL 1.1</summary><pre>{interLicense}</pre></details><details><summary>Space Grotesk · SIL OFL 1.1</summary><pre>{spaceLicense}</pre></details>
        <details><summary>{t("aboutPanel.dependencies")}</summary><pre>{dependencyNotices}</pre>
          {inventory.dependencies.map(dependency=><details key={`${dependency.ecosystem}:${dependency.name}:${dependency.version}`} onToggle={event=>{
            if(!event.currentTarget.open)return;
            for(const file of dependency.licenseFiles)if(!(file in texts))void fetch(new URL(`legal/${file}`,document.baseURI)).then(response=>{if(!response.ok)throw Error(response.statusText);return response.text();}).then(text=>setTexts(current=>({...current,[file]:text}))).catch(()=>setTexts(current=>({...current,[file]:t("aboutPanel.licenseLocation")})));
          }}><summary>{dependency.name} {dependency.version} — {typeof dependency.license==="string"?dependency.license:JSON.stringify(dependency.license)}</summary>
            {dependency.licenseFiles.map(file=><pre key={file}>{texts[file]??t("aboutPanel.loadingLicense")}</pre>)}
          </details>)}
        </details>
      </div>
    </Modal></>;
}
