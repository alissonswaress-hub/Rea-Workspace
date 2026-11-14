import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createApp } from './server.mjs';
import { generateProject, zipFiles, readProject, packageProject } from './generator.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function tempSource(t) {
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'rea-gen-'));
  t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const models=path.join(tmp,'projetos','treinolab');
  await fs.mkdir(path.dirname(models),{recursive:true});
  await fs.cp(path.join(root,'projetos','treinolab'),models,{recursive:true});
  const templates=path.join(tmp,'painel','templates','base');
  await fs.mkdir(path.dirname(templates),{recursive:true});
  await fs.cp(path.join(root,'painel','templates','base'),templates,{recursive:true});
  return tmp;
}

test('Gerador cria PWA fitness editável de marca própria após inspeção APK',async t=>{
  const tmp=await tempSource(t);
  const dir=path.join(tmp,'results','gerados');
  const report=path.join(tmp,'apk-analysis.json');
  await fs.writeFile(report,JSON.stringify({normalized_result:{
    package_name:'app.befit',
    manifest:{permissions:['INTERNET','VIBRATE'],activities:['MainActivity']},
    classes:['WorkoutActivity','ExerciseListScreen']
  }}));
  const project=await generateProject({
    root:tmp,generatedDir:dir,reportPath:report,
    name:'FitNova',kind:'auto',description:'Fichas, séries e evolução.',
    source:{kind:'apk',title:'befit-base.apk'}
  });
  assert.equal(project.kind,'treinos');
  assert.equal(project.source.kind,'análise-estática-apk');
  assert.equal(project.source.packageId,'app.befit');
  assert.match(project.features,/36 exercícios/);
  const stored=await readProject(dir,project.id);
  assert.equal(stored.name,'FitNova');
  const html=await fs.readFile(path.join(dir,project.id,'index.html'),'utf8');
  const js=await fs.readFile(path.join(dir,project.id,'app.js'),'utf8');
  assert.match(html,/<title>FitNova/);
  assert.match(js,/const KEY='rea-fitness-/);
  assert.match(js,/sessions/);
  execFileSync(process.execPath,['--check',path.join(dir,project.id,'app.js')]);
  const {zip}=await packageProject(dir,project.id);
  assert.equal(zip.readUInt32LE(0),0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
  assert.ok(zip.length>10000);
});

test('Gerador público indica que não analisou APK e cria agenda com ações',async t=>{
  const tmp=await tempSource(t),dir=path.join(tmp,'results','gerados');
  const project=await generateProject({
    root:tmp,generatedDir:dir,name:'Agenda Livre',kind:'agendamentos',
    source:{kind:'public',packageId:'br.exemplo.agenda',title:'Agenda exemplo'}
  });
  assert.equal(project.source.kind,'descrição-pública');
  const script=await fs.readFile(path.join(dir,project.id,'app.js'),'utf8');
  assert.match(script,/agendamentos/);
  assert.match(script,/Registrar agendamento/);
  execFileSync(process.execPath,['--check',path.join(dir,project.id,'app.js')]);
  await assert.rejects(generateProject({
    root:tmp,generatedDir:dir,name:'Befit',kind:'treinos',source:{kind:'public'}
  }),/marca própria/);
  await assert.rejects(generateProject({
    root:tmp,generatedDir:dir,name:'Meu app',kind:'invasao',source:{kind:'public'}
  }),/inválido/);
  const zip=zipFiles({'README.md':'Olá mundo'});
  assert.equal(zip.readUInt16LE(zip.length-12),1);
  assert.throws(()=>zipFiles({'../secret':'foo'}),/não permitido/);
});

test('REA Hub gera, serve prévia com sessão privada e baixa ZIP somente após autenticação',async t=>{
  const tmp=await tempSource(t);
  const calls=[];
  const runner=async(command,args)=>{
    calls.push([command,args]);
    if(command==='rea'&&args[0]==='--version')return {ok:true,stdout:'rea 6.9.0',stderr:''};
    if(command==='rea'&&args[0]==='doctor')return {ok:true,stdout:'{"healthy":true,"checks":[{"name":"jadx","ok":true}]}',stderr:''};
    if(command==='rea'&&args[0]==='inspect-android-package')return {ok:true,stdout:JSON.stringify({normalized_result:{package_name:'app.befit',manifest:{activities:['MainActivity']}}}),stderr:''};
    if(command==='rea'&&args[0]==='search-android-classes')return {ok:true,stdout:'{"classes":["MainActivity"]}',stderr:''};
    return {ok:false,stdout:'',stderr:'unexpected'};
  };
  const app=createApp({
    root:tmp,secret:'testing-secret',runner,
    storeLookup:async(url)=>({url,packageId:'app.befit',title:'Befit: academia',description:'Treinos e séries',analyzedApk:false})
  });
  await app.ready;
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(()=>new Promise(ok=>app.server.close(ok)));
  const base='http://127.0.0.1:'+app.server.address().port;
  const headers={'x-rea-token':'testing-secret','content-type':'application/json'};
  const publicRes=await fetch(base+'/api/generate',{method:'POST',body:JSON.stringify({mode:'public',name:'Minha Academia',storeUrl:'https://play.google.com/store/apps/details?id=app.befit'})});
  assert.equal(publicRes.status,401);
  const invalid=await fetch(base+'/api/generate',{method:'POST',headers,body:JSON.stringify({mode:'analysis',name:'FitNova',jobId:'bad'})});
  assert.equal(invalid.status,400);
  const result=await fetch(base+'/api/generate',{method:'POST',headers,
    body:JSON.stringify({mode:'public',name:'Meu Treino',kind:'treinos',storeUrl:'https://play.google.com/store/apps/details?id=app.befit'})});
  assert.equal(result.status,201);
  const created=(await result.json()).project;
  assert.equal(created.kind,'treinos');
  assert.equal(created.source.kind,'descrição-pública');
  assert.equal(created.name,'Meu Treino');
  const direct=await fetch(base+created.preview);
  assert.equal(direct.status,401,'A prévia é privada');
  const previewCookie=(result.headers.get('set-cookie')||'').split(';')[0];
  assert.match(previewCookie,/rea-preview=/);
  const preview=await fetch(base+created.preview,{headers:{cookie:previewCookie}});
  assert.equal(preview.status,200);
  assert.match(await preview.text(),/Meu Treino/);
  const script=await fetch(base+created.preview+'app.js',{headers:{cookie:previewCookie}});
  assert.equal(script.status,200);
  assert.match(await script.text(),/sessions/);
  const listing=await (await fetch(base+'/api/projects',{headers})).json();
  assert.ok(listing.projects.some(x=>x.id===created.id));
  const zipped=await fetch(base+'/api/projects/'+created.id+'/zip',{headers});
  assert.equal(zipped.status,200);
  assert.match(zipped.headers.get('content-type'),/application\/zip/);
  const bytes=Buffer.from(await zipped.arrayBuffer());
  assert.equal(bytes.readUInt32LE(0),0x04034b50);

  const upload=await fetch(base+'/api/android-upload',{
    method:'POST',
    headers:{'x-rea-token':'testing-secret','x-rea-filename':'app.befit.apk'},
    body:Buffer.from([0x50,0x4b,0x03,0x04,0,0,0,0])
  });
  assert.equal(upload.status,202);
  const jobId=(await upload.json()).id;
  let job;
  for(let i=0;i<100;i++){
    const jobs=(await (await fetch(base+'/api/jobs',{headers})).json()).jobs;
    job=jobs.find(x=>x.id===jobId);
    if(job?.status==='concluido'||job?.status==='erro')break;
    await new Promise(resolve=>setTimeout(resolve,15));
  }
  assert.equal(job?.status,'concluido',job?.error);
  assert.ok(job.reports.includes('android-pacote'));
  const built=await fetch(base+'/api/generate',{
    method:'POST',headers,
    body:JSON.stringify({mode:'analysis',jobId,name:'Meu Treino Próprio',kind:'auto'})
  });
  assert.equal(built.status,201);
  const generated=(await built.json()).project;
  assert.equal(generated.kind,'treinos');
  assert.equal(generated.source.kind,'análise-estática-apk');
  assert.equal(generated.source.packageId,'app.befit');
  assert.notEqual(generated.id,created.id);
  const logoff=await fetch(base+'/api/logout',{method:'POST',headers});
  assert.equal(logoff.status,200);
  assert.match(logoff.headers.get('set-cookie')||'',/Max-Age=0/);
});
