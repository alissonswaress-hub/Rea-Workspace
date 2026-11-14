/* Busca apenas metadados PUBLICOS de apps do Google Play.
 * Um link da loja nao concede acesso ao APK ou a codigo-fonte.
 */
function entity(text) {
  return String(text || '').replace(/&(#(?:x[0-9a-f]+|\d+)|amp|quot|apos|lt|gt|nbsp);/gi, (m, k) => {
    const low = k.toLowerCase();
    if (low.startsWith('#')) {
      const code = low[1] === 'x' ? parseInt(low.slice(2), 16) : parseInt(low.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[low] || m;
  }).replace(/\s+/g, ' ').trim();
}
function meta(html, key) {
  const re = /<meta\b[^>]*>/gi;
  for (const tag of html.match(re) || []) {
    const props = {};
    const attrs = /\b(property|name|content)\s*=\s*(['"])(.*?)\2/gi;
    for (const m of tag.matchAll(attrs)) props[m[1].toLowerCase()] = m[3];
    if (props.property === key || props.name === key) return entity(props.content || '');
  }
  return '';
}
export function normalizePlayLink(link) {
  if (typeof link !== 'string' || link.length > 500) throw new Error('Cole o link do aplicativo na Google Play.');
  let url;
  try { url = new URL(link.trim()); } catch { throw new Error('Link inválido. Use um link da Google Play.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'play.google.com' || url.pathname !== '/store/apps/details') {
    throw new Error('Por segurança, aceitamos somente links de aplicativos da Google Play.');
  }
  const packageId = url.searchParams.get('id') || '';
  if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(packageId) || packageId.length > 150) {
    throw new Error('O link da loja não possui um identificador válido de aplicativo.');
  }
  return { packageId, url: 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(packageId) };
}
export async function lookupPlayStore(link, { getPage = fetch } = {}) {
  const app = normalizePlayLink(link);
  const result = {
    ...app, title: '', description: '', developer: '', source: 'Google Play (dados públicos)',
    analyzedApk: false, notice: 'Um link identifica o aplicativo, mas não permite analisar o APK nem copiar seu código.'
  };
  try {
    const response = await getPage(app.url + '&hl=pt_BR', {
      headers: { 'Accept': 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7' },
      redirect: 'error', signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { ...result, notice: 'Link válido. Metadados não disponíveis no momento; o APK ainda precisa ser enviado.' };
    const type = response.headers?.get?.('content-type') || '';
    if (type && !type.includes('text/html')) return result;
    const len = Number(response.headers?.get?.('content-length') || 0);
    if (len > 1500000) return result;
    const body = await response.text();
    if (body.length > 1500000) return result;
    const title = meta(body, 'og:title') || entity((body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
    const description = meta(body, 'og:description') || meta(body, 'description');
    return { ...result, title: title.slice(0, 180), description: description.slice(0, 1200) };
  } catch {
    return { ...result, notice: 'Link válido. O Google Play não liberou os metadados agora. Isso não impede enviar o APK.' };
  }
}
