import fs from 'node:fs';
import assert from 'node:assert/strict';
import {deflateSync,inflateSync} from 'node:zlib';
import {parseProject,serializeProject} from './inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const p=parseProject(original),units=p.root[0].children[1].children;
const relay=units.find(u=>u.children[0].text==='SmartRelay1');
const panel=units.find(u=>u.children[0].text==='TouchPanel2');
assert(relay&&panel);
const relayModule=relay.children[7].children.find(m=>m.children[0].text==='RelayControl');
const statusModule=panel.children[7].children.find(m=>m.children[0].text==='RelayStatus');
assert(relayModule&&statusModule);
function pack(text){const raw=Buffer.from(text,'utf16le'),size=Buffer.alloc(4);size.writeUInt32LE(raw.length);return {tag:5,payload:Buffer.concat([size,deflateSync(raw)])};}
const relayCode=`Global Event Relay1StateChanged As Process(isclosed As Boolean)

Global Process Relay1On()
    RE1.Close()
    RaiseEvent Relay1StateChanged(RE1.IsClosed())
End Process

Global Process Relay1Off()
    RE1.Open()
    RaiseEvent Relay1StateChanged(RE1.IsClosed())
End Process

// One initial state request from the status panel; reply uses the same event.
Global Process ReportRelay1State()
    RaiseEvent Relay1StateChanged(RE1.IsClosed())
End Process
`;
const statusCode=`Public Function Initialize()
    Home.Relay1Indicator.HideObject()
    Home.StatusText.SetText("Relay 1: waiting for state")
    StartProcess SmartRelay1.RelayControl.ReportRelay1State()
End Function

Private Process OnRelay1StateChanged(isclosed As Boolean) Link SmartRelay1.RelayControl.Relay1StateChanged
    Home.Relay1Indicator.SetValue(isclosed)
    Home.Relay1Indicator.ShowObject()
    If isclosed Then
        Home.StatusText.SetText("Relay 1: ON")
    Else
        Home.StatusText.SetText("Relay 1: OFF")
    End If
End Process
`;
relayModule.children[7]=pack(relayCode);statusModule.children[7]=pack(statusCode);
const bytes=serializeProject(p),check=parseProject(bytes);
assert.deepEqual(serializeProject(check),bytes);
const sources=[];
for(const u of check.root[0].children[1].children) for(const m of u.children[7].children) sources.push(inflateSync(m.children[7].payload.subarray(4)).toString('utf16le'));
assert(sources.includes(relayCode)&&sources.includes(statusCode));
assert(!sources.some(s=>s.includes('_CallPeriodic')||s.includes('ReceiveRelay1State')||s.includes('_CallDelayed')));
assert.equal((relayCode.match(/RaiseEvent Relay1StateChanged/g)||[]).length,3);
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-before-events.cvcp',original,{flag:'wx'});
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-events.cvcp',bytes);
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-events.xpl2',relayCode+'\n// TouchPanel2 / RelayStatus\n'+statusCode);
console.log('Event publisher and linked subscriber verified; periodic polling and stale timeout removed.');
