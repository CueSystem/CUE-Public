import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from './inspect-project.mjs';
const input='C:/Users/Jaroslav Dibitanzl/Downloads/CoreGraphicLibrary_1.00 (1).cvcp';
const original=fs.readFileSync(input),p=parseProject(original),root=p.root[0].children;
const resources=root[0].children,unit=root[1].children[0];
const common=resources.find(r=>r.children[0].text==='MyCommon');
const library=resources.find(r=>r.children[0].text==='CoreGraphicLibrary');
const read=n=>n.payload.length?inflateSync(n.payload.subarray(4)).toString('utf16le'):'';
const str=text=>({tag:3,payload:Buffer.from(text,'utf16le')});
const int=value=>({tag:1,value});
const group=(...children)=>({tag:240,children});
const raw=text=>({tag:4,payload:Buffer.from(text,'utf16le')});
const empty=()=>({tag:5,payload:Buffer.alloc(0)});
function pack(text){const b=Buffer.from(text,'utf16le'),l=Buffer.alloc(4);l.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([l,deflateSync(b)])};}
let layout=read(unit.children[6]);
const used=new Set([...layout.matchAll(/MyCommon\.(\w+)/g)].map(m=>m[1]));
const translations=JSON.parse(fs.readFileSync('cvc-driver-mcp/core-czech.json','utf8'));
const unchanged=new Set(['+','−','— %','↑','←','OK','→','↓','— °C','DVD','CD','Světla','SVĚTELNÉ SCÉNY','Večer','Kino','Vše vypnout','Zapnout','Vypnout','Komfort','Vytápění','Tři světelné okruhy • stmívání a scény','HLAVNÍ OVLÁDÁNÍ','Vše zapnout','Stropní světla','Jas: — %','Nástěnná světla','Ambientní LED','Den','Odchod']);
let translated=0;
for(const n of common.children[8].children){
  const name=n.children?.[0]?.text?.match(/Const (\w+) As Text/)?.[1];if(!used.has(name))continue;
  const variants=n.children[1].children,base=variants.find(v=>v.children[0].value===0).children[1].payload.toString('utf16le');
  const cz=translations[base]??(/^Soverom \d+$/.test(base)?base.replace('Soverom','Ložnice'):/^Bad \d+$/.test(base)?base.replace('Bad','Koupelna'):unchanged.has(base)?base:undefined);
  assert.notEqual(cz,undefined,`Missing translation: ${base}`);
  assert(!variants.some(v=>v.children[0].value===32),'Czech already exists; review before overwriting');
  variants.push(group(int(32),raw(cz)));translated++;
}
assert.equal(translated,used.size);
for(const [name,base,cz] of [['txtLanguageCzech','Čeština','Čeština'],['txtLanguageOriginal','Original','Původní'],['txtEmpty','','']]){
  common.children[8].children.push(group(str(`Public Const ${name} As Text`),group(group(int(0),raw(base)),group(int(32),raw(cz)))));
}
const colors={FF101923:'FF10271D',FF35495D:'FF3F6952',FF45C8B3:'FF57C987',FF397A82:'FF2E8051',FFA7B8C9:'FFB7D7C4',FF1B2938:'FF19392A',FF293B4D:'FF254B36',FFF3F7FC:'FFF3FCF6',FF0B1930:'FF0D2418',FF57A6FF:'FF66DC91',FF37628D:'FF447653',FF3684E0:'FF36985A',FF16365B:'FF1D5033',FFF2F7FF:'FFF2FFF5',FFBDD5F0:'FFBDDFC7',FF102846:'FF153A25',FF2467C2:'FF287F47'};
layout=layout.replace(/&H([0-9A-F]{8})/g,(all,color)=>colors[color]?'&H'+colors[color]:all).replace('_DefaultLanguageId:=0','_DefaultLanguageId:=32');
// Reserve the top-right header area on the startup page for language controls.
const pageStart=layout.indexOf('Global _GraphicWindow CdPage ');assert(pageStart>=0);
const pageEnd=layout.indexOf('End _GraphicWindow',pageStart);
let cd=layout.slice(pageStart,pageEnd);
cd=cd.replace(/Global GraphicObject SystemCaption [\s\S]*?End GraphicObject\s*/,'');
for(const [name,x,text] of [['LanguageCzech',850,'txtLanguageCzech'],['LanguageOriginal',1050,'txtLanguageOriginal']])cd+=`Global GraphicObject ${name} As MyController.CoreGraphicLibrary.Button WithProperties
 { Left:=${x},Top:=28,Width:=180,Height:=62,Visible:=True,Locked:=0,_CollectionID:=0,BorderColor:=&HFF66DC91,BorderWidth:=1,ColorUp:=&HFF1D5033,ColorDown:=&HFF36985A,TextMain:=MyCommon.${text},TextHint:=MyCommon.txtEmpty,TextMainColor:=&HFFF2FFF5}
 End GraphicObject
`;
layout=layout.slice(0,pageStart)+cd+layout.slice(pageEnd);
unit.children[6]=pack(layout);
// Explicitly refresh cached button strings after SetLanguage.
let page,refresh=[];
for(const line of layout.split('\n')){
  const pm=line.match(/Global _GraphicWindow (\w+)/);if(pm)page=pm[1];
  const om=line.match(/Global GraphicObject (\w+) As .*\.(Button|Label) /);if(om)refresh.push({page,name:om[1],type:om[2],pending:true});
  if(refresh.at(-1)?.pending&&line.includes('MyCommon.')){
    const r=refresh.at(-1);const prop=r.type==='Button'?'TextMain':'stxText';
    const ref=line.match(new RegExp(prop+':=MyCommon\\.(\\w+)'));
    if(ref){r.ref=ref[1];r.pending=false;}
  }
}
const code=`Private Process CdPage_LanguageCzech_OnPush() Link CdPage.LanguageCzech.OnPush
    ApplyLanguage(_LANGUAGE_CZECH)
End Process

Private Process CdPage_LanguageOriginal_OnPush() Link CdPage.LanguageOriginal.OnPush
    ApplyLanguage(_LANGUAGE_DEFAULT)
End Process

Public Function ApplyLanguage(languageid As Long)
    SetLanguage(languageid)
${refresh.filter(r=>r.ref).map(r=>`    ${r.page}.${r.name}.${r.type==='Button'?'SetTextMain':'SetText'}(MyCommon.${r.ref})`).join('\n')}
End Function
`;
const modules=unit.children[7].children;
assert(!modules.some(m=>m.children[0].text==='Languages'));
modules.push(group(str('Languages'),int(1),int(Math.max(...modules.map(m=>m.children[2].value))+1),str(''),str(''),empty(),empty(),pack(code),group(),group()));
const main=modules.find(m=>m.children[0].text==='Main');
main.children[7]=pack(read(main.children[7]).replace(/(Private Process Autoexec\(\))/i,'$1\n    Languages.ApplyLanguage(_LANGUAGE_CZECH)'));
let lib=read(library.children[7]);
lib=lib.replace(/^.*DrawTextViaVectorFont\(vfntCALIBRI,"DDDDD".*\r?\n/gm,'');
library.children[7]=pack(lib);
const output=serializeProject(p),verified=parseProject(output);assert.deepEqual(serializeProject(verified),output);
assert.equal((layout.match(/Global _GraphicWindow /g)||[]).length,6);
assert.equal((layout.match(/Global GraphicObject Language/g)||[]).length,2);
assert(!lib.includes('"DDDDD"'));
assert.equal(refresh.filter(r=>r.ref).length,(layout.match(/As MyController.CoreGraphicLibrary\.(Button|Label) WithProperties/g)||[]).length);
fs.writeFileSync('cvc-driver-mcp/generated/CoreGraphicLibrary-before-green-czech.cvcp',original,{flag:'wx'});
fs.writeFileSync('cvc-driver-mcp/generated/CoreGraphicLibrary-green-czech.cvcp',output);
fs.writeFileSync('cvc-driver-mcp/generated/CoreGraphicLibrary-languages.xpl2',code);
fs.writeFileSync('cvc-driver-mcp/generated/CoreGraphicLibrary-green-layout.xpl2',layout);
console.log(JSON.stringify({bytes:output.length,translatedTexts:translated,pages:6,refreshedObjects:refresh.filter(r=>r.ref).length,startupPage:'CdPage',languages:['Czech (32)','Original (0)'],defaultLanguage:'Czech',checks:'byte-exact roundtrip and translation/layout coverage passed'},null,2));
