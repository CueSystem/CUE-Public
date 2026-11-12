import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const p=parseProject(original),[resources,units]=p.root[0].children;
const p1=units.children.find(n=>n.children[0].text==='TouchPanel1'),p2=units.children.find(n=>n.children[0].text==='TouchPanel2'),relay=units.children.find(n=>n.children[0].text==='SmartRelay1');
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=t=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([h,deflateSync(b)])}};
const str=t=>({tag:3,payload:Buffer.from(t,'utf16le')});const int=value=>({tag:1,value});const group=(...children)=>({tag:240,children});const empty=()=>({tag:5,payload:Buffer.alloc(0)});
const mods=p1.children[7].children;const mod=name=>mods.find(n=>n.children[0].text===name);
function addModule(name,source){assert(!mod(name));mods.push(group(str(name),int(1),int(Math.max(...mods.map(n=>n.children[2].value))+1),str(''),str(''),empty(),empty(),pack(source),group(),group()));}
const rc=relay.children[7].children.find(n=>n.children[0].text==='RelayControl');
assert(!unpack(rc.children[7]).includes('DimmerLevelChanged'));
rc.children[7]=pack(unpack(rc.children[7])+`
Private Var SharedDimmerLevel As Double := 0
Global Event DimmerLevelChanged As Process(level As Double)
Global Event DimmerLevelRequested As Process(level As Double)

Global Process SetDimmerLevel(level As Double)
    If level < 0 Then level := 0 End If
    If level > 100 Then level := 100 End If
    SharedDimmerLevel := level
    RaiseEvent DimmerLevelRequested(SharedDimmerLevel)
    RaiseEvent DimmerLevelChanged(SharedDimmerLevel)
End Process

Global Process ReportLightingState()
    RaiseEvent Relay1StateChanged(RE1.IsClosed())
    RaiseEvent Relay2StateChanged(RE2.IsClosed())
    RaiseEvent DimmerLevelChanged(SharedDimmerLevel)
End Process
`);
mod('LightingControls').children[7]=pack(`Private Process DimmerChanged(level As Double) Link Lights.DimmerLevel.OnValueChange
    StartProcess SmartRelay1.RelayControl.SetDimmerLevel(level)
End Process

Private Process DimmerOff() Link Lights.DimmerOff.OnPush
    StartProcess SmartRelay1.RelayControl.SetDimmerLevel(0)
End Process

Private Process DimmerFull() Link Lights.DimmerFull.OnPush
    StartProcess SmartRelay1.RelayControl.SetDimmerLevel(100)
End Process

Private Process Circuit2On() Link Lights.Circuit2On.OnPush
    StartProcess SmartRelay1.RelayControl.Relay2On()
End Process

Private Process Circuit2Off() Link Lights.Circuit2Off.OnPush
    StartProcess SmartRelay1.RelayControl.Relay2Off()
End Process

Private Process ReceiveDimmer(level As Double) Link SmartRelay1.RelayControl.DimmerLevelChanged
    Private Var caption As Text[64]
    Lights.DimmerLevel.SetValue(level)
    FormatText(caption, "{n} %", level)
    Lights.DimmerValue.SetText(caption)
End Process

Private Process ReceiveRelay1(isclosed As Boolean) Link SmartRelay1.RelayControl.Relay1StateChanged
    If isclosed Then
        Lights.Circuit1State.SetText("Zapnuto")
    Else
        Lights.Circuit1State.SetText("Vypnuto")
    End If
End Process

Private Process ReceiveRelay2(isclosed As Boolean) Link SmartRelay1.RelayControl.Relay2StateChanged
    If isclosed Then
        Lights.Circuit2State.SetText("Zapnuto")
    Else
        Lights.Circuit2State.SetText("Vypnuto")
    End If
End Process
`);
// Network operations always run on the panel owning the single TCP driver.
const oldAV=unpack(mod('SamsungControls').children[7]);
const commands=[...oldAV.matchAll(/Private Process (\w+)\(\) Link AV\.(\w+)\.OnPush\s+SamsungMonitor1\.(\w+)\(\)/g)];assert.equal(commands.length,13);
let client='',service=`Private Var PowerCaption As Text[128] := "Monitor: stav neznámý"
Private Var InputCaption As Text[128] := "Vstup: dosud nezvolen"
Global Event AVStateChanged As Process(powertext As Text, inputtext As Text)

Global Process ReportState()
    RaiseEvent AVStateChanged(PowerCaption, InputCaption)
End Process

Private Process PowerFeedback(status As Long) Link SamsungMonitor1.OnPowerStatusChange
    If status = 1 Then
        PowerCaption := "Monitor: zapnutý"
    Else
        If status = 0 Then
            PowerCaption := "Monitor: vypnutý"
        Else
            PowerCaption := "Monitor: stav neznámý"
        End If
    End If
    RaiseEvent AVStateChanged(PowerCaption, InputCaption)
End Process
`;
for(const [,handler,button,fn] of commands){client+=`Private Process ${handler}() Link AV.${button}.OnPush\n    StartProcess TouchPanel1.AVService.${fn}()\nEnd Process\n\n`;const isPower=fn.startsWith('Power');const caption=isPower?(fn==='PowerOn'?'Zapnutí: příkaz odeslán':'Vypnutí: příkaz odeslán'):'Požadovaný vstup: '+fn.replace('Input_','').replaceAll('_',' ');const variable=isPower?'PowerCaption':'InputCaption';service+=`\nGlobal Process ${fn}()\n    If SamsungMonitor1.${fn}() Then\n        ${variable} := "${caption}"\n    Else\n        ${variable} := "Chyba odeslání povelu"\n    End If\n    RaiseEvent AVStateChanged(PowerCaption, InputCaption)\nEnd Process\n`;}
client+=`Private Process ReceiveAV(powertext As Text, inputtext As Text) Link TouchPanel1.AVService.AVStateChanged
    AV.PowerState.SetText(powertext)
    AV.InputState.SetText(inputtext)
End Process
`;
mod('SamsungControls').children[7]=pack(client);
mod('Navigation').children[7]=pack(unpack(mod('Navigation').children[7]).replace('    Lights.ShowObject()','    Lights.ShowObject()\n    StartProcess SmartRelay1.RelayControl.ReportLightingState()').replace('    AV.ShowObject()','    AV.ShowObject()\n    StartProcess TouchPanel1.AVService.ReportState()'));
mod('Main').children[7]=pack(`Private Process Autoexec()
    Navigation.ShowHome()
    StartProcess SmartRelay1.RelayControl.ReportLightingState()
    StartProcess TouchPanel1.AVService.ReportState()
End Process
`);
const common=resources.children.find(n=>n.children[0].text==='MyCommon');
function label(name,x,y,w,h){const key='txtSync'+name;common.children[8].children.push(group(str(`Public Const ${key} As Text`),group(group(int(0),{tag:4,payload:Buffer.from('Čekám na stav…','utf16le')}))));return `Global GraphicObject ${name} As MyController.GenericObjects.StaticText WithProperties\n { Left:=${x},Top:=${y},Width:=${w},Height:=${h},Visible:=True,Locked:=0,_CollectionID:=0,stxText:=MyCommon.${key},Color:=&HFFFFFFFF}\n End GraphicObject\n`;}
let layout=unpack(p1.children[6]);
const extras={Lights:label('Circuit1State',950,175,260,80)+label('Circuit2State',950,355,260,80)+label('DimmerValue',600,635,270,65),AV:label('PowerState',280,710,450,55)+label('InputState',750,710,490,55)};
layout=layout.replace(/Global _GraphicWindow (\w+)[\s\S]*?End _GraphicWindow/g,(block,name)=>extras[name]?block.replace('End _GraphicWindow',extras[name]+'End _GraphicWindow'):block);
p1.children[6]=pack(layout);
// Identical UI and client modules; keep each panel's identity and network configuration.
function clone(n){const c={...n};if(n.payload)c.payload=Buffer.from(n.payload);if(n.children)c.children=n.children.map(clone);return c;}
p2.children[6]=clone(p1.children[6]);p2.children[7]=clone(p1.children[7]);
addModule('AVService',service);
const out=serializeProject(p),verified=parseProject(out);assert.deepEqual(serializeProject(verified),out);
assert.equal(unpack(p1.children[6]),unpack(p2.children[6]));
for(const m of p2.children[7].children){assert.equal(unpack(m.children[7]),unpack(mod(m.children[0].text).children[7]));}
assert.equal((client.match(/StartProcess TouchPanel1.AVService/g)||[]).length,13);
assert(!unpack(p2.children[7].children.find(m=>m.children[0].text==='SamsungControls').children[7]).includes('SamsungMonitor1.'));
// SetValue is a render update, not a touch event: verify library has no event raise in that function.
const base=unpack(resources.children.find(n=>n.children[0].text==='GenericObjectsBase').children[7]);
const slider=base.slice(base.indexOf('Private GraphicClass BaseSlider'),base.indexOf('Global GraphicClass BaseHorizontalSlider'));
const setValue=slider.match(/Public Function SetValue\([\s\S]*?End Function/);assert(setValue);assert(!setValue[0].includes('RaiseEvent'));
const pageObjects={};for(const m of layout.matchAll(/Global _GraphicWindow (\w+)[\s\S]*?End _GraphicWindow/g))pageObjects[m[1]]=new Set([...m[0].matchAll(/Global GraphicObject (\w+)/g)].map(x=>x[1]));
for(const m of mods)for(const link of unpack(m.children[7]).matchAll(/Link (Home|AV|Lights|HVAC)\.(\w+)\./g))assert(pageObjects[link[1]].has(link[2]));
const old=parseProject(original);assert.deepEqual(p.root[0].children[2],old.root[0].children[2]);
fs.writeFileSync('FirstAIproject-before-panel-sync.cvcp',original,{flag:'wx'});fs.writeFileSync('FirstAIproject-panel-sync.cvcp',out);fs.writeFileSync('AVService.xpl2',service);fs.writeFileSync('LightingControls-synchronized.xpl2',unpack(mod('LightingControls').children[7]));
console.log('Verified identical panel layouts and client modules; 13 AV calls routed to owner; shared dimmer, relay events and snapshots; no SetValue event feedback loop; graphic links and CRC roundtrip.');
