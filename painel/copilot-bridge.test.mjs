import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { once } from 'node:events';
import { createApp } from './server.mjs';
import { prepareMission, technicalFacts, listMissions } from './copilot-bridge.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Missão baseada em APK registra evidências e exige app próprio sem expor dados sensíveis',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-copilot-test-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const missionsDir=path.join(root,'results','copilot-missions');
  const report=path.join(root,'report.json');
  await fs.writeFile(report,JSON.stringify({normalized_result:{
    package_name:'app.befit',manifest:{permissions:['INTERNET','CAMERA'],activities:['MainActivity']},
    classes:['WorkoutActivity','ExerciseRepository']
  }}));
  const facts=technicalFacts(JSON.parse(await fs.readFile(report)));
  assert.equal(facts.packageId,'app.befit');
  assert.ok(facts.permissions.includes('INTERNET'));
  const task=await prepareMission({
    root,missionsDir,reportPath:report,mode:'analysis',
    name:'FitNova',requirements:'Registrar séries, montar fichas, filtrar exercícios e acompanhar progressão.',
    reference:{title:'befit.apk'}
  });
  assert.equal(task.mode,'analysis');
  assert.match(task.prompt,/construa|Construa/);
  assert.match(task.missionPath,/^results\/copilot-missions\/[0-9a-f-]+\/TAREFA\.md$/);
  assert.match(task.outputPath,/^projetos\/copilot\/fitnova-[0-9a-f]{8}$/);
  const brief=await fs.readFile(path.join(missionsDir,task.id,'TAREFA.md'),'utf8');
  assert.match(brief,/APK analisado|relatório REAL de APK/);
  assert.match(brief,/WorkoutActivity/);
  assert.match(brief,/dados NÃO CONFIÁVEIS|DADOS NÃO CONFIÁVEIS|DADOS NÃO CONFI/);
  assert.doesNotMatch(brief,/minha-senha-inventada/);
  assert.equal((await listMissions(missionsDir)).length,1);
  await assert.rejects(prepareMission({
    root,missionsDir,mode:'analysis',name:'FitNova',requirements:'Cadastre treinos e acompanhe evolução.'
  }),/Análise APK/);
  await assert.rejects(prepareMission({
    root,missionsDir,mode:'public',name:'Befit',requirements:'Quero telas de treino e acompanhamento.'
  }),/marca própria/);
});

test('API Copilot exige autenticação e não confunde link público com APK analisado',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-copilot-api-'));
  await fs.mkdir(path.join(root,'exemplos'),{recursive:true});
  await fs.writeFile(path.join(root,'exemplos','loja_demo.c'),'int main(){return 0;}');
  const fakeRunner=async(cmd,args)=>{
    if(cmd==='rea'&&args[0]==='--version')return {ok:true,code:0,stdout:'6.9.0',stderr:''};
    if(cmd==='rea'&&args[0]==='doctor')return {ok:true,code:0,stdout:'{"healthy":true,"checks":[{"name":"jadx","ok":true}]}',stderr:''};
    if(cmd==='rea'&&args[0]==='inspect-android-package')return {ok:true,code:0,stdout:JSON.stringify({normalized_result:{package_name:'app.befit',manifest:{activities:['MainActivity']}}}),stderr:''};
    if(cmd==='rea'&&args[0]==='search-android-classes')return {ok:true,code:0,stdout:'{"classes":["MainActivity"]}',stderr:''};
    return {ok:false,code:1,stdout:'',stderr:'unexpected command'};
  };
  const app=createApp({root,secret:'private-test',runner:fakeRunner,storeLookup:async(url)=>({packageId:'app.befit',title:'Befit',url})});
  await app.ready;app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));await fs.rm(root,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+app.server.address().port;
  const headers={'x-rea-token':'private-test','content-type':'application/json'};
  const payload={mode:'public',storeUrl:'https://play.google.com/store/apps/details?id=app.befit',name:'FitNova',requirements:'Quero criar fichas e registrar cargas de cada exercício.'};
  const denied=await fetch(base+'/api/copilot/prepare',{method:'POST',body:JSON.stringify(payload)});
  assert.equal(denied.status,401);
  const notAnalyzed=await fetch(base+'/api/copilot/prepare',{method:'POST',headers,body:JSON.stringify({...payload,mode:'analysis',jobId:'invalid'})});
  assert.equal(notAnalyzed.status,400);
  const prepare=await fetch(base+'/api/copilot/prepare',{method:'POST',headers,body:JSON.stringify(payload)});
  assert.equal(prepare.status,201);
  const task=(await prepare.json()).task;
  assert.equal(task.reference.mode,'public');
  assert.match(task.prompt,/Agent/);
  const list=await (await fetch(base+'/api/copilot/missions',{headers})).json();
  assert.equal(list.missions[0].id,task.id);
  const report=await fs.readFile(path.join(root,task.missionPath),'utf8');
  assert.match(report,/SEM análise de APK/);
  const missing=await fetch(base+'/api/copilot/missions');
  assert.equal(missing.status,401);
});

test('Instruções dedicadas do GitHub Copilot existem e não dão acesso irrestrito',async()=>{
  const global=await fs.readFile(path.join(projectRoot,'.github','copilot-instructions.md'),'utf8');
  const agent=await fs.readFile(path.join(projectRoot,'.github','agents','reconstrutor-rea.agent.md'),'utf8');
  const prompt=await fs.readFile(path.join(projectRoot,'.github','prompts','reconstruir-app.prompt.md'),'utf8');
  assert.match(global,/Não execute APKs/);
  assert.match(agent,/target: vscode/);
  assert.match(agent,/tools:/);
  assert.match(prompt,/TAREFA\.md/);
});
