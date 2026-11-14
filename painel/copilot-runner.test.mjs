import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { once } from 'node:events';
import { createApp } from './server.mjs';
import { prepareMission } from './copilot-bridge.mjs';
import { copilotVersion, runCopilotMission, parsePreviewPath, previewFile } from './copilot-runner.mjs';

function memoryRunner(calls){
  return async(command,args,options={})=>{
    calls.push({command,args,options:{cwd:options.cwd}});
    if(command==='copilot'&&args[0]==='--version')return {ok:true,code:0,stdout:'1.0.0',stderr:''};
    if(command==='copilot'&&args.includes('-p')){
      assert.ok(args.includes('--available-tools=edit,view,grep,glob'),'restricted tools');
      assert.ok(args.includes('--allow-tool=write'),'write tools only');
      assert.ok(args.includes('--deny-tool=shell'),'no arbitrary shell');
      const output=options.cwd;
      await fs.writeFile(path.join(output,'index.html'),'<!doctype html><html><body><h1>App funcional</h1><script src="./app.js"></script></body></html>');
      await fs.writeFile(path.join(output,'app.js'),'const title = "App funcional"; console.log(title);');
      await fs.writeFile(path.join(output,'styles.css'),'body{color:white;background:black}');
      await fs.writeFile(path.join(output,'README.md'),'Um aplicativo original, demonstrativo e testável.');
      return {ok:true,code:0,stdout:'App funcional gerado com sucesso.',stderr:''};
    }
    if(command==='node'&&args[0]==='--check')return {ok:true,code:0,stdout:'',stderr:''};
    if(command==='rea'&&args[0]==='--version')return {ok:true,code:0,stdout:'6.9.0',stderr:''};
    return {ok:false,code:1,stdout:'',stderr:'unknown command'};
  };
}
test('Copilot CLI executa sem shell, escreve somente em pasta da missão e entrega arquivos',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rea-cli-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const missions=path.join(dir,'results','copilot-missions');
  const task=await prepareMission({root:dir,missionsDir:missions,mode:'public',
    name:'Novo Treino',requirements:'Cadastro de exercícios, planos semanais e histórico de séries.',
    reference:{title:'Referência pública',packageId:'app.befit'}});
  const calls=[];
  assert.equal((await copilotVersion(memoryRunner(calls))).installed,true);
  const result=await runCopilotMission({missionsDir:missions,id:task.id,runner:memoryRunner(calls)});
  assert.equal(result.ready,true);
  assert.ok(calls.some(c=>c.command==='copilot'&&c.args.includes('-p')));
  assert.equal((await previewFile(missions,task.id,'index.html')).includes('App funcional'),true);
  await assert.rejects(previewFile(missions,task.id,'../.rea-private/secret'),/inválido/);
  assert.equal(parsePreviewPath('/'+task.id+'/')?.name,'index.html');
  assert.equal(parsePreviewPath('/'+task.id+'/app.js')?.name,'app.js');
  assert.equal(parsePreviewPath('/'+task.id+'/../metadata.json'),null);
  assert.equal(parsePreviewPath('/../../../x'),null);
});
test('REA Hub aciona Copilot opcionalmente e oferece prévia em servidor separado',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-cli-api-'));
  const calls=[];
  const app=createApp({root,secret:'tested-token',runner:memoryRunner(calls),
    storeLookup:async(url)=>({packageId:'app.befit',title:'BeFit',url})});
  await app.ready;app.server.listen(0,'127.0.0.1');app.previewServer.listen(0,'127.0.0.1');
  await Promise.all([once(app.server,'listening'),once(app.previewServer,'listening')]);
  t.after(async()=>{
    await Promise.all([
      new Promise(r=>app.server.close(r)),new Promise(r=>app.previewServer.close(r))
    ]);
    await fs.rm(root,{recursive:true,force:true});
  });
  const base='http://127.0.0.1:'+app.server.address().port;
  const previewBase='http://127.0.0.1:'+app.previewServer.address().port;
  const headers={'x-rea-token':'tested-token','content-type':'application/json'};
  const status=await fetch(base+'/api/copilot/status',{headers});
  assert.equal((await status.json()).installed,true);
  const taskRes=await fetch(base+'/api/copilot/prepare',{method:'POST',headers,body:JSON.stringify({
    mode:'public',name:'Novo Fit',storeUrl:'https://play.google.com/store/apps/details?id=app.befit',
    requirements:'Fichas de treino, séries e pesos, exercícios pesquisáveis.'
  })});
  assert.equal(taskRes.status,201);
  const task=(await taskRes.json()).task;
  const forbidden=await fetch(base+'/api/copilot/execute',{method:'POST',body:JSON.stringify({missionId:task.id,confirm:true})});
  assert.equal(forbidden.status,401);
  const unconfirmed=await fetch(base+'/api/copilot/execute',{method:'POST',headers,body:JSON.stringify({missionId:task.id,confirm:false})});
  assert.equal(unconfirmed.status,400);
  const started=await fetch(base+'/api/copilot/execute',{method:'POST',headers,body:JSON.stringify({missionId:task.id,confirm:true})});
  assert.equal(started.status,202);
  const id=(await started.json()).id;
  let job;
  for(let i=0;i<120;i++){
    const json=await (await fetch(base+'/api/jobs',{headers})).json();
    job=json.jobs.find(j=>j.id===id);
    if(job?.status==='concluido'||job?.status==='erro')break;
    await new Promise(r=>setTimeout(r,10));
  }
  assert.equal(job?.status,'concluido',job?.error);
  assert.equal(job.previewId,task.id);
  assert.ok(job.reports.includes('copilot-resposta'));
  const page=await fetch(previewBase+'/'+task.id+'/');
  assert.equal(page.status,200);
  assert.match(await page.text(),/App funcional/);
  const script=await fetch(previewBase+'/'+task.id+'/app.js');
  assert.equal(script.status,200);
  assert.match(await script.text(),/App funcional/);
  assert.equal((await fetch(previewBase+'/'+task.id+'/metadata.json')).status,404);
  assert.equal((await fetch(previewBase+'/')).status,404);
  assert.ok(calls.some(c=>c.command==='node'&&c.args.includes('--check')));
});


