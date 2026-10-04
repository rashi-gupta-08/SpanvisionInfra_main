import fs from 'node:fs';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
// Keep the supplied engineering documents intact; translate their control labels and headings.
const log=JSON.parse(fs.readFileSync('qa/english/template-translations.json','utf8'));
const dictionary=Object.assign(Object.create(null),...['terms','report-terms','manual-translations','more-translations'].map(f=>JSON.parse(fs.readFileSync(`qa/english/${f}.json`,'utf8'))));
for(const key of ['en','of','de','het','een','in','is','op','uit','voor','van','met','aan','tot'])delete dictionary[key];
dictionary.EN='EN';dictionary.voor='for';dictionary.naar='to';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const matcher=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(escape).join('|')})(?![\\p{L}\\p{N}_])`,'gu');
const translate=text=>Object.hasOwn(dictionary,text.trim())?text.replace(text.trim(),dictionary[text.trim()]):text.replace(matcher,key=>dictionary[key]);
function labels(source){let select=false;return source.split('\n').map(line=>{
 const s=line.trim();if(s.startsWith('@select ')){select=true;return line.replace(/"([^"\n]*)"/,(m,label)=>'"'+translate(label)+'"');}
 if(s==='@end'){select=false;return line;}
 if(select)return line.replace(/^(.+?)(\s*=.*)$/,(m,label,code)=>translate(label)+code);
 if(s.startsWith('"'))return line.replace(/^(\s*")(.*)$/,(m,prefix,label)=>prefix+translate(label));
 if(/^#{1,6}\s/.test(s))return line.replace(/^(\s*#{1,6}\s+)(.*)$/,(m,prefix,label)=>prefix+translate(label));
 return line;
}).join('\n');}
for(const file of [...new Set(log.map(r=>r.file))]){
 const documents=log.filter(r=>r.file===file),text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),edits=[];let index=0;
 function visit(n){if(ts.isNoSubstitutionTemplateLiteral(n)){
  const entry=documents[index++];if(entry&&entry.after===n.text)edits.push({start:n.getStart(source),end:n.end,value:'`'+labels(entry.before).replaceAll('`','\\`').replaceAll('${','\\${')+'`'});
 }ts.forEachChild(n,visit);}visit(source);let after=text;for(const edit of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,edit.start)+edit.value+after.slice(edit.end);fs.writeFileSync(file,after);
}
console.log('Calculation document controls and headings are English; supplied engineering prose and formulas are preserved.');
