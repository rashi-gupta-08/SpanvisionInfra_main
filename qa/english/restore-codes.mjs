import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
function tokens(source){const out=[];function visit(n){if(ts.isStringLiteral(n))out.push(n);ts.forEachChild(n,visit);}visit(source);return out;}
function nearest(n){let a=n.parent;while(a&&!(ts.isStatement(a)||ts.isPropertyAssignment(a)))a=a.parent;return a??n.parent;}
function key(n,source){const a=nearest(n);const list=tokens(a);let text=a.getText(source);const start=a.getStart(source);for(const item of list.toReversed())text=text.slice(0,item.getStart(source)-start)+'""'+text.slice(item.end-start);return text.replace(/\s+/g,' ')+':'+list.indexOf(n);}
const log=[];
for(const original of files('qa/english/originals').filter(f=>/\.(tsx?|jsx?)$/.test(f))){
 const file=path.relative('qa/english/originals',original);if(!fs.existsSync(file)||file.includes('i18n'))continue;
 const oldText=fs.readFileSync(original,'utf8'),text=fs.readFileSync(file,'utf8');const kind=file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const old=ts.createSourceFile(file,oldText,ts.ScriptTarget.Latest,true,kind),current=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,kind);
 const index=new Map();for(const n of tokens(old)){const k=key(n,old);const values=index.get(k)??new Set();values.add(n.text);index.set(k,values);}
 const replacements=[];
 for(const n of tokens(current)){
  const p=n.parent;
  const compare=ts.isBinaryExpression(p)&&p.operatorToken.kind!==ts.SyntaxKind.PlusToken;
  const arrayCode=ts.isArrayLiteralExpression(p)&&/^[a-zA-Z][\w.-]*$/.test(n.text);
  const type=ts.isLiteralTypeNode(p);
  const returnCode=ts.isReturnStatement(p)&&/^[a-z][\w.-]*$/.test(n.text);
  const propertyCode=ts.isPropertyAssignment(p)&&p.initializer===n&&/^(id|kind|type|category|value|code|country|bouwvak|bucket|locale|lang|mode|setting|operation)$/.test(p.name.getText(current));
  const conditionalCode=ts.isConditionalExpression(p)&&p.condition!==n&&/^[a-zA-Z][\w.-]*$/.test(n.text);
  if(!(compare||arrayCode||type||returnCode||propertyCode||conditionalCode))continue;
  const candidates=index.get(key(n,current));if(!candidates||candidates.size!==1)continue;const oldValue=[...candidates][0];
  if(oldValue!==n.text){replacements.push({start:n.getStart(current),end:n.end,value:JSON.stringify(oldValue)});log.push({file,from:n.text,to:oldValue});}
 }
 let after=text;for(const r of replacements.sort((a,b)=>b.start-a.start))after=after.slice(0,r.start)+r.value+after.slice(r.end);if(after!==text)fs.writeFileSync(file,after);
}
fs.writeFileSync('qa/english/restored-codes.json',JSON.stringify(log,null,2));console.log(`${log.length} internal codes preserved from the original source.`);
