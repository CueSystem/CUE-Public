import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
const sourcePath='C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject_v02.cvcp';
const original=fs.readFileSync(sourcePath),p=parseProject(original);
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=t=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([h,deflateSync(b)])}};
const units=p.root[0].children[1].children;
const mod=(u,name)=>u.children[7].children.find(n=>n.children[0].text===name);
const p1=units.find(n=>n.children[0].text==='TouchPanel1'),p2=units.find(n=>n.children[0].text==='TouchPanel2');
let service=unpack(mod(p1,'AVService').children[7]);
const inputs=[...service.matchAll(/Global Process (Input_\w+)\(\)[\s\S]*?SelectedInput := (\d+)[\s\S]*?InputCaption := "([^"]+)"[\s\S]*?End Process/g)].map(m=>({fn:m[1],id:+m[2],caption:m[3]}));assert.equal(inputs.length,11);
for(const [u,peer] of [[p1,'TouchPanel2'],[p2,'TouchPanel1']]){
 let client=unpack(mod(u,'SamsungControls').children[7]);
 let count=0;
 for(const {fn,id} of inputs){const call=`    StartProcess TouchPanel1.AVService.${fn}()`;assert(client.includes(call));client=client.replace(call,`    ApplyInputSelection(${id})\n    RaiseEvent InputPressed(${id})`);count++;}assert.equal(count,11);
 client='Global Event InputPressed As Process(inputid As Long)\nPrivate Var LocalInput As Long := 0\n\n'+client;
 client=client.replace('    AV.InputState.SetText(inputtext)','    // Input indication is owned exclusively by button/peer events.');
 const header='Private Process ReceiveInputSelection(inputid As Long) Link TouchPanel1.AVService.InputSelectionChanged';assert(client.includes(header));
 client=client.replace(header,'Public Function ApplyInputSelection(inputid As Long)\n    LocalInput := inputid');
 // The previous last process becomes a local UI-only function.
 const idx=client.indexOf('Public Function ApplyInputSelection');const end=client.indexOf('End Process',idx);assert(end>idx);
 const captions='    Select inputid\n'+inputs.map(i=>`        Case ${i.id}\n            AV.InputState.SetText("${i.caption}")`).join('\n')+'\n    End Select\n';
 client=client.slice(0,end)+captions+'End Function'+client.slice(end+'End Process'.length);
 client+=`\nPrivate Process PeerInput(inputid As Long) Link ${peer}.SamsungControls.InputPressed\n    ApplyInputSelection(inputid)\nEnd Process\n`;
 // Snapshot uses the UI state, never the potentially busy driver service.
 client+=`\nGlobal Event InputSnapshot As Process(inputid As Long)\nGlobal Process ReportInputSelection()\n    If LocalInput > 0 Then\n        RaiseEvent InputSnapshot(LocalInput)\n    End If\nEnd Process\n\nPrivate Process PeerSnapshot(inputid As Long) Link ${peer}.SamsungControls.InputSnapshot\n    If LocalInput = 0 Then\n        ApplyInputSelection(inputid)\n    End If\nEnd Process\n`;
 mod(u,'SamsungControls').children[7]=pack(client);
 const main=mod(u,'Main');main.children[7]=pack(unpack(main.children[7]).replace('    Navigation.ShowHome()',`    Navigation.ShowHome()\n    StartProcess ${peer}.SamsungControls.ReportInputSelection()`));
 const nav=mod(u,'Navigation');nav.children[7]=pack(unpack(nav.children[7]).replace('    AV.ShowObject()',`    AV.ShowObject()\n    StartProcess ${peer}.SamsungControls.ReportInputSelection()`));
 assert(!client.includes('Link TouchPanel1.AVService.InputSelectionChanged'));
 for(const {id} of inputs)assert(client.includes(`ApplyInputSelection(${id})\n    RaiseEvent InputPressed(${id})`));
}
// Independent listeners receive the same button event; UI never calls or waits on these.
for(const owner of ['TouchPanel1','TouchPanel2'])service+=`\nPrivate Process ${owner}Input(inputid As Long) Link ${owner}.SamsungControls.InputPressed\n    Select inputid\n${inputs.map(i=>`        Case ${i.id}\n            StartProcess ${i.fn}()`).join('\n')}\n    End Select\nEnd Process\n`;
mod(p1,'AVService').children[7]=pack(service);
const out=serializeProject(p);assert.deepEqual(serializeProject(parseProject(out)),out);
assert.equal(unpack(p1.children[6]),unpack(p2.children[6]));
for(const u of [p1,p2]){const c=unpack(mod(u,'SamsungControls').children[7]);assert.equal((c.match(/RaiseEvent InputPressed\(/g)||[]).length,11);const peerHandler=c.match(/Private Process PeerInput[\s\S]*?End Process/)[0];assert(!peerHandler.includes('RaiseEvent'));assert(!peerHandler.includes('StartProcess'));}
fs.writeFileSync('FirstAIproject_v03.cvcp',out);fs.writeFileSync('SamsungControls-v03.xpl2',unpack(mod(p1,'SamsungControls').children[7]));
console.log('v03: 22 direct button event publishers, immediate local UI, direct peer subscriptions, independent driver listeners, no event echo or driver override; roundtrip verified.');
