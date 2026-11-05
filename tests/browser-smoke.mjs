import {chromium} from 'playwright';
import {createBackground} from './helpers/background.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const audit=process.argv.includes('--audit');
const ambiguous=process.argv.includes('--ambiguous');
const artifactRoot=path.resolve('../audit');
const ext=audit?JSON.parse(await fs.readFile('../audit/upstream.json','utf8')).snapshot:path.resolve('extension');
const runId=(audit?'upstream-dom':'personal-dom')+'-'+Date.now();
const background=createBackground(ext);
const fixture=JSON.parse(await fs.readFile(path.join(ext,'sample-profile.json'),'utf8')).profileV2;
fixture.sections.basic.values['姓名']='测试同学';
fixture.sections.basic.values['邮箱']='new@example.invalid';
background.data.profileV2=fixture;
background.data.apiConfig={enabled:false,apiKey:'FIXTURE-KEY-DO-NOT-EXPORT'};
await fs.mkdir(artifactRoot,{recursive:true});
process.env.TEMP=path.resolve('../tools/tmp');process.env.TMP=process.env.TEMP;
await fs.mkdir(process.env.TEMP,{recursive:true});
let html='<!doctype html><meta charset="utf-8"><title>虚构网申表单</title><style>body{font:16px sans-serif;padding:24px}label{display:block;margin:12px}input,select,textarea{display:block;width:330px;padding:6px}section{padding:16px;border:1px solid #ccc;margin:12px}.resume-item{padding:12px;border:1px dashed #bbb}</style><form id="application"><section><h2>基本信息</h2>'
+'<label>姓名<input id="name" name="姓名"></label><label>电话<input id="phone" name="电话" type="tel"></label><label>邮箱<input id="email" name="邮箱" type="email" value="kept@example.invalid"></label>'
+'<label>出生日期<input id="birth" name="出生日期" type="date"></label><label>性别<select id="gender" name="性别"><option value="">请选择</option><option value="male">男</option><option value="female">女</option></select></label><label>未知字段<input id="unknown" name="unknown"></label><label>证件号码<input id="readonly" name="证件号码" value="USER-READONLY" readonly></label></section>'
+'<section><h2>教育经历</h2><div class="resume-item"><h3>教育经历 1 硕士</h3><label>学校<input id="school1" name="school1"></label><label>专业<input id="major1" name="major1"></label></div><div class="resume-item"><h3>教育经历 2 本科</h3><label>学校<input id="school2" name="school2"></label><label>专业<input id="major2" name="major2"></label></div></section>'
+'<section><h2>自我描述</h2><label>自我评价<textarea id="self" name="自我评价"></textarea></label></section>'
+'<label><input id="consent" name="consent" type="checkbox">本人声明以上填写内容与事实完全相符</label><button type="submit">提交申请</button></form>'
+'<script>window.inputEvents=[];window.submits=0;document.querySelector("form").addEventListener("submit",e=>{e.preventDefault();window.submits++});document.querySelector("#name").addEventListener("input",e=>{window.controlledName=e.target.value;window.inputEvents.push("input")});</script>';
if(ambiguous)html=html.replaceAll('class="resume-item"','class="unrecognized-row"').replaceAll('教育经历 1 硕士','教育经历').replaceAll('教育经历 2 本科','教育经历');
const server=http.createServer(async(req,res)=>{
 try {
  if(req.url.startsWith('/extension/')){
   const file=path.resolve(ext,decodeURIComponent(req.url.slice('/extension/'.length)).split('?')[0]);
   if(!file.startsWith(ext+path.sep))throw new Error('Invalid fixture path');
   const type={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png'}[path.extname(file)]||'text/plain';
   res.setHeader('Content-Type',type+'; charset=utf-8');res.end(await fs.readFile(file));
  }else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)}
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try {
 browser=await chromium.launch({headless:true,timeout:20000,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1400,height:1000},acceptDownloads:true});
 await context.exposeFunction('__qhBackground',async message=>{
  try{return {ok:true,data:await background.message(message)}}
  catch(error){return {ok:false,error:error.message}}
 });
 await context.addInitScript(({origin})=>{
  const listener={addListener(fn){window.__qhContentHandler=fn},removeListener(){}};
  window.chrome={
   runtime:{id:'fixture',lastError:null,onMessage:listener,getURL:p=>origin+'/extension/'+p,getManifest:()=>({version:'0.1.0'}),sendMessage(message,callback){window.__qhBackground(message).then(callback)}},
   permissions:{contains(_,cb){cb(true)},request(_,cb){cb(true)}}
  };
 },{origin});
 const page=await context.newPage();await page.goto(origin+'/apply');
 async function inject(){await page.addScriptTag({path:path.join(ext,'src/content.js')})}
 async function send(type){return page.evaluate(type=>new Promise(resolve=>window.__qhContentHandler({type},{},resolve)),type)}
 await inject();
 const filling=send('OJAF_START_AUTOFILL');filling.catch(()=>{});
 if(!audit){
  await page.locator('#qh-fill-preview').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#name').inputValue(),'');
  await page.locator('#qh-preview-apply').click();
 }
 const result=await Promise.race([filling,new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('Fill timeout')),15000);t.unref()})]);
 const debug=await send('OJAF_GET_DEBUG_SNAPSHOT');
 await fs.writeFile(path.join(artifactRoot,audit?'upstream-plan.json':'personal-plan.json'),JSON.stringify(debug,null,2));
 const values=await page.evaluate(()=>({name:document.querySelector('#name').value,phone:document.querySelector('#phone').value,email:document.querySelector('#email').value,birth:document.querySelector('#birth').value,gender:document.querySelector('#gender').value,schools:[document.querySelector('#school1').value,document.querySelector('#school2').value],majors:[document.querySelector('#major1').value,document.querySelector('#major2').value],self:document.querySelector('#self').value,unknown:document.querySelector('#unknown').value,readonly:document.querySelector('#readonly').value,controlledName:window.controlledName,events:window.inputEvents,submits:window.submits,consent:document.querySelector('#consent').checked}));
 const report={harness:'real Chromium DOM + Chrome runtime shim (not full extension loading)',audit,result,values,requests:background.calls};
 await page.screenshot({path:path.join(artifactRoot,runId+'.png'),fullPage:true});
 await fs.writeFile(path.join(artifactRoot,audit?'upstream-browser.json':'browser-smoke.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!audit){
  assert.equal(values.name,'测试同学');assert.equal(values.controlledName,'测试同学');assert.ok(values.events.includes('input'));
  assert.equal(values.phone,'13800000000');assert.equal(values.email,'kept@example.invalid');
  assert.equal(values.birth,'1999-01-01');assert.equal(values.gender,'male');
  if(ambiguous){assert.deepEqual(values.schools,['','']);assert.deepEqual(values.majors,['','']);}
  else {assert.deepEqual(values.schools,['示例大学','示例理工大学']);assert.deepEqual(values.majors,['软件工程','计算机科学与技术']);}
  assert.equal(values.self,fixture.sections.self.values['自我评价']);assert.equal(values.unknown,'');assert.equal(values.readonly,'USER-READONLY');
  assert.equal(values.submits,0);assert.equal(values.consent,false);assert.equal(background.calls.length,0);
  await page.reload();await inject();
  const cancel=send('OJAF_START_AUTOFILL');cancel.catch(()=>{});
  await page.locator('#qh-fill-preview').waitFor({state:'visible'});await page.locator('#qh-preview-cancel').click();
  assert.equal((await cancel).data.reason,'cancelled');assert.equal(await page.locator('#name').inputValue(),'');
  const options=await context.newPage();await options.goto(origin+'/extension/src/options.html');
  await options.locator('[data-profile-section="basic"] input').first().waitFor();
  assert.equal(await options.locator('#aiEnabled').isChecked(),false);
  const download=options.waitForEvent('download');await options.locator('#exportProfile').click();
  const file=await download;const backup=path.join(artifactRoot,runId+'-backup.json');await file.saveAs(backup);
  const backupText=await fs.readFile(backup,'utf8');assert.equal(backupText.includes('FIXTURE-KEY-DO-NOT-EXPORT'),false);
  assert.equal(JSON.parse(backupText).profileV2.sections.education.items.length,2);
  await options.screenshot({path:path.join(artifactRoot,runId+'-options.png'),fullPage:true});
  console.log('BROWSER_DOM_SMOKE_PASSED');
 }
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
