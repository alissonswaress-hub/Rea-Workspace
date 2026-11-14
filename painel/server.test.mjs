import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createApp } from './server.mjs';

test('Painel REA: acesso protegido, exemplo e upload analisados sem executar upload', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-hub-test-'));
  await fs.mkdir(path.join(root, 'exemplos'));
  await fs.writeFile(path.join(root, 'exemplos', 'loja_demo.c'), 'int main(void){return 0;}');
  const calls = [];
  async function fakeRunner(command, args) {
    calls.push({ command, args });
    if (command === 'gcc') return { ok: true, code: 0, stdout: '', stderr: '' };
    if (command === 'bash') return { ok: true, code: 0, stdout: 'JADX preparado', stderr: '' };
    if (command.includes('demo-')) return { ok: true, code: 0, stdout: 'total_centavos=4050 lucro_centavos=1950\n', stderr: '' };
    if (command === 'rea') {
      if (args[0] === '--version') return { ok: true, code: 0, stdout: 'rea 6.9.0', stderr: '' };
      if (args[0] === 'doctor') return { ok: true, code: 0, stdout: '{"healthy":true,"checks":[{"name":"hopper","ok":true},{"name":"jadx","ok":true}]}', stderr: '' };
      if (args[0] === 'inspect-android-package') return { ok: true, code: 0, stdout: '{"normalized_result":{"package_name":"app.befit","manifest":{"activities":[]}}}', stderr: '' };
      if (args[0] === 'search-android-classes') return { ok: true, code: 0, stdout: '{"classes":[{"name":"MainActivity"}]}', stderr: '' };
      if (args[0] === 'analyze') return { ok: true, code: 0, stdout: '{"symbols":["calcular_total"]}', stderr: '' };
      if (args[0] === 'function') return { ok: true, code: 0, stdout: '{"name":"calcular_total","address":"0x1197"}', stderr: '' };
    }
    return { ok: false, code: 1, stdout: '', stderr: 'Comando inesperado' };
  }

  const app = createApp({ secret: 'minha-chave-de-teste', root, runner: fakeRunner, storeLookup: async url => ({ packageId: 'app.befit', url, title: 'Befit', analyzedApk: false }) });
  await app.ready;
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = 'http://127.0.0.1:' + app.server.address().port;
  t.after(async () => {
    await new Promise(resolve => app.server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  const headers = { 'x-rea-token': 'minha-chave-de-teste', 'content-type': 'application/json' };

  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /REA HUB/);

  const forbidden = await fetch(base + '/api/health');
  assert.equal(forbidden.status, 401);

  const wrong = await fetch(base + '/api/health', { headers: { 'x-rea-token': 'outro' } });
  assert.equal(wrong.status, 401);

  const health = await (await fetch(base + '/api/health', { headers })).json();
  assert.equal(health.rea, true);

  const invalid = await fetch(base + '/api/analyze', { method: 'POST', headers, body: JSON.stringify({ mode: 'upload', name: 'teste.bin', data: 'AA==', symbol: 'abc\nx' }) });
  assert.equal(invalid.status, 400);

  async function waitUntilFinished(id) {
    for (let tries = 0; tries < 100; tries++) {
      const r = await (await fetch(base + '/api/jobs', { headers })).json();
      const job = r.jobs.find(item => item.id === id);
      if (job?.status === 'concluido' || job?.status === 'erro') return job;
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    throw new Error('Teste excedeu tempo aguardando o job.');
  }

  const started = await fetch(base + '/api/analyze', { method: 'POST', headers, body: JSON.stringify({ mode: 'demo' }) });
  assert.equal(started.status, 202);
  const demo = await waitUntilFinished((await started.json()).id);
  assert.equal(demo.status, 'concluido', demo.error);
  assert.ok(demo.reports.includes('diagnostico'));
  assert.ok(demo.reports.includes('analise'));
  assert.ok(demo.reports.includes('funcao'));
  const report = await fetch(base + '/api/reports/' + demo.id + '/funcao', { headers });
  assert.equal(report.status, 200);
  assert.match(await report.text(), /calcular_total/);

  const uploaded = await fetch(base + '/api/analyze', {
    method: 'POST', headers,
    body: JSON.stringify({ mode: 'upload', name: '../../usuario.exe', data: Buffer.from([0x7f, 0x45, 0x4c, 0x46]).toString('base64') })
  });
  assert.equal(uploaded.status, 202);
  const binary = await waitUntilFinished((await uploaded.json()).id);
  assert.equal(binary.status, 'concluido', binary.error);
  assert.equal(binary.filename, 'usuario.exe');

  const linkResponse = await fetch(base + '/api/playstore', {
    method: 'POST', headers,
    body: JSON.stringify({ url: 'https://play.google.com/store/apps/details?id=app.befit' })
  });
  assert.equal(linkResponse.status, 200);
  const linkResult = await linkResponse.json();
  assert.equal(linkResult.packageId, 'app.befit');
  assert.equal(linkResult.analyzedApk, false);
  const setupResponse = await fetch(base + '/api/android-setup', { method: 'POST', headers });
  assert.equal(setupResponse.status, 202);
  const setupJob = await waitUntilFinished((await setupResponse.json()).id);
  assert.equal(setupJob.status, 'concluido', setupJob.error);
  assert.ok(setupJob.reports.includes('android-instalacao'));
  assert.ok(calls.some(row => row.command === 'bash'));

  const forbiddenAndroid = await fetch(base + '/api/android-upload', { method: 'POST', body: Buffer.from([0x50,0x4b,0x03,0x04]), headers: { 'x-rea-filename': 'befit.apk' } });
  assert.equal(forbiddenAndroid.status, 401);
  const wrongType = await fetch(base + '/api/android-upload', { method: 'POST', body: 'not-an-apk', headers: { ...headers, 'x-rea-filename': 'arquivo.exe' } });
  assert.equal(wrongType.status, 400);
  const androidUpload = await fetch(base + '/api/android-upload', {
    method: 'POST', headers: { 'x-rea-token': 'minha-chave-de-teste', 'x-rea-filename': 'befit.apk', 'content-type': 'application/vnd.android.package-archive' },
    body: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00])
  });
  assert.equal(androidUpload.status, 202);
  const android = await waitUntilFinished((await androidUpload.json()).id);
  assert.equal(android.status, 'concluido', android.error);
  assert.ok(android.reports.includes('android-diagnostico'));
  assert.ok(android.reports.includes('android-pacote'));
  assert.ok(android.reports.includes('android-classes'));
  const packageReport = await fetch(base + '/api/reports/' + android.id + '/android-pacote', { headers });
  assert.equal(packageReport.status, 200);
  assert.match(await packageReport.text(), /app\.befit/);
  assert.ok(calls.some(item => item.command === 'rea' && item.args[0] === 'inspect-android-package'));
  assert.equal(calls.filter(item => item.command.endsWith('befit.apk')).length, 0, 'Um APK enviado nao pode ser executado.');

  const receivedUploads = calls.filter(item => item.command !== 'rea' && item.command !== 'gcc' && item.command !== 'bash' && !item.command.includes('demo-'));
  assert.equal(receivedUploads.length, 0, 'Um binário enviado pelo usuário não pode ser executado.');
  const analysisCalls = calls.filter(item => item.command === 'rea' && item.args[0] === 'analyze');
  assert.equal(analysisCalls.length, 2);
  assert.ok(analysisCalls.every(item => item.args.includes('--provider') && item.args.includes('hopper')));
});
