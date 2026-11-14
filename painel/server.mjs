import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs, constants as fsConstants, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const STATIC = path.join(HERE, 'public');
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_BODY_BYTES = 17 * 1024 * 1024;
const MAX_APK_BYTES = 160 * 1024 * 1024;
const REPORT_NAMES = new Set(['diagnostico', 'analise', 'funcao', 'erro-diagnostico', 'erro-analise', 'erro-funcao', 'android-pacote', 'android-classes', 'erro-android-diagnostico', 'erro-android-pacote', 'erro-android-classes']);
const MIME = { '/': 'text/html; charset=utf-8', '/styles.css': 'text/css; charset=utf-8', '/app.js': 'text/javascript; charset=utf-8' };
const STATIC_PATH = { '/': 'index.html', '/styles.css': 'styles.css', '/app.js': 'app.js' };

function cleanString(value, length = 100) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, length);
}

function safeName(name) {
  return cleanString(path.basename(String(name ?? 'arquivo.bin').replaceAll('\\', '/')), 90)
    .replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '') || 'arquivo.bin';
}

function json(res, code, data) {
  const text = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(text);
}

function authorized(req, secret) {
  const given = req.headers['x-rea-token'];
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const err = new Error('Arquivo grande demais. Limite de 12 MB.');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { const err = new Error('Dados enviados em formato inválido.'); err.statusCode = 400; throw err; }
  return parsed;
}

function runProcess(command, args, { cwd = ROOT, env = process.env, timeout = 300000 } = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, env, timeout, maxBuffer: 7 * 1024 * 1024, encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error ? (error.code ?? 'erro') : 0,
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? '') || (error ? cleanString(error.message, 1500) : ''),
      });
    });
  });
}

