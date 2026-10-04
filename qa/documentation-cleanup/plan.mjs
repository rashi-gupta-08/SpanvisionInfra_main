import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root} from '../../branding/common.mjs';

const directory=path.join(root,'qa/documentation-cleanup');
const inventory=JSON.parse(fs.readFileSync(path.join(directory,'inventory.json'),'utf8'));
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function reason(e){
 const name=path.posix.basename(e.relative),p=e.relative;
 if(/(^|\/)(legal|licenses|dependency-licenses)(\/|$)/i.test(p)||/(license|notices?|attribution|copyright)/i.test(name))return null;
 if(p.startsWith('public/')||p.includes('/public/'))return null;
 if(e.module==='planner'&&p.startsWith('docs/superpowers/evidence/'))return null;
 if(e.module==='calculation'&&p==='docs/UPSTREAM-README.md')return null;
 if(e.module==='frame'&&p==='docs/upstream/README.md')return null;
 if(e.module==='calc'&&p==='docs/source-provenance/UPSTREAM_README.md')return null;
 if(/^AGENTS\.md$/i.test(name)||p.startsWith('.claude/')||/^CLAUDE\.md$/i.test(name))return null;
 if(/(^|\/)(superpowers|archive|archief|onderhoudbaarheid|claude-code|research|pocs|provenance|source-provenance|upstream)(\/|$)/i.test(p))return 'Historical design, research or upstream source record';
 if(/^(PLAN|TODO|STATUS|AUTO_CLAUDE_SETUP|backlog)\.md$/i.test(name))return 'Planning, backlog or setup record';
 if(/^README-SPANVISION\.md$/i.test(name))return 'Duplicate edition README';
 if(/^(release-notes-v|RELEASE_NOTES_v)/i.test(name))return 'Older release notes';
 if(e.module==='planner'&&p.startsWith('docs/release-notes/')&&!p.endsWith('/v2026.9.0.md'))return 'Older release notes';
 if(e.module==='pdf'&&(/^(docs\/voorstel-|docs\/logboek\.md$|docs\/performance\/)/i.test(p)||p==='mcpb/INDIENEN.md'))return 'Historical proposal, log, measurement or submission instructions';
 if(e.module==='pdf'&&p==='open-pdf-studio/README.md')return 'Outdated Electron README; current Tauri edition instructions are in the workspace README';
 if(e.module==='frame'&&/(onderzoek|gap-analyse)/i.test(name))return 'Historical research or gap analysis';
 if(e.module==='fem'&&p.startsWith('design-mockup/'))return 'Retired interface prototype documentation';
 if(e.module==='fem'&&p==='docs/verification/iteration-log.md')return 'Historical verification iteration log';
 if(e.module==='geo'&&/^(COMPONENT-MANIFEST|INTEGRATION)\.md$/i.test(name))return 'Retired interface prototype integration record';
 if(e.module==='pile'&&p.startsWith('docs/designs/'))return 'Dated design record';
 if(/UPSTREAM-README\.md$/i.test(name))return 'Original source README; active edition README is retained';
 if(/^README\.md$/i.test(name)&&fs.readFileSync(path.join(root,e.path),'utf8').match(/^# (React \+ TypeScript \+ Vite|React \+ Vite|Svelte \+ Vite)/m))return 'Unmodified framework template README';
 return null;
}
const entries=inventory.entries.map(e=>({...e,reason:reason(e),sha256:sha(path.join(root,e.path))}));
const plan={plannedAt:new Date().toISOString(),archiveRoot:'source-provenance',moves:entries.filter(e=>e.reason).map(e=>({...e,destination:`source-provenance/${e.moduleRoot}/${e.relative}`})),retained:entries.filter(e=>!e.reason)};
fs.writeFileSync(path.join(directory,'plan.json'),JSON.stringify(plan,null,2)+'\n');
for(const id of [...new Set(entries.map(e=>e.module))])console.log(JSON.stringify({module:id,archive:plan.moves.filter(e=>e.module===id).length,retain:plan.retained.filter(e=>e.module===id).length}));
console.log(JSON.stringify({archiveTotal:plan.moves.length,retainedTotal:plan.retained.length,archiveBytes:plan.moves.reduce((sum,e)=>sum+e.bytes,0)}));
