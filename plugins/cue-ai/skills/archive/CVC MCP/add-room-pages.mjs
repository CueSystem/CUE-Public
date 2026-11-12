import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const p=parseProject(original), [resources,units]=p.root[0].children;
const panel=units.children.find(n=>n.children[0].text==='TouchPanel1');
const relay=units.children.find(n=>n.children[0].text==='SmartRelay1');
const common=resources.children.find(n=>n.children[0].text==='MyCommon');
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=t=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([h,deflateSync(b)])}};
const str=t=>({tag:3,payload:Buffer.from(t,'utf16le')});const int=value=>({tag:1,value});
const group=(...children)=>({tag:240,children});const empty=()=>({tag:5,payload:Buffer.alloc(0)});
const oldLayout=unpack(panel.children[6]);assert.equal((oldLayout.match(/Global _GraphicWindow /g)||[]).length,1);
const objects=[...oldLayout.matchAll(/Global GraphicObject (\w+) As [\s\S]*?End GraphicObject/g)];
assert.equal(objects.length,15);
function txt(name,value){const key='txtRoom'+name;assert(!common.children[8].children.some(n=>n.children[0].text===`Public Const ${key} As Text`));common.children[8].children.push(group(str(`Public Const ${key} As Text`),group(group(int(0),{tag:4,payload:Buffer.from(value,'utf16le')}))));return `MyCommon.${key}`;}
const labels={};for(const [key,value] of Object.entries({Home:'Home',AV:'AV',Lights:'Lights',HVAC:'HVAC',Welcome:'Ovládání místnosti',Intro:'Vyberte AV, Lights nebo HVAC v levém menu.',HVACNote:'Ovládání HVAC zatím není nakonfigurováno.',Circuit1:'Světelný okruh 1',Circuit2:'Světelný okruh 2',Dimmer:'Stmívaný okruh',DimmerNote:'Připraveno pro napojení stmívače',On:'Zapnout',Off:'Vypnout',Zero:'0 %',Full:'100 %'}))labels[key]=txt(key,value);
function obj(name,type,x,y,w,h,props){assert(x>=0&&y>=0&&x+w<=1280&&y+h<=800);return `Global GraphicObject ${name} As MyController.GenericObjects.${type} WithProperties\n { Left:=${x},Top:=${y},Width:=${w},Height:=${h},Visible:=True,Locked:=0,_CollectionID:=0,${props}}\n End GraphicObject\n`;}
const button=(name,label,x,y,w=280,h=80,color='2678C8')=>obj(name,'PushButton',x,y,w,h,`UpText:=${label},UpColor:=&HFF${color},DownColor:=&HFF18508C,UpFontColor:=&HFFFFFFFF,BevelWidth:=0`);
const label=(name,text,x,y,w=920,h=55)=>obj(name,'StaticText',x,y,w,h,`stxText:=${text},Color:=&HFFFFFFFF`);
const pages=['Home','AV','Lights','HVAC'];let navigation='';
for(const page of pages)navigation+=`Public Function Show${page}()\n${pages.filter(n=>n!==page).map(n=>`    ${n}.HideObject()`).join('\n')}\n    ${page}.ShowObject()\nEnd Function\n\n`;
function page(name,body){let menu='';pages.forEach((dest,i)=>{menu+=button('Nav'+dest,labels[dest],20,120+i*110,200,85,name===dest?'287D46':'24384B');navigation+=`Private Process ${name}_Nav${dest}() Link ${name}.Nav${dest}.OnPush\n    Show${dest}()\nEnd Process\n\n`;});return `Global _GraphicWindow ${name} As MyController.GenericObjects.Page WithProperties\n { Left:=0,Top:=0,Width:=1280,Height:=800,Visible:=${name==='Home'?'True':'False'},Locked:=0,_CollectionID:=0,Color:=&HFF182434}\n`+menu+label('PageTitle',labels[name],280,25)+body+'End _GraphicWindow\n';}
let av='';objects.filter(m=>!['Button1','Button2'].includes(m[1])).forEach((m,i)=>{const x=i<2?280+i*480:280+((i-2)%3)*320;const y=i<2?120:250+Math.floor((i-2)/3)*110;const width=i<2?450:300;av+=m[0].replace(/Left:=\d+,Top:=\d+,Width:=\d+,Height:=\d+/,`Left:=${x},Top:=${y},Width:=${width},Height:=85`)+'\n';});
let lights=label('Circuit1Title',labels.Circuit1,280,110)+button('Button1',labels.On,300,175)+button('Button2',labels.Off,640,175,280,80,'A43D3D');
lights+=label('Circuit2Title',labels.Circuit2,280,290)+button('Circuit2On',labels.On,300,355)+button('Circuit2Off',labels.Off,640,355,280,80,'A43D3D');
lights+=label('DimmerTitle',labels.Dimmer,280,470)+obj('DimmerLevel','HorizontalSlider',310,545,850,65,'Minimum:=0,Maximum:=100,StepValue:=1,DefaultValue:=0,AutoSetValue:=True,Events:=True,BackgroundColor:=&HFF35485B,FloodColor:=&HFF38A96B,BevelWidth:=0');
lights+=button('DimmerOff',labels.Zero,310,635,260,65)+button('DimmerFull',labels.Full,900,635,260,65)+label('DimmerNote',labels.DimmerNote,280,715,920,45);
const layout=oldLayout.slice(0,oldLayout.indexOf('Global _GraphicWindow'))+page('Home',label('Welcome',labels.Welcome,280,190)+label('Intro',labels.Intro,280,280))+page('AV',av)+page('Lights',lights)+page('HVAC',label('Notice',labels.HVACNote,280,220));
panel.children[6]=pack(layout);
const modules=panel.children[7].children;const mod=name=>modules.find(n=>n.children[0].text===name);
mod('SamsungControls').children[7]=pack(unpack(mod('SamsungControls').children[7]).replaceAll('Link Home.','Link AV.'));
mod('RelayButtonEvents').children[7]=pack(unpack(mod('RelayButtonEvents').children[7]).replaceAll('Link Home.','Link Lights.'));
const main=mod('Main');assert(unpack(main.children[7]).includes('Home.ShowObject()'));main.children[7]=pack(unpack(main.children[7]).replace('Home.ShowObject()','Navigation.ShowHome()'));
function addModule(name,source){assert(!mod(name));modules.push(group(str(name),int(1),int(Math.max(...modules.map(n=>n.children[2].value))+1),str(''),str(''),empty(),empty(),pack(source),group(),group()));}
addModule('Navigation',navigation);
const lightCode=`Global Event DimmerLevelRequested As Process(level As Double)
Private Var RequestedLevel As Double := 0

Public Function SetDimmerLevel(level As Double)
    If level < 0 Then level := 0 End If
    If level > 100 Then level := 100 End If
    If level <> RequestedLevel Then
        RequestedLevel := level
        Lights.DimmerLevel.SetValue(level)
        RaiseEvent DimmerLevelRequested(level)
    End If
End Function

Private Process DimmerChanged(level As Double) Link Lights.DimmerLevel.OnValueChange
    SetDimmerLevel(level)
End Process

Private Process DimmerOff() Link Lights.DimmerOff.OnPush
    SetDimmerLevel(0)
End Process

Private Process DimmerFull() Link Lights.DimmerFull.OnPush
    SetDimmerLevel(100)
End Process

Private Process Circuit2On() Link Lights.Circuit2On.OnPush
    StartProcess SmartRelay1.RelayControl.Relay2On()
End Process

Private Process Circuit2Off() Link Lights.Circuit2Off.OnPush
    StartProcess SmartRelay1.RelayControl.Relay2Off()
End Process
`;
addModule('LightingControls',lightCode);
const relayModule=relay.children[7].children.find(n=>n.children[0].text==='RelayControl');
relayModule.children[7]=pack(unpack(relayModule.children[7])+`\nGlobal Event Relay2StateChanged As Process(isclosed As Boolean)\n\nGlobal Process Relay2On()\n    RE2.Close()\n    RaiseEvent Relay2StateChanged(RE2.IsClosed())\nEnd Process\n\nGlobal Process Relay2Off()\n    RE2.Open()\n    RaiseEvent Relay2StateChanged(RE2.IsClosed())\nEnd Process\n`);
const out=serializeProject(p);assert.deepEqual(serializeProject(parseProject(out)),out);
assert.equal((layout.match(/Global _GraphicWindow /g)||[]).length,4);
assert.equal((navigation.match(/ Link /g)||[]).length,16);
// Verify every linked graphic event resolves to an object on its new page.
const pageObjects={};for(const match of layout.matchAll(/Global _GraphicWindow (\w+)[\s\S]*?End _GraphicWindow/g))pageObjects[match[1]]=new Set([...match[0].matchAll(/Global GraphicObject (\w+)/g)].map(m=>m[1]));
for(const m of modules)for(const link of unpack(m.children[7]).matchAll(/Link (Home|AV|Lights|HVAC)\.(\w+)\./g))assert(pageObjects[link[1]].has(link[2]),'Missing linked object '+link[0]);
const before=parseProject(original);assert.deepEqual(units.children.find(n=>n.children[0].text==='TouchPanel2'),before.root[0].children[1].children.find(n=>n.children[0].text==='TouchPanel2'));
fs.writeFileSync('FirstAIproject-before-room-pages.cvcp',original,{flag:'wx'});fs.writeFileSync('FirstAIproject-room-pages.cvcp',out);fs.writeFileSync('TouchPanel1-room-layout.xpl2',layout);fs.writeFileSync('LightingControls.xpl2',lightCode);console.log('Verified four pages, 16 navigation links, 13 AV controls, RE1/RE2, dimmer event, unchanged TouchPanel2, CRC and exact binary roundtrip.');
