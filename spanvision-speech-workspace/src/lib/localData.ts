import brand from "../brand.json";

const SETTINGS = "spanvision_speech_settings";
const DICTIONARY = "spanvision_speech_dictionary";
function read(key: string): any {
  try { const value=localStorage.getItem(key);return value ? JSON.parse(value) : null; }
  catch { return null; }
}
export function migrateBrowserData() {
  try {
    if(localStorage.getItem("spanvision_speech_import_v1")) return;
    for(const [oldKey,newKey] of [["oss_settings",SETTINGS],["oss_dictionary",DICTIONARY]]) {
      if(localStorage.getItem(newKey)!==null) continue;
      const value=read(oldKey);
      if(value && typeof value==="object" && !Array.isArray(value)) {
        if(newKey===SETTINGS) value.remote_server_enabled=false;
        localStorage.setItem(newKey,JSON.stringify(value));
      }
    }
    for(const oldKey of Object.keys(localStorage).filter(key=>key.startsWith("oss_samples_"))) {
      const newKey=oldKey.replace("oss_samples_","sw_samples_");
      if(localStorage.getItem(newKey)===null) localStorage.setItem(newKey,localStorage.getItem(oldKey)!);
    }
    localStorage.setItem("spanvision_speech_import_v1","1");
  } catch { /* Storage restrictions must not prevent the workspace opening. */ }
}
export function loadSettings() {
  migrateBrowserData();
  return {
    model_name:"base",model_path:"",use_gpu:false,
    hotkey:"Ctrl+Super",hotkey_mode:"hold",auto_paste:true,auto_enter:false,
    audio_device:"default",system_audio_device:"default",theme:brand.theme,
    file_auto_save:false,file_save_directory:"",file_confirm_actions:true,audio_feedback:true,
    ...read(SETTINGS),language:"en",ui_language:"en",remote_server_enabled:false,
  };
}
export function saveSettings(value: unknown) { try { localStorage.setItem(SETTINGS,JSON.stringify(value)); } catch {} }
export function loadDictionary(): {words:Record<string,string|null>} {
  const saved=read(DICTIONARY);
  return saved?.words && typeof saved.words==="object" && !Array.isArray(saved.words) ? saved : {words:{}};
}
export function saveDictionary(value: unknown) { try { localStorage.setItem(DICTIONARY,JSON.stringify(value)); } catch {} }
