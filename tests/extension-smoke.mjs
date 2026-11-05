import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const deadline = (promise, label) => Promise.race([promise, new Promise((_,reject) => {const t=setTimeout(()=>reject(new Error('Timed out: '+label)),20000);t.unref()})]);
const audit = false;
const artifactRoot = path.resolve('../audit');
await fs.mkdir(artifactRoot,{recursive:true});
const runId = (audit?'upstream':'personal')+'-'+Date.now();
const ext = path.join(artifactRoot,runId+'-extension');
await fs.cp(path.resolve(process.env.QH_EXTENSION || 'extension'),ext,{recursive:true});
const manifest = JSON.parse(await fs.readFile(path.join(ext,'manifest.json'),'utf8'));
manifest.host_permissions = [...(manifest.host_permissions||[]),'http://127.0.0.1/*'];
await fs.writeFile(path.join(ext,'manifest.json'),JSON.stringify(manifest));
const html = '<!doctype html><meta charset="utf-8"><title>虚构网申表单</title><style>body{font:16px sans-serif;padding:24px}label{display:block;margin:12px}input,select,textarea{display:block;width:330px;padding:6px}section{padding:16px;border:1px solid #ccc;margin:12px}</style><form id="application"><section><h2>基本信息</h2>'
+ '<label>姓名<input id="name" name="姓名"></label>'
+ '<label>电话<input id="phone" name="电话" type="tel"></label>'
+ '<label>邮箱<input id="email" name="邮箱" type="email" value="kept@example.invalid"></label>'
+ '<label>出生日期<input id="birth" name="出生日期" type="date"></label>'
+ '<label>性别<select id="gender" name="性别"><option value="">请选择</option><option value="male">男</option><option value="female">女</option></select></label>'
+ '<label>未知字段<input id="unknown" name="unknown"></label>'
+ '<label>证件号码<input id="readonly" name="证件号码" value="USER-READONLY" readonly></label>'
+ '</section><section><h2>教育经历</h2><div class="resume-item"><h3>教育经历 1 硕士</h3><label>学校<input id="school1" name="school1"></label><label>专业<input id="major1" name="major1"></label></div><div class="resume-item"><h3>教育经历 2 本科</h3><label>学校<input id="school2" name="school2"></label><label>专业<input id="major2" name="major2"></label></div></section>'
+ '<section><h2>自我描述</h2><label>自我评价<textarea id="self" name="自我评价"></textarea></label></section>'
+ '<label><input id="consent" name="consent" type="checkbox">本人声明以上填写内容与事实完全相符</label><section><h2>论文</h2><div class="resume-item"><h3>论文 1</h3><label>论文名称<input id="paper1" name="论文名称"></label></div><div class="resume-item"><h3>论文 2</h3><label>论文名称<input id="paper2" name="论文名称"></label></div></section><section><h2>专利</h2><div class="resume-item"><h3>专利 1</h3><label>专利名称<input id="patent1" name="专利名称"></label></div></section><section><h2>科研经历</h2><div class="resume-item"><h3>科研经历 1</h3><label>项目名称<input id="research1" name="项目名称"></label></div></section><section><h2>求职意向</h2><label>期望薪资<input id="salary" name="期望薪资" type="number" value="1"></label></section><button type="submit">提交申请</button></form>'
+ '<script>window.inputEvents=[];window.submits=0;document.querySelector("form").addEventListener("submit",e=>{e.preventDefault();window.submits++});document.querySelector("#name").addEventListener("input",e=>{window.controlledName=e.target.value;window.inputEvents.push("input")});</script>';
const server = http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/apply';
process.env.TEMP=path.resolve('../tools/tmp');process.env.TMP=process.env.TEMP;
let context;
try {
 console.log('STAGE launch');
 context=await chromium.launchPersistentContext(path.join(artifactRoot,runId+'-profile'),{
  channel:'chromium',headless:true,timeout:20000,viewport:{width:1400,height:1000},
  ignoreDefaultArgs:['--disable-extensions'],
  args:['--disable-gpu','--enable-unsafe-extension-debugging']
 });
 const cdp=await context.browser().newBrowserCDPSession();
 await cdp.send('Extensions.loadUnpacked',{path:ext});
 console.log('STAGE worker');
 const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker',{timeout:20000});
 console.log('STAGE fetch hook');
 await deadline(worker.evaluate(()=>{globalThis.__requests=[];const original=fetch;globalThis.fetch=(url,opts)=>{
  if(String(url).startsWith('chrome-extension://') || String(url).startsWith('http://127.0.0.1:18765/'))return original(url,opts);
  globalThis.__requests.push(String(url));return Promise.reject(new Error('Network blocked by fixture'));
 }}), 'fetch hook');
 console.log('STAGE profile');
 const fixture=JSON.parse(await fs.readFile('extension/sample-profile.json','utf8')).profileV2;
 fixture.sections.basic.values['姓名']='测试同学';
 fixture.sections.basic.values['邮箱']='new@example.invalid';
 fixture.sections.patents={key:'patents',title:'专利',kind:'repeat',items:[{title:'专利1',values:{专利名称:'虚构专利'},custom:[]}]};
 fixture.sections.research={key:'research',title:'科研经历',kind:'repeat',items:[{title:'科研经历1',values:{项目名称:'虚构科研项目'},custom:[]}]};
 fixture.customSections.push({key:'fixture-publications',title:'测试论文',kind:'repeat',items:[{title:'论文1',values:{论文名称:'虚构论文甲'},custom:[]},{title:'论文2',values:{论文名称:'虚构论文乙'},custom:[]}]});
 await deadline(worker.evaluate(async profile=>{await chrome.storage.local.clear();await chrome.storage.local.set({profileV2:profile,apiConfig:{enabled:false,apiKey:'FIXTURE-KEY-DO-NOT-EXPORT'}})},fixture), 'profile save');
 console.log('STAGE page');
 const page=await context.newPage();await page.goto(url);
 async function send(type) {
  return worker.evaluate(async({url,type})=>{
   const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url===url);
   await chrome.scripting.executeScript({target:{tabId:tab.id},files:['src/content.js']});
   return await chrome.tabs.sendMessage(tab.id,{type});
  },{url,type});
 }
 console.log('STAGE fill');
 const filling=deadline(send('OJAF_START_AUTOFILL'), 'fill response');
 filling.catch(()=>{});
 if(!audit){
  await page.locator('#qh-fill-preview').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#name').inputValue(),'');
  await page.locator('#qh-preview-apply').click();
 }
 const result=await filling;
 const values=await page.evaluate(()=>({name:document.querySelector('#name').value,phone:document.querySelector('#phone').value,email:document.querySelector('#email').value,birth:document.querySelector('#birth').value,gender:document.querySelector('#gender').value,schools:[document.querySelector('#school1').value,document.querySelector('#school2').value],majors:[document.querySelector('#major1').value,document.querySelector('#major2').value],self:document.querySelector('#self').value,unknown:document.querySelector('#unknown').value,readonly:document.querySelector('#readonly').value,controlledName:window.controlledName,events:window.inputEvents,submits:window.submits,consent:document.querySelector('#consent').checked}));
 const requests=await worker.evaluate(()=>globalThis.__requests);
 const report={harness:'Full Manifest V3 extension in Chromium',audit,result,values,requests};
 await page.screenshot({path:path.join(artifactRoot,runId+'.png'),fullPage:true});
 await fs.writeFile(path.join(artifactRoot,audit?'upstream-browser.json':'extension-smoke.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!audit){
  assert.equal(await page.locator('#salary').inputValue(),'1','Existing numeric value must be preserved');
  assert.equal(await page.locator('#paper1').inputValue(),'虚构论文甲');
  assert.equal(await page.locator('#paper2').inputValue(),'虚构论文乙');
  assert.equal(await page.locator('#patent1').inputValue(),'虚构专利');
  assert.equal(await page.locator('#research1').inputValue(),'虚构科研项目');
  assert.equal(values.name,'测试同学');assert.equal(values.controlledName,'测试同学');assert.ok(values.events.includes('input'));
  assert.equal(values.phone,'13800000000');assert.equal(values.email,'kept@example.invalid');
  assert.equal(values.birth,'1999-01-01');assert.equal(values.gender,'male');
  assert.deepEqual(values.schools,['示例大学','示例理工大学']);
  assert.deepEqual(values.majors,['软件工程','计算机科学与技术']);
  assert.equal(values.self,fixture.sections.self.values['自我评价']);
  assert.equal(values.unknown,'');assert.equal(values.readonly,'USER-READONLY');
  assert.equal(values.submits,0);assert.equal(values.consent,false);
  assert.equal(requests.length,0,'Default filling must make no external requests');
  await page.reload();
  const cancelled=send('OJAF_START_AUTOFILL');
  await page.locator('#qh-fill-preview').waitFor({state:'visible'});
  await page.locator('#qh-preview-cancel').click();
  assert.equal((await cancelled).data.reason,'cancelled');assert.equal(await page.locator('#name').inputValue(),'');
  await page.reload();
  const raced=send('OJAF_START_AUTOFILL');raced.catch(()=>{});
  await page.locator('#qh-fill-preview').waitFor({state:'visible'});
  await page.evaluate(()=>{const input=document.querySelector('#name');input.value='用户临时输入';input.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#name').inputValue(),'用户临时输入','Race fixture must actually set the field before confirming');
  await page.locator('#qh-preview-apply').click();const racedResult=await raced;assert.equal(racedResult.data.failed,0);
  assert.equal(await page.locator('#name').inputValue(),'用户临时输入');
  assert.equal(await page.locator('#phone').inputValue(),'13800000000');
  assert.equal(await page.evaluate(()=>window.submits),0);
  const metadata=await worker.evaluate(()=>chrome.runtime.getManifest());
  assert.equal(metadata.name,'lxy的秋招助手');assert.equal(metadata.author,'lxy');
  const options=await context.newPage();await options.goto('chrome-extension://'+worker.url().split('/')[2]+'/src/options.html');
  await options.locator('#aiEnabled').waitFor();assert.equal(await options.locator('#aiEnabled').isChecked(),false);
  assert.equal(await options.title(),'lxy的秋招助手 · 设置');
  const downloading=options.waitForEvent('download');await options.locator('#exportProfile').click();
  const backup=await downloading;const backupPath=path.join(artifactRoot,runId+'-profile-backup.json');await backup.saveAs(backupPath);
  const text=await fs.readFile(backupPath,'utf8'),parsed=JSON.parse(text);
  assert.equal(text.includes('FIXTURE-KEY-DO-NOT-EXPORT'),false);
  assert.equal(parsed.profileV2.sections.education.items.length,2);
  assert.equal(parsed.profileV2.customSections.find(s=>s.key==='fixture-publications').items.length,2);
  const basicName=options.locator('[data-profile-section="basic"] input').first();
  await basicName.fill('临时修改');await options.locator('#saveProfile').click();
  await options.waitForFunction(()=>!document.querySelector('#saveProfile').disabled);
  assert.equal((await worker.evaluate(()=>chrome.storage.local.get('profileV2'))).profileV2.sections.basic.values['姓名'],'临时修改');
  options.on('dialog',dialog=>dialog.accept());
  await options.locator('#profileFileInput').setInputFiles({name:'fixture-restore.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await options.waitForFunction(()=>document.querySelector('[data-profile-section="basic"] input').value==='测试同学');
  await options.locator('#saveProfile').click();await options.waitForFunction(()=>!document.querySelector('#saveProfile').disabled);
  assert.equal((await worker.evaluate(()=>chrome.storage.local.get('profileV2'))).profileV2.sections.basic.values['姓名'],'测试同学');
  await options.screenshot({path:path.join(artifactRoot,'lxy-options.png'),fullPage:true});
  console.log('FULL_EXTENSION_SMOKE_PASSED');
 }
} finally {console.log('STAGE close');await deadline(context?.close(), 'close'); await new Promise(r=>server.close(r));}
