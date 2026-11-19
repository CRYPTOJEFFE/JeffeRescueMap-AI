/* Browser integration checks for user-visible behavior. NODE_PATH may point to a preinstalled Playwright. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../web');
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server = http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname.replace(/^\//,'')||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found')}res.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/lib/chromium/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name)}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message)}}
 async function fresh(){await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>window.AtlasApp);}
 await fresh();
 await check('initial demo is clearly labeled and renders ten fixtures',async()=>{assert.match(await page.locator('#mode-banner').innerText(),/TRAINING WORKSPACE/);assert.equal(await page.locator('.incident-card').count(),10);assert.equal(await page.locator('.map-host svg').count(),1)});
 await check('area and text filters produce meaningful empty state',async()=>{await page.locator('#area-filter').selectOption('Newark, NJ');assert.equal(await page.locator('.incident-card').count(),4);await page.locator('#incident-search').fill('ZZZ-NO-MATCH');assert.equal(await page.locator('.incident-card').count(),0);assert.match(await page.locator('.incident-list').innerText(),/No incidents match/)});
 await fresh();
 await check('category selection filters and clearing restores all events',async()=>{await page.locator('[data-action="categories"]').click();await page.locator('[data-category="ems"]').check();await page.locator('[data-action="apply-types"]').click();assert.equal(await page.locator('.incident-card').count(),2);await page.locator('[data-action="categories"]').click();await page.locator('[data-action="clear-types"]').click();await page.locator('[data-action="apply-types"]').click();assert.equal(await page.locator('.incident-card').count(),10)});
 await check('favorite survives reload',async()=>{await page.locator('[data-save="DEMO-001"]').click();await page.reload();assert.equal(await page.locator('[data-save="DEMO-001"]').innerText(),'★')});
 await check('unconfigured live source opens configuration without pretending to play',async()=>{await page.locator('#side-nav [data-nav="listen"]').click();assert.equal(await page.locator('.feed-card').count(),10);assert.match(await page.locator('.feed-card').first().innerText(),/NOT CONNECTED/);await page.locator('.feed-card [data-play-feed]').first().click();assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);assert.equal(await page.locator('#audio').getAttribute('src'),null);await page.locator('[data-action="close-modal"]').click()});
 await check('ignored talkgroup has an accessible restore action',async()=>{await page.locator('#side-nav [data-nav="favorites"]').click();await page.locator('[data-ignore]').first().click();assert.equal(await page.locator('.call-row').count(),5);assert.ok(await page.locator('[data-action="release"]').count()>0,'No Release control is displayed after Ignore');await page.locator('[data-action="release"]').click();assert.equal(await page.locator('.call-row').count(),6)});
 await fresh();
 await check('invalid import is atomic',async()=>{const before=await page.evaluate(()=>JSON.stringify(AtlasApp.getData()));const fixture=await page.evaluate(()=>({...AtlasApp.getData().incidents[0],id:'SHOULD-NOT-IMPORT'}));await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({incidents:[fixture],workspace:{geojson:{type:'Broken'}}}))});await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('rejected'));const after=await page.evaluate(()=>JSON.stringify(AtlasApp.getData()));assert.equal(after,before,'Invalid import changed current data despite rejection')});
 await fresh();
 await check('workspace import restores exported dashboards and alert rules',async()=>{const fixture={incidents:[],workspace:{favorites:[],feedFavorites:[],types:[],dashboards:[{name:'Restored dashboard',filters:{query:'',area:'all',priority:'all',types:[]}}],alerts:[{name:'Restored alert',query:'',area:'all',priority:'all',types:[]}]}};await page.locator('#import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Imported'));assert.equal(await page.evaluate(()=>AtlasApp.state.dashboards[0]?.name),'Restored dashboard');assert.equal(await page.evaluate(()=>AtlasApp.state.alerts[0]?.name),'Restored alert')});
 await fresh();
 await check('station selection, acknowledgement and cross streets',async()=>{await page.locator('#side-nav [data-nav="station"]').click();assert.match(await page.locator('.station-call').innerText(),/Cross streets/);await page.locator('[data-ack]').click();assert.match(await page.locator('[data-ack]').innerText(),/Acknowledged on this device/);await page.reload();assert.match(await page.locator('[data-ack]').innerText(),/Acknowledged on this device/)});
 await check('mobile layouts fit viewport and navigation remains available',async()=>{await page.setViewportSize({width:390,height:844});for(const view of ['incidents','favorites','listen','settings','notifications','station']){await page.goto(url+'/#'+view);await page.waitForFunction(()=>window.AtlasApp);const dims=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dims.scroll<=dims.w+1,`${view} overflows ${dims.scroll-dims.w}px`);if(view!=='station')assert.ok(await page.locator('#bottom-nav').isVisible());} });
 await check('all tested flows are free of uncaught JavaScript errors',async()=>{assert.deepEqual(errors,[])});
 // Passive visual artifacts use only a freshly reset synthetic training workspace.
 const screenshotDir=path.resolve(__dirname,'../test-results');
 fs.mkdirSync(screenshotDir,{recursive:true});
 await page.setViewportSize({width:1440,height:1000});
 await fresh();
 await page.screenshot({path:path.join(screenshotDir,'desktop-incidents.png'),animations:'disabled'});
 await page.locator('#side-nav [data-nav="station"]').click();
 await page.screenshot({path:path.join(screenshotDir,'desktop-station.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 await fresh();
 await page.screenshot({path:path.join(screenshotDir,'mobile-incidents.png'),animations:'disabled'});
 await page.locator('[data-action="categories"]').click();
 await page.screenshot({path:path.join(screenshotDir,'mobile-categories.png'),animations:'disabled'});
 console.log(JSON.stringify({results,errors,screenshots:['desktop-incidents.png','desktop-station.png','mobile-incidents.png','mobile-categories.png']},null,2));
 await browser.close();server.close();process.exitCode=results.some(r=>!r.pass)?1:0;
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
