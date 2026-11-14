'use strict';
/* TreinoLab: protótipo independente inspirado nas necessidades da categoria de apps de treino.
   Os dados permanecem no navegador. Não há IA remota, login real nem pagamentos. */
const KEY='treinolab-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);
const dateKey=dt=>new Date(dt).toLocaleDateString('pt-BR');
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const fmt=(v,d=0)=>num(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const muscles=['Peito','Costas','Pernas','Ombros','Bíceps','Tríceps','Abdômen','Cardio','Glúteos'];
const exercises=[
 ['supino-reto','Supino reto com barra','Peito','Barra','Academia'],
 ['supino-inclinado','Supino inclinado com halteres','Peito','Halteres','Academia'],
 ['crucifixo','Crucifixo com halteres','Peito','Halteres','Academia'],
 ['flexao','Flexão de braços','Peito','Peso corporal','Casa'],
 ['crossover','Crossover na polia','Peito','Polia','Academia'],
 ['remada-curvada','Remada curvada','Costas','Barra','Academia'],
 ['puxada-frontal','Puxada frontal','Costas','Máquina','Academia'],
 ['remada-baixa','Remada baixa','Costas','Máquina','Academia'],
 ['barra-fixa','Barra fixa','Costas','Peso corporal','Academia'],
 ['remada-unilateral','Remada unilateral','Costas','Halteres','Casa'],
 ['agachamento','Agachamento livre','Pernas','Barra','Academia'],
 ['leg-press','Leg press','Pernas','Máquina','Academia'],
 ['cadeira-extensora','Cadeira extensora','Pernas','Máquina','Academia'],
 ['mesa-flexora','Mesa flexora','Pernas','Máquina','Academia'],
 ['afundo','Afundo','Pernas','Peso corporal','Casa'],
 ['panturrilha','Elevação de panturrilha','Pernas','Peso corporal','Casa'],
 ['agachamento-peso','Agachamento com peso corporal','Pernas','Peso corporal','Casa'],
 ['desenvolvimento','Desenvolvimento com halteres','Ombros','Halteres','Academia'],
 ['elevacao-lateral','Elevação lateral','Ombros','Halteres','Casa'],
 ['elevacao-frontal','Elevação frontal','Ombros','Halteres','Casa'],
 ['face-pull','Face pull','Ombros','Polia','Academia'],
 ['rosca-direta','Rosca direta','Bíceps','Barra','Academia'],
 ['rosca-alternada','Rosca alternada','Bíceps','Halteres','Casa'],
 ['rosca-martelo','Rosca martelo','Bíceps','Halteres','Casa'],
 ['triceps-corda','Tríceps na corda','Tríceps','Polia','Academia'],
 ['triceps-frances','Tríceps francês','Tríceps','Halteres','Casa'],
 ['mergulho','Mergulho no banco','Tríceps','Peso corporal','Casa'],
 ['prancha','Prancha isométrica','Abdômen','Peso corporal','Casa'],
 ['abdominal','Abdominal tradicional','Abdômen','Peso corporal','Casa'],
 ['elevacao-pernas','Elevação de pernas','Abdômen','Peso corporal','Casa'],
 ['bicicleta','Bicicleta ergométrica','Cardio','Máquina','Academia'],
 ['corrida','Corrida no lugar','Cardio','Peso corporal','Casa'],
 ['polichinelo','Polichinelo','Cardio','Peso corporal','Casa'],
 ['elevacao-pelvica','Elevação pélvica','Glúteos','Barra','Academia'],
 ['ponte-gluteos','Ponte de glúteos','Glúteos','Peso corporal','Casa'],
 ['stiff','Stiff com halteres','Glúteos','Halteres','Casa'],
].map(([id,name,muscle,equipment,place])=>({id,name,muscle,equipment,place}));
const byId=id=>exercises.find(e=>e.id===id)||{id,name:'Exercício não encontrado',muscle:'Outro',equipment:'',place:''};
const defaultProfile={name:'Atleta',goal:'hipertrofia',level:'iniciante',place:'academia',days:3};
function buildPlan(p=defaultProfile){
 const groups = p.days>=5
 ? [['Peito','Tríceps'],['Costas','Bíceps'],['Pernas','Glúteos'],['Ombros','Abdômen'],['Pernas','Costas']]
 : p.days===4
 ? [['Peito','Tríceps'],['Costas','Bíceps'],['Pernas','Glúteos'],['Ombros','Abdômen']]
 : p.days===2
 ? [['Peito','Costas','Ombros','Tríceps'],['Pernas','Glúteos','Bíceps','Abdômen']]
 : [['Peito','Tríceps','Ombros'],['Costas','Bíceps','Abdômen'],['Pernas','Glúteos','Abdômen']];
 const tags=['A','B','C','D','E'];
 return groups.map((muscleNames,index)=>{
   const picked=[];
   muscleNames.forEach(m=>{
     const available=exercises.filter(e=>e.muscle===m && (p.place==='academia'||e.place==='Casa'));
     const count=muscleNames.length>=4?1:muscleNames.length===2?3:2;
     Array.from({length:Math.min(count,available.length)},(_,j)=>available[(index+j)%available.length]).forEach(e=>{if(!picked.find(x=>x.id===e.id))picked.push({id:e.id,sets:p.level==='avancado'?4:3,reps:p.goal==='forca'?6:12,rest:p.goal==='forca'?120:75});});
     if(!available.length)exercises.filter(e=>e.muscle===m).slice(0,1).forEach(e=>picked.push({id:e.id,sets:3,reps:12,rest:75}));
   });
   return {id:uid(),name:'Treino '+tags[index],focus:muscleNames.slice(0,2).join(' + '),exercises:picked};
 });
}
function newState(){return {profile:{...defaultProfile},routines:buildPlan(),sessions:[],active:null,createdAt:new Date().toISOString()};}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(KEY));
  if(s&&Array.isArray(s.routines)&&Array.isArray(s.sessions)&&s.profile&&typeof s.profile.name==='string')return s;
 }catch{}
 return newState();
}
let state=load();let screen='inicio';let filter={text:'',muscle:'',place:''};let detailRoutineId=null;let timerEnd=0;let toastTimeout=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('Armazenamento indisponível. Verifique espaço/privacidade.');}}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2900);}
function sectionTitle(eyebrow,title,subtitle){return '<div class="title-row"><div><span class="eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(title)+'</h1>'+(subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div></div>';}
function quickStat(label,value,foot){return '<div class="card"><div class="stat-label">'+esc(label)+'</div><div class="stat-val mono">'+esc(value)+'</div><div class="stat-foot">'+esc(foot)+'</div></div>';}
function weeks(){const anchor=new Date();anchor.setHours(0,0,0,0);const weekStart=new Date(anchor);weekStart.setDate(anchor.getDate()-((anchor.getDay()+6)%7));return state.sessions.filter(s=>new Date(s.date)>=weekStart).length;}
function completedSets(s){return s.lines.reduce((n,l)=>n+l.sets.filter(x=>x.done).length,0);}
function totalVolume(s){return s.lines.reduce((n,l)=>n+l.sets.reduce((v,x)=>v+(x.done?num(x.weight)*num(x.reps):0),0),0);}
function getLatestLift(exid){for(const s of state.sessions){const line=s.lines.find(l=>l.id===exid);if(line){const set=line.sets.find(x=>x.done);if(set)return set.weight;}}return 0;}
function exerciseTile(e,btn){
 return '<div class="exercise-item"><span class="exercise-icon">'+({Peito:'◈',Costas:'↕',Pernas:'↟',Ombros:'◆',Bíceps:'◡',Tríceps:'⊳',Abdômen:'◇',Cardio:'♥',Glúteos:'◉'}[e.muscle]||'○')+'</span><div><h3>'+esc(e.name)+'</h3><p>'+esc(e.muscle)+' · '+esc(e.equipment)+'</p></div>'+(btn||'')+'</div>';
}
function routineCard(r){
 return '<div class="card routine-card"><div class="routine-bubble">'+esc(r.name.split(' ').at(-1))+'</div><div><h3>'+esc(r.name)+'</h3><p>'+esc(r.focus)+' · '+r.exercises.length+' exercícios</p></div><button class="btn" data-action="routine" data-id="'+esc(r.id)+'">Abrir ↗</button></div>';
}
function pageHome(){
 const last=state.sessions[0];const r=state.routines[weeks()%Math.max(state.routines.length,1)]||state.routines[0];const act=state.active;
 return '<div class="eyebrow">SEU CENTRO DE PERFORMANCE</div><h1 class="headline">Olá, <b>'+esc(state.profile.name||'Atleta')+'!</b> 👋</h1><p class="muted">Cada treino registrado é um passo na sua evolução.</p>'+
 '<div class="hero"><span class="eyebrow">◈ '+(act?'TREINO EM ANDAMENTO':'SEU PRÓXIMO PASSO')+'</span><h2>'+(act?'Seu treino está esperando por você.':r?'Pronto para o '+esc(r.name)+'?':'Comece sua jornada hoje.')+'</h2><p>'+(act?'Continue de onde parou. Seus registros permanecem salvos neste dispositivo.':r?'Hoje o foco é '+esc(r.focus)+'. Registre suas séries, cargas e repetições sem complicação.':'Gere uma rotina de treino adaptada ao seu objetivo.')+'</p><div class="buttons"><button class="btn primary large" data-action="'+(act?'active':r?'start':'generate')+'" data-id="'+(r?.id||'')+'">'+(act?'Retomar treino':'Iniciar treino')+' →</button><button class="btn ghost large" data-nav="treinos">Ver minhas fichas</button></div></div>'+
 '<div class="grid stats">'+quickStat('Treinos na semana',weeks(),'/ '+state.profile.days+' planejados')+quickStat('Treinos realizados',state.sessions.length,'histórico completo')+quickStat('Volume acumulado',fmt(state.sessions.reduce((n,s)=>n+s.volume,0))+' kg','peso × repetições')+'</div>'+
 '<div class="section-head"><h2>Seus treinos</h2><button class="btn ghost" data-nav="treinos">Ver todos ↗</button></div><div class="grid two">'+(state.routines.slice(0,4).map(routineCard).join('')||'<div class="empty">Nenhum treino ainda.</div>')+'</div>'+
 '<div class="section-head"><h2>Última atividade</h2></div>'+(last?'<div class="card history-row"><div><strong>'+esc(last.name)+'</strong><small>'+dateKey(last.date)+' · '+completedSets(last)+' séries finalizadas</small></div><strong class="lime">'+fmt(last.volume)+' kg</strong></div>':'<div class="empty"><div class="empty-icon">◎</div><strong>Seu progresso começa aqui</strong><p>Conclua seu primeiro treino para visualizar seu histórico.</p></div>');
}
function pageTreinos(){
 if(detailRoutineId){const r=state.routines.find(x=>x.id===detailRoutineId);if(!r)detailRoutineId=null;else return pageRoutine(r);}
 return sectionTitle('BIBLIOTECA PESSOAL','Meus treinos','Organize fichas, personalize exercícios e escolha por onde começar.')+
 '<div class="buttons"><button class="btn primary" data-action="create-routine">+ Nova ficha</button><button class="btn" data-action="generate">↻ Gerar plano por objetivo</button></div>'+
 '<div class="section-head"><h2>Minhas fichas ('+state.routines.length+')</h2></div><div class="grid two">'+state.routines.map(routineCard).join('')+'</div>'+
 '<p class="banner-note">A geração usa regras gerais, não substitui avaliação profissional e pode ser ajustada por você.</p>';
}
function pageRoutine(r){
 return '<button class="btn ghost" data-action="back-routines">← Voltar</button><div class="title-row"><div><span class="eyebrow">SUA FICHA PERSONALIZADA</span><h1>'+esc(r.name)+'</h1><p>'+esc(r.focus)+' · '+r.exercises.length+' exercícios</p></div></div>'+
 '<div class="buttons"><button class="btn primary" data-action="start" data-id="'+esc(r.id)+'">▶ Iniciar treino</button><button class="btn" data-action="add-exercise" data-id="'+esc(r.id)+'">+ Exercício</button><button class="btn" data-action="rename-routine" data-id="'+esc(r.id)+'">Editar nome</button><button class="btn danger" data-action="delete-routine" data-id="'+esc(r.id)+'">Excluir ficha</button></div>'+
 '<div class="section-head"><h2>Exercícios da ficha</h2></div><div class="exercise-list">'+r.exercises.map((line,i)=>{
 const e=byId(line.id);return exerciseTile(e,'<button class="btn" data-action="edit-line" data-id="'+esc(r.id)+'" data-ex="'+esc(line.id)+'">'+line.sets+'×'+line.reps+' · '+line.rest+'s ✎</button><button class="btn danger" data-action="remove-exercise" data-id="'+esc(r.id)+'" data-ex="'+esc(line.id)+'" aria-label="Remover '+esc(e.name)+'">×</button>');
 }).join('')+'</div>';
}
function pageExercicios(){
 const items=exercises.filter(e=>(!filter.muscle||e.muscle===filter.muscle)&&(!filter.place||e.place===filter.place||e.place==='Casa'&&filter.place==='Academia')&&(!filter.text||e.name.toLowerCase().includes(filter.text.toLowerCase())));
 return sectionTitle('BIBLIOTECA DE MOVIMENTOS','Exercícios','Explore exercícios por músculo e equipamento. Demonstrações em vídeo não estão incluídas nesta versão.')+
 '<div class="filterbar"><input id="search-ex" aria-label="Pesquisar exercício" placeholder="Pesquisar exercício" value="'+esc(filter.text)+'"><select id="filter-muscle" aria-label="Filtrar músculo"><option value="">Todos os músculos</option>'+muscles.map(m=>'<option '+(filter.muscle===m?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select><select id="filter-place" aria-label="Filtrar local"><option value="">Todos locais</option><option '+(filter.place==='Academia'?'selected':'')+'>Academia</option><option '+(filter.place==='Casa'?'selected':'')+'>Casa</option></select></div>'+
 '<div class="section-head"><h2>'+items.length+' exercícios</h2></div><div class="exercise-list">'+(items.map(e=>exerciseTile(e,'<button class="btn" data-action="pick-routine" data-ex="'+esc(e.id)+'">+ Ficha</button>')).join('')||'<div class="empty">Nenhum exercício encontrado.</div>')+'</div>';
}
function chartSvg(){
 const recent=[...state.sessions].reverse().slice(-7),max=Math.max(...recent.map(s=>s.volume),1),step=recent.length>1?470/(recent.length-1):0;
 const pts=recent.map((s,i)=>[18+i*step,175-(s.volume/max)*135]);
 if(!pts.length)return '<div class="empty"><div class="empty-icon">↗</div><strong>Sem gráfico ainda</strong><p>Registre treinos para visualizar sua progressão.</p></div>';
 const coords=pts.map(p=>p.join(',')).join(' ');
 return '<svg class="progress-chart" role="img" aria-label="Gráfico de volume por sessão" viewBox="0 0 510 210" preserveAspectRatio="none"><g stroke="#3d4b5c" stroke-width="1"><line x1="10" y1="40" x2="505" y2="40"/><line x1="10" y1="105" x2="505" y2="105"/><line x1="10" y1="176" x2="505" y2="176"/></g><polyline points="'+coords+'" fill="none" stroke="#c6fc66" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'+pts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#c6fc66" stroke="#18252a" stroke-width="3"/>').join('')+'</svg><div class="chart-legend"><span>Primeiro: '+fmt(recent[0].volume)+' kg</span><span>Último: '+fmt(recent.at(-1).volume)+' kg</span></div>';
}
function pageEvolucao(){
 const totals=state.sessions.reduce((acc,s)=>{for(const line of s.lines){const m=byId(line.id).muscle;acc[m]=(acc[m]||0)+line.sets.filter(x=>x.done).length;}return acc;},{});
 const max=Math.max(...Object.values(totals),1);
 return sectionTitle('DADOS QUE MOSTRAM RESULTADOS','Sua evolução','Histórico de treino e volume registrado. Não são medidas clínicas nem estimativas de recuperação fisiológica.')+
 '<div class="grid stats">'+quickStat('Sessões',state.sessions.length,'total realizadas')+quickStat('Séries',state.sessions.reduce((n,s)=>n+completedSets(s),0),'concluídas')+quickStat('Volume',fmt(state.sessions.reduce((n,s)=>n+s.volume,0))+' kg','carga × repetições')+'</div>'+
 '<div class="grid two"><div class="card"><h2>Volume por treino</h2><p class="muted small">Últimas 7 sessões</p>'+chartSvg()+'</div><div class="card"><h2>Séries por músculo</h2><p class="muted small">Somatório do seu histórico</p>'+(Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([m,n])=>'<div class="bar-row"><span>'+esc(m)+'</span><div class="bar"><i style="width:'+Math.round(n/max*100)+'%"></i></div><b>'+n+'</b></div>').join('')||'<div class="empty">Ainda sem dados.</div>')+'</div></div>'+
 '<div class="section-head"><h2>Histórico</h2><button class="btn" data-action="export">Exportar dados</button></div><div class="card">'+(state.sessions.map(s=>'<div class="history-row"><div><strong>'+esc(s.name)+'</strong><small>'+dateKey(s.date)+' · '+completedSets(s)+' séries</small></div><b class="lime">'+fmt(s.volume)+' kg</b></div>').join('')||'<div class="empty">Nenhuma sessão registrada.</div>')+'</div>';
}
function pagePerfil(){
 const p=state.profile;
 return sectionTitle('SUAS PREFERÊNCIAS','Meu perfil','Ajuste as preferências que orientam a geração de fichas de treino.')+
 '<div class="grid two"><div class="card"><h2>Configurações</h2><form id="profile-form"><div class="field"><label for="p-name">Nome</label><input id="p-name" name="name" maxlength="40" required value="'+esc(p.name)+'"></div><div class="field"><label for="p-goal">Objetivo</label><select id="p-goal" name="goal">'+[['hipertrofia','Ganho de massa'],['forca','Força'],['condicionamento','Condicionamento'],['emagrecimento','Controle de peso']].map(([v,t])=>'<option value="'+v+'" '+(p.goal===v?'selected':'')+'>'+t+'</option>').join('')+'</select></div><div class="field"><label for="p-level">Experiência</label><select id="p-level" name="level">'+[['iniciante','Iniciante'],['intermediario','Intermediário'],['avancado','Avançado']].map(([v,t])=>'<option value="'+v+'" '+(p.level===v?'selected':'')+'>'+t+'</option>').join('')+'</select></div><div class="field"><label for="p-place">Onde treina?</label><select id="p-place" name="place"><option value="academia" '+(p.place==='academia'?'selected':'')+'>Academia</option><option value="casa" '+(p.place==='casa'?'selected':'')+'>Casa</option></select></div><div class="field"><label for="p-days">Dias de treino por semana</label><select id="p-days" name="days">'+[2,3,4,5].map(n=>'<option value="'+n+'" '+(p.days===n?'selected':'')+'>'+n+' dias</option>').join('')+'</select></div><button class="btn primary" type="submit">Salvar preferências</button></form></div>'+
 '<div class="card"><h2>Meus dados</h2><p class="muted">Os registros desta versão ficam neste navegador. Exportar os dados ajuda a manter uma cópia.</p><div class="buttons"><button class="btn" data-action="export">↓ Exportar backup JSON</button><button class="btn" data-action="import">↑ Importar backup</button><button class="btn danger" data-action="reset">Limpar todos os dados</button></div><div class="banner-note">Sem login, sincronização em nuvem ou assinatura nesta primeira versão. Trocar de dispositivo pode exigir importar o backup.</div><div class="section-head"><h2>Sobre o projeto</h2></div><p class="muted small">TreinoLab é um projeto independente inspirado nas funcionalidades da categoria de apps de musculação. Não é afiliado ao Befit. As rotinas são sugestões gerais com regras e não substituem orientação de profissionais de educação física ou saúde.</p></div></div>';
}
function pageActive(){
 const s=state.active;if(!s)return pageHome();
 const done=completedSets(s),all=s.lines.reduce((n,l)=>n+l.sets.length,0);
 return '<div class="eyebrow">SESSÃO EM ANDAMENTO</div><div class="workout-title"><div><h1>'+esc(s.name)+'</h1><p class="muted">'+esc(s.focus)+' · '+dateKey(s.date)+'</p></div><button class="btn danger" data-action="discard">Descartar</button></div>'+
 '<div class="card"><div class="title-row"><div><strong>'+done+' de '+all+' séries concluídas</strong><p class="muted small">Cada série pode ter carga e repetições diferentes.</p></div><button class="btn" data-action="timer">⏱ Descanso <span id="rest-left"></span></button></div><div class="workout-progress"><i style="width:'+(all?Math.round(done/all*100):0)+'%"></i></div></div>'+
 '<div class="exercise-list" style="margin-top:18px">'+s.lines.map((line,i)=>{const e=byId(line.id);return '<section class="card"><div class="section-head" style="margin:0 0 8px"><h2>'+(i+1)+'. '+esc(e.name)+'</h2><span class="chip">'+esc(e.muscle)+'</span></div><table class="set-table"><thead><tr><th>Série</th><th>Repetições</th><th>Peso (kg)</th><th>Feita</th></tr></thead><tbody>'+line.sets.map((set,j)=>'<tr><td>'+((j+1))+'</td><td><input aria-label="Repetições série '+(j+1)+'" type="number" inputmode="numeric" min="0" max="999" data-set-field="reps" data-line="'+i+'" data-set="'+j+'" value="'+set.reps+'"></td><td><input aria-label="Peso série '+(j+1)+'" type="number" inputmode="decimal" min="0" max="10000" step="0.5" data-set-field="weight" data-line="'+i+'" data-set="'+j+'" value="'+set.weight+'"></td><td><input class="set-check" aria-label="Concluir série '+(j+1)+'" type="checkbox" data-set-field="done" data-line="'+i+'" data-set="'+j+'" '+(set.done?'checked':'')+'></td></tr>').join('')+'</tbody></table><button class="btn" data-action="add-set" data-line="'+i+'">+ Adicionar série</button></section>';}).join('')+'</div><div class="section-head"><button class="btn primary large" data-action="finish">✓ Concluir treino</button></div><p class="muted small">Registros apenas neste dispositivo. Para preservar seu histórico, exporte seu backup no Perfil.</p>';
}
function render(){
 $('#today-date').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'numeric',month:'short'}).format(new Date());
 document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===screen));
 $('#main').innerHTML=state.active&&screen==='ativo'?pageActive():screen==='inicio'?pageHome():screen==='treinos'?pageTreinos():screen==='exercicios'?pageExercicios():screen==='evolucao'?pageEvolucao():pagePerfil();
}
function navigate(to){screen=to;detailRoutineId=null;render();window.scrollTo({top:0,behavior:'instant'});}
function modal(title,body,actions=''){
 $('#modal-root').innerHTML='<div class="modal-cover" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header><h2>'+esc(title)+'</h2><button type="button" class="close" data-action="close-modal" aria-label="Fechar">×</button></header>'+body+'<footer>'+actions+'</footer></div></div>';
 $('#modal-root').querySelector('input,select,button:not(.close)')?.focus();
}
function closeModal(){$('#modal-root').innerHTML='';}
function chooseRoutine(exid){
 const e=byId(exid);
 if(!state.routines.length){toast('Crie uma ficha primeiro.');navigate('treinos');return;}
 modal('Adicionar '+e.name,'<p class="muted">Escolha a ficha para adicionar este exercício.</p><div class="field"><label for="target-routine">Ficha de destino</label><select id="target-routine">'+state.routines.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+'</option>').join('')+'</select></div>',
 '<button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="confirm-add" data-ex="'+esc(exid)+'">Adicionar à ficha</button>');
}
function addToRoutine(rid,exid){
 const r=state.routines.find(x=>x.id===rid);if(!r)return;
 if(r.exercises.some(x=>x.id===exid)){toast('Esse exercício já está na ficha.');return;}
 r.exercises.push({id:exid,sets:3,reps:12,rest:75});save();toast('Exercício adicionado.');closeModal();detailRoutineId=rid;screen='treinos';render();
}
function addExerciseDialog(rid){
 modal('Escolher exercício','<div class="field"><label for="choose-ex">Exercício</label><select id="choose-ex">'+exercises.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name)+' · '+esc(e.muscle)+'</option>').join('')+'</select></div>',
 '<button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="confirm-choose-ex" data-id="'+esc(rid)+'">Adicionar</button>');
}
function startRoutine(rid){
 if(state.active){screen='ativo';render();toast('Retomando seu treino em andamento.');return;}
 const r=state.routines.find(x=>x.id===rid);if(!r)return;
 state.active={id:uid(),routineId:r.id,name:r.name,focus:r.focus,date:new Date().toISOString(),lines:r.exercises.map(ex=>({id:ex.id,sets:Array.from({length:ex.sets},()=>({reps:ex.reps,weight:getLatestLift(ex.id),done:false}))}))};save();screen='ativo';render();window.scrollTo({top:0});
}
function finish(){
 const s=state.active;if(!s)return;
 if(!completedSets(s)){toast('Marque ao menos uma série como concluída.');return;}
 const done={...s,volume:totalVolume(s),finishedAt:new Date().toISOString()};state.sessions.unshift(done);state.active=null;save();screen='evolucao';render();toast('Treino concluído! Evolução registrada.');window.scrollTo({top:0});
}
function generate(){
 if(state.active){toast('Finalize ou descarte o treino em andamento antes.');return;}
 modal('Gerar novo plano','<p class="muted">Criar fichas com base em '+esc(state.profile.days)+' dias, objetivo e local de treino. Suas fichas atuais serão substituídas, mas o histórico será mantido.</p>',
 '<button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="confirm-generate">Gerar plano</button>');
}
function editLine(rid,exid){
 const line=state.routines.find(r=>r.id===rid)?.exercises.find(x=>x.id===exid);if(!line)return;
 modal('Configurar '+byId(exid).name,
 '<div class="field"><label for="edit-sets">Séries</label><input type="number" id="edit-sets" min="1" max="10" value="'+line.sets+'"></div><div class="field"><label for="edit-reps">Repetições</label><input type="number" id="edit-reps" min="1" max="100" value="'+line.reps+'"></div><div class="field"><label for="edit-rest">Descanso em segundos</label><input type="number" id="edit-rest" min="15" max="600" value="'+line.rest+'"></div>',
 '<button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="save-line" data-id="'+esc(rid)+'" data-ex="'+esc(exid)+'">Salvar</button>');
}
function downloadBackup(){
 const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='treinolab-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);toast('Backup exportado.');
}
async function importBackup(file){
 if(!file)return;
 try{
  const txt=await file.text();if(txt.length>4e6)throw Error('Arquivo muito grande.');
  const x=JSON.parse(txt);if(!Array.isArray(x.routines)||!Array.isArray(x.sessions)||!x.profile||!Array.isArray(x.routines.every?x.routines:[]))throw Error('Formato inválido.');
  if(!x.routines.every(r=>typeof r.id==='string'&&typeof r.name==='string'&&Array.isArray(r.exercises)))throw Error('Backup incompatível.');
  if(!confirm('Importar o backup substituirá os dados deste dispositivo. Continuar?'))return;
  state=x;save();navigate('inicio');toast('Backup importado.');
 }catch(e){toast('Não foi possível importar: '+e.message);}
}
function onAction(button){
 const a=button.dataset.action,id=button.dataset.id,ex=button.dataset.ex;
 if(a==='settings')navigate('perfil');
 if(a==='routine'){detailRoutineId=id;screen='treinos';render();window.scrollTo({top:0});}
 if(a==='back-routines'){detailRoutineId=null;render();}
 if(a==='start')startRoutine(id);
 if(a==='active'){screen='ativo';render();}
 if(a==='create-routine')modal('Criar nova ficha','<div class="field"><label for="new-routine-name">Nome da ficha</label><input id="new-routine-name" maxlength="40" placeholder="Ex.: Treino de sábado"></div><div class="field"><label for="new-routine-focus">Foco principal</label><input id="new-routine-focus" maxlength="80" placeholder="Ex.: Peito e costas"></div>',
 '<button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="save-new-routine">Criar ficha</button>');
 if(a==='save-new-routine'){const name=$('#new-routine-name').value.trim();if(!name)return toast('Informe o nome da ficha.');const r={id:uid(),name,focus:$('#new-routine-focus').value.trim()||'Personalizado',exercises:[]};state.routines.push(r);save();closeModal();detailRoutineId=r.id;screen='treinos';render();toast('Ficha criada. Adicione exercícios.');}
 if(a==='rename-routine'){const r=state.routines.find(x=>x.id===id);if(!r)return;modal('Renomear ficha','<div class="field"><label for="rename-value">Nome</label><input id="rename-value" maxlength="40" value="'+esc(r.name)+'"></div><div class="field"><label for="refocus-value">Foco</label><input id="refocus-value" maxlength="80" value="'+esc(r.focus)+'"></div>','<button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="confirm-rename" data-id="'+esc(id)+'">Salvar</button>');}
 if(a==='confirm-rename'){const r=state.routines.find(x=>x.id===id);if(!r)return;r.name=$('#rename-value').value.trim()||r.name;r.focus=$('#refocus-value').value.trim()||r.focus;save();closeModal();render();}
 if(a==='delete-routine'){if(!confirm('Excluir esta ficha? Seus treinos concluídos permanecerão no histórico.'))return;state.routines=state.routines.filter(r=>r.id!==id);save();detailRoutineId=null;render();}
 if(a==='generate')generate();
 if(a==='confirm-generate'){state.routines=buildPlan(state.profile);save();closeModal();detailRoutineId=null;screen='treinos';render();toast('Plano personalizado criado.');}
 if(a==='edit-line')editLine(id,ex);
 if(a==='save-line'){const line=state.routines.find(r=>r.id===id)?.exercises.find(x=>x.id===ex);if(!line)return;line.sets=Math.max(1,Math.min(10,num($('#edit-sets').value,3)));line.reps=Math.max(1,Math.min(100,num($('#edit-reps').value,12)));line.rest=Math.max(15,Math.min(600,num($('#edit-rest').value,75)));save();closeModal();render();}
 if(a==='remove-exercise'){const r=state.routines.find(r=>r.id===id);if(!r)return;r.exercises=r.exercises.filter(x=>x.id!==ex);save();render();}
 if(a==='pick-routine')chooseRoutine(ex);
 if(a==='confirm-add')addToRoutine($('#target-routine').value,ex);
 if(a==='add-exercise')addExerciseDialog(id);
 if(a==='confirm-choose-ex')addToRoutine(id,$('#choose-ex').value);
 if(a==='add-set'){const line=state.active?.lines[Number(button.dataset.line)];if(line){const old=line.sets.at(-1);line.sets.push({reps:old?.reps||12,weight:old?.weight||0,done:false});save();render();}}
 if(a==='finish')finish();
 if(a==='discard'){if(confirm('Descartar o treino em andamento?')){state.active=null;save();navigate('inicio');}}
 if(a==='timer'){timerEnd=Date.now()+75000;toast('Descanso de 75 segundos iniciado.');tickTimer();}
 if(a==='export')downloadBackup();
 if(a==='import'){$('#import-file').click();}
 if(a==='reset'){if(!confirm('Isso apagará todas as fichas e treinos deste dispositivo. Deseja continuar?'))return;localStorage.removeItem(KEY);state=newState();save();navigate('inicio');toast('Dados redefinidos.');}
 if(a==='close-modal')closeModal();
}
function tickTimer(){const el=$('#rest-left');if(!el)return;const left=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));el.textContent=left?' '+left+'s':'';if(!left&&timerEnd){timerEnd=0;toast('Descanso concluído!');}}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action],[data-nav]');if(!button)return;
 e.preventDefault();
 if(button.dataset.nav){navigate(button.dataset.nav);return;}
 onAction(button);
});
document.addEventListener('change',e=>{
 const target=e.target;
 if(target.dataset.setField){
  const line=state.active?.lines[Number(target.dataset.line)],set=line?.sets[Number(target.dataset.set)];if(!set)return;
  const prop=target.dataset.setField;
  set[prop]=prop==='done'?target.checked:Math.max(0,Math.min(prop==='reps'?999:10000,num(target.value)));
  save();
  if(prop==='done')render();
 }
 if(target.id==='filter-muscle'){filter.muscle=target.value;render();}
 if(target.id==='filter-place'){filter.place=target.value;render();}
 if(target.id==='import-file')void importBackup(target.files[0]);
});
document.addEventListener('input',e=>{
 if(e.target.id==='search-ex'){filter.text=e.target.value;const pos=e.target.selectionStart;render();$('#search-ex')?.focus();$('#search-ex')?.setSelectionRange(pos,pos);}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='profile-form')return;e.preventDefault();const f=new FormData(e.target);
 const p={name:String(f.get('name')||'Atleta').trim().slice(0,40)||'Atleta',goal:String(f.get('goal')),level:String(f.get('level')),place:String(f.get('place')),days:Math.max(2,Math.min(5,num(f.get('days'),3)))};
 state.profile=p;save();toast('Preferências salvas. Gere um novo plano quando quiser.');render();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
const input=document.createElement('input');input.type='file';input.id='import-file';input.accept='application/json,.json';input.style.display='none';document.body.append(input);
render();save();
setInterval(()=>{if(screen==='ativo')tickTimer();},1000);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
