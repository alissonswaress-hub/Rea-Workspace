import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json; charset=utf-8']],
  ['/sw.js', ['sw.js', 'text/javascript; charset=utf-8']],
  ['/icon.svg', ['icon.svg', 'image/svg+xml']],
]);
export function createTreinoServer() {
  return http.createServer(async(req,res)=>{
    const pathname=new URL(req.url||'/', 'http://localhost').pathname;
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if(req.method!=='GET'||!routes.has(pathname)){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Não encontrado');return;}
    try{
      const [filename,mime]=routes.get(pathname);
      const body=await fs.readFile(path.join(ROOT,filename));
      const headers={'Content-Type':mime,'Cache-Control':'no-cache'};
      if(pathname==='/sw.js')headers['Service-Worker-Allowed']='/';
      res.writeHead(200,headers);res.end(body);
    }catch{res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('Erro ao ler arquivo local');}
  });
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.TREINOLAB_PORT||4173);
  createTreinoServer().listen(port,'0.0.0.0',()=>{
    console.log('TreinoLab ativo na porta '+port+'. Abra Codespaces > Portas > 4173 > Abrir no navegador.');
    console.log('Mantenha a porta PRIVATE. Os dados são salvos apenas no navegador.');
  });
}
