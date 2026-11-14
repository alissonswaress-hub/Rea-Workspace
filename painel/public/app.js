/* REA Hub - interface local. Nenhum serviço externo ou CDN. */
const $ = (selector) => document.querySelector(selector);
const state = { token: sessionStorage.getItem('rea-hub-key') || '', mode: 'demo', jobs: [], job: null, currentReport: '', reportText: '', timer: null };
const labels = { diagnostico: 'Diagnóstico do Hopper', analise: 'Análise do programa', funcao: 'Detalhes da função', 'erro-analise': 'Log de erros da análise', 'erro-funcao': 'Log de erros da função', 'erro-diagnostico': 'Log do diagnóstico' };

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
  } catch (error) {
    if (error.message.includes('Chave')) showLogin();
  }
}

function setMode(mode) {
  state.mode = mode;
  const demo = mode === 'demo';
  $('#demo-area').classList.toggle('hidden', !demo);
  $('#upload-area').classList.toggle('hidden', demo);
  $('#mode-demo').classList.toggle('selected', demo);
  $('#mode-upload').classList.toggle('selected', !demo);
  $('#mode-demo').setAttribute('aria-pressed', String(demo));
  $('#mode-upload').setAttribute('aria-pressed', String(!demo));
  $('#symbol').value = demo ? 'calcular_total' : '';
}
function niceDate(date) {
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)); }
  catch { return date; }
}
function summaryText(job) {
  if (!job) return 'Selecione um arquivo para começar.';
  if (job.status === 'erro') return job.error || 'Ocorreu uma falha.';
  if (job.status === 'concluido') return job.warning ? 'Análise concluída, com aviso: ' + job.warning : 'Análise concluída. Abra os relatórios abaixo.';
  if (job.status === 'interrompido') return 'A execução foi interrompida por reinício do servidor.';
  return job.step || 'Analisando...';
}
function updateSteps(job) {
  const steps = [...document.querySelectorAll('#job-steps li')];
  const status = job?.status || 'aguardando';
  let active = 0;
  if (job) {
    if (/Diagnost/.test(job.step)) active = 1;
    else if (/Analisando|Inspecionando/.test(job.step)) active = 2;
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
    small.textContent = niceDate(job.createdAt) + ' · ' + (job.mode === 'demo' ? 'Programa de exemplo' : 'Arquivo enviado');
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
    const data = { mode: state.mode, symbol: $('#symbol').value.trim() };
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
  sessionStorage.removeItem('rea-hub-key');
  showLogin();
});
$('#mode-demo').addEventListener('click', () => setMode('demo'));
$('#mode-upload').addEventListener('click', () => setMode('upload'));
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

if (state.token) {
  hideLogin();
  void health();
  void refreshJobs();
} else showLogin();
state.timer = setInterval(() => { if (state.token) void refreshJobs(); }, 2500);
