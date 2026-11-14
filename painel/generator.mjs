/* Gerador de projetos ORIGINAIS a partir de um relatório autorizado.
 * Não copia bytecode, assets, classes, logotipos ou fontes de apps de terceiros.
 * Modelos locais e determinísticos. Não usa IA remota nem promete app idêntico.
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

const FILES = ['index.html','styles.css','app.js','manifest.webmanifest','icon.svg','sw.js','config.json','README.md'];
const KINDS = new Set(['auto','treinos','agendamentos','catalogo','tarefas','geral']);
function safeText(value, max = 100) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
}
const escapeHTML = value => safeText(value,120).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validId = id => typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
function inferKind(data) {
  const text=(data.packageId+' '+data.title+' '+data.description+' '+data.hints).toLowerCase();
  if (/befit|fitness|muscula|academia|workout|exercis|treino|gym\b/.test(text)) return 'treinos';
  if (/agend|sal[oã]o|consulta|barbearia|booking|appoint|manicure/.test(text)) return 'agendamentos';
  if (/shop|commerce|catalog|loja|vitrine|mercado|compras|store\b/.test(text)) return 'catalogo';
  if (/task|habit|tarefas|rotina|organiza|checklist/.test(text)) return 'tarefas';
  return 'geral';
}
function detailsFromAnalysis(doc) {
  if (!doc || typeof doc!=='object') return { packageId:'', hints:'', indicators:[] };
  const r=doc.normalized_result||doc.raw_result||doc;
  const compact=JSON.stringify(r).slice(0,60000);
  const packageId=String(r.package_name||r.packageName||r.manifest?.package_name||r.manifest?.packageName||doc.subject?.name||'').slice(0,150);
  const indicators = [];
  const manifest=r.manifest || r.package || {};
  for(const key of ['permissions','activities','services','receivers']){
    const val=manifest[key]||r[key];
    if(Array.isArray(val)) indicators.push(key+': '+val.length);
  }
  return { packageId,hints:compact.slice(0,20000),indicators };
}
function zipCrc(buf) {
  let crc=-1;
  for(const byte of buf) {
    crc^=byte;
    for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^(-1))>>>0;
}
export function zipFiles(files) {
  const local=[],central=[];let offset=0;
  for(const [filename,contents] of Object.entries(files)){
    if(!FILES.includes(filename))throw Error('Arquivo gerado não permitido.');
    const name=Buffer.from(filename,'utf8'),bytes=Buffer.from(contents,'utf8'),crc=zipCrc(bytes);
    if(bytes.length>3e6 || name.length>150)throw Error('Arquivo gerado grande demais.');
    const loc=Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50,0);loc.writeUInt16LE(20,4);loc.writeUInt32LE(crc,14);
    loc.writeUInt32LE(bytes.length,18);loc.writeUInt32LE(bytes.length,22);loc.writeUInt16LE(name.length,26);
    local.push(loc,name,bytes);
    const cen=Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50,0);cen.writeUInt16LE(20,4);cen.writeUInt16LE(20,6);
    cen.writeUInt32LE(crc,16);cen.writeUInt32LE(bytes.length,20);cen.writeUInt32LE(bytes.length,24);
    cen.writeUInt16LE(name.length,28);cen.writeUInt32LE(offset,42);
    central.push(cen,name);
    offset+=loc.length+name.length+bytes.length;
  }
  const cen=Buffer.concat(central),end=Buffer.alloc(22),count=Object.keys(files).length;
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);
  end.writeUInt32LE(cen.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,cen,end]);
}
async function readAnalysis(reportPath) {
  if(!reportPath)return {};
  const st=await fs.stat(reportPath);
  if(!st.isFile()||st.size<2||st.size>4e6)throw Error('Relatório de análise inválido ou muito grande.');
  return JSON.parse(await fs.readFile(reportPath,'utf8'));
}
function originalIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#151420"/><rect x="53" y="53" width="406" height="406" rx="90" fill="#b9a3ff"/><path d="M170 257h173M257 170v173" fill="none" stroke="#161226" stroke-linecap="round" stroke-width="54"/></svg>';
}
function serviceWorker(projectId){
  return "const CACHE='app-original-"+projectId+"';\n"+
    "self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./app.js','./styles.css','./config.json','./manifest.webmanifest','./icon.svg'])).then(()=>self.skipWaiting())));\n"+
    "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));\n"+
    "self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});\n";
}
function manifest(name) {
  return JSON.stringify({name,short_name:name.slice(0,30),start_url:'./',scope:'./',id:'./',
    display:'standalone',background_color:'#0b0d15',theme_color:'#0b0d15',
    icons:[{src:'./icon.svg',sizes:'any',type:'image/svg+xml'}]},null,2);
}
async function buildFiles({root,name,kind,id,description}){
  const files={};
  if(kind==='treinos'){
    for(const f of ['index.html','styles.css','app.js','sw.js','icon.svg','manifest.webmanifest']){
      files[f]=await fs.readFile(path.join(root,'projetos','treinolab',f),'utf8');
    }
    files['index.html']=files['index.html']
      .replace(/<title>[^<]*<\/title>/,'<title>'+escapeHTML(name)+' | Treinos</title>')
      .replace('<span>TREINO<em>LAB</em><small>','<span>'+escapeHTML(name)+'<small>')
      .replace('TreinoLab: treinos e evolução organizados em um aplicativo próprio.',escapeHTML(name)+': acompanhamento de treinos e evolução.');
    files['app.js']=files['app.js'].replace("const KEY='treinolab-v1';","const KEY='rea-fitness-"+id+"';")
      .replaceAll('TreinoLab','este aplicativo');
    files['sw.js']=files['sw.js'].replaceAll('treinolab-v1','rea-fitness-'+id);
    files['manifest.webmanifest']=manifest(name);
  } else {
    for(const f of ['index.html','app.js','styles.css'])
      files[f]=await fs.readFile(path.join(root,'painel','templates','base',f),'utf8');
    files['index.html']=files['index.html'].replace('<title>Meu Projeto</title>','<title>'+escapeHTML(name)+'</title>');
    files['manifest.webmanifest']=manifest(name);
    files['icon.svg']=originalIcon();
    files['sw.js']=serviceWorker(id);
    files['config.json']=JSON.stringify({projectId:id,name,description,kind},null,2);
  }
  if(!files['config.json'])files['config.json']=JSON.stringify({projectId:id,name,description,kind},null,2);
  return files;
}
export async function generateProject({root,generatedDir,name,kind='auto',description='',source={},reportPath=null}){
  if(!KINDS.has(kind))throw Error('Tipo de aplicativo inválido.');
  name=safeText(name,64);
  description=safeText(description,400);
  if(name.length<3)throw Error('Informe um nome próprio para o novo aplicativo (mínimo 3 letras).');
  if(/^(befit|be fit)$/i.test(name))throw Error('Escolha uma marca própria, diferente da referência.');
  const analysis=await readAnalysis(reportPath),facts=detailsFromAnalysis(analysis);
  const sourceInfo={
    kind:source.kind==='apk'?'análise-estática-apk':'descrição-pública',
    packageId:safeText(source.packageId || facts.packageId,150),
    title:safeText(source.title,150),
    description:safeText(source.description,400),
    indicators:facts.indicators
  };
  const actualKind=kind==='auto'?inferKind({...sourceInfo,hints:facts.hints}):kind;
  const projectId=randomUUID(),dir=path.join(generatedDir,projectId);
  const desc=description || (actualKind==='treinos'
    ? 'Seu espaço para organizar treinos, registrar séries e acompanhar a evolução.'
    : actualKind==='agendamentos'?'Organize atendimentos e horários em um só lugar.'
    : actualKind==='catalogo'?'Organize produtos, preços e pedidos em um catálogo local.'
    : actualKind==='tarefas'?'Organize tarefas e acompanhe o que já foi feito.'
    : 'Organize informações e ideias para desenvolver seu aplicativo.');
  const files=await buildFiles({root,name,kind:actualKind,id:projectId,description:desc});
  const features={
    treinos:'Fichas editáveis, 36 exercícios, registro de séries e cargas, evolução e backup local.',
    agendamentos:'Agenda local, cadastro de clientes e horários e bloqueio de horários repetidos.',
    catalogo:'Produtos editáveis, carrinho local e cópia do pedido.',
    tarefas:'Criação, conclusão e exclusão de tarefas.',
    geral:'Anotações e organização de informações locais.'
  };
  const lines=[
    '# '+name,'','Projeto ORIGINAL criado pelo REA Hub. Não é código extraído ou cópia do aplicativo de referência.',
    '','## De onde veio esta referência',
    'Tipo: '+sourceInfo.kind,'Pacote: '+(sourceInfo.packageId||'não informado'),
    'Indícios do relatório: '+(sourceInfo.indicators.join('; ') || 'não extraídos'),
    '','## O que foi implementado',features[actualKind],
    '','## Limitações','Os dados ficam neste navegador (localStorage). Sem backend, login, sincronização, assinaturas ou IA integrada.',
    'Não foi reproduzido código proprietário, imagens, modelos remotos ou APIs privadas. Uma análise estática não recupera todo o funcionamento.',
    'O protótipo é uma base editável, não um clone completo nem um APK Android pronto.',
    '','## Como abrir','Abra index.html em um servidor estático HTTPS ou local. Para visualizar no Codespaces, use a prévia do REA Hub.',
    'Pode-se publicar posteriormente com infraestrutura própria e autorização adequada.',
  ];
  files['README.md']=lines.join('\n')+'\n';
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  try {
    for(const [filename,content] of Object.entries(files))
      await fs.writeFile(path.join(dir,filename),content,{mode:0o600,flag:'wx'});
    const result={
      id:projectId,name,kind:actualKind,description:desc,source:sourceInfo,
      features:features[actualKind],createdAt:new Date().toISOString(),
      files:Object.keys(files),preview:'/generated/'+projectId+'/',limit:'MVP original sem backend ou IA'
    };
    await fs.writeFile(path.join(dir,'project.json'),JSON.stringify(result,null,2),{mode:0o600});
    return result;
  } catch(error){await fs.rm(dir,{force:true,recursive:true});throw error;}
}
export async function readProject(generatedDir,id){
  if(!validId(id))throw Error('Projeto inválido.');
  const dir=path.join(generatedDir,id);
  const result=JSON.parse(await fs.readFile(path.join(dir,'project.json'),'utf8'));
  if(result.id!==id)throw Error('Projeto inválido.');
  return result;
}
export async function projectFile(generatedDir,id,filename){
  const result=await readProject(generatedDir,id);
  if(!FILES.includes(filename) || !result.files.includes(filename))throw Error('Arquivo inexistente.');
  const body=await fs.readFile(path.join(generatedDir,id,filename));
  return {project:result,body};
}
export async function packageProject(generatedDir,id){
  const proj=await readProject(generatedDir,id),files={};
  for(const filename of proj.files)files[filename]=await fs.readFile(path.join(generatedDir,id,filename),'utf8');
  return {project:proj,zip:zipFiles(files)};
}


/* Apaga SOMENTE rascunhos gerados pelo painel.
 * Nao remove APKs, relatorios, templates, codigo versionado nem outros repositorios.
 */
