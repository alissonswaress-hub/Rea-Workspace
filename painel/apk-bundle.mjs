/* Le um pacote ZIP de split APKs, sem executar arquivos.
 * Nao depende de pacotes npm. Limites previnem zip bombs e path traversal.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const MAX = 160 * 1024 * 1024;
const MAX_TOTAL = 220 * 1024 * 1024;
const MAX_ENTRIES = 300;
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function invalid(reason) { throw new Error('Arquivo ZIP inválido: ' + reason); }

export function inspectApkBundle(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22 || buffer.length > MAX) invalid('tamanho inválido');
  let eocd = -1;
  for (let p = buffer.length - 22; p >= Math.max(0, buffer.length - 22 - 65535); p--) {
    if (buffer.readUInt32LE(p) === 0x06054b50 && p + 22 + buffer.readUInt16LE(p + 20) === buffer.length) { eocd = p; break; }
  }
  if (eocd < 0) invalid('diretório central ausente');
  if (buffer.readUInt16LE(eocd + 4) !== 0 || buffer.readUInt16LE(eocd + 6) !== 0) invalid('ZIP de vários discos não suportado');
  const count = buffer.readUInt16LE(eocd + 10);
  if (count > MAX_ENTRIES || count !== buffer.readUInt16LE(eocd + 8)) invalid('quantidade excessiva de arquivos');
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (centralSize === 0xffffffff || centralOffset === 0xffffffff || centralOffset + centralSize > eocd) invalid('formato ZIP64 ou arquivo truncado');
  let cursor = centralOffset;
  let totalSize = 0;
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) invalid('entrada do diretório central corrompida');
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const unpacked = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > buffer.length || compressed === 0xffffffff || unpacked === 0xffffffff || localOffset === 0xffffffff) invalid('arquivo truncado ou ZIP64');
    const filename = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    cursor = end;
    if (!filename.toLowerCase().endsWith('.apk')) continue;
    if (flags & 0x0001) invalid('arquivo protegido por senha');
    if (![0, 8].includes(method)) invalid('compressão não suportada');
    if (unpacked > MAX || compressed > MAX) invalid('APK maior que 160 MB');
    totalSize += unpacked;
    if (totalSize > MAX_TOTAL) invalid('conteúdo descompactado excede 220 MB');
    const normalized = filename.replaceAll('\\', '/');
    if (normalized.startsWith('/') || normalized.split('/').includes('..')) invalid('caminho inseguro');
    entries.push({ filename: normalized, unpacked, compressed, localOffset, method, crc });
  }
  if (cursor !== centralOffset + centralSize) invalid('diretório central inconsistente');
  if (!entries.length) invalid('não foi encontrado nenhum arquivo .apk');
  const base = entries.find(e => path.posix.basename(e.filename).toLowerCase() === 'base.apk') || entries[0];
  return { entries, base };
}

export async function unpackBaseApk(archive, destPath) {
  const buf = await fs.readFile(archive);
  const { entries, base } = inspectApkBundle(buf);
  const { localOffset, compressed, unpacked, method, crc } = base;
  if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== 0x04034b50) invalid('cabeçalho local ausente');
  const localNameLen = buf.readUInt16LE(localOffset + 26);
  const localExtraLen = buf.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + localNameLen + localExtraLen;
  if (start + compressed > buf.length) invalid('dados comprimidos incompletos');
  const part = buf.subarray(start, start + compressed);
  let extracted;
  try {
    extracted = method === 0 ? part : inflateRawSync(part, { maxOutputLength: MAX });
  } catch { invalid('falha na descompressão ou tamanho excessivo'); }
  if (extracted.length !== unpacked || crc32(extracted) !== crc) invalid('integridade do APK não confere');
  if (extracted.length < 4 || extracted.readUInt32LE(0) !== 0x04034b50) invalid('arquivo escolhido não parece um APK ZIP');
  await fs.writeFile(destPath, extracted, { mode: 0o600, flag: 'wx' });
  return {
    selected: base.filename, totalApks: entries.length,
    files: entries.map(e => ({ name: e.filename, bytes: e.unpacked })),
    warning: entries.length > 1
      ? 'Pacote dividido: a primeira análise utiliza o APK base. Componentes extras podem exigir inspeções separadas.'
      : ''
  };
}
