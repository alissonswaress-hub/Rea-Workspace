import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { inspectApkBundle, unpackBaseApk } from './apk-bundle.mjs';
import { normalizePlayLink, lookupPlayStore } from './playstore.mjs';

function crc32(buf) {
  let crc = ~0;
  for (const n of buf) {
    crc ^= n;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function buildZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, data] of files) {
    const b = Buffer.from(data), nameBuf = Buffer.from(name);
    const crc = crc32(b);
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0);
    loc.writeUInt16LE(20, 4);
    loc.writeUInt32LE(crc, 14);
    loc.writeUInt32LE(b.length, 18);
    loc.writeUInt32LE(b.length, 22);
    loc.writeUInt16LE(nameBuf.length, 26);
    locals.push(loc, nameBuf, b);
    const cent = Buffer.alloc(46);
    cent.writeUInt32LE(0x02014b50, 0);
    cent.writeUInt16LE(20, 4);
    cent.writeUInt16LE(20, 6);
    cent.writeUInt32LE(crc, 16);
    cent.writeUInt32LE(b.length, 20);
    cent.writeUInt32LE(b.length, 24);
    cent.writeUInt16LE(nameBuf.length, 28);
    cent.writeUInt32LE(offset, 42);
    centrals.push(cent, nameBuf);
    offset += loc.length + nameBuf.length + b.length;
  }
  const central = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, central, eocd]);
}

test('Pacote do extrator: base.apk e splits ZIP sem executar nenhum arquivo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-apk-'));
  try {
    const base = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x42, 0x45, 0x46, 0x49, 0x54]);
    const zip = buildZip([
      ['manifest.json', Buffer.from('{"package":"app.befit"}')],
      ['app.befit/base.apk', base],
      ['app.befit/split_config.arm64_v8a.apk', Buffer.from('PK\x03\x04')]
    ]);
    const pkg = path.join(root, 'app-befit.zip');
    await fs.writeFile(pkg, zip);
    const indexed = inspectApkBundle(zip);
    assert.equal(indexed.entries.length, 2);
    assert.equal(indexed.base.filename, 'app.befit/base.apk');
    const output = path.join(root, 'base.apk');
    const report = await unpackBaseApk(pkg, output);
    assert.equal(report.totalApks, 2);
    assert.match(report.warning, /dividido/);
    assert.deepEqual(await fs.readFile(output), base);
    assert.throws(() => inspectApkBundle(buildZip([['../base.apk', base]])), /caminho inseguro/);
    assert.throws(() => inspectApkBundle(Buffer.from('nao um zip')), /ZIP inválido/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('Play Store: somente links HTTPS de apps são aceitos', () => {
  assert.equal(normalizePlayLink('https://play.google.com/store/apps/details?id=app.befit').packageId, 'app.befit');
  assert.throws(() => normalizePlayLink('https://play.google.com.evil.net/store/apps/details?id=app.befit'), /Google Play/);
  assert.throws(() => normalizePlayLink('http://play.google.com/store/apps/details?id=app.befit'), /Google Play/);
  assert.throws(() => normalizePlayLink('https://play.google.com/store/apps/details?id=invalid'), /identificador/);
});

test('Play Store: extrai somente metadados públicos, não declara acesso ao APK', async () => {
  const result = await lookupPlayStore('https://play.google.com/store/apps/details?id=app.befit', {
    getPage: async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><head><meta property="og:title" content="Befit: Academia &amp; Treino"><meta name="description" content="Treinos, séries e evolução."></head></html>'
    })
  });
  assert.equal(result.packageId, 'app.befit');
  assert.equal(result.title, 'Befit: Academia & Treino');
  assert.match(result.description, /Treinos/);
  assert.equal(result.analyzedApk, false);
});
