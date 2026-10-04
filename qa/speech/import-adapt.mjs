// One-time adaptation of the supplied source. The original ZIP remains intact.
import fs from 'node:fs';
import path from 'node:path';
const app=path.resolve('spanvision-speech-workspace');
const read=file=>fs.readFileSync(path.join(app,file),'utf8').replaceAll('\r','');
const write=(file,text)=>fs.writeFileSync(path.join(app,file),text);
const change=(file,fn)=>write(file,fn(read(file)));
function walk(dir){return fs.readdirSync(path.join(app,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
for(const file of [...walk('src'),...walk('src-tauri/src'),'build.bat']) {
  if(!/\.(tsx?|rs|css|bat)$/.test(file))continue;
  change(file,text=>text.replaceAll('Open Speech Studio','speech workspace').replaceAll('OpenAEC Foundation','Spanvision infra').replaceAll('OpenAEC','Spanvision').replaceAll('Impertio Accounts','Spanvision account preview').replaceAll('Impertio','Spanvision').replaceAll('open_speech_studio_lib','spanvision_speech_workspace_lib').replaceAll('oss_convert_','sw_convert_').replaceAll('oss_tts_','sw_tts_').replaceAll('oss_samples_','sw_samples_'));
}
// Replace colored UI constants with neutral tokens; photos and data stay intact.
for(const file of walk('src').filter(file=>/\.(css|tsx)$/.test(file))) {
  change(file,text=>text.replace(/#[\da-f]{6}\b/gi,hex=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    if(rgb[0]===rgb[1]&&rgb[1]===rgb[2])return hex;
    const level=Math.max(...rgb)>120?'var(--theme-accent)':'var(--theme-bg-card)';return level;
  }).replace(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/g,(all,r,g,b,a)=>r===g&&g===b?all:`rgba(255,255,255,${a})`));
}
change('src-tauri/Cargo.toml',text=>text.replace('name = "open-speech-studio"','name = "spanvision-speech-workspace"').replace('name = "open_speech_studio_lib"','name = "spanvision_speech_workspace_lib"').replace('authors = ["OpenAEC Foundation"]','authors = ["Spanvision infra"]')
  .replace(/^repository = .*\n/m,'').replace(/^# Shared OpenAEC[\s\S]*?^openaec-accounts-client = .*\n/m,'').replace(/^description = .*$/m,'description = "Local speech workspace by Spanvision infra"'));
change('src-tauri/src/lib.rs',text=>{
  text=text.replace('mod app_config;','mod brand;\nmod migration;\nmod app_config;');
  text=text.replace('.open(r"C:\\Users\\rickd\\oss-debug.txt")','.open(std::env::temp_dir().join("spanvision-speech-debug.log"))');
  text=text.replace(/let mut text = if settings\.remote_server_enabled \{[\s\S]*?    \} else \{/g,'let mut text = {');
  const start=text.indexOf('    // Snapshot remote-server settings;');const end=text.indexOf('    // Gather what we need',start);if(start>=0&&end>start)text=text.slice(0,start)+text.slice(end);
  const remoteStart=text.indexOf('/// Send a file to the remote transcription server');const remoteEnd=text.indexOf('/// Cancel a running file transcription job.',remoteStart);if(remoteStart>=0&&remoteEnd>remoteStart)text=text.slice(0,remoteStart)+text.slice(remoteEnd);
  const initStart=text.indexOf('    // Configure the shared Spanvision login.');const initEnd=text.indexOf('    // Add the bundled bin/',initStart);if(initStart<0||initEnd<0)throw new Error('Account initialization markers missing');text=text.slice(0,initStart)+text.slice(initEnd);
  text=text.replaceAll('remote: settings.remote_server_enabled','remote: false');
  text=text.replaceAll('"speech workspace"','brand::PRODUCT');
  return text;
});
change('src-tauri/src/job_queue.rs',text=>{
  const start=text.indexOf('    if job.remote {');const end=text.indexOf('    } else {',start);if(start<0||end<0)throw new Error('Queue markers missing');
  text=text.slice(0,start)+text.slice(end).replace('    } else {','    {');
  return text.replace('    app: &Option<tauri::AppHandle>,','    _app: &Option<tauri::AppHandle>,').replace('    runtime: &Option<tokio::runtime::Handle>,','    _runtime: &Option<tokio::runtime::Handle>,');
});
change('src-tauri/src/settings.rs',text=>text.replace('theme: "light".to_string()','theme: super::brand::THEME.to_string()').replaceAll('.join("OSS Meetings")','.join("Speech Workspace Meetings")').replaceAll('.join("open-speech-studio")','.join(super::brand::CONFIG_DIRECTORY)').replace('    std::fs::create_dir_all(&dir)?;\n    Ok(dir)','    std::fs::create_dir_all(&dir)?;\n    super::migration::import_legacy(&dir)?;\n    Ok(dir)').replace('    Ok(settings)\n}','    settings.remote_server_enabled = false;\n    Ok(settings)\n}'));
for(const file of ['src-tauri/src/transcriber.rs','src-tauri/src/autocorrect.rs','src-tauri/src/tts.rs'])change(file,text=>text.replaceAll('.join("open-speech-studio")','.join(crate::brand::CONFIG_DIRECTORY)').replace('"open-speech-studio"','"spanvision-speech-workspace"'));
change('src-tauri/src/lib.rs',text=>text.replace('fn save_settings(','fn save_settings(').replace('    new_settings: settings::Settings,','    mut new_settings: settings::Settings,').replace('    settings::save_settings(&new_settings)','    new_settings.remote_server_enabled = false;\n    settings::save_settings(&new_settings)'));
change('src/components/SettingsPanel.tsx',text=>{
  const start=text.indexOf('          <div class="setting-row">',text.indexOf('{/* ── General'));const end=text.indexOf('          <div class="setting-row">\n            <label>{t("settings.uiLanguage")}',start);
  if(start<0||end<0)throw new Error('Settings cloud row markers missing');
  text=text.slice(0,start)+`          <div class="setting-row"><label for="appearance-theme">Appearance</label><select id="appearance-theme" value={props.settings?.theme || "spanvision-mono"} onChange={e => autoSave({theme:e.currentTarget.value})}><option value="spanvision-mono">Spanvision Mono</option><option value="dark">Dark grayscale</option><option value="light">Light grayscale</option></select></div>\n`+text.slice(end);
  text=text.replace('api, auth,','api,').replace(/import \{ isAuthenticated.*\n/,'').replace(/^    initAuth\(\);\n/m,'').replace(/^  const \[remoteServerEnabled.*\n/m,'').replace(/^      setRemoteServerEnabled.*\n/m,'');return text;
});
write('src-tauri/src/auth.rs',`// Disabled account compatibility commands. Account previews never call these.\nuse serde::{Deserialize, Serialize};\n#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct UserProfile { pub sub: String, pub email: Option<String>, pub name: Option<String>, pub picture: Option<String> }\n#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct UserInfo { pub sub: String, pub email: Option<String>, pub email_verified: Option<bool>, pub name: Option<String>, pub picture: Option<String>, pub subscription: Option<serde_json::Value>, pub credits: Option<serde_json::Value> }\n#[tauri::command]\npub fn auth_is_configured() -> bool { false }\n#[tauri::command]\npub async fn auth_login(_app: tauri::AppHandle, _page_text: Option<serde_json::Value>) -> Result<UserProfile, String> { Err("Accounts are unavailable in this local edition. Use the account preview.".into()) }\n#[tauri::command]\npub fn auth_logout() {}\n#[tauri::command]\npub async fn auth_current_user() -> Option<UserProfile> { None }\n#[tauri::command]\npub async fn auth_userinfo() -> Result<UserInfo, String> { Err("Accounts are unavailable in this local edition.".into()) }\n`);
write('src-tauri/src/app_config.rs',`// Local service configuration; no discovery, credentials, or service cache.\nuse serde::{Deserialize, Serialize};\n#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct AiServer { pub url: String }\n#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct AppConfig { pub client_id: Option<String>, pub ai_servers: Vec<AiServer>, pub operations: serde_json::Value }\n#[tauri::command]\npub async fn get_app_config() -> Result<AppConfig, String> { Ok(AppConfig { client_id: None, ai_servers: vec![], operations: serde_json::Value::Null }) }\n#[tauri::command]\npub async fn invalidate_app_config() -> Result<(), String> { Ok(()) }\n`);
change('index.html',text=>text.replace('<title>Open Speech Studio</title>','<title>speech workspace — Spanvision infra</title>\n    <link rel="icon" href="/sw-mark.svg" />').replace(/    <link rel="preconnect".*\n/g,'').replace(/    <link href="https:\/\/fonts.googleapis.*\n/g,''));
console.log('Imported presentation and local speech paths adapted.');
