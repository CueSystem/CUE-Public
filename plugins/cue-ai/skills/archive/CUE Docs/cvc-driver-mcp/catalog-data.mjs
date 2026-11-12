import fs from 'node:fs';
import path from 'node:path';
import {crc32} from './driver.mjs';
import {parseProject,serializeProject} from './inspect-project.mjs';

const root=path.resolve(process.argv[2]||'C:/Program Files/CUE/CUE Visual Composer/Data');
const destination=path.resolve(process.argv[3]||'cvc-driver-mcp/analysis/data-catalog.json');
const entries=[];
function scan(directory) {
  for(const item of fs.readdirSync(directory,{withFileTypes:true})) {
    const full=path.join(directory,item.name);
    if(item.isDirectory()){scan(full);continue;}
    if(!item.isFile())continue;
    const extension=path.extname(item.name).toLowerCase();
    const record={path:path.relative(root,full),extension,bytes:fs.statSync(full).size};
    if(['.cvcd','.cvcds','.cvcc','.cvcg','.cvcgs','.cvcm','.cvcl','.cvcp'].includes(extension)) {
      const b=fs.readFileSync(full);
      record.header=b.subarray(4,24).toString('hex');
      record.crcValid=b.length>=4&&b.readUInt32LE(0)===crc32(b.subarray(4));
      // Metadata candidate discovery only: this does not parse the resource container.
      for(let i=12;i<Math.min(4096,b.length-5);i++) {
        if(b[i]!==3)continue;
        const length=b.readUInt32LE(i+1);
        if(length%2||length>65536||i+5+length>b.length)continue;
        const text=b.subarray(i+5,i+5+length).toString('utf16le');
        if(!text.startsWith('PRODUCTNAME:='))continue;
        record.metadataOffset=i;record.metadata=Object.fromEntries(text.split(/\r?\n/).filter(s=>s.includes(':=')).map(s=>{const p=s.indexOf(':=');return [s.slice(0,p),s.slice(p+2)];}));break;
      }
      if(extension==='.cvcp') {
        try {
          const p=parseProject(b);record.projectVersion=p.version;
          record.roundtripExact=serializeProject(p).equals(b);
          record.topLevelFields=p.root[0]?.children?.length;
          record.resources=p.root[0]?.children?.[0]?.children?.map(r=>({name:r.children?.[0]?.text,type:r.children?.[1]?.value,id:r.children?.[2]?.value}));
        }catch(e){record.parseError=e.message;}
      }
    }
    entries.push(record);
  }
}
scan(root);
const folders={};for(const e of entries){const folder=e.path.split(path.sep)[0];folders[folder]??={files:0,extensions:{}};folders[folder].files++;folders[folder].extensions[e.extension]=(folders[folder].extensions[e.extension]||0)+1;}
const report={root,generatedAt:new Date().toISOString(),folders,entries};
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2));
console.log(JSON.stringify({files:entries.length,metadata:entries.filter(e=>e.metadata).length,crcFailures:entries.filter(e=>e.crcValid===false).map(e=>e.path),projects:entries.filter(e=>e.extension==='.cvcp').map(e=>({path:e.path,version:e.projectVersion,roundtrip:e.roundtripExact,error:e.parseError})),destination},null,2));
