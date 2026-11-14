/* REA Hub - interface local. Nenhum serviço externo ou CDN. */
const $ = (selector) => document.querySelector(selector);
const state = { token: sessionStorage.getItem('rea-hub-key') || localStorage.getItem('rea-hub-key') || '', mode: 'store', jobs: [], job: null, currentReport: '', reportText: '', timer: null };
const labels = { diagnostico: 'Diagnóstico do Hopper', analise: 'Análise do programa', funcao: 'Detalhes da função', 'erro-analise': 'Log de erros da análise', 'erro-funcao': 'Log de erros da função', 'erro-diagnostico': 'Log do diagnóstico', 'android-diagnostico': 'Diagnóstico do JADX', 'android-pacote': 'Estrutura e manifesto do aplicativo', 'android-arquivos': 'Arquivos APK dentro do ZIP', 'android-instalacao': 'Preparação do Android', 'erro-android-instalacao': 'Erro na preparação do Android', 'android-classes': 'Classes de entrada (MainActivity)', 'erro-android-diagnostico': 'Erro no diagnóstico JADX', 'erro-android-pacote': 'Erro na inspeção do APK', 'erro-android-classes': 'Erro na busca de classes' };

async function api(path, { method = 'GET', data = null, raw = false } = {}) {
  const response = await fetch('/api/' + path, {
    method,
    headers: { 'X-REA-Token': state.token, ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined,
    cache: 'no-store'
  });
  if (raw && response.ok) return response.text();
  const payload = await response.json().catch(() => ({ error: 'Erro de comunicação.' }));
  if (!response.ok) throw new Error(payload.error || 'Erro na solicitação.');
  return payload;
}

function forgetLogin() {
  state.token = '';
  sessionStorage.removeItem('rea-hub-key');
  localStorage.removeItem('rea-hub-key');
}
function showLogin() {
  $('#login-overlay').classList.remove('hidden');
  $('#access-token').focus();
}
function hideLogin() { $('#login-overlay').classList.add('hidden'); }
function tag(pill, available) {
  pill.classList.toggle('ok', available);
  pill.classList.toggle('no', !available);
  pill.title = available ? 'Encontrado neste Codespace' : 'Não encontrado neste Codespace';
}
async function health() {
  try {
    const result = await api('health');
    tag($('#pill-rea'), result.rea);
    tag($('#pill-hopper'), result.hopper);
    tag($('#pill-jadx'), result.jadx);
  } catch (error) {
    if (error.message.includes('Chave')) { forgetLogin(); showLogin(); }
  }
}

function setMode(mode) {
  state.mode = mode;
  const demo = mode === 'demo';
  const android = mode === 'android';
  const store = mode === 'store';
  $('#store-area').classList.toggle('hidden', !store);
  $('#demo-area').classList.toggle('hidden', !demo);
  $('#upload-area').classList.toggle('hidden', store || demo);
  for (const [id, selected] of [['mode-store', store], ['mode-demo', demo], ['mode-upload', mode === 'upload'], ['mode-android', android]]) {
    const control = $('#' + id);
    control.classList.toggle('selected', selected);
    control.setAttribute('aria-pressed', String(selected));
  }
  $('#symbol-area').classList.toggle('hidden', store || android);
  $('#android-tip').classList.toggle('hidden', !android);
  $('#binary-file').accept = android ? '.apk,.apks,.zip,.xapk,application/vnd.android.package-archive,application/zip' : '';
  $('#upload-title').textContent = android ? 'Selecione o APK ou ZIP do aplicativo' : 'Escolha um executável';
  $('#upload-description').textContent = android ? 'APK único ou ZIP/APKS com todos os arquivos exportados do celular' : 'ELF, EXE, DLL, Mach-O e outros suportados pelo REA';
  $('#upload-limit').textContent = android ? 'Até 160 MB. Não executamos o aplicativo.' : 'Até 12 MB. Não executamos arquivos enviados.';
  $('#analyze-label').textContent = store ? 'Identificar aplicativo' : 'Iniciar análise';
  $('#binary-file').value = '';
  $('#symbol').value = demo ? 'calcular_total' : '';
}
async function lookupStore() {
  const url = $('#playstore-url').value.trim();
  $('#store-result').classList.add('hidden');
  $('#job-message').textContent = 'Identificando aplicativo na Play Store...';
  const info = await api('playstore', { method: 'POST', data: { url } });
  $('#store-title').textContent = info.title || 'Aplicativo: ' + info.packageId;
  $('#store-package').textContent = 'Pacote Android: ' + info.packageId;
  $('#store-desc').textContent = (info.description || info.notice || '').slice(0, 700);
  $('#store-result').classList.remove('hidden');
  $('#job-message').textContent = 'Aplicativo identificado. Para fazer engenharia reversa, exporte o APK ou ZIP e selecione APK / ZIP.';
}
async function prepareAndroid() {
  if (!confirm('Instalar Java e JADX para analisar APKs neste Codespace? Pode baixar pacotes e consumir recursos do Codespaces.')) return;
  $('#btn-setup-android').disabled = true;
  $('#setup-status').textContent = 'Preparação iniciada. Acompanhe o status em Acompanhamento.';
  try {
    const response = await api('android-setup', { method: 'POST' });
    state.job = { id: response.id };
    await refreshJobs();
    $('#title-status').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { $('#setup-status').textContent = 'Não foi possível iniciar: ' + error.message; }
  finally { $('#btn-setup-android').disabled = false; }
}
function niceDate(date) {
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)); }
  catch { return date; }
}
function summaryText(job) {
  if (!job) return 'Selecione um arquivo para começar.';
  if (job.status === 'erro') return job.error || 'Ocorreu uma falha.';
  if (job.status === 'concluido') return job.warning ? 'Concluído com aviso: ' + job.warning : 'Concluído. Abra os relatórios abaixo.';
  if (job.status === 'interrompido') return 'A execução foi interrompida por reinício do servidor.';
  return job.step || 'Analisando...';
}
function updateSteps(job) {
  const steps = [...document.querySelectorAll('#job-steps li')];
  steps[1].querySelector('div').childNodes[0].textContent = job?.mode === 'android' || job?.mode === 'setup' ? 'Configuração do Android' : 'Diagnóstico do Hopper';
  steps[2].querySelector('div').childNodes[0].textContent = job?.mode === 'android' ? 'Inspeção do APK Android' : job?.mode === 'setup' ? 'Verificação do JADX' : 'Análise com o REA';
  const status = job?.status || 'aguardando';
  let active = 0;
  if (job) {
    if (/Diagnost/.test(job.step)) active = 1;
    else if (/Analisando|Inspecionando|Buscando/.test(job.step)) active = 2;
    else if (status === 'concluido') active = 3;
    else if (status === 'erro') active = 2;
  }
  steps.forEach((item, i) => {
    item.classList.toggle('done', Boolean(job) && (status === 'concluido' || i < active));
    item.classList.toggle('active', Boolean(job) && (status === 'executando' || status === 'iniciando') && i === active);
  });
  const badge = $('#job-state');
  badge.textContent = !job ? 'Aguardando' : status === 'concluido' ? 'Concluído' : status === 'erro' ? 'Falhou' : status === 'interrompido' ? 'Interrompido' : 'Executando';
  badge.className = 'job-tag' + (status === 'concluido' ? ' ok' : status === 'erro' || status === 'interrompido' ? ' bad' : status === 'executando' || status === 'iniciando' ? ' active' : '');
  $('#job-message').textContent = summaryText(job);
  $('#btn-analyze').disabled = Boolean(state.jobs.find((j) => j.status === 'executando' || j.status === 'iniciando'));
}

