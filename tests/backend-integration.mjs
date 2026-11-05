import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createBackground} from './helpers/background.mjs';

const artifact=path.resolve('../audit/backend-integration.log');
const jdk=path.resolve('../tools/jdk',(await fsp.readdir('../tools/jdk'))[0],'bin/java.exe');
const jar=path.resolve('backend/target/qiuzhi-helper-rules-0.1.0.jar');
const log=fs.createWriteStream(artifact);
const child=spawn(jdk,['-Xmx256m','-XX:ActiveProcessorCount=2','-jar',jar,'--server.port=0'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.pipe(log);child.stderr.pipe(log);
async function stop(){
 if(child.exitCode!==null || child.signalCode!==null)return;
 await new Promise(resolve=>{child.once('exit',resolve);child.kill()});
}
try {
 const port=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('Backend startup timeout')),20000);
  child.once('error',reject);
  let output='';
  child.stdout.on('data',chunk=>{
   output+=chunk.toString();const match=output.match(/Tomcat started on port (\d+)/);
   if(match){clearTimeout(timeout);resolve(Number(match[1]))}
  });
  child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Backend exited '+code))});
 });
 const origin='http://127.0.0.1:'+port;
 const rules=await fetch(origin+'/api/v1/rules');
 assert.equal(rules.status,200);assert.ok(rules.headers.get('etag'));
 const bundled=JSON.parse(await fsp.readFile('extension/config/default-rules.json','utf8'));
 assert.deepEqual(await rules.json(),bundled);
 const health=await fetch(origin+'/api/v1/health');assert.equal((await health.json()).status,'UP');
 assert.equal((await fetch(origin+'/api/v1/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"fixture"}'})).status,404);
 const bg=createBackground(path.resolve('extension'),{},(url,opts)=>fetch(String(url).replace('127.0.0.1:18765','127.0.0.1:'+port),opts));
 const updated=await bg.message({type:'OJAF_REFRESH_RULES'});
 assert.equal(updated.updated,true);assert.deepEqual(bg.data.qhRuleBundle,bundled);
 await stop();
 const fallback=await bg.message({type:'OJAF_REFRESH_RULES'});
 assert.equal(fallback.updated,false);assert.deepEqual(bg.data.qhRuleBundle,bundled);
 assert.ok(bg.calls.every(call=>call.method==='GET'));
 console.log('BACKEND_INTEGRATION_PASSED: real Java HTTP service, validated rule update, offline cache retention, no profile endpoint');
}finally{await stop();log.end()}