export async function deleteGeneratedProject(generatedDir,id) {
  if(!validId(id)) throw Error('Identificador de projeto inválido.');
  const root=await fs.realpath(generatedDir);
  const dir=path.join(root,id);
  const lstat=await fs.lstat(dir);
  if(!lstat.isDirectory()||lstat.isSymbolicLink())throw Error('Pasta de projeto inválida.');
  const project=await readProject(root,id);
  const marker=await fs.lstat(path.join(dir,'project.json'));
  if(!marker.isFile()||marker.isSymbolicLink())throw Error('Marcador de projeto inválido.');
  const names=await fs.readdir(dir);
  const allowed=new Set([...FILES,'project.json']);
  if(names.some(name=>!allowed.has(name)))throw Error('O projeto possui arquivos desconhecidos. Exclusão bloqueada.');
  await fs.rm(dir,{recursive:true,force:false});
  return {id,name:project.name,deleted:true};
}

export async function deleteAllGeneratedProjects(generatedDir) {
  try { await fs.access(generatedDir); }
  catch(error) { if(error.code==='ENOENT')return {deleted:[],failed:[]}; throw error; }
  const entries=await fs.readdir(generatedDir,{withFileTypes:true});
  const ids=entries.filter(e=>e.isDirectory() && validId(e.name)).map(e=>e.name);
  const deleted=[],failed=[];
  for(const id of ids){
    try {deleted.push(await deleteGeneratedProject(generatedDir,id));}
    catch {failed.push(id);}
  }
  return {deleted,failed};
}
