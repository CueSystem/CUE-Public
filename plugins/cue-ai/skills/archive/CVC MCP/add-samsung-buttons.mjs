import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inflateSync,deflateSync} from 'node:zlib';
import {parseProject,serializeProject} from '../CUE Docs/cvc-driver-mcp/inspect-project.mjs';
const original=fs.readFileSync('C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp');
const p=parseProject(original), [resources,units,devices]=p.root[0].children;
const panel=units.children.find(n=>n.children[0].text==='TouchPanel1');
assert(devices.children.some(n=>n.children[0].text==='SamsungMonitor1'&&n.children[1].text==='TouchPanel1'));
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
const pack=t=>{const b=Buffer.from(t,'utf16le'),h=Buffer.alloc(4);h.writeUInt32LE(b.length);return {tag:5,payload:Buffer.concat([h,deflateSync(b)])}};
const str=t=>({tag:3,payload:Buffer.from(t,'utf16le')});
const int=value=>({tag:1,value});
const group=(...children)=>({tag:240,children});
const empty=()=>({tag:5,payload:Buffer.alloc(0)});
const common=resources.children.find(n=>n.children[0].text==='MyCommon');
const buttons=[['ProjectorOn','Zapnout projektor','PowerOn'],['ProjectorOff','Vypnout projektor','PowerOff'],
 ['InputHDMI1','HDMI 1','Input_HDMI_1'],['InputHDMI2','HDMI 2','Input_HDMI_2'],['InputDP','DisplayPort','Input_DisplayPort_1'],
 ['InputVGA','VGA','Input_VGA_1'],['InputDVI','DVI','Input_DVI_1'],['InputComponent','Component','Input_Component_1'],
 ['InputBNC','BNC','Input_BNC_1'],['InputComposite','Composite','Input_Composite_1'],['InputSVideo','S-Video','Input_Svideo_1'],
 ['InputMagicInfo','MagicInfo','Input_MagicInfo'],['InputMagicInfoLite','MagicInfo Lite','Input_MagicInfoLite']];
const driver=resources.children.find(n=>n.children[0].text==='SamsungDisplay_Generic_2_28');const source=unpack(driver.children[7]);
const available=[...source.matchAll(/^Global Function (Input_\w+)\s*\(/gm)].map(m=>m[1]);
assert.deepEqual(buttons.slice(2).map(b=>b[2]).sort(),available.sort());
let layout=unpack(panel.children[6]);assert(!layout.includes('ProjectorOn'));
// Preserve relay objects and callbacks, reserving a compact top row for them.
for(const [name,x] of [['Button1',40],['Button2',660]]) {
 const re=new RegExp('(Global GraphicObject '+name+' As [\\s\\S]*?\\{ )Left:=\\d+,Top:=\\d+,Width:=\\d+,Height:=\\d+');
 assert(re.test(layout));layout=layout.replace(re,`$1Left:=${x},Top:=30,Width:=580,Height:=80`);
}
let objects='',handlers='';
buttons.forEach(([name,label,fn],i)=>{
 assert(source.includes('Global Function '+fn+' ' )||source.includes('Global Function '+fn+'('));
 const constant='txtSamsung'+name;
 common.children[8].children.push(group(str(`Public Const ${constant} As Text`),group(group(int(0),{tag:4,payload:Buffer.from(label,'utf16le')}))));
 const x=i<2?40+i*620:40+((i-2)%3)*410;
 const y=i<2?150:280+Math.floor((i-2)/3)*110;
 const width=i<2?580:380;
 const color=i===0?'287D46':i===1?'A43D3D':'2678C8';
 objects+=`Global GraphicObject ${name} As MyController.GenericObjects.PushButton WithProperties\n { Left:=${x},Top:=${y},Width:=${width},Height:=85,Visible:=True,Locked:=0,_CollectionID:=0,UpText:=MyCommon.${constant},UpColor:=&HFF${color},DownColor:=&HFF18508C,UpFontColor:=&HFFFFFFFF,BevelWidth:=0}\n End GraphicObject\n`;
 handlers+=`Private Process ${name}_OnPush() Link Home.${name}.OnPush\n    SamsungMonitor1.${fn}()\nEnd Process\n\n`;
 assert(x+width<=1280&&y+85<=800);
});
assert.equal((layout.match(/End _GraphicWindow/g)||[]).length,1);
layout=layout.replace('End _GraphicWindow',objects+'End _GraphicWindow');panel.children[6]=pack(layout);
const modules=panel.children[7].children;assert(!modules.some(n=>n.children[0].text==='SamsungControls'));
modules.push(group(str('SamsungControls'),int(1),int(Math.max(...modules.map(n=>n.children[2].value))+1),str(''),str(''),empty(),empty(),pack(handlers),group(),group()));
const out=serializeProject(p),verified=parseProject(out);assert.deepEqual(serializeProject(verified),out);
assert.equal((layout.match(/Global GraphicObject /g)||[]).length,15);
assert.equal((handlers.match(/Link Home\./g)||[]).length,13);
fs.writeFileSync('FirstAIproject-before-samsung-buttons.cvcp',original,{flag:'wx'});
fs.writeFileSync('FirstAIproject-samsung-buttons.cvcp',out);
fs.writeFileSync('SamsungControls.xpl2',handlers);
fs.writeFileSync('TouchPanel1-buttons-layout.xpl2',layout);
console.log('Verified 13 Samsung buttons: power on/off and all 11 driver inputs; 2 relay buttons preserved; CRC and binary roundtrip passed.');
