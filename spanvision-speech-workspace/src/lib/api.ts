export interface Settings {
  language: string;
  ui_language: string;
  model_name: string;
  model_path: string;
  use_gpu: boolean;
  hotkey: string;
  hotkey_mode: string;
  auto_paste: boolean;
  auto_enter?: boolean;
  audio_device: string;
  system_audio_device?: string;
  theme: string;
  file_auto_save: boolean;
  file_save_directory: string;
  file_confirm_actions: boolean;
  audio_feedback: boolean;
  // v0.7 new fields
  incremental_interval?: number;
  incremental_interval_secs?: number;
  max_parallel_workers?: number;
  max_workers?: number;
  auto_correction_llm?: boolean;
  auto_correct?: boolean;
  auto_correct_model?: string;
  meeting_save_directory?: string;
  meeting_save_dir?: string;
  speaker_diarization?: boolean;
  floating_indicator?: boolean;
  sound_pack?: string;
  sound_volume?: number;
  remote_server_enabled?: boolean;
  // TTS (Higgs Audio v3, local server)
  tts_enabled?: boolean;
  tts_server_url?: string;
  tts_voice?: string;
  tts_allow_install?: boolean;
}

export interface SystemAudioStatus {
  active: boolean;
  level: number;
  last_packet_ms_ago: number | null;
}

export interface ModelInfo {
  name: string;
  size: string;
  downloaded: boolean;
  path: string | null;
}

export interface TranscriptionResult {
  text: string;
  original_text?: string;
  language: string;
  duration_ms: number;
}

export interface Dictionary {
  words: Record<string, string | null>;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  memory_mb: number;
}

export interface DownloadStart {
  name: string;
  dir: string;
}

export interface DownloadProgress {
  name: string;
  pct: number;
  downloaded_mb: number;
  total_mb: number;
}

export interface DownloadComplete {
  name: string;
  path: string;
}

export interface PiperVoiceInfo {
  id: string;
  name: string;
  language: string;
  quality: string;
  size: string;
  downloaded: boolean;
}

export interface PiperStatus {
  binary_installed: boolean;
  dir: string;
}

export interface TtsOptions {
  speed?: number;
  expressiveness?: number;
  sentencePause?: number;
}

export interface QueueStatus {
  queued: number;
  active: number;
  completed: number;
  sessions: SessionInfo[];
}

export interface SessionInfo {
  session_id: string;
  status: string;
  completed_chunks: number;
  total_chunks: number;
  current_progress_pct: number;
}

import { t } from "./i18n";

// Detect if we're running inside Tauri or in a plain browser
const isTauri = !!(window as any).__TAURI_INTERNALS__;

// ─── Tauri backend ───────────────────────────────────────────

let invoke: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | null = null;

const invokeReady: Promise<void> = isTauri
  ? import("@tauri-apps/api/core").then((mod) => {
      invoke = mod.invoke;
    })
  : Promise.resolve();

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  await invokeReady;
  if (invoke) return invoke<T>(cmd, args);
  return Promise.reject(new Error(`Tauri not available — "${cmd}" cannot be called`));
}

