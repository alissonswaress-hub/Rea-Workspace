import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createTreinoServer} from './server.mjs';

test('TreinoLab serve interface, roteiro PWA e arquivos locais em porta isolada', async t=>{
 const server=createTreinoServer();
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port;
 for(const route of ['/', '/index.html','/styles.css','/app.js','/manifest.webmanifest','/sw.js']){
   const resp=await fetch(url+route);
   assert.equal(resp.status,200,route);
   const body=await resp.text();
   assert.ok(body.length>20);
 }
 const page=await (await fetch(url+'/')).text();
 assert.match(page,/TREINO/);
 assert.match(page,/data-nav="treinos"/);
 const app=await (await fetch(url+'/app.js')).text();
 assert.match(app,/localStorage/);
 assert.match(app,/calcular|buildPlan|generate/);
 assert.match(app,/sessions/);
 assert.match(app,/sets/);
 const invalid=await fetch(url+'/../../.git/config');
 assert.equal(invalid.status,404);
 const post=await fetch(url+'/',{method:'POST',body:'test'});
 assert.equal(post.status,404);
 const manifest=await (await fetch(url+'/manifest.webmanifest')).json();
 assert.equal(manifest.display,'standalone');
});
