import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const p=parseProject(original),units=p.root[0].children[1].children;
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=t=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([h,deflateSync(b)])}};
const module=(u,name)=>u.children[7].children.find(m=>m.children[0].text===name);
const p1=units.find(n=>n.children[0].text==='TouchPanel1'),p2=units.find(n=>n.children[0].text==='TouchPanel2');
const service=module(p1,'AVService');const old=unpack(service.children[7]);
const inputs=[...old.matchAll(/Global Process (Input_\w+)\(\)[\s\S]*?SelectedInput := (\d+)[\s\S]*?InputCaption := "([^"]+)"[\s\S]*?End Process/g)].map(m=>({fn:m[1],id:Number(m[2]),caption:m[3]}));assert.equal(inputs.length,11);
let code=`Private Var SelectedInput As Long := 0
Private Var InputRevision As Long := 0
Private Var InputSendLock As _Semaphore
Private Var PowerCaption As Text[128] := "Monitor: stav neznámý"
Private Var InputCaption As Text[128] := "Vstup: dosud nezvolen"
Global Event InputSelectionChanged As Process(inputid As Long)
Global Event AVStateChanged As Process(powertext As Text, inputtext As Text)

Global Process ReportState()
    RaiseEvent InputSelectionChanged(SelectedInput)
    RaiseEvent AVStateChanged(PowerCaption, InputCaption)
End Process

`;
code+=old.match(/Private Process PowerFeedback[\s\S]*?End Process/)[0]+'\n\n';
for(const {fn,id,caption} of inputs)code+=`Global Process ${fn}()
    SelectedInput := ${id}
    InputRevision += 1
    InputCaption := "${caption}"
    RaiseEvent InputSelectionChanged(SelectedInput)
    RaiseEvent AVStateChanged(PowerCaption, InputCaption)
    StartProcess SendInput(${id}, InputRevision)
End Process

`;
code+=`// TCP runs separately from the shared selection and its UI events.
// Discard obsolete queued selections; never overwrite a newer UI selection.
Private Process SendInput(inputid As Long, revision As Long)
    InputSendLock.Lock()
    If revision = InputRevision Then
        Select inputid
${inputs.map(i=>`            Case ${i.id}\n                SamsungMonitor1.${i.fn}()`).join('\n')}
        End Select
    End If
    InputSendLock.Unlock()
End Process

`;
for(const [fn,caption] of [['PowerOn','Požadavek: zapnout monitor'],['PowerOff','Požadavek: vypnout monitor']])code+=`Global Process ${fn}()
    PowerCaption := "${caption}"
    RaiseEvent AVStateChanged(PowerCaption, InputCaption)
    StartProcess Send${fn}()
End Process

Private Process Send${fn}()
    SamsungMonitor1.${fn}()
End Process

`;
service.children[7]=pack(code);
for(const u of [p1,p2]){
 const m=module(u,'SamsungControls');let client=unpack(m.children[7]);
 // Explicit runtime colors also cover property defaults in the imported graphics library.
 client=client.replace(/(        AV\.(\w+)\.SetStateDown\(\))/g,(_,line,name)=>`        AV.${name}.SetUpColor(&HFF2AA65A)\n        AV.${name}.SetDownColor(&HFF2AA65A)\n${line}`);
 client=client.replace(/(        AV\.(\w+)\.SetStateUp\(\))/g,(_,line,name)=>`        AV.${name}.SetUpColor(&HFF2678C8)\n        AV.${name}.SetDownColor(&HFF2AA65A)\n${line}`);
 m.children[7]=pack(client);
}
// Verify every input request publishes before dispatch, and performs no blocking driver call.
for(const {fn} of inputs){const body=code.match(new RegExp('Global Process '+fn+'\\(\\)[\\s\\S]*?End Process'))[0];assert(!body.includes('SamsungMonitor1.'));assert(body.indexOf('RaiseEvent InputSelectionChanged')<body.indexOf('StartProcess SendInput'));}
assert(code.includes('If revision = InputRevision Then'));
assert.equal(unpack(module(p1,'SamsungControls').children[7]),unpack(module(p2,'SamsungControls').children[7]));
const graphics=unpack(p.root[0].children[0].children.find(n=>n.children[0].text==='GenericObjects').children[7]);const cls=graphics.slice(graphics.indexOf('Global GraphicClass TwoStatePushButton'));assert(cls.includes('Public Function SetDownColor('));
const out=serializeProject(p);assert.deepEqual(serializeProject(parseProject(out)),out);
fs.writeFileSync('FirstAIproject_v02.cvcp',out);fs.writeFileSync('AVService-v02.xpl2',code);
console.log('v02 verified: 11 immediate selection events, separate TCP worker, superseded queued inputs skipped, explicit colors on both panels; CRC/roundtrip. Original unchanged.');
