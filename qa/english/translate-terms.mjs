import fs from 'node:fs';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const all=JSON.parse(fs.readFileSync('qa/english/all-ui-text.json','utf8'));
const terms=JSON.parse(fs.readFileSync('qa/english/terms.json','utf8'));
const whole={...JSON.parse(fs.readFileSync('qa/english/manual-translations.json','utf8')),...JSON.parse(fs.readFileSync('qa/english/more-translations.json','utf8'))};
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const matcher=new RegExp(`(?<![\\p{L}\\p{N}_-])(?:${Object.keys(terms).sort((a,b)=>b.length-a.length).map(escape).join('|')})(?![\\p{L}\\p{N}_-])`,'gu');
function translate(s){const trimmed=s.trim();if(whole[trimmed])return s.replace(trimmed,whole[trimmed]);return s.replace(matcher,m=>terms[m]);}
const log=[];
for(const file of [...new Set(Object.values(all).flat().map(row=>row.file))]){
 if(file.includes('sondeerbedrijven')||file.includes('aiTools')||file.includes('templates'))continue;
 let source=fs.readFileSync(file,'utf8');let after=source;
 if(file.endsWith('.svelte')){
  after=source.replace(/>([^<>\n{}]+)</g,(m,s)=>'>'+translate(s)+'<').replace(/((?:title|placeholder|aria-label|alt)=["'])([^"']+)(["'])/g,(m,pre,s,end)=>pre+translate(s)+end);
 }else{
  const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const replacements=[];
  function visit(n){
   if(n.parent&&(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))){
    const p=n.parent;
    const attribute=ts.isJsxAttribute(p)&&['title','placeholder','aria-label','alt'].includes(p.name.text);
    const property=ts.isPropertyAssignment(p)&&p.initializer===n&&['label','name','title','description','hint','invoke','caption','placeholder','help','tooltip','defaultValue','shortDescription','uitleg'].includes(p.name.getText(parsed));
    const conditional=ts.isConditionalExpression(p)&&p.condition!==n;
    const concat=ts.isBinaryExpression(p)&&p.operatorToken.kind===ts.SyntaxKind.PlusToken;
    const call=(ts.isCallExpression(p)||ts.isNewExpression(p))&&/alert|confirm|prompt|toast|notify|Error|setError|setMessage|setStatus|pushWarning/i.test(p.expression.getText(parsed));
    let a=p;while(a&&!ts.isJsxExpression(a)&&!ts.isCallExpression(a)&&!ts.isVariableDeclaration(a))a=a.parent;
    const template=(ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))&&a&&ts.isJsxExpression(a);
    if(ts.isJsxText(n)||attribute||property||conditional||concat||call||ts.isJsxExpression(p)||template){
     const text=translate(n.text);if(text!==n.text){
      const start=n.getStart(parsed);let value;
      if(ts.isJsxText(n))value=n.getText(parsed).replace(n.text,text);
      else if(template)value=n.getText(parsed).replace(n.text,text);
      else value=attribute?`{${JSON.stringify(text)}}`:JSON.stringify(text);
      replacements.push({start,end:n.end,value,before:n.text,after:text});
     }
    }
   }ts.forEachChild(n,visit);
  }visit(parsed);
  let last=Infinity;for(const r of replacements.sort((a,b)=>b.start-a.start)){if(r.end>last)continue;after=after.slice(0,r.start)+r.value+after.slice(r.end);last=r.start;log.push({file,before:r.before,after:r.after});}
 }
 if(after!==source)fs.writeFileSync(file,after);
}
fs.writeFileSync('qa/english/term-edits.json',JSON.stringify(log,null,2));
console.log(`${log.length} additional interface labels translated.`);