function renderHistory() {
  const target = $('#history-list');
  target.replaceChildren();
  if (!state.jobs.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Nenhuma análise registrada neste Codespace.';
    target.append(p);
    return;
  }
  for (const job of state.jobs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item';
    const ico = document.createElement('span');
    ico.textContent = '⌑';
    const info = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = job.filename;
    const small = document.createElement('small');
    small.textContent = niceDate(job.createdAt) + ' · ' + (job.mode === 'demo' ? 'Programa de exemplo' : job.mode === 'android' ? 'APK Android' : job.mode === 'setup' ? 'Preparar análise Android' : 'Arquivo enviado');
    info.append(strong, small);
    const status = document.createElement('span');
    status.className = 'history-status' + (job.status === 'erro' ? ' bad' : '');
    status.textContent = job.status === 'concluido' ? '✓ Concluído' : job.status === 'erro' ? 'Falhou' : job.status === 'interrompido' ? 'Interrompido' : 'Executando';
    btn.append(ico, info, status);
    btn.addEventListener('click', () => showJob(job));
    target.append(btn);
  }
}

async function refreshJobs() {
  try {
    const response = await api('jobs');
    state.jobs = response.jobs;
    const current = state.job ? state.jobs.find((job) => job.id === state.job.id) : state.jobs[0];
    if (current) {
      const reportsChanged = current.id !== state.job?.id || JSON.stringify(current.reports) !== JSON.stringify(state.job?.reports);
      state.job = current;
      updateSteps(current);
      if (reportsChanged) await renderReports(current);
    } else updateSteps(null);
    renderHistory();
  } catch (error) {
    if (error.message.includes('Chave')) showLogin();
    else $('#job-message').textContent = 'Falha ao atualizar: ' + error.message;
  }
}

