import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function createBackground(extension, initial={}, externalFetch=null) {
 const data=structuredClone(initial), calls=[];
 const listener={addListener(){}};
 const context=vm.createContext({
  console,URL,AbortController,setTimeout,clearTimeout,
  chrome:{
   storage:{local:{
    async get(keys){return Object.fromEntries(keys.map(k=>[k,data[k]]))},
    async set(next){Object.assign(data,structuredClone(next))},
    async clear(){for(const k of Object.keys(data))delete data[k]}
   }},
   runtime:{onInstalled:listener,onStartup:listener,onMessage:listener,getManifest:()=>({version:'0.1.0',name:'lxy的秋招助手',author:'lxy'}),getURL:p=>'chrome-extension://fixture/'+p},
   alarms:{onAlarm:listener,async get(){return {}},async create(){}},
   action:{async setBadgeText(){},async setBadgeBackgroundColor(){},async setTitle(){}},
   tabs:{async create(){}}
  },
  async fetch(url,options){
   if(String(url).startsWith('chrome-extension://fixture/'))return {ok:true,async json(){return JSON.parse(fs.readFileSync(path.join(extension,'config/default-rules.json'),'utf8'))}};
   calls.push({url:String(url),method:options?.method||'GET'});
   if(externalFetch) return externalFetch(url,options);
   throw new Error('Network blocked by synthetic fixture');
  }
 });
 vm.runInContext(fs.readFileSync(path.join(extension,'src/background.js'),'utf8'),context);
 return {data,calls,async message(message){return vm.runInContext('handleMessage('+JSON.stringify(message)+')',context)}};
}