test('Bloqueio de licença/política do GitHub é reconhecido sem pedir novo login',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-copilot-policy-'));
  const missionsDir=path.join(root,'results','copilot-missions');
  const task=await prepareMission({root,missionsDir,mode:'public',
    name:'Treino Novo',requirements:'Cadastrar exercícios, registrar séries e acompanhar progresso semanal.',
    reference:{packageId:'app.befit',title:'Befit'}});
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const blockedRunner=async(cmd,args)=>{
    if(cmd==='copilot'&&args[0]==='--version')
      return {ok:true,code:0,stdout:'1.0.0',stderr:''};
    if(cmd==='copilot'&&args.includes('-p'))
      return {ok:false,code:1,stdout:'',stderr:'Error: Access denied by policy settings. Your Copilot CLI policy setting may be preventing access.'};
    throw Error('Não deveria tentar outros comandos.');
  };
  await assert.rejects(
    runCopilotMission({missionsDir,id:task.id,runner:blockedRunner}),
    error=>error.code==='COPILOT_POLICY_DENIED'&&/github.com\/settings\/copilot/.test(error.message)
  );
});

test('REA Hub exibe política negada e preserva tarefa para Copilot Agent no notebook',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-copilot-policy-api-'));
  const runner=async(command,args)=>{
    if(command==='copilot'&&args[0]==='--version')
      return {ok:true,code:0,stdout:'1.0.0',stderr:''};
    if(command==='copilot'&&args.includes('-p'))
      return {ok:false,code:1,stdout:'',stderr:'Error: Access denied by policy settings. Visit https://github.com/settings/copilot'};
    return {ok:true,code:0,stdout:'rea 6.9.0',stderr:''};
  };
  const app=createApp({root,secret:'test-policy-token',runner,
    storeLookup:async url=>({url,packageId:'app.befit',title:'Befit'})});
  await app.ready;app.server.listen(0,'127.0.0.1');
  await once(app.server,'listening');
  t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));await fs.rm(root,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+app.server.address().port;
  const headers={'x-rea-token':'test-policy-token','content-type':'application/json'};
  const mission=await fetch(base+'/api/copilot/prepare',{
    method:'POST',headers,body:JSON.stringify({mode:'public',name:'Treino Teste',
      requirements:'Cadastrar treinos, registrar pesos e séries e acompanhar evolução.',
      storeUrl:'https://play.google.com/store/apps/details?id=app.befit'})
  });
  assert.equal(mission.status,201);
  const task=(await mission.json()).task;
  const execute=await fetch(base+'/api/copilot/execute',{
    method:'POST',headers,body:JSON.stringify({missionId:task.id,confirm:true})
  });
  assert.equal(execute.status,202);
  const {id}=await execute.json();
  let job;
  for(let i=0;i<100;i++){
    const state=await (await fetch(base+'/api/jobs',{headers})).json();
    job=state.jobs.find(j=>j.id===id);
    if(job?.status==='erro')break;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.equal(job?.status,'erro');
  assert.equal(job.issue,'copilot_policy_denied');
  assert.match(job.error,/política ou licença/);
  const status=await (await fetch(base+'/api/copilot/status',{headers})).json();
  assert.equal(status.installed,true);
  assert.equal(status.policyBlocked,true);
  const missions=await (await fetch(base+'/api/copilot/missions',{headers})).json();
  assert.equal(missions.missions[0].id,task.id);
});
