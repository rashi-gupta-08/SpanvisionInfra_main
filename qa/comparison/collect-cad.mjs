import fs from 'node:fs/promises';
const response=await fetch('https://api.github.com/repos/HakanSeven12/OpenCADStudio/releases?per_page=3',{headers:{'User-Agent':'Spanvision-readiness-review','Accept':'application/vnd.github+json'}});
const data=await response.json();
const report={checkedAt:new Date().toISOString(),status:response.status,releases:Array.isArray(data)?data.map(r=>({tag:r.tag_name,url:r.html_url,prerelease:r.prerelease,publishedAt:r.published_at,assets:r.assets.map(a=>({name:a.name,url:a.browser_download_url}))})):data};
await fs.writeFile(new URL('./upstream-cad.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