export function createApp({ secret = randomBytes(20).toString('hex'), root = ROOT, runner = runProcess } = {}) {
  const uploadsDir = path.join(root, 'targets', 'painel');
  const reportsDir = path.join(root, 'results', 'painel');
  const hopperPath = process.env.HOPPER_LAUNCHER_PATH || '/opt/hopper/bin/Hopper';
  const jadxPath = process.env.REA_JADX_MCP_JAR || path.join(process.env.HOME || '/home/vscode', '.local/share/rea/android/jadx-headless-mcp-0.7.1-all.jar');
  const jobs = new Map();
  let running = false;
  const env = { ...process.env, HOPPER_LAUNCHER_PATH: hopperPath, REA_JADX_MCP_JAR: jadxPath };

  async function persist(job) {
    const dir = path.join(reportsDir, job.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'status.json'), JSON.stringify(job, null, 2), { mode: 0o600 });
  }

  async function saveReport(job, name, value) {
    const ext = name.startsWith('erro-') ? '.txt' : '.json';
    await fs.writeFile(path.join(reportsDir, job.id, name + ext), value || '', { mode: 0o600 });
    if (!job.reports.includes(name)) job.reports.push(name);
    await persist(job);
  }

  async function call(job, command, args, reportName, timeout = 300000) {
    const result = await runner(command, args, { cwd: root, env, timeout });
    if (reportName) await saveReport(job, reportName, result.stdout);
    if (reportName && result.stderr) await saveReport(job, 'erro-' + reportName, result.stderr);
    if (!result.ok) {
      const detail = result.stderr.trim().slice(-1200) || result.stdout.trim().slice(-1200);
      throw new Error(command + ' falhou (' + result.code + '). ' + (detail || 'Consulte o relatório.'));
    }
    return result;
  }

  async function runJob(job, requestData) {
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.mkdir(path.join(reportsDir, job.id), { recursive: true });
      job.status = 'executando';
      job.step = 'Preparando arquivo';
      await persist(job);
      let target;

      if (requestData.mode === 'android') {
        target = requestData.targetPath;
        if (!target.startsWith(uploadsDir + path.sep) || !target.toLowerCase().endsWith('.apk')) throw new Error('Arquivo APK inválido.');
        const meta = await fs.stat(target);
        if (!meta.isFile() || !meta.size || meta.size > MAX_APK_BYTES) throw new Error('APK inválido ou muito grande.');
      } else if (requestData.mode === 'demo') {
        target = path.join(uploadsDir, 'demo-' + job.id);
        const src = path.join(root, 'exemplos', 'loja_demo.c');
        await call(job, 'gcc', ['-O0', '-g', '-fno-inline', '-o', target, src], null, 30000);
        const sample = await call(job, target, [], null, 10000); // Apenas o exemplo escrito por nós é executado.
        if (!sample.stdout.includes('total_centavos=4050 lucro_centavos=1950')) throw new Error('O exemplo não produziu o resultado esperado.');
      } else {
        target = path.join(uploadsDir, job.id + '-' + safeName(job.filename));
        const raw = requestData.data;
        if (typeof raw !== 'string' || !/^[a-zA-Z0-9+/]*={0,2}$/.test(raw)) throw new Error('Arquivo inválido.');
        const bytes = Buffer.from(raw, 'base64');
        if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error('O arquivo precisa ter até 12 MB.');
        await fs.writeFile(target, bytes, { mode: 0o600 });
        // Arquivos enviados pelo usuário NUNCA são executados.
      }

      if (requestData.mode === 'android') {
        job.step = 'Diagnosticando JADX';
        await persist(job);
        const diagnostic = await call(job, 'rea', ['doctor', '--provider', 'jadx', '--json'], 'android-diagnostico', 60000);
        let doc;
        try { doc = JSON.parse(diagnostic.stdout); } catch { throw new Error('Diagnóstico JADX não retornou JSON válido.'); }
        const list = doc.checks || doc.scope_checks || [];
        if (doc.healthy !== true && !list.some(x => x.name === 'jadx' && x.ok === true)) {
          throw new Error('JADX ausente ou não configurado. Execute bash scripts/preparar-rea-android.sh no terminal do Codespace.');
        }
        job.step = 'Inspecionando APK com JADX';
        await persist(job);
        await call(job, 'rea', ['inspect-android-package', target, '--json'], 'android-pacote', 600000);
        job.step = 'Buscando classes do aplicativo';
        await persist(job);
        try { await call(job, 'rea', ['search-android-classes', target, 'MainActivity', '--json'], 'android-classes', 180000); }
        catch (error) { job.warning = cleanString(error.message, 600); }
        job.step = 'Relatórios Android disponíveis';
        job.status = 'concluido';
      } else {
      job.step = 'Diagnosticando Hopper';
      await persist(job);
      const diagnostic = await call(job, 'rea', ['doctor', '--provider', 'hopper', '--json'], 'diagnostico', 60000);
      if (!diagnostic.stdout.trim()) throw new Error('REA não retornou um diagnóstico.');
      let healthy = false;
      try {
        const doc = JSON.parse(diagnostic.stdout);
        healthy = doc.healthy === true || (Array.isArray(doc.checks) && doc.checks.some(item => item.name === 'hopper' && item.ok === true));
      } catch {
        healthy = diagnostic.stdout.includes('"healthy":true') || diagnostic.stdout.includes('"ok":true');
      }
      if (!healthy) throw new Error('Hopper não foi reconhecido como saudável. Confira o diagnóstico.');

      job.step = 'Analisando com REA + Hopper';
      await persist(job);
      await call(job, 'rea', ['analyze', target, '--provider', 'hopper', '--json'], 'analise', 360000);

      if (job.symbol) {
        job.step = 'Inspecionando função ' + job.symbol;
        await persist(job);
        try {
          await call(job, 'rea', ['function', target, job.symbol, '--provider', 'hopper', '--json'], 'funcao', 180000);
        } catch (error) {
          job.warning = cleanString(error.message, 600);
        }
      }

      job.step = 'Relatórios disponíveis';
      job.status = 'concluido';
      }
    } catch (error) {
      job.status = 'erro';
      job.step = 'Falha durante a análise';
      job.error = cleanString(error.message, 1500);
    } finally {
      job.finishedAt = new Date().toISOString();
      try { await persist(job); } catch (error) { console.error('Falha ao salvar histórico:', error.message); }
      running = false;
    }
  }

  async function loadHistory() {
    await fs.mkdir(reportsDir, { recursive: true });
    const entries = await fs.readdir(reportsDir, { withFileTypes: true });
    for (const entry of entries.filter(item => item.isDirectory()).slice(-100)) {
      try {
        const row = JSON.parse(await fs.readFile(path.join(reportsDir, entry.name, 'status.json'), 'utf8'));
        if (row && /^[a-f0-9-]{36}$/.test(row.id)) {
          if (row.status === 'executando') { row.status = 'interrompido'; row.step = 'Servidor reiniciado durante a análise'; }
          jobs.set(row.id, row);
        }
      } catch { /* Histórico incompleto é ignorado. */ }
    }
  }

  const ready = loadHistory();

  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");

    try {
      await ready;
      if (req.method === 'GET' && STATIC_PATH[pathname]) {
        const data = await fs.readFile(path.join(STATIC, STATIC_PATH[pathname]));
        res.writeHead(200, { 'Content-Type': MIME[pathname], 'Cache-Control': 'no-store' });
        res.end(data);
        return;
      }

      if (!pathname.startsWith('/api/')) return json(res, 404, { error: 'Página não encontrada.' });
      if (!authorized(req, secret)) return json(res, 401, { error: 'Chave de acesso incorreta.' });

      if (req.method === 'GET' && pathname === '/api/health') {
        let hopper = false;
        try { await fs.access(hopperPath, fsConstants.X_OK); hopper = true; } catch { /* Ignorar */ }
        let jadx = false;
        try { await fs.access(jadxPath, fsConstants.R_OK); jadx = true; } catch { /* provider ainda ausente */ }
        const check = await runner('rea', ['--version'], { cwd: root, env, timeout: 8000 });
        return json(res, 200, {
          rea: check.ok, version: check.stdout.trim().slice(0, 200),
          hopper, hopperPath, jadx, running,
          info: 'O painel usa o REA local. Não conecta nem autentica automaticamente agentes externos.'
        });
      }
      if (req.method === 'GET' && pathname === '/api/jobs') {
        const list = [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
        return json(res, 200, { jobs: list });
      }
      if (req.method === 'POST' && pathname === '/api/android-upload') {
        if (running) return json(res, 409, { error: 'Já existe uma análise em andamento.' });
        const filename = safeName(req.headers['x-rea-filename'] || 'aplicativo.apk');
        if (!filename.toLowerCase().endsWith('.apk')) return json(res, 400, { error: 'Selecione um arquivo .apk. Arquivos .apks devem ser separados antes.' });
        const givenSize = Number(req.headers['content-length'] || 0);
        if (givenSize > MAX_APK_BYTES) return json(res, 413, { error: 'APK acima do limite de 160 MB.' });
        running = true;
        await fs.mkdir(uploadsDir, { recursive: true });
        const targetPath = path.join(uploadsDir, randomUUID() + '-' + filename);
        try {
          let count = 0;
          const guard = new Transform({
            transform(chunk, encoding, callback) {
              count += chunk.length;
              if (count > MAX_APK_BYTES) callback(Object.assign(new Error('APK maior que 160 MB.'), { statusCode: 413 }));
              else callback(null, chunk);
            }
          });
          await pipeline(req, guard, createWriteStream(targetPath, { flags: 'wx', mode: 0o600 }));
          if (!count) throw Object.assign(new Error('APK vazio.'), { statusCode: 400 });
          const job = {
            id: randomUUID(), filename, mode: 'android', symbol: '', status: 'iniciando',
            step: 'Arquivo recebido, preparando análise', createdAt: new Date().toISOString(),
            finishedAt: null, error: '', warning: '', reports: []
          };
          jobs.set(job.id, job);
          void runJob(job, { mode: 'android', targetPath });
          return json(res, 202, { id: job.id });
        } catch (error) {
          running = false;
          await fs.rm(targetPath, { force: true }).catch(() => {});
          throw error;
        }
      }
      if (req.method === 'POST' && pathname === '/api/analyze') {
        if (running) return json(res, 409, { error: 'Já existe uma análise em andamento.' });
        const body = await readBody(req);
        if (!body || !['demo', 'upload'].includes(body.mode)) return json(res, 400, { error: 'Selecione um arquivo ou o exemplo.' });
        if (body.mode === 'upload' && (typeof body.data !== 'string' || body.data.length > MAX_BODY_BYTES)) {
          return json(res, 413, { error: 'Arquivo inválido ou acima de 12 MB.' });
        }
        const symbol = cleanString(body.symbol, 100);
        if (symbol && /[^\w.$:@()+<>-]/.test(symbol)) return json(res, 400, { error: 'Nome de função inválido.' });
        const job = {
          id: randomUUID(),
          filename: body.mode === 'demo' ? 'loja_demo (exemplo)' : safeName(body.name),
          mode: body.mode,
          symbol: symbol || (body.mode === 'demo' ? 'calcular_total' : ''),
          status: 'iniciando',
          step: 'Aguardando análise',
          createdAt: new Date().toISOString(), finishedAt: null, error: '', warning: '', reports: []
        };
        jobs.set(job.id, job);
        running = true;
        void runJob(job, body);
        return json(res, 202, { id: job.id });
      }
      const match = pathname.match(/^\/api\/reports\/([a-f0-9-]{36})\/([a-z-]+)$/);
      if (req.method === 'GET' && match && REPORT_NAMES.has(match[2])) {
        const job = jobs.get(match[1]);
        if (!job || !job.reports.includes(match[2])) return json(res, 404, { error: 'Relatório não encontrado.' });
        const name = match[2] + (match[2].startsWith('erro-') ? '.txt' : '.json');
        const data = await fs.readFile(path.join(reportsDir, job.id, name), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(data);
        return;
      }
      return json(res, 404, { error: 'Recurso não encontrado.' });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: cleanString(error.message, 300) });
    }
  });

  return { server, secret, ready };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp({ secret: process.env.REA_HUB_TOKEN || randomBytes(18).toString('hex') });
  await app.ready;
  const port = Number(process.env.PORT || 3000);
  app.server.listen(port, '0.0.0.0', () => {
    console.log('\n============================================');
    console.log('   REA HUB | Central de analise');
    console.log('============================================');
    console.log('Porta: ' + port + ' (abra em Codespaces > Portas)');
    console.log('SENHA TEMPORARIA: ' + app.secret);
    console.log('Nao compartilhe esta chave. Nao torne a porta publica.');
    console.log('============================================\n');
  });
}
