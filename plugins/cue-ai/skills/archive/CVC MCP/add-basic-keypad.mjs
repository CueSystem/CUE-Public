import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
import {crc32} from '../CUE Docs/cvc-driver-mcp/driver.mjs';
let original;try{original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject_v04.cvcp')}catch(e){if(e.code!=='EBUSY')throw e;original=fs.readFileSync('FirstAIproject_v04.cvcp');console.log('Locked desktop v04: using generated v04 for new v05');}
const p=parseProject(original),[resources,units,devices,cfg]=p.root[0].children;
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=(t,tag=5)=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag,payload:Buffer.concat([h,deflateSync(b)])}};
const str=t=>({tag:3,text:t,payload:Buffer.from(t,'utf16le')});const int=value=>({tag:1,value});const group=(...children)=>({tag:240,children});const empty=()=>({tag:5,payload:Buffer.alloc(0)});
const mod=(u,name)=>u.children[7].children.find(m=>m.children[0].text===name);
function module(name,id,code){return group(str(name),int(1),int(id),str(''),str(''),empty(),empty(),pack(code),group(),group());}
function library(path,name){const b=fs.readFileSync('C:/Program Files/CUE/CUE Visual Composer/Data/'+path);assert.equal(b.readUInt32LE(0),crc32(b.subarray(4)));Buffer.from('089c58cadbb12695','hex').copy(b,4);b.writeUInt32LE(crc32(b.subarray(4)),0);const root=parseProject(b).root[0],r=root.children[0].tag===240?root.children[0]:root;assert.equal(r.children.length,8);resources.children.push(group(str(name),r.children[0],int(Math.max(...resources.children.map(n=>n.children[2].value))+1),...r.children.slice(1)));}
assert(!units.children.some(n=>n.children[0].text==='ControlBasic1'));
library('CUEunits/controlCUE-basic_CS0552_Firmware_21.70.cvcc','controlCUE_basic_21_70');
library('CUEdevices/CUEwire/RS485ToCUEwire_4.12.cvcd','RS485ToCUEwire_4_12');
library('CUEdevices/CUEwire/keypadCUE-55_4.14.cvcd','keypadCUE_55_4_14');
const p1=units.children.find(n=>n.children[0].text==='TouchPanel1'),p2=units.children.find(n=>n.children[0].text==='TouchPanel2'),relay=units.children.find(n=>n.children[0].text==='SmartRelay1');
const av=unpack(mod(p1,'AVService').children[7]);const inputs=[...av.matchAll(/Global Process (Input_\w+)\(\)[\s\S]*?SelectedInput := (\d+)[\s\S]*?End Process/g)].map(m=>({fn:m[1],id:+m[2]}));assert.equal(inputs.length,11);
let keypad=`Private Var SelectedInput As Long := 0
Global Event InputPressed As Process(inputid As Long)

Private Process MonitorOn() Link Keypad1.Button1.OnPush
    StartProcess TouchPanel1.AVService.PowerOn()
End Process
Private Process MonitorOff() Link Keypad1.Button2.OnPush
    StartProcess TouchPanel1.AVService.PowerOff()
End Process
Private Process PreviousInput() Link Keypad1.Button3.OnPush
    SelectedInput -= 1
    If SelectedInput < 1 Then SelectedInput := 11 End If
    RaiseEvent InputPressed(SelectedInput)
End Process
Private Process NextInput() Link Keypad1.Button4.OnPush
    SelectedInput += 1
    If SelectedInput > 11 Then SelectedInput := 1 End If
    RaiseEvent InputPressed(SelectedInput)
End Process
Private Process Light1() Link Keypad1.Button5.OnPush
    StartProcess SmartRelay1.RelayControl.ToggleRelay1()
End Process
Private Process Light2() Link Keypad1.Button6.OnPush
    StartProcess SmartRelay1.RelayControl.ToggleRelay2()
End Process
Private Process DimDown() Link Keypad1.Button7.OnPush
    StartProcess SmartRelay1.RelayControl.AdjustDimmer(-10)
End Process
Private Process DimUp() Link Keypad1.Button8.OnPush
    StartProcess SmartRelay1.RelayControl.AdjustDimmer(10)
End Process
`;
for(const panel of ['TouchPanel1','TouchPanel2'])keypad+=`\nPrivate Process ${panel}Input(inputid As Long) Link ${panel}.SamsungControls.InputPressed\n    SelectedInput := inputid\nEnd Process\n\nPrivate Process ${panel}Snapshot(inputid As Long) Link ${panel}.SamsungControls.InputSnapshot\n    If SelectedInput = 0 Then SelectedInput := inputid End If\nEnd Process\n`;
for(const n of [1,2])keypad+=`\nPrivate Process Relay${n}Feedback(isclosed As Boolean) Link SmartRelay1.RelayControl.Relay${n}StateChanged\n    If isclosed Then\n        Keypad1.Button${n+4}.LEDOn()\n    Else\n        Keypad1.Button${n+4}.LEDOff()\n    End If\nEnd Process\n`;
keypad+=`\nPrivate Process DimmerFeedback(level As Double) Link SmartRelay1.RelayControl.DimmerLevelChanged
    If level > 0 Then
        Keypad1.Button7.LEDOn()
    Else
        Keypad1.Button7.LEDOff()
    End If
    If level < 100 Then
        Keypad1.Button8.LEDOn()
    Else
        Keypad1.Button8.LEDOff()
    End If
End Process

Private Process MonitorFeedback(status As Long) Link SamsungMonitor1.OnPowerStatusChange
    Keypad1.Button1.LEDOff()
    Keypad1.Button2.LEDOff()
    If status = 1 Then Keypad1.Button1.LEDOn() End If
    If status = 0 Then Keypad1.Button2.LEDOn() End If
End Process
`;
const main=`Private Process Autoexec()
    Keypad1.SetBackLightBrightness(70)
    Keypad1.SetLEDBrightness(70)
    Keypad1.Button3.LEDOn()
    Keypad1.Button4.LEDOn()
    StartProcess SmartRelay1.RelayControl.ReportLightingState()
    StartProcess TouchPanel1.SamsungControls.ReportInputSelection()
    StartProcess TouchPanel2.SamsungControls.ReportInputSelection()
End Process
`;
units.children.push(group(str('ControlBasic1'),int(Math.max(...units.children.map(n=>n.children[1].value))+1),int(0),int(0),int(0),str('controlCUE_basic_21_70'),pack('MyProperties {}\n'),group(module('Main',1,main),module('KeypadControls',2,keypad)),int(0),int(0),int(0),group(),{tag:4,payload:Buffer.alloc(0)}));
devices.children.push(group(str('CUEwireBus1'),str('ControlBasic1'),str('RS485ToCUEwire_4_12'),pack('MyConnectors { RS485Connector:=MyProject.ControlBasic1.KEYPAD1 }\nMyProperties {}\n')));
devices.children.push(group(str('Keypad1'),str('ControlBasic1'),str('keypadCUE_55_4_14'),pack('MyConnectors { CUEwireConnector:=MyProject.CUEwireBus1.CUEwireConnector }\nMyProperties { Address:=2 }\n')));
for(const u of [p1,p2]){const m=mod(u,'SamsungControls');let code=unpack(m.children[7]);code+=`\nPrivate Process KeypadInput(inputid As Long) Link ControlBasic1.KeypadControls.InputPressed\n    ApplyInputSelection(inputid)\n`;if(u===p1)code+='    Select inputid\n'+inputs.map(i=>`        Case ${i.id}\n            StartProcess AVService.${i.fn}()`).join('\n')+'\n    End Select\n';code+='End Process\n';m.children[7]=pack(code);}
const rc=mod(relay,'RelayControl');let rcode=unpack(rc.children[7]);for(const n of [1,2])rcode+=`\nGlobal Process ToggleRelay${n}()\n    If RE${n}.IsClosed() Then\n        RE${n}.Open()\n    Else\n        RE${n}.Close()\n    End If\n    RaiseEvent Relay${n}StateChanged(RE${n}.IsClosed())\nEnd Process\n`;
rcode+=`\nGlobal Process AdjustDimmer(delta As Double)\n    SharedDimmerLevel := SharedDimmerLevel + delta\n    If SharedDimmerLevel < 0 Then SharedDimmerLevel := 0 End If\n    If SharedDimmerLevel > 100 Then SharedDimmerLevel := 100 End If\n    RaiseEvent DimmerLevelRequested(SharedDimmerLevel)\n    RaiseEvent DimmerLevelChanged(SharedDimmerLevel)\nEnd Process\n`;rc.children[7]=pack(rcode);
let config=unpack(cfg).replace('#DEVICES','"ControlBasic1" 650 30 "TouchPanels" "" 0\n#DEVICES').replace('#INTERNALDEBUGCONFIGURATION','"CUEwireBus1" 650 200 "TouchPanels"\n"Keypad1" 650 320 "TouchPanels"\n#INTERNALDEBUGCONFIGURATION');p.root[0].children[3]=pack(config,6);
for(const u of units.children){const seen=new Set();for(const m of u.children[7].children){for(const link of unpack(m.children[7]).matchAll(/\bLink\s+([^\s]+)/g)){const key=link[1].toLowerCase().replace(new RegExp('^'+u.children[0].text.toLowerCase()+'\\.'),'');assert(!seen.has(key),'Duplicate '+key);seen.add(key);}}}
assert.equal((keypad.match(/Link Keypad1.Button\d.OnPush/g)||[]).length,8);
const out=serializeProject(p);assert.deepEqual(serializeProject(parseProject(out)),out);fs.writeFileSync('FirstAIproject_v05.cvcp',out);fs.writeFileSync('KeypadControls-v05.xpl2',keypad);console.log('v05 verified: controlCUE-basic, KEYPAD1 -> RS485ToCUEwire -> keypadCUE-55 address 2; eight keys; event links unique per unit; CRC roundtrip.');

