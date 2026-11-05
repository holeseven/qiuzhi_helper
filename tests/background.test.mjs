import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

const extension = path.resolve(process.env.QH_EXTENSION || 'extension');
function background(initial = {}) {
  const data = structuredClone(initial);
  const calls = [];
  const listener = { addListener() {} };
  const context = vm.createContext({
    console, URL, AbortController, setTimeout, clearTimeout,
    chrome: {
      storage: { local: {
        async get(keys) { return Object.fromEntries(keys.map(k => [k, data[k]])); },
        async set(next) { Object.assign(data, structuredClone(next)); },
        async clear() { for (const key of Object.keys(data)) delete data[key]; }
      }},
      runtime: { onInstalled: listener, onStartup: listener, onMessage: listener,
        getManifest: () => ({version:'0.1.0'}),
        getURL: p => 'chrome-extension://test/' + p },
      alarms: { onAlarm: listener, async get() { return {}; }, async create() {} },
      action: { async setBadgeText() {}, async setBadgeBackgroundColor() {}, async setTitle() {} }
    },
    async fetch(url, options) {
      if (String(url).startsWith('chrome-extension://test/')) {
        return { ok:true, async json() { return JSON.parse(fs.readFileSync(path.join(extension, 'config/default-rules.json'), 'utf8')); } };
      }
      calls.push({url:String(url), method: options?.method || 'GET'});
      throw new Error('Network unavailable in this test');
    }
  });
  vm.runInContext(fs.readFileSync(path.join(extension, 'src/background.js'), 'utf8'), context);
  return { data, calls, run: expression => vm.runInContext(expression, context) };
}
const payload = {
  scan: { url:'https://example.invalid/apply', hostname:'example.invalid', title:'虚构申请',
    fields:[{fieldId:'name',label:'姓名',type:'text'}] },
  profileCatalog:{fields:[{path:'basic.name',label:'姓名'}]}
};

test('AI defaults to explicitly disabled', async () => {
  const bg = background();
  assert.equal((await bg.run('getSettings()')).apiConfig.enabled, false);
});
for (const operation of ['mapFields', 'analyzePageStructure']) {
  test(operation + ' does not make network requests without AI opt-in', async () => {
    const bg = background();
    let result, error;
    try { result = await bg.run(operation + '(' + JSON.stringify(payload) + ')'); }
    catch (e) { error = e; }
    assert.equal(bg.calls.length, 0, 'Default path must not attempt any network request');
    assert.equal(error, undefined);
    assert.equal(Array.isArray(result[operation === 'mapFields' ? 'mappings' : 'fieldHints']), true);
  });
}
test('explicit AI opt-in reaches the configured endpoint', async () => {
  const bg = background({apiConfig:{enabled:true,baseUrl:'https://model.example.invalid/v1',model:'test'}});
  await assert.rejects(bg.run('mapFields(' + JSON.stringify(payload) + ')'), /Network unavailable/);
  assert.equal(bg.calls.length, 1);
  assert.equal(bg.calls[0].url, 'https://model.example.invalid/v1/chat/completions');
});
test('profile save and retrieval preserve multi-entry and custom sections locally', async () => {
  const bg = background();
  const profile = {schemaVersion:2,sections:{education:{key:'education',title:'教育经历',kind:'repeat',
    items:[{title:'硕士',values:{学校:'示例甲大学'},custom:[]},{title:'本科',values:{学校:'示例乙大学'},custom:[]}]}},
    customSections:[{key:'papers',title:'论文',kind:'repeat',items:[{title:'论文1',values:{论文名称:'虚构论文'},custom:[]}]}]};
  await bg.run('saveSettings({profileV2:' + JSON.stringify(profile) + '})');
  const saved = await bg.run('getSettings()');
  assert.equal(saved.profileV2.sections.education.items.length, 2);
  assert.equal(saved.profileV2.customSections[0].items[0].values['论文名称'], '虚构论文');
  assert.equal(bg.calls.length, 0);
});

test('bundled rules are available when no server or cache exists', async () => {
  const bg = background();
  const settings = await bg.run('getSettings()');
  assert.equal(settings.ruleBundle.schemaVersion,1);
  assert.equal(settings.ruleBundle.version,'2026.11.06.1');
  assert.equal(bg.calls.length,0);
});
test('failed server refresh keeps the last valid cached rules', async () => {
  const cached=JSON.parse(fs.readFileSync(path.join(extension,'config/default-rules.json'),'utf8'));
  cached.version='fixture-cached';
  const bg=background({qhRuleBundle:cached});
  const response=await bg.run('refreshRules()');
  assert.equal(response.updated,false);
  assert.equal(response.ruleBundle.version,'fixture-cached');
  assert.equal(bg.data.qhRuleBundle.version,'fixture-cached');
  assert.equal(bg.calls.length,1);
  assert.equal(bg.calls[0].method,'GET');
});
test('invalid cached data falls back to the packaged rules', async () => {
  const bg=background({qhRuleBundle:{schemaVersion:999,version:'bad',aliases:{},sites:[]}});
  const settings=await bg.run('getSettings()');
  assert.equal(settings.ruleBundle.version,'2026.11.06.1');
  assert.equal(bg.calls.length,0);
});
