import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
import { parse } from '../../vision-calculation-studio/packages/core/dist/parser.js';
const dictionaries=['terms','report-terms','manual-translations','more-translations','final-ui-translations','messages'];
const dictionary=Object.assign(Object.create(null),...dictionaries.map(f=>JSON.parse(fs.readFileSync(`qa/english/${f}.json`,'utf8'))));
const map=new Map(Object.entries(dictionary).map(([key,value])=>[key.toLowerCase(),value]));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const matcher=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...map.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')})(?![\\p{L}\\p{N}_])`,'giu');
function translate(text){
 const whole=map.get(text.trim().toLowerCase());if(whole)return text.replace(text.trim(),whole);
 return text.replace(matcher,word=>{const value=map.get(word.toLowerCase());return /^[A-Z]/.test(word)&&/^[a-z]/.test(value)?value[0].toUpperCase()+value.slice(1):value;});
}
function htmlText(text) {
 return text.split(/(<[^>]*>)/g).map(piece=>piece.startsWith('<')?piece:translate(piece)).join('');
}
function prose(text){return text.split("'").map((piece,index)=>index%2===0?htmlText(piece):piece).join("'");}
function convert(source){
 let select=false,svg=false;
 return source.split('\n').map(line=>{
  const indent=line.match(/^\s*/)[0],s=line.trim();
  if(s.startsWith('@select ')){select=true;return line.replace(/"([^"\n]*)"/,(m,label)=>'"'+translate(label)+'"');}
  if(s==='@svg'){svg=true;return line;}
  if(s==='@end'){select=false;svg=false;return line;}
  if(select)return line.replace(/^(.+?)(\s*=.*)$/,(m,label,code)=>translate(label)+code);
  if(svg)return line.replace(/>([^<>]*)</g,(m,label)=>'>'+prose(label)+'<');
  if(s.startsWith("'"))return indent+"'"+prose(line.slice(indent.length+1));
  if(s.startsWith('"'))return indent+'"'+translate(line.slice(indent.length+1));
  if(/^#{1,6}\s/.test(s))return line.replace(/^(\s*#{1,6}\s+)(.*)$/,(m,start,label)=>start+translate(label));
  // Inline annotations are text; the formula before them is retained verbatim.
  const comment=line.indexOf("'");
  if(comment>=0)return line.slice(0,comment)+"'"+prose(line.slice(comment+1));
  return line;
 }).join('\n');
}
function numericSignature(source){
 function clean(nodes){return nodes.flatMap(node=>{
  if(node.type==='text'||node.type==='heading')return [];
  const n={...node};delete n.raw;
  if(n.type==='select'){delete n.label;n.options=n.options.map(o=>({value:o.value}));}
  if(n.type==='svg'||n.type==='image')return [];
  if(n.body)n.body=clean(n.body);if(n.branches)n.branches=n.branches.map(b=>({...b,body:clean(b.body)}));
  if(n.elseBody)n.elseBody=clean(n.elseBody);if(n.ifBody)n.ifBody=clean(n.ifBody);
  return [n];
 });}return JSON.stringify(clean(parse(source)));
}
const dir='vision-calculation-studio/packages/desktop/src/templates',log=[];let verified=0;
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.ts')&&!n.startsWith('calcpad-')&&n!=='index.ts')){
 const file=path.join(dir,name),text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),edits=[];
 function visit(n){if(ts.isNoSubstitutionTemplateLiteral(n)){
  const translated=convert(n.text);if(translated!==n.text){
   if(numericSignature(n.text)!==numericSignature(translated))throw new Error(`Calculation changed in ${name}. Translation was not applied.`);
   verified++;edits.push({start:n.getStart(source),end:n.end,value:'`'+translated.replaceAll('`','\\`').replaceAll('${','\\${')+'`'});
   log.push({file,before:n.text,after:translated});
  }
 }ts.forEachChild(n,visit);}visit(source);
 let after=text;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.value+after.slice(e.end);
 if(after!==text)fs.writeFileSync(file,after);
}
fs.writeFileSync('qa/english/template-translations.json',JSON.stringify(log,null,2));
console.log(`${verified} built-in calculation documents translated; their calculation expressions and option values are unchanged.`);
