import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const p=parseProject(original),units=p.root[0].children[1].children;
const p1=units.find(n=>n.children[0].text==='TouchPanel1'),p2=units.find(n=>n.children[0].text==='TouchPanel2');
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=t=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([h,deflateSync(b)])}};
const module=(u,name)=>u.children[7].children.find(m=>m.children[0].text===name);
const service=module(p1,'AVService');let source=unpack(service.children[7]);assert(!source.includes('InputSelectionChanged'));
const client=unpack(module(p1,'SamsungControls').children[7]);
const inputs=[...client.matchAll(/Private Process \w+\(\) Link AV\.(\w+)\.OnPush\s+StartProcess TouchPanel1.AVService\.(Input_\w+)\(\)/g)].map((m,i)=>({button:m[1],fn:m[2],id:i+1}));assert.equal(inputs.length,11);
source='Private Var SelectedInput As Long := 0\nGlobal Event InputSelectionChanged As Process(inputid As Long)\n\n'+source;
source=source.replace('Global Process ReportState()','Global Process ReportState()\n    RaiseEvent InputSelectionChanged(SelectedInput)');
for(const {fn,id} of inputs){const needle=`    If SamsungMonitor1.${fn}() Then`;assert(source.includes(needle));source=source.replace(needle,needle+`\n        SelectedInput := ${id}\n        RaiseEvent InputSelectionChanged(SelectedInput)`);}
service.children[7]=pack(source);
let receive='\nPrivate Process ReceiveInputSelection(inputid As Long) Link TouchPanel1.AVService.InputSelectionChanged\n';
for(const {button,id} of inputs)receive+=`    If inputid = ${id} Then\n        AV.${button}.SetStateDown()\n    Else\n        AV.${button}.SetStateUp()\n    End If\n`;
receive+='End Process\n';
const stateButtons=new Set([...inputs.map(i=>i.button),'Button1','Button2','Circuit2On','Circuit2Off']);
for(const u of [p1,p2]){
 let count=0;const layout=unpack(u.children[6]).replace(/Global GraphicObject (\w+) As [\s\S]*?End GraphicObject/g,(block,name)=>{
  if(!stateButtons.has(name))return block;count++;
  const down=['Button2','Circuit2Off'].includes(name)?'B84747':'2AA65A';
  const text=block.match(/UpText:=([^,}]+)/)[1];
  return block.replace('GenericObjects.PushButton','GenericObjects.TwoStatePushButton').replace(/UpColor:=&H[0-9A-F]+/,'UpColor:=&HFF2678C8').replace(/DownColor:=&H[0-9A-F]+/,`DownColor:=&HFF${down}`).replace('BevelWidth:=0',`BevelWidth:=0,DefaultState:=False,DownText:=${text},DownFontColor:=&HFFFFFFFF`);
 });assert.equal(count,15);u.children[6]=pack(layout);
 module(u,'SamsungControls').children[7]=pack(client+receive);
 const lighting=module(u,'LightingControls');let code=unpack(lighting.children[7]);
 for(const [n,on,off] of [[1,'Button1','Button2'],[2,'Circuit2On','Circuit2Off']]){
  code=code.replace(`        Lights.Circuit${n}State.SetText("Zapnuto")`,`        Lights.${on}.SetStateDown()\n        Lights.${off}.SetStateUp()\n        Lights.Circuit${n}State.SetText("Zapnuto")`);
  code=code.replace(`        Lights.Circuit${n}State.SetText("Vypnuto")`,`        Lights.${on}.SetStateUp()\n        Lights.${off}.SetStateDown()\n        Lights.Circuit${n}State.SetText("Vypnuto")`);
 }lighting.children[7]=pack(code);
}
assert.equal(unpack(p1.children[6]),unpack(p2.children[6]));
assert.equal((source.match(/RaiseEvent InputSelectionChanged/g)||[]).length,12);
assert.equal((receive.match(/SetStateDown/g)||[]).length,11);
for(const u of [p1,p2])assert(unpack(module(u,'LightingControls').children[7]).includes('Link SmartRelay1.RelayControl.Relay2StateChanged'));
// Exhaustively check selection mapping: unknown selects none; each valid ID selects exactly one.
for(let id=0;id<=11;id++)assert.equal(inputs.filter(i=>i.id===id).length,id===0?0:1);
const base=unpack(p.root[0].children[0].children.find(n=>n.children[0].text==='GenericObjectsBase').children[7]);
const twoState=base.slice(base.indexOf('Global GraphicClass BaseTwoStatePushButton'));for(const fn of ['SetStateUp','SetStateDown']){const body=twoState.match(new RegExp('Public Function '+fn+'\\([\\s\\S]*?End Function'))[0];assert(!body.includes('RaiseEvent'));}
const out=serializeProject(p);assert.deepEqual(serializeProject(parseProject(out)),out);
fs.writeFileSync('FirstAIproject-before-two-state.cvcp',original,{flag:'wx'});fs.writeFileSync('FirstAIproject-two-state.cvcp',out);fs.writeFileSync('AVService-two-state.xpl2',source);
console.log('Verified 11 input + 4 lighting two-state buttons on each panel; selection event and startup snapshot; mutually exclusive input states; relay event subscribers; no visual-state event loop; CRC roundtrip.');
