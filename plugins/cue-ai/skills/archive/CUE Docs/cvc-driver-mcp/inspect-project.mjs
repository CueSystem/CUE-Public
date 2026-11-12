import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { crc32 } from './driver.mjs';

export function parseProject(bytes) {
  if (bytes.length < 14 || bytes.readUInt32LE(0) !== crc32(bytes.subarray(4))) throw new Error('Invalid CRC32');
  if (bytes.subarray(4,12).toString('hex') !== '089c58cadbb12695') throw new Error('Unknown project magic');
  let offset = 14;
  const root = [], stack = [root], counts = {};
  while (offset < bytes.length) {
    const start = offset, tag = bytes[offset++];
    counts[tag] = (counts[tag] || 0) + 1;
    if (tag === 0xf1) {
      if (stack.length === 1) throw new Error(`Unmatched group end at ${start}`);
      stack.pop(); continue;
    }
    const node = {offset:start, tag}; stack.at(-1).push(node);
    if (tag === 0xf0) { node.children=[]; stack.push(node.children); continue; }
    if (offset + 4 > bytes.length) throw new Error('Truncated field');
    const length = bytes.readUInt32LE(offset); offset += 4;
    if (tag === 1) { node.value=length; continue; }
    if (![3,4,5,6].includes(tag)) throw new Error(`Unknown tag ${tag} at ${start}`);
    if (offset + length > bytes.length) throw new Error('Truncated payload');
    node.length=length; node.payload=bytes.subarray(offset,offset+length); offset+=length;
    if (tag===3) { if(length%2) throw new Error('Odd UTF16 length'); node.text=node.payload.toString('utf16le'); }
    if (tag===4 && length%2===0) node.textCandidate=node.payload.toString('utf16le');
  }
  if(stack.length!==1) throw new Error('Unclosed groups');
  return {version:bytes.readUInt16LE(12),root,counts};
}

export function serializeProject(parsed) {
  const chunks=[Buffer.from('089c58cadbb12695','hex')];
  const version=Buffer.alloc(2); version.writeUInt16LE(parsed.version);chunks.push(version);
  function write(nodes) {for(const n of nodes) {
    chunks.push(Buffer.from([n.tag]));
    if(n.tag===240) {write(n.children);chunks.push(Buffer.from([241]));continue;}
    const value=Buffer.alloc(4);value.writeUInt32LE(n.tag===1?n.value:n.payload.length);chunks.push(value);
    if(n.tag!==1) chunks.push(n.payload);
  }}
  write(parsed.root);const body=Buffer.concat(chunks),checksum=Buffer.alloc(4);checksum.writeUInt32LE(crc32(body));
  return Buffer.concat([checksum,body]);
}

export function analyzeProject(bytes, outputDirectory) {
  const parsed=parseProject(bytes), packed=[], groups=[];
  fs.mkdirSync(outputDirectory,{recursive:true});
  const textDir=path.join(outputDirectory,'texts');fs.mkdirSync(textDir,{recursive:true});
  function walk(nodes, route=[]) {nodes.forEach((n,i)=>{
    const nodeRoute=[...route,i];
    if(n.children) {
      const heading=n.children.find(c=>c.tag===3)?.text;
      groups.push({offset:n.offset,path:nodeRoute.join('.'),heading:heading?.slice(0,160),fields:n.children.slice(0,9).map(c=>c.children?'group':c.tag===1?`int:${c.value}`:`tag${c.tag}:${c.length}`)});
      walk(n.children,nodeRoute);
    } else if([5,6].includes(n.tag)&&n.length) {
      const record={offset:n.offset,path:nodeRoute.join('.'),tag:n.tag,bytes:n.length};
      try {
        if(n.length<4)throw new Error('No raw length');
        const rawLength=n.payload.readUInt32LE(0);
        if(rawLength>128*1024*1024)throw new Error('Raw length limit exceeded');
        const result=inflateSync(n.payload.subarray(4),{info:true,maxOutputLength:128*1024*1024});
        if(result.buffer.length!==rawLength||result.engine.bytesWritten!==n.length-4)throw new Error('Compressed length mismatch');
        record.rawBytes=rawLength;
        const s=result.buffer.toString('utf16le');
        if(rawLength%2===0 && [...s].filter(c=>c==='\n'||c==='\r'||c==='\t'||c.charCodeAt(0)>=32&&c.charCodeAt(0)<0x2500).length/Math.max(s.length,1)>.97) {
          record.kind='text';record.file=`texts/${n.offset}.txt`;
          record.preview=s.slice(0,140);fs.writeFileSync(path.join(outputDirectory,record.file),s);
        }else {record.kind='binary';record.signature=result.buffer.subarray(0,16).toString('hex');}
      }catch(e){record.kind='unclassified';record.reason=e.message;record.signature=n.payload.subarray(0,16).toString('hex');}
      packed.push(record);
    }
  });}
  walk(parsed.root);
  const report={size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),crcValid:true,version:parsed.version,counts:parsed.counts,roundtripExact:serializeProject(parsed).equals(bytes),groups,packed};
  fs.writeFileSync(path.join(outputDirectory,'structure.json'),JSON.stringify(report,null,2));
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw new Error('Usage: node inspect-project.mjs INPUT.cvcp OUTPUT_DIRECTORY');
  const r=analyzeProject(fs.readFileSync(input),output);
  console.log(JSON.stringify({size:r.size,version:r.version,counts:r.counts,roundtripExact:r.roundtripExact,groups:r.groups.length,packed:r.packed.length,kinds:r.packed.reduce((a,b)=>(a[b.kind]=(a[b.kind]||0)+1,a),{})},null,2));
}
