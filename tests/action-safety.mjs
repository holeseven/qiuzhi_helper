import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
process.env.TEMP=path.resolve('../tools/tmp');process.env.TMP=process.env.TEMP;
const source=await fs.readFile('extension/src/content.js','utf8');
const match=source.match(/  function clickActionElement\(element\) \{[\s\S]*?\n  \}/);
assert.ok(match,'Action helper must be present in production code');
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try {
 const page=await browser.newPage();
 await page.setContent('<form><button id="explicit" type="submit">完善资料</button><button id="implicit">编辑</button><button id="combined" type="button">完善简历并提交</button><div id="delivery" role="button">立即投递</div><button id="safe" type="button">编辑</button></form>');
 await page.evaluate(code=>{
  window.submits=0;window.safeClicks=0;
  document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.submits++});
  document.querySelector('#safe').addEventListener('click',()=>window.safeClicks++);
  window.eval(code+'; window.qhClickAction=clickActionElement;');
 },match[0]);
 for(const id of ['explicit','implicit','combined','delivery']){
  const result=await page.evaluate(id=>window.qhClickAction(document.getElementById(id)),id);
  assert.equal(result,false,'Must not click final action '+id);
 }
 assert.equal(await page.evaluate(()=>window.submits),0);
 assert.equal(await page.evaluate(()=>window.qhClickAction(document.querySelector('#safe'))),true);
 assert.equal(await page.evaluate(()=>window.safeClicks),1);
 console.log('ACTION_SAFETY_PASSED: submit controls, implicit submit, delivery text blocked; normal edit allowed');
}finally{await browser.close()}
