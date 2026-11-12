import fs from 'node:fs';
import assert from 'node:assert/strict';
import {deflateSync,inflateSync} from 'node:zlib';
import {parseProject,serializeProject} from './inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const project=parseProject(original),root=project.root[0].children,units=root[1].children;
const str=text=>({tag:3,payload:Buffer.from(text,'utf16le')});
const int=value=>({tag:1,value});
const group=(...children)=>({tag:240,children});
const empty=()=>({tag:5,payload:Buffer.alloc(0)});
const read=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
function pack(text,tag=5){const raw=Buffer.from(text,'utf16le'),size=Buffer.alloc(4);size.writeUInt32LE(raw.length);return {tag,payload:Buffer.concat([size,deflateSync(raw)])};}
function module(name,id,source){return group(str(name),int(1),int(id),str(''),str(''),empty(),empty(),pack(source),group(),group());}
const panel1=units.find(u=>u.children[0].text==='TouchPanel1');
const relay=units.find(u=>u.children[0].text==='SmartRelay1');
assert(panel1&&relay);assert(!units.some(u=>u.children[0].text==='TouchPanel2'));
const oldPanel=serializeProject({version:project.version,root:[panel1]});
const relayModule=relay.children[7].children.find(m=>m.children[0].text==='RelayControl');
const oldRelay=read(relayModule.children[7]);
assert(!oldRelay.includes('ReportRelay1State'));
relayModule.children[7]=pack(oldRelay+`
Global Process ReportRelay1State()
    StartProcess TouchPanel2.RelayStatus.ReceiveRelay1State(RE1.IsClosed())
End Process
`);
const layout=`MyProperties { _DisplayWidth:=1280,_DisplayHeight:=800,_DefaultLanguageId:=0,_FullScreen:=False}
Global _GraphicWindow Home As MyController.GenericObjects.Page WithProperties
 { Left:=0,Top:=0,Width:=1280,Height:=800,Visible:=True,Locked:=0,_CollectionID:=0,Color:=&HFF182434}
Global GraphicObject Relay1Indicator As MyController.GenericObjects.Indicator WithProperties
 { Left:=560,Top:=270,Width:=160,Height:=160,Visible:=False,Locked:=0,_CollectionID:=0,ActiveColor:=&HFF28C76F,NonActiveColor:=&HFF748094,IndicatorValue:=False,Events:=False}
 End GraphicObject
Global GraphicObject StatusText As MyController.GenericObjects.StaticText WithProperties
 { Left:=340,Top:=470,Width:=600,Height:=80,Visible:=True,Locked:=0,_CollectionID:=0,Color:=&HFFFFFFFF}
 End GraphicObject
End _GraphicWindow
`;
const main=`Private Process Autoexec()
    Home.ShowObject()
    RelayStatus.Initialize()
End Process
`;
const status=`Public Function Initialize()
    ShowUnknown()
    RequestState()
    _CallPeriodic(RequestState, :1.0)
End Function

Private Function RequestState()
    StartProcess SmartRelay1.RelayControl.ReportRelay1State()
End Function

Global Process ReceiveRelay1State(isclosed As Boolean)
    Home.Relay1Indicator.SetValue(isclosed)
    Home.Relay1Indicator.ShowObject()
    If isclosed Then
        Home.StatusText.SetText("Relay 1: ON")
    Else
        Home.StatusText.SetText("Relay 1: OFF")
    End If
    _StopSchedule(ShowUnknown)
    _CallDelayed(ShowUnknown, :5.0)
End Process

Private Function ShowUnknown()
    Home.Relay1Indicator.HideObject()
    Home.StatusText.SetText("Relay 1: waiting for connection")
End Function
`;
const panel2=group(str('TouchPanel2'),int(Math.max(...units.map(u=>u.children[1].value))+1),int(0),int(0),int(0),str(panel1.children[5].text),pack(layout),
  group(module('Main',1,main),module('RelayStatus',2,status)),int(0),int(0),int(0),group(),{tag:4,payload:Buffer.alloc(0)});
units.push(panel2);
root[3]=pack(read(root[3]).replace('#DEVICES','"TouchPanel2" 75 240 "TouchPanels" "" 0\n#DEVICES'),6);
const output=serializeProject(project),verified=parseProject(output),verifiedUnits=verified.root[0].children[1].children;
assert.deepEqual(serializeProject(verified),output);
assert.equal(verifiedUnits.length,3);
assert.deepEqual(serializeProject({version:project.version,root:[verifiedUnits.find(u=>u.children[0].text==='TouchPanel1')]}),oldPanel);
const v=verifiedUnits.find(u=>u.children[0].text==='TouchPanel2');
assert.equal(v.children[5].text,panel1.children[5].text);
assert.equal(read(v.children[6]),layout);
assert.equal(read(v.children[7].children[1].children[7]),status);
assert.match(read(relayModule.children[7]),/RE1\.IsClosed\(\)/);
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-before-status-panel.cvcp',original,{flag:'wx'});
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-status-panel.cvcp',output);
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-status-panel.xpl2',layout+'\n// Main\n'+main+'\n// RelayStatus\n'+status);
console.log(JSON.stringify({bytes:output.length,units:verifiedUnits.map(u=>u.children[0].text),page:'Home',indicator:'Relay1Indicator',pollSeconds:1,staleSeconds:5,checks:'roundtrip, original panel unchanged, second panel definition and source verified'},null,2));
