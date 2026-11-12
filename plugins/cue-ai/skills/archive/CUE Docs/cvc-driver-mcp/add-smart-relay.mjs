import fs from 'node:fs';
import {deflateSync,inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {parseProject,serializeProject} from './inspect-project.mjs';
import {crc32} from './driver.mjs';

const input='C:/Users/Jaroslav Dibitanzl/Desktop/FirstAIproject.cvcp';
const original=fs.readFileSync(input), project=parseProject(original);
const [resources,controllers,devices,config]=project.root[0].children;
const str=text=>({tag:3,payload:Buffer.from(text,'utf16le')});
const int=value=>({tag:1,value});
const group=(...children)=>({tag:240,children});
const empty=()=>({tag:5,payload:Buffer.alloc(0)});
const unpack=n=>inflateSync(n.payload.subarray(4)).toString('utf16le');
function pack(text,tag=5){const raw=Buffer.from(text,'utf16le'),size=Buffer.alloc(4);size.writeUInt32LE(raw.length);return {tag,payload:Buffer.concat([size,deflateSync(raw)])};}
function module(name,id,source){return group(str(name),int(1),int(id),str(''),str(''),empty(),empty(),pack(source),group(),group());}
assert(!controllers.children.some(n=>n.children[0].text==='SmartRelay1'),'SmartRelay1 already exists');
const panel=controllers.children.find(n=>n.children[0].text==='TouchPanel1');assert(panel,'TouchPanel1 missing');
const layout=unpack(panel.children[6]);assert.match(layout,/Global _GraphicWindow Home /);assert.match(layout,/Global GraphicObject Button1 /);assert.match(layout,/Global GraphicObject Button2 /);
const resourceName='smartCUE_relay_21_70';
const b=fs.readFileSync('C:/Program Files/CUE/CUE Visual Composer/Data/CUEunits/smartCUE-relay_CS0496_Firmware_21.70.cvcc');
assert.equal(b.readUInt32LE(0),crc32(b.subarray(4)));
Buffer.from('089c58cadbb12695','hex').copy(b,4);b.writeUInt32LE(crc32(b.subarray(4)),0);
const library=parseProject(b).root[0].children[0];assert.equal(library.children[0].value,4);
const unitSource=unpack(library.children[5]);assert.match(unitSource,/Global Channel RE1 As _Relay/);
const nextResourceId=Math.max(...resources.children.map(n=>n.children[2].value))+1;
resources.children.push(group(str(resourceName),library.children[0],int(nextResourceId),...library.children.slice(1)));
const relayCode=`Public Function Relay1On()
    RE1.Close()
End Function

Public Function Relay1Off()
    RE1.Open()
End Function
`;
const nextControllerId=Math.max(...controllers.children.map(n=>n.children[1].value))+1;
controllers.children.push(group(str('SmartRelay1'),int(nextControllerId),int(0),int(0),int(0),str(resourceName),pack('MyProperties {}\n'),
  group(module('Main',1,'// No automatic relay switching on startup\n'),module('RelayControl',2,relayCode)),
  int(0),int(0),int(0),group(),{tag:4,payload:Buffer.alloc(0)}));
const events=`Private Process Home_Button1_OnPush() Link Home.Button1.OnPush
    SmartRelay1.RelayControl.Relay1On()
End Process

Private Process Home_Button2_OnPush() Link Home.Button2.OnPush
    SmartRelay1.RelayControl.Relay1Off()
End Process
`;
const modules=panel.children[7].children;
assert(!modules.some(n=>n.children[0].text==='RelayButtonEvents'),'Relay event module already exists');
modules.push(module('RelayButtonEvents',Math.max(...modules.map(n=>n.children[2].value))+1,events));
const configText=unpack(config);assert(configText.includes('#DEVICES'));
project.root[0].children[3]=pack(configText.replace('#DEVICES','"SmartRelay1" 360 30 "TouchPanels" "" 0\n#DEVICES'),6);
const output=serializeProject(project),verified=parseProject(output);
assert.deepEqual(serializeProject(verified),output);
assert.equal(verified.root[0].children[1].children.length,controllers.children.length);
assert.equal(unpack(verified.root[0].children[1].children.find(n=>n.children[0].text==='TouchPanel1').children[6]),layout);
const verifiedRelay=verified.root[0].children[1].children.find(n=>n.children[0].text==='SmartRelay1');
assert.equal(unpack(verifiedRelay.children[7].children[1].children[7]),relayCode);
const verifiedPanel=verified.root[0].children[1].children.find(n=>n.children[0].text==='TouchPanel1');
assert.equal(unpack(verifiedPanel.children[7].children.at(-1).children[7]),events);
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-before-relay.cvcp',original,{flag:'wx'});
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-with-relay.cvcp',output);
fs.writeFileSync('cvc-driver-mcp/generated/FirstAIproject-relay-events.xpl2',events+'\n// SmartRelay1 / RelayControl\n'+relayCode);
console.log(JSON.stringify({bytes:output.length,controllers:verified.root[0].children[1].children.map(n=>n.children[0].text),events,relayCode,ipAddresses:'unchanged; new unit 0.0.0.0',checks:'structural roundtrip, layout preservation, event and relay module extraction passed'},null,2));
