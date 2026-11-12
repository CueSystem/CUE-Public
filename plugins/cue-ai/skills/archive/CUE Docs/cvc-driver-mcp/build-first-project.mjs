import fs from 'node:fs';
import path from 'node:path';
import {deflateSync,inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {crc32} from './driver.mjs';
import {parseProject,serializeProject} from './inspect-project.mjs';

const data='C:/Program Files/CUE/CUE Visual Composer/Data';
const str=text=>({tag:3,payload:Buffer.from(text,'utf16le')});
const int=value=>({tag:1,value});
const group=(...children)=>({tag:240,children});
const empty=()=>({tag:5,payload:Buffer.alloc(0)});
function packed(text,tag=5){const raw=Buffer.from(text,'utf16le'),size=Buffer.alloc(4);size.writeUInt32LE(raw.length);return {tag,payload:Buffer.concat([size,deflateSync(raw)])};}
function module(name,type,id,source,assets=[]){return group(str(name),int(type),int(id),str(''),str(''),empty(),empty(),packed(source),group(...assets),group());}
function textConstant(name,value){return group(str(`Public Const ${name} As Text`),group(group(int(0),{tag:4,payload:Buffer.from(value,'utf16le')})));}
function library(relative,name,id){
  const bytes=fs.readFileSync(path.join(data,relative));
  assert.equal(bytes.readUInt32LE(0),crc32(bytes.subarray(4)),`Invalid library CRC: ${relative}`);
  // Resource containers use the same token stream but a different 8-byte magic.
  // Adapt a temporary in-memory header to reuse the verified token parser.
  const adapted=Buffer.from(bytes);Buffer.from('089c58cadbb12695','hex').copy(adapted,4);adapted.writeUInt32LE(crc32(adapted.subarray(4)),0);
  const tree=parseProject(adapted);
  const resource=tree.root[0].children[0]?.tag===240?tree.root[0].children[0]:tree.root[0];
  assert.equal(resource.children.length,8);
  assert.equal(resource.children[0].tag,1);
  return group(str(name),resource.children[0],int(id),...resource.children.slice(1));
}

const layout=`MyProperties { _DisplayWidth:=1280,_DisplayHeight:=800,_DefaultLanguageId:=0,_FullScreen:=False}
Global _GraphicWindow Home As MyController.GenericObjects.Page WithProperties
 { Left:=0,Top:=0,Width:=1280,Height:=800,Visible:=True,Locked:=0,_CollectionID:=0,Color:=&HFF182434}
Global GraphicObject Button1 As MyController.GenericObjects.PushButton WithProperties
 { Left:=300,Top:=330,Width:=300,Height:=140,Visible:=True,Locked:=0,_CollectionID:=0,UpText:=MyCommon.txtButton1,UpColor:=&HFF2678C8,DownColor:=&HFF18508C,UpFontColor:=&HFFFFFFFF,BevelWidth:=0}
 End GraphicObject
Global GraphicObject Button2 As MyController.GenericObjects.PushButton WithProperties
 { Left:=680,Top:=330,Width:=300,Height:=140,Visible:=True,Locked:=0,_CollectionID:=0,UpText:=MyCommon.txtButton2,UpColor:=&HFF2678C8,DownColor:=&HFF18508C,UpFontColor:=&HFFFFFFFF,BevelWidth:=0}
 End GraphicObject
End _GraphicWindow
`;
const resources=group(
  module('MyCommon',2,1,'// Shared project resources\n',[
    textConstant('txtButton1','Button 1'),textConstant('txtButton2','Button 2'),
  ]),
  library('CUEunits/touchCUE-10-W_CS0564_Firmware_21.70.cvcc','touchCUE_10_W_21_70',2),
  library('Collections/GenericObjects_3.14.cvcg','GenericObjects',3),
  library('Collections/GenericObjectsBase_3.25.cvcgs','GenericObjectsBase',4),
);
const controller=group(str('TouchPanel1'),int(1),int(0),int(0),int(0),str('touchCUE_10_W_21_70'),packed(layout),
  group(module('Main',1,1,'Private Process Autoexec()\n    Home.ShowObject()\nEnd Process\n'),
    module('DeviceEvents',1,2,'// Device events\n'),module('GraphicEvents',1,3,'// No button actions assigned\n')),
  int(0),int(0),int(0),group(),{tag:4,payload:Buffer.alloc(0)});
const configuration=`#VERSION 4
#PAGES
"TouchPanels" 100
#CONTROLLERS
"TouchPanel1" 75 30 "TouchPanels" "" 0
#DEVICES
#INTERNALDEBUGCONFIGURATION
#DEBUGCONFIGURATION
#MULTIIPADDRESSES
#ALLSIMULATIONCONFIGURATION
#MDIWINDOWS
31 "" ""
#END
`;
const project={version:22,root:[group(resources,group(controller),group(),packed(configuration,6))]};
const bytes=serializeProject(project),parsed=parseProject(bytes);
assert.deepEqual(serializeProject(parsed),bytes);
const actual=parsed.root[0].children;
assert.equal(actual[0].children.length,4);
assert.equal(actual[1].children.length,1);
assert.equal(actual[2].children.length,0);
const actualLayout=inflateSync(actual[1].children[0].children[6].payload.subarray(4)).toString('utf16le');
assert.equal(actualLayout,layout);
assert.equal((actualLayout.match(/Global _GraphicWindow /g)||[]).length,1);
assert.equal((actualLayout.match(/Global GraphicObject /g)||[]).length,2);
assert.match(actual[0].children[1].children[3].text,/PRODUCTNAME:=touchCUE-10-W/);
const output=path.resolve('cvc-driver-mcp/generated/FirstAIproject.cvcp');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
fs.writeFileSync(path.join(path.dirname(output),'FirstAIproject-layout.xpl2'),layout);
console.log(JSON.stringify({output,bytes:bytes.length,unit:'touchCUE-10-W',page:'Home',buttons:['Button1','Button2'],structuralChecks:'passed',cvcOpenAndCompile:'not performed',networkAddress:'unconfigured (0.0.0.0)'},null,2));
