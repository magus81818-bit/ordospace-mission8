const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');

(async () => {
const root=path.resolve(__dirname,'..','..','..');
const out=path.join(root,'evidence','redo','r02','ordospace-unchanged');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://x').pathname);let file=path.join(root,pathname==='/'?'index.html':pathname.slice(1));if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('not found');return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(4177,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({locale:'ko-KR',colorScheme:'dark',reducedMotion:'reduce'});const page=await context.newPage();
const result={generatedAt:new Date().toISOString(),baseline:'937d38b92d5b062f6110dba42bc4690c35f3ff15',captures:[],pageErrors:[]};page.on('pageerror',e=>result.pageErrors.push(e.message));
async function publicRoute(route,viewportName,width,height){await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:4177/#${route}`,{waitUntil:'domcontentloaded'});await page.waitForTimeout(250);if(!await page.locator(`#screen-${route}`).isVisible())throw new Error(`${route} not visible`);const file=path.join(out,`${route}-${viewportName}-${width}x${height}.png`);await page.screenshot({path:file,fullPage:true});result.captures.push(path.relative(root,file).replaceAll('\\','/'));}
for(const [name,v] of Object.entries({desktop:[1440,1000],tablet:[1024,1366],mobile:[390,844]})){await publicRoute('landing',name,v[0],v[1]);await publicRoute('auth',name,v[0],v[1]);}
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4177/#select-workspace',{waitUntil:'domcontentloaded'});await page.locator('[data-ws-role="client"]').click();await page.waitForTimeout(250);for(const route of ['dashboard','project','approvals']){await page.goto(`http://127.0.0.1:4177/#${route}`,{waitUntil:'domcontentloaded'});await page.waitForTimeout(250);if(!await page.locator(`#screen-${route}`).isVisible())throw new Error(`${route} not visible`);const file=path.join(out,`${route}-desktop-1440x1000.png`);await page.screenshot({path:file,fullPage:true});result.captures.push(path.relative(root,file).replaceAll('\\','/'));}
result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'artifacts','redo','r02','ordospace-browser-parity.json'),`${JSON.stringify(result,null,2)}\n`,'utf8');await browser.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({captures:result.captures.length,pageErrors:result.pageErrors.length}));
})().catch(error => { console.error(error); process.exit(1); });
