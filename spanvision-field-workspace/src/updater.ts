// Field Workspace: upstream update checks are disabled.
declare const __APP_VERSION__: string;
export type UpdateStatus = {available:boolean;currentVersion:string;latestVersion?:string;htmlUrl?:string};
export async function checkForUpdates(): Promise<UpdateStatus> { return {available:false,currentVersion:__APP_VERSION__}; }
export function renderUpdateBadge(_status:UpdateStatus,_tGet?:(key:string,...args:string[])=>string) { document.getElementById('title-bar-update-badge')?.remove(); }
