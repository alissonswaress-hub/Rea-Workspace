/* Execução opt-in do GitHub Copilot CLI em diretório isolado.
 * Não concede shell nem caminhos externos, não usa flags --allow-all e
 * não publica dados privados do usuário no repositório.
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';

const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedPreview=new Map([
  ['index.html','text/html; charset=utf-8'],
  ['app.js','text/javascript; charset=utf-8'],
  ['styles.css','text/css; charset=utf-8'],
  ['manifest.webmanifest','application/manifest+json; charset=utf-8'],
  ['icon.svg','image/svg+xml']
]);
export async function copilotVersion(runner){
  const result=await runner('copilot',['--version'],{timeout:5000});
  return {installed:!!result.ok,version:result.ok?String(result.stdout||'').trim().slice(0,100):''};
}
export async function runCopilotMission({missionsDir,id,runner,timeout=720000}){
  if(!ID.test(id))throw Error('Identificador de missão inválido.');
  const dir=path.join(missionsDir,id);
  const source=await fs.readFile(path.join(dir,'TAREFA.md'),'utf8');
  const metadata=JSON.parse(await fs.readFile(path.join(dir,'metadata.json'),'utf8'));
  if(metadata.id!==id)throw Error('Missão inválida.');
  const output=path.join(dir,'app');
  await fs.mkdir(output,{recursive:true,mode:0o700});
  await fs.writeFile(path.join(output,'ESPECIFICACAO.md'),source,{mode:0o600});
  const prompt=[
    'Leia o arquivo ESPECIFICACAO.md NA PASTA ATUAL. A partir da missão, crie um aplicativo PWA ORIGINAL e FUNCIONAL.',
    'IMPORTANTE: nesta execução automática o ÚNICO diretório de escrita é o diretório atual, chamado app.',
    'O caminho de saída fora da pasta atual mencionado no brief se refere apenas ao modo Copilot IDE. IGNORE esse caminho no modo automático.',
    'Crie index.html, styles.css, app.js, README.md e outros arquivos LOCAIS necessários.',
    'Implemente pelo menos três fluxos principais, estado persistente, validação, navegação e excelente design responsivo.',
    'Sem biblioteca externa, backend, chaves, scripts de terceiros, assets proprietários ou instalação de pacotes.',
    'Não execute comandos shell, não acesse URLs e não leia arquivos fora deste diretório.',
    'Não copie marcas nem códigos do aplicativo de referência. Diferencie os dados técnicos de hipóteses.',
    'Este é o trabalho final. Crie os arquivos AGORA usando as ferramentas de edição e retorne um resumo do que foi feito.'
  ].join(' ');
  const args=[
    '-s','-p',prompt,
    '--available-tools=edit,view,grep,glob',
    '--allow-tool=write',
    '--deny-tool=shell',
    '--deny-tool=web_fetch,web_search'
  ];
  const result=await runner('copilot',args,{cwd:output,timeout,env:process.env});
  if(!result.ok){
    const message=String(result.stderr||result.stdout||'').slice(-900);
    if(/Access denied by policy settings|Copilot CLI policy setting may be preventing access/i.test(message)) {
      const err=new Error('Acesso ao Copilot CLI negado pela política do GitHub. Verifique sua assinatura e as permissões do Copilot CLI em https://github.com/settings/copilot. Se o acesso for por uma organização, o administrador precisa autorizar. Enquanto isso, use o Copilot Agent no Codespace.');
      err.code='COPILOT_POLICY_DENIED';
      throw err;
    }
    throw Error('O Copilot CLI não conseguiu concluir. Consulte as informações da conta e o relatório da execução. '+message);
  }
  for(const file of ['index.html','styles.css','app.js']){
    const filePath=path.join(output,file);
    const stat=await fs.lstat(filePath).catch(()=>null);
    if(!stat?.isFile()||stat.isSymbolicLink()||stat.size<20||stat.size>3e6)
      throw Error('Copilot não entregou todos os arquivos principais. Falta ou é inválido: '+file);
  }
  const checked=await runner('node',['--check',path.join(output,'app.js')],{cwd:output,timeout:10000});
  if(!checked.ok)throw Error('O JavaScript gerado não passou na validação de sintaxe: '+String(checked.stderr).slice(-600));
  return {id,ready:true,files:['index.html','styles.css','app.js'],summary:String(result.stdout||'').slice(0,12000)};
}
export function parsePreviewPath(pathname){
  const match=pathname.match(/^\/([0-9a-f-]{36})\/(index\.html|app\.js|styles\.css|manifest\.webmanifest|icon\.svg)?$/i);
  if(!match||!ID.test(match[1]))return null;
  const name=match[2]||'index.html';
  return allowedPreview.has(name)?{id:match[1],name,type:allowedPreview.get(name)}:null;
}
export async function previewFile(missionsDir,id,name) {
  if(!ID.test(id)||!allowedPreview.has(name))throw Error('Arquivo inválido.');
  const directory=path.join(missionsDir,id,'app');
  const file=path.join(directory,name);
  const stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>3e6)throw Error('Arquivo de prévia inválido.');
  return fs.readFile(file);
}
