const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const app=read('app.js'),manual=read('manual.js');
assert.match(app,/querySelectorAll\('\.man-section'\)/);assert.equal([...manual.matchAll(/id="man-[^"]+"/g)].length,[...manual.matchAll(/class="man-section" id="man-/g)].length);
const css=app.split('style.textContent = `')[1].split('`;')[0];for(const line of css.split('\n')){const m=line.match(/^\s*([^{}]+)\s*\{/);if(m&&!m[1].trim().startsWith('@'))for(const selector of m[1].split(','))assert(selector.trim().startsWith('#radix-app'),selector);}
// Reproduce late IndexedDB success without waiting four seconds.
(async()=>{let req,timeout,closed=0;const ctx=vm.createContext({indexedDB:{open(){return req={result:{close(){closed++}}};}},setTimeout(fn){timeout=fn;return 1;},clearTimeout(){}});vm.runInContext(read('history-cache.js')+'\nthis.C=RadixHistoryCache;',ctx);const result=ctx.C.clear();timeout();assert.equal(await result,false);req.onsuccess();assert.equal(closed,1);console.log('RC1 regression: manual sections, CSS isolation, delayed IndexedDB connection.');})().catch(e=>{console.error(e);process.exitCode=1});
