'use strict';
/* Aplicativo original gerado por modelos controlados. Sem serviços externos. */
const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const uid = () => crypto.randomUUID?.() || (Date.now() + '-' + Math.random().toString(16).slice(2));
let config = null;
let data = null;
let storageKey = '';
function notify(message) {
  const target = $('#toast'); target.textContent = message; target.classList.add('show');
  setTimeout(() => target.classList.remove('show'), 2500);
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); }
  catch { notify('Não foi possível guardar os dados neste dispositivo.'); }
}
function defaults(kind) {
  return kind === 'catalogo'
    ? { products: [{id:uid(),name:'Produto demonstrativo A',price:25},{id:uid(),name:'Produto demonstrativo B',price:48}], cart: [] }
    : { items: [] };
}
function card(title,caption,button='') {
  return '<div class="row-card"><div class="info"><strong>'+esc(title)+'</strong><small>'+esc(caption)+'</small></div>'+button+'</div>';
}
function field(label,id,type,placeholder,required=true) {
  return '<div class="field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" name="'+id+'" type="'+type+'" placeholder="'+esc(placeholder)+'" '+(required?'required':'')+'></div>';
}
function render() {
  const kind=config.kind, items=data.items || [],root=$('#main-content');
  const headings={agendamentos:'Agendamentos locais',catalogo:'Vitrine e carrinho',tarefas:'Minhas tarefas',geral:'Notas e ideias'};
  $('#section-heading').textContent=headings[kind]||'Seu painel';
  $('#counter').textContent=String(kind==='catalogo'?data.cart.length:items.length);
  if(kind==='agendamentos') {
    root.innerHTML='<form id="entry-form">'+field('Nome do cliente','name','text','Ex.: Maria')+
      '<div class="form-grid"><div class="field"><label for="service">Serviço</label><select id="service" name="service"><option>Avaliação</option><option>Atendimento</option><option>Retorno</option></select></div>'+
      field('Data','date','date','')+'</div>'+
      field('Horário','time','time','')+
      '<button type="submit">Registrar agendamento</button></form><h2 style="margin-top:25px">Agenda neste dispositivo</h2>'+
      (items.length?items.map(item=>card(item.name,item.service+' • '+item.date+' às '+item.time,
        '<button class="danger" data-remove="'+esc(item.id)+'">Excluir</button>')).join(''):'<div class="empty">Nenhum horário cadastrado.</div>');
  } else if(kind==='catalogo') {
    root.innerHTML='<p class="muted">Produtos e preços são exemplos. Edite no próprio aplicativo antes de uso real.</p>'+
      '<form id="entry-form"><div class="form-grid">'+field('Nome do produto','name','text','Novo produto')+field('Preço em reais','price','number','0,00')+'</div><button type="submit">Adicionar produto</button></form>'+
      '<h2 style="margin-top:25px">Produtos</h2>'+
      data.products.map(item=>card(item.name,'R$ '+Number(item.price).toFixed(2).replace('.',','),
        '<button data-cart="'+esc(item.id)+'">Adicionar</button><button data-remove-product="'+esc(item.id)+'" class="danger">×</button>')).join('')+
      '<h2 style="margin-top:25px">Carrinho ('+data.cart.length+')</h2>'+
      (data.cart.length?data.cart.map(item=>card(item.name,'R$ '+Number(item.price).toFixed(2).replace('.',','),
        '<button class="danger" data-remove-cart="'+esc(item.id)+'">×</button>')).join(''):'<div class="empty">Carrinho vazio.</div>')+
      '<button id="copy-order" class="secondary">Copiar lista do pedido</button>';
  } else {
    root.innerHTML='<form id="entry-form">'+field(kind==='tarefas'?'Nova tarefa':'Nova anotação','name','text',kind==='tarefas'?'O que precisa ser feito?':'Registre uma ideia')+
      '<button type="submit">Adicionar</button></form><h2 style="margin-top:25px">'+(kind==='tarefas'?'Minha lista':'Anotações')+'</h2>'+
      (items.length?items.map(item=>'<div class="row-card '+(item.done?'completed':'')+'">'+
        (kind==='tarefas'?'<input type="checkbox" data-check="'+esc(item.id)+'" aria-label="Concluir '+esc(item.name)+'" '+(item.done?'checked':'')+'>':'')+
        '<div class="info"><strong>'+esc(item.name)+'</strong><small>'+esc(new Date(item.date).toLocaleString('pt-BR'))+'</small></div>'+
        '<button class="danger" data-remove="'+esc(item.id)+'">Excluir</button></div>').join(''):'<div class="empty">Nenhum item ainda. Crie o primeiro acima.</div>');
  }
}
function handleSubmit(event) {
  event.preventDefault();
  const form=event.target;
  if(form.id!=='entry-form')return;
  const name=form.elements.name.value.trim().slice(0,100);
  if(!name) return notify('Informe o nome.');
  if(config.kind==='catalogo') {
    const price=Number(form.elements.price.value);
    if(!Number.isFinite(price)||price<0||price>1000000)return notify('Preço inválido.');
    data.products.push({id:uid(),name,price});
  } else {
    const item={id:uid(),name,date:new Date().toISOString(),done:false};
    if(config.kind==='agendamentos') {
      const date=form.elements.date.value, time=form.elements.time.value,service=form.elements.service.value;
      if(!date || !time) return notify('Selecione data e horário.');
      if(data.items.some(x=>x.date===date&&x.time===time))return notify('Já existe um agendamento neste horário.');
      item.date=date;item.time=time;item.service=service;
    }
    data.items.unshift(item);
  }
  save();render();notify('Adicionado.');
}
function handleClick(event) {
  const b=event.target.closest('button');if(!b)return;
  const id=b.dataset.remove || b.dataset.removeProduct || b.dataset.cart || b.dataset.removeCart;
  if(b.dataset.remove){data.items=data.items.filter(x=>x.id!==id);}
  else if(b.dataset.removeProduct){data.products=data.products.filter(x=>x.id!==id);}
  else if(b.dataset.cart){const product=data.products.find(x=>x.id===id);if(product)data.cart.push({...product,id:uid()});}
  else if(b.dataset.removeCart){data.cart=data.cart.filter(x=>x.id!==id);}
  else if(b.id==='copy-order'){
    const text='Meu pedido:\n'+data.cart.map(x=>'- '+x.name+' — R$ '+Number(x.price).toFixed(2)).join('\n')+
      '\nTotal: R$ '+data.cart.reduce((n,x)=>n+Number(x.price),0).toFixed(2);
    void navigator.clipboard.writeText(text).then(()=>notify('Pedido copiado.')).catch(()=>notify('Copie os itens manualmente.'));
    return;
  } else if(b.id==='export'){
    const blob=new Blob([JSON.stringify({config,data},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='meu-app-backup.json';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  } else if(b.id==='reset'){
    if(!confirm('Apagar todos os dados deste aparelho?'))return;
    data=defaults(config.kind);
  } else return;
  save();render();
}
async function main() {
  try {
    const response=await fetch('./config.json',{cache:'no-store'});
    if(!response.ok)throw Error('Configuração indisponível');
    config=await response.json();
    storageKey='rea-original-project-'+config.projectId;
    try {data=JSON.parse(localStorage.getItem(storageKey));}catch{}
    if(!data || typeof data!=='object' || (config.kind==='catalogo'?!Array.isArray(data.products)||!Array.isArray(data.cart):!Array.isArray(data.items)))data=defaults(config.kind);
    document.title=config.name+' | Meu aplicativo';
    $('#brand-name').textContent=config.name.toUpperCase();
    $('#hero-title').textContent=config.name;
    $('#hero-desc').textContent=config.description;
    $('#category').textContent=config.kind==='agendamentos'?'AGENDA':config.kind==='catalogo'?'CATÁLOGO':config.kind==='tarefas'?'ORGANIZAÇÃO':'PROJETO INICIAL';
    render();
  } catch(error) { $('#main-content').textContent='Não foi possível carregar este projeto. '+error.message; }
}
document.addEventListener('submit',handleSubmit);
document.addEventListener('click',handleClick);
document.addEventListener('change',event=>{if(event.target.dataset.check){const item=data.items.find(x=>x.id===event.target.dataset.check);if(item){item.done=event.target.checked;save();render();}}});
void main();
