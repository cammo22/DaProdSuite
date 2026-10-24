import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const dir=await mkdtemp(join(tmpdir(),'daprodgiochi-test-'));
const port=18790,base=`http://127.0.0.1:${port}`;
const exe=resolve('target/debug/daprodgiochi'+(process.platform==='win32'?'.exe':''));
const service=spawn(exe,['--headless','--data-dir',dir,'--port',String(port),'--public-url','https://test.example.ts.net'],{stdio:'ignore',windowsHide:true});
service.on('error',e=>{throw e;});
let browser;
try{
 for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const token=(await readFile(join(dir,'proprietario.key'),'utf8')).trim();
 browser=await chromium.launch({channel:process.platform==='win32'?'msedge':'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto(base+'/#token='+token);await page.locator('[data-open="claw"]').waitFor();
 assert.equal(await page.locator('.game-card').count(),3);
 await mkdir('test-output',{recursive:true});await page.screenshot({path:'test-output/sala-desktop.png',fullPage:true});
 await page.locator('[data-view="market"]').click();await page.locator('[data-trade="buy"]').first().click();
 await page.locator('#amount').fill('1');await page.locator('#amount-form button').click();await page.locator('#dialog').waitFor({state:'hidden'});
 await page.locator('[data-view="wallet"]').click();await page.getByText('Acquisto DPC',{exact:false}).waitFor();
 await page.locator('[data-bank="deposit"]').click();await page.locator('#amount').fill('100');await page.locator('#amount-form button').click();await page.locator('#dialog').waitFor({state:'hidden'});
 await page.locator('[data-view="admin"]').click();await page.locator('[data-invite]').click();await page.locator('#invite-form button').click();await page.locator('#qr svg').waitFor();
 const invitation=await page.locator('.invite-url').textContent();await page.locator('#dialog .close').click();
 const guest=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await guest.goto(base+'/'+new URL(invitation).hash);await guest.locator('#name').fill('Anna');await guest.locator('#join-button').click();await guest.locator('[data-open="dozer"]').first().waitFor();
 await guest.screenshot({path:'test-output/sala-telefono.png',fullPage:true});
 assert.ok(await guest.locator('#admin-nav').isHidden());
 assert.ok(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const actions=[['dozer','DOZER'],['claw','CLAW'],['neon','NP']];
 await page.locator('[data-view="sala"]').click();
 for(const[id,global]of actions){
  await page.locator(`[data-open="${id}"]`).last().click();
  const frame=await (await page.locator('#game-frame').elementHandle()).contentFrame();
  await frame.waitForFunction(key=>Boolean(window[key]),global,{timeout:45000});
  await frame.waitForFunction(()=>window.DaProdLira?.stato()?.modo==='suite');
  const before=await frame.evaluate(k=>k==='NP'?window.NP.S.lire:window[k].stato[k==='DOZER'?'saldo':'lire'],global);
  await page.locator('#refill').click();await page.locator('#amount').fill('1936');await page.locator('#amount-form button').click();await page.locator('#dialog').waitFor({state:'hidden'});
  await frame.waitForFunction(({key,before})=>(key==='NP'?window.NP.S.lire:window[key].stato[key==='DOZER'?'saldo':'lire'])>=before+1936,{key:global,before});
  await page.waitForTimeout(1800);
  await page.screenshot({path:`test-output/${id}.png`});
  await page.locator('#leave').click();await page.locator('#play').waitFor({state:'hidden'});
 }
 await page.locator('[data-slot]').click();await page.locator('[data-spin="387"]').click();await page.locator('#slot-result').filter({hasText:/★|△/}).waitFor();
 assert.deepEqual(errors,[],`Errori JavaScript: ${errors.join('; ')}`);
 console.log('OK: desktop, telefono, mercato, banca, invito QR, ospite, tre giochi, ricariche e macchinetta.');
}finally{await browser?.close();service.kill();await new Promise(r=>service.once('exit',r));await rm(dir,{recursive:true,force:true});}