const tauriApi = {
  getSettings: async (): Promise<Settings> => {
    const settings=await tauriInvoke<Settings>("get_settings");
    return {...settings,remote_server_enabled:false,incremental_interval:settings.incremental_interval_secs??settings.incremental_interval,
      max_parallel_workers:settings.max_workers??settings.max_parallel_workers,
      auto_correction_llm:settings.auto_correct??settings.auto_correction_llm,
      meeting_save_directory:settings.meeting_save_dir??settings.meeting_save_directory};
  },
  saveSettings: (settings: Settings) => tauriInvoke<void>("save_settings", { newSettings: {...settings,remote_server_enabled:false,
    incremental_interval_secs:settings.incremental_interval??settings.incremental_interval_secs??2,
    max_workers:settings.max_parallel_workers??settings.max_workers??2,
    auto_correct:settings.auto_correction_llm??settings.auto_correct??false,
    auto_correct_model:settings.auto_correct_model??"",
    meeting_save_dir:settings.meeting_save_directory??settings.meeting_save_dir??""} }),
  getAvailableModels: () => tauriInvoke<ModelInfo[]>("get_available_models"),
  downloadModel: (modelName: string) => tauriInvoke<string>("download_model", { modelName }),
  deleteModel: (modelName: string) => tauriInvoke<void>("delete_model", { modelName }),
  loadModel: (modelPath: string) => tauriInvoke<void>("load_model", { modelPath }),
  startRecording: (systemAudio?: boolean) =>
    tauriInvoke<void>("start_recording", { systemAudio: systemAudio ?? false }),
  stopRecording: () => tauriInvoke<TranscriptionResult>("stop_recording"),
  getRecordingStatus: () => tauriInvoke<boolean>("get_recording_status"),
  startDictation: () => tauriInvoke<string>("start_dictation"),
  stopDictationSync: () => tauriInvoke<TranscriptionResult>("stop_dictation_sync"),
  stopDictationAsync: (sessionId: string) => tauriInvoke<void>("stop_dictation", { sessionId }),
  getDictationStatus: () => tauriInvoke<boolean>("get_dictation_status"),
  getQueueStatus: () => tauriInvoke<QueueStatus>("get_queue_status"),
  getCompletedSessions: () => tauriInvoke<Array<[string, number, string]>>("get_completed_sessions"),
  pollChunkResults: () => tauriInvoke<Array<[string, number, string, number]>>("poll_chunk_results"),
  initJobQueue: () => tauriInvoke<void>("init_job_queue"),
  getDictionary: () => tauriInvoke<Dictionary>("get_dictionary"),
  saveDictionary: (dict: Dictionary) => tauriInvoke<void>("save_dictionary", { dict }),
  addDictionaryWord: (word: string, replacement: string | null) =>
    tauriInvoke<void>("add_dictionary_word", { word, replacement }),
  removeDictionaryWord: (word: string) => tauriInvoke<void>("remove_dictionary_word", { word }),
  getAudioDevices: () => tauriInvoke<string[]>("get_audio_devices"),
  getOutputDevices: () => tauriInvoke<string[]>("get_output_devices"),
  getAudioLevel: () => tauriInvoke<number>("get_audio_level"),
  getSystemAudioStatus: () => tauriInvoke<SystemAudioStatus>("get_system_audio_status"),
  isModelLoaded: () => tauriInvoke<boolean>("is_model_loaded"),
  getGpuInfo: () => tauriInvoke<{ available: boolean; name: string; vram_mb: number; driver: string; recommendation: string }>("get_gpu_info"),
  getGpuStatus: () => tauriInvoke<{ enabled: boolean; cuda_available: boolean; active: boolean; device_name: string }>("get_gpu_status"),
  typeText: (text: string, autoEnter?: boolean) => tauriInvoke<void>("type_text", { text, autoEnter: autoEnter ?? false }),
  updateTrayLanguage: (language: string) => tauriInvoke<void>("update_tray_language", { language }),
  startFileJob: (jobId: string, filePath: string) =>
    tauriInvoke<void>("start_file_job", { jobId, filePath }),
  cancelFileJob: (jobId: string) =>
    tauriInvoke<void>("cancel_file_job", { jobId }),
  stopDictationRaw: () =>
    tauriInvoke<number[]>("stop_dictation_raw"),
  trainSpeaker: (name: string, audio: number[]) =>
    tauriInvoke<void>("train_speaker", { name, audio }),
  listSpeakerProfiles: () =>
    tauriInvoke<string[]>("list_speaker_profiles"),
  deleteSpeakerProfile: (name: string) =>
    tauriInvoke<void>("delete_speaker_profile", { name }),
  ttsSpeak: (text: string, voice?: string, options?: TtsOptions) =>
    tauriInvoke<number[]>("tts_speak", { text, voice: voice ?? null, options: options ?? null }),
  ttsGetVoices: () =>
    tauriInvoke<PiperVoiceInfo[]>("tts_get_voices"),
  ttsDownloadVoice: (voiceId: string) =>
    tauriInvoke<void>("tts_download_voice", { voiceId }),
  ttsDeleteVoice: (voiceId: string) =>
    tauriInvoke<void>("tts_delete_voice", { voiceId }),
  ttsStatus: () =>
    tauriInvoke<PiperStatus>("tts_status"),
  getRunningProcesses: () =>
    tauriInvoke<ProcessInfo[]>("get_running_processes"),
  killProcess: (pid: number) =>
    tauriInvoke<void>("kill_process", { pid }),
};

