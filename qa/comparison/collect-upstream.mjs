import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(await fs.readFile(path.join(out, 'upstream-repos.json'), 'utf8'));
const names = ['open-pdf-studio','open-planner-studio','Open-Calculations-Studio','open-calc-studio','monty-ifc-viewer','open-geotechniek-studio','open-speech-studio','OpenAEC-BIM-validator','Open-Field-Studio','open-frame-studio','open-pointcloud-studio','pile-plan-studio','Open-STL-3DMap-Studio','openaec-installer','open-heatloss-studio','open-3d-studio','openaec-bcf-platform','open-energy-studio','Y-app-ERPNext'];
const requested = process.argv.slice(2);
const queue = requested.length ? [...requested] : [...names];
const records = [];
await fs.mkdir(path.join(out, 'upstream'), {recursive:true});
async function collect(name) {
  const repo = snapshot.repos.find(r => r.name.toLowerCase() === name.toLowerCase());
  if (!repo) return {name,error:'Not in organization snapshot'};
  const headers = {'User-Agent':'Spanvision-readiness-review','Accept':'application/vnd.github+json'};
  const [releaseResponse, readmeResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo.full_name}/releases?per_page=6`, {headers}),
    fetch(`https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/README.md`, {headers})
  ]);
  const releases = releaseResponse.ok ? await releaseResponse.json() : {status:releaseResponse.status,body:await releaseResponse.text()};
  const readme = await readmeResponse.text();
  if(readmeResponse.ok) await fs.writeFile(path.join(out,'upstream',`${name}.README.md`), readme);
  const result = {name:repo.name,url:repo.html_url,branch:repo.default_branch,pushedAt:repo.pushed_at,archived:repo.archived,openIssues:repo.open_issues_count,readmeStatus:readmeResponse.status,releases:Array.isArray(releases)?releases.map(r=>({tag:r.tag_name,url:r.html_url,prerelease:r.prerelease,draft:r.draft,publishedAt:r.published_at,body:r.body,assets:r.assets.map(a=>({name:a.name,size:a.size,url:a.browser_download_url}))})):releases};
  records.push(result);
  console.log(JSON.stringify({name:result.name,pushedAt:result.pushedAt,readmeStatus:result.readmeStatus,releases:Array.isArray(result.releases)?result.releases.slice(0,3).map(r=>({tag:r.tag,prerelease:r.prerelease,publishedAt:r.publishedAt,assets:r.assets.map(a=>a.name)})):result.releases}));
}
await Promise.all(Array.from({length:3}, async()=>{while(queue.length){await collect(queue.shift());}}));
let prior=[];
if(requested.length){try{prior=JSON.parse(await fs.readFile(path.join(out,'upstream-products.json'),'utf8')).products;}catch{}}
const merged=[...prior.filter(p=>!records.some(r=>r.name===p.name)),...records];
await fs.writeFile(path.join(out,'upstream-products.json'), JSON.stringify({checkedAt:new Date().toISOString(),products:merged},null,2)+'\n');
