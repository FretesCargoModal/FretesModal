const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
let config = {brand:'CargoModal', whatsapp:''};
let adminFreights = [];
const fmtWeight = n => n == null || n === '' ? 'Peso sob consulta' : `${Number(n).toLocaleString('pt-BR')} toneladas`;
const fmtDate = d => { if(!d) return 'Data a confirmar'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url, options={}) {
  const res = await fetch(url, {credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}
async function loadConfig(){try{config=await api('/api/config')}catch{}}
function whatsappLink(f){
  const number=config.whatsapp;
  const message=`Olá, CargoModal! Tenho interesse no frete #${f.id}: ${f.origin_city}/${f.origin_state} → ${f.destination_city}/${f.destination_state}. Veículo: ${f.vehicle_type}. Poderiam informar as condições?`;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}
function freightCard(f){
 return `<article class="freight-card"><div class="card-top"><span class="card-category">${esc(f.vehicle_type.toUpperCase())}</span><span class="card-date">${esc(fmtDate(f.loading_date))}</span></div><h3>${esc(f.title)}</h3><div class="route"><div class="route-line"><i></i><b></b><i></i></div><div><div class="route-point"><small>ORIGEM</small><b>${esc(f.origin_city)} – ${esc(f.origin_state)}</b></div><div class="route-point destination"><small>DESTINO</small><b>${esc(f.destination_city)} – ${esc(f.destination_state)}</b></div></div></div><div class="card-meta"><span class="meta-chip">⚖ ${esc(fmtWeight(f.weight_tons))}</span>${f.material?`<span class="meta-chip">▦ ${esc(f.material)}</span>`:''}<span class="meta-chip">Frete a negociar</span></div>${f.notes?`<p class="card-notes">${esc(f.notes)}</p>`:''}<a class="card-cta" href="${whatsappLink(f)}" target="_blank" rel="noopener noreferrer">Tenho interesse nesta carga ↗</a></article>`;
}
async function loadFreights(){
 const form=$('#filters'); const params=new URLSearchParams(new FormData(form));
 $('#freight-list').innerHTML='<div class="empty-state">Buscando fretes disponíveis…</div>';
 try{
  const data=await api('/api/freights?'+params.toString());
  $('#result-count').textContent=`${data.length} ${data.length===1?'frete encontrado':'fretes encontrados'}`;
  $('#freight-list').innerHTML=data.length?data.map(freightCard).join(''):'<div class="empty-state"><div style="font-size:28px">⌕</div><b>Nenhum frete encontrado</b><span>Tente ajustar os filtros ou volte mais tarde para consultar novas oportunidades.</span></div>';
 }catch(e){$('#result-count').textContent='';$('#freight-list').innerHTML=`<div class="empty-state">${esc(e.message)}</div>`}
}
$('#year').textContent=new Date().getFullYear();
$('#filters').addEventListener('submit',e=>{e.preventDefault();loadFreights()});
$('#filters').addEventListener('reset',()=>setTimeout(loadFreights,0));
$('#refresh').addEventListener('click',loadFreights);
const modal=$('#login-modal');
function openLogin(){modal.classList.remove('hidden');$('#login-error').textContent='';setTimeout(()=>$('#login-form [name=username]').focus(),50)}
function closeLogin(){modal.classList.add('hidden')}
$('#admin-open').addEventListener('click',async()=>{try{await api('/api/me');showAdmin()}catch{openLogin()}});
$$('[data-close]').forEach(b=>b.addEventListener('click',closeLogin));
modal.addEventListener('click',e=>{if(e.target===modal)closeLogin()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeLogin();closeEditor()}});
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));$('#login-error').textContent='';try{const result=await api('/api/login',{method:'POST',body:JSON.stringify(data)});closeLogin();$('#admin-user').textContent=result.username;showAdmin()}catch(err){$('#login-error').textContent=err.message}});
async function showAdmin(){ $('#admin-view').classList.remove('hidden'); document.body.style.overflow='hidden'; try{const me=await api('/api/me');$('#admin-user').textContent=me.username;await loadAdminFreights()}catch{ $('#admin-view').classList.add('hidden');document.body.style.overflow='';openLogin()}}
function hideAdmin(){ $('#admin-view').classList.add('hidden');document.body.style.overflow='';closeEditor();loadFreights()}
$('#logout').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST'})}catch{}hideAdmin()});
function statusLabel(s){return ({published:'Publicado',paused:'Pausado',closed:'Encerrado'})[s]||s}
async function loadAdminFreights(){
 try{
  adminFreights=await api('/api/admin/freights');
  $('#admin-count').textContent=`${adminFreights.length} registro(s)`;
  $('#admin-freights').innerHTML=adminFreights.length?adminFreights.map(f=>`<div class="admin-freight-row"><div><h3>${esc(f.title)}</h3><p>${esc(f.origin_city)}/${esc(f.origin_state)} → ${esc(f.destination_city)}/${esc(f.destination_state)} · ${esc(f.vehicle_type)} · ${esc(fmtWeight(f.weight_tons))}</p></div><span class="status status-${esc(f.status)}">${statusLabel(f.status)}</span><div class="row-actions"><button class="small-btn" data-edit="${f.id}">Editar</button><button class="small-btn danger" data-delete="${f.id}">Excluir</button></div></div>`).join(''):'<div class="empty-state">Nenhuma carga cadastrada ainda. Clique em “Novo frete” para começar.</div>';
  $$('[data-edit]').forEach(b=>b.addEventListener('click',()=>editFreight(Number(b.dataset.edit))));
  $$('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteFreight(Number(b.dataset.delete))));
 }catch(e){if(e.message.includes('Sessão'))hideAdmin();else showAdminMessage(e.message,true)}
}
function showAdminMessage(msg,error=false){const n=$('#admin-message');n.textContent=msg;n.classList.remove('hidden','error');if(error)n.classList.add('error');setTimeout(()=>n.classList.add('hidden'),4500)}
function openEditor(f=null){
 $('#freight-editor').classList.remove('hidden');$('#editor-title').textContent=f?'Editar frete':'Cadastrar frete';$('#editor-error').textContent='';
 const form=$('#freight-form');form.reset();form.elements.id.value=f?.id||'';
 for(const key of ['title','origin_city','origin_state','destination_city','destination_state','weight_tons','vehicle_type','material','loading_date','notes','status']) if(f && form.elements[key])form.elements[key].value=f[key]??(key==='status'?'published':'');
 $('#freight-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function closeEditor(){$('#freight-editor').classList.add('hidden')}
$('#new-freight').addEventListener('click',()=>openEditor());
$('#cancel-editor').addEventListener('click',closeEditor);$('#cancel-editor-bottom').addEventListener('click',closeEditor);
function editFreight(id){const f=adminFreights.find(x=>x.id===id);if(f)openEditor(f)}
async function deleteFreight(id){const f=adminFreights.find(x=>x.id===id);if(!f||!confirm(`Excluir o frete "${f.title}"? Esta ação não pode ser desfeita.`))return;try{await api('/api/admin/freights/'+id,{method:'DELETE'});showAdminMessage('Frete excluído.');await loadAdminFreights();await loadFreights()}catch(e){showAdminMessage(e.message,true)}}
$('#freight-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget;const raw=Object.fromEntries(new FormData(form));const id=raw.id;delete raw.id;
 raw.weight_tons=raw.weight_tons===''?null:Number(raw.weight_tons);
 $('#editor-error').textContent='';
 try{await api(id?'/api/admin/freights/'+id:'/api/admin/freights',{method:id?'PUT':'POST',body:JSON.stringify(raw)});closeEditor();showAdminMessage(id?'Frete atualizado.':'Frete cadastrado com sucesso.');await loadAdminFreights();await loadFreights()}catch(err){$('#editor-error').textContent=err.message}
});
loadConfig().then(loadFreights);