async function showJob(job) {
  const different = state.job?.id !== job.id;
  state.job = job;
  updateSteps(job);
  if (different) await renderReports(job);
  $('#title-status').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderReports(job) {
  const reports = job.reports.filter((name) => labels[name]);
  $('#report-empty').classList.toggle('hidden', reports.length > 0);
  $('#report-view').classList.toggle('hidden', reports.length === 0);
  $('#report-count').textContent = reports.length + (reports.length === 1 ? ' arquivo' : ' arquivos');
  const select = $('#report-select');
  select.replaceChildren();
  for (const name of reports) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = labels[name];
    select.append(opt);
  }
  if (reports.length) {
    if (!reports.includes(state.currentReport)) state.currentReport = reports[0];
    select.value = state.currentReport;
    await loadReport();
  } else { state.currentReport = ''; state.reportText = ''; }
}
async function loadReport() {
  const job = state.job;
  const name = $('#report-select').value;
  state.currentReport = name;
  $('#report-text').textContent = 'Abrindo relatório...';
  try {
    const text = await api('reports/' + job.id + '/' + name, { raw: true });
    if (state.job?.id !== job.id || state.currentReport !== name) return;
    try { state.reportText = JSON.stringify(JSON.parse(text), null, 2); }
    catch { state.reportText = text || '(arquivo vazio)'; }
    $('#report-text').textContent = state.reportText;
  } catch (error) { $('#report-text').textContent = error.message; state.reportText = ''; }
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

async function begin() {
  const btn = $('#btn-analyze');
  btn.disabled = true;
  $('#job-message').textContent = 'Preparando análise...';
  try {
    if (state.mode === 'store') { await lookupStore(); return; }
    const data = { mode: state.mode, symbol: $('#symbol').value.trim() };
    if (state.mode === 'android') {
      const file = $('#binary-file').files[0];
      if (!file) throw new Error('Selecione o APK ou ZIP exportado do celular.');
      if (!/\.(apk|zip|apks|xapk)$/i.test(file.name)) throw new Error('Selecione .apk, .zip ou .apks.');
      if (file.size > 160 * 1024 * 1024) throw new Error('O arquivo ultrapassa 160 MB.');
      const response = await fetch('/api/android-upload', {
        method: 'POST', headers: { 'X-REA-Token': state.token, 'X-REA-Filename': encodeURIComponent(file.name) }, body: file, cache: 'no-store'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao enviar APK.');
      state.job = { id: result.id };
      await refreshJobs();
      $('#title-status').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (state.mode === 'upload') {
      const file = $('#binary-file').files[0];
      if (!file) throw new Error('Selecione um arquivo para analisar.');
      if (file.size > 12 * 1024 * 1024) throw new Error('O limite é de 12 MB.');
      data.name = file.name;
      data.data = await readBase64(file);
    }
    const result = await api('analyze', { method: 'POST', data });
    state.job = { id: result.id };
    await refreshJobs();
    $('#title-status').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { $('#job-message').textContent = error.message; }
  finally { btn.disabled = false; await refreshJobs(); }
}

async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(value);
    $('#job-message').textContent = 'Copiado para a área de transferência.';
  } catch { $('#job-message').textContent = 'Não foi possível copiar. Selecione o texto do relatório manualmente.'; }
}

async function download() {
  if (!state.job || !state.reportText) return;
  const fileName = (state.currentReport || 'relatorio') + '-' + state.job.id.slice(0, 8) + '.txt';
  const blob = new Blob([state.reportText], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const candidate = $('#access-token').value.trim();
  if (!candidate) return;
  state.token = candidate;
  $('#login-error').textContent = '';
  try {
    await api('health');
    sessionStorage.setItem('rea-hub-key', candidate);
    if ($('#remember-phone').checked) localStorage.setItem('rea-hub-key', candidate);
    else localStorage.removeItem('rea-hub-key');
    $('#access-token').value = '';
    hideLogin();
    await health();
    await refreshJobs();
  } catch (error) {
    state.token = '';
    $('#login-error').textContent = error.message;
  }
});
$('#btn-lock').addEventListener('click', () => {
  state.token = ''; state.jobs = []; state.job = null;
  forgetLogin();
  showLogin();
});
$('#mode-store').addEventListener('click', () => setMode('store'));
$('#mode-demo').addEventListener('click', () => setMode('demo'));
$('#mode-upload').addEventListener('click', () => setMode('upload'));
$('#mode-android').addEventListener('click', () => setMode('android'));
$('#store-next').addEventListener('click', () => setMode('android'));
$('#btn-setup-android').addEventListener('click', prepareAndroid);
$('#binary-file').addEventListener('change', () => {
  $('#upload-title').textContent = $('#binary-file').files[0]?.name || 'Escolher arquivo para analisar';
});
$('#btn-analyze').addEventListener('click', begin);
$('#btn-refresh').addEventListener('click', refreshJobs);
$('#report-select').addEventListener('change', loadReport);
$('#btn-copy').addEventListener('click', () => copyValue(state.reportText));
$('#btn-download').addEventListener('click', download);
$('#btn-prompt').addEventListener('click', () => {
  if (!state.job || !state.reportText) return;
  const prompt = 'Você é um especialista em engenharia reversa. Analise o relatório do REA/Hopper abaixo sobre um arquivo próprio ou autorizado, identifique funções, estruturas, possíveis problemas e próximos testes. Não invente fatos; diferencie evidência de hipótese. Nome do arquivo: ' + state.job.filename + '.\n\nRELATÓRIO:\n' + state.reportText.slice(0, 18000);
  void copyValue(prompt);
});

let installPrompt = null;
const showMobileHelp = () => {
  const message = 'Para abrir o REA Hub com um toque no Android:\n\n1. Abra esta página no Chrome.\n2. Toque nos três pontos (⋮) do Chrome.\n3. Selecione “Adicionar à tela inicial” ou “Instalar app”.\n4. Confirme o nome REA Hub.\n\nSe o Codespace estiver pausado, inicie-o em github.com/codespaces e volte ao ícone.';
  alert(message);
};
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  $('#btn-install').textContent = 'Instalar REA Hub';
});
$('#btn-install').addEventListener('click', async () => {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
    $('#btn-install').textContent = 'Ver como instalar';
  } else showMobileHelp();
});
$('#btn-mobile-help').addEventListener('click', showMobileHelp);
if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
});
const params = new URLSearchParams(location.search);
setMode(params.get('abrir') === 'android' ? 'android' : 'store');
if (state.token) {
  hideLogin();
  void health();
  void refreshJobs();
} else showLogin();
state.timer = setInterval(() => { if (state.token) void refreshJobs(); }, 2500);