// Browser preview is deliberately independent of speech services.
import {loadSettings,saveSettings,loadDictionary,saveDictionary} from "./localData";
import {runtime,desktopRequired} from "./runtime";
let previewSettings: Settings=loadSettings();
let previewDictionary: Dictionary=loadDictionary();
const unavailable=()=>Promise.reject(new Error(desktopRequired));
export const getMicAnalyser=():AnalyserNode|null=>null;
export const isBrowserMode=()=>runtime.preview;
export const isServerMode=()=>false;
const previewApi: typeof tauriApi = {
  getSettings:async()=>({...previewSettings}),
  saveSettings:async value=>{previewSettings={...value,remote_server_enabled:false};saveSettings(previewSettings);},
  getDictionary:async()=>({words:{...previewDictionary.words}}),
  saveDictionary:async value=>{previewDictionary={words:{...value.words}};saveDictionary(previewDictionary);},
  addDictionaryWord:async(word,replacement)=>{previewDictionary.words[word]=replacement;saveDictionary(previewDictionary);},
  removeDictionaryWord:async word=>{delete previewDictionary.words[word];saveDictionary(previewDictionary);},
  getAvailableModels:async()=>[
    {name:"tiny",size:"75 MB",downloaded:false,path:null},
    {name:"base",size:"142 MB",downloaded:false,path:null},
    {name:"small",size:"466 MB",downloaded:false,path:null},
    {name:"medium",size:"1.5 GB",downloaded:false,path:null},
    {name:"large-v3-turbo",size:"1.6 GB",downloaded:false,path:null},
    {name:"large-v3",size:"3.1 GB",downloaded:false,path:null}],
  downloadModel:unavailable,deleteModel:unavailable,loadModel:unavailable,
  startRecording:unavailable,stopRecording:unavailable,startDictation:unavailable,
  stopDictationSync:unavailable,stopDictationAsync:unavailable,stopDictationRaw:unavailable,
  getRecordingStatus:async()=>false,getDictationStatus:async()=>false,
  getQueueStatus:async()=>({queued:0,active:0,completed:0,sessions:[]}),
  getCompletedSessions:async()=>[],pollChunkResults:async()=>[],initJobQueue:async()=>{},
  getAudioDevices:async()=>[],getOutputDevices:async()=>[],getAudioLevel:async()=>0,
  getSystemAudioStatus:async()=>({active:false,level:0,last_packet_ms_ago:null}),
  isModelLoaded:async()=>false,
  getGpuInfo:async()=>({available:false,name:"Desktop app required",vram_mb:0,driver:"",recommendation:desktopRequired}),
  getGpuStatus:async()=>({enabled:false,cuda_available:false,active:false,device_name:""}),
  typeText:unavailable,updateTrayLanguage:async()=>{},startFileJob:unavailable,cancelFileJob:unavailable,
  trainSpeaker:unavailable,listSpeakerProfiles:async()=>[],deleteSpeakerProfile:unavailable,
  ttsSpeak:unavailable,ttsGetVoices:async()=>[],ttsDownloadVoice:unavailable,ttsDeleteVoice:unavailable,
  ttsStatus:async()=>({binary_installed:false,dir:""}),getRunningProcesses:async()=>[],killProcess:unavailable,
};
export const api = runtime.native ? tauriApi : previewApi;
export interface UserProfile {sub:string;email?:string;name?:string;picture?:string;}
export interface UserInfo extends UserProfile {subscription?:{tier?:string;status?:string}|null;credits?:{total:number;monthly:number;topup:number;resets_at?:string|null}|null;}
export const auth={isConfigured:async()=>false,login:async():Promise<UserProfile>=>{throw new Error("Accounts are preview-only.");},logout:async()=>{},currentUser:async():Promise<UserProfile|null>=>null,userInfo:async():Promise<UserInfo>=>{throw new Error("Accounts are preview-only.");}};
export interface AppConfig {client_id?:string|null;ai_servers:{url:string}[];operations:unknown;}
export const appConfig={get:async():Promise<AppConfig>=>({client_id:null,ai_servers:[],operations:null}),invalidate:async()=>{}};
