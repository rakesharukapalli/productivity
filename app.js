const API_BASE = '/api';
let nodes = [];

async function apiGet(action='bootstrap') {
  const res = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}
async function apiPost(payload) {
  const res = await fetch(API_BASE, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render() {
  const q=document.querySelector('#search').value.toLowerCase();
  const type=document.querySelector('#typeFilter').value;
  const visible=nodes.filter(n=>(!q || `${n.title} ${n.description||''}`.toLowerCase().includes(q)) && (!type || n.node_type===type));
  document.querySelector('#totalCount').textContent=nodes.length;
  document.querySelector('#activeCount').textContent=nodes.filter(n=>n.status==='Active').length;
  document.querySelector('#doneCount').textContent=nodes.filter(n=>n.status==='Completed').length;
  const visibleIds=new Set(visible.map(n=>String(n.node_id)));
  const roots=visible.filter(n=>!n.parent_id || !nodes.some(p=>String(p.node_id)===String(n.parent_id)));
  document.querySelector('#tree').innerHTML=roots.length?`<ul>${roots.map(n=>renderNode(n,visible,visibleIds)).join('')}</ul>`:'<p class="empty">No matching items. Add your first item.</p>';
  const parent=document.querySelector('#parentId');
  parent.innerHTML='<option value="">Top level</option>'+nodes.map(n=>`<option value="${esc(n.node_id)}">${esc(n.node_type)} — ${esc(n.title)}</option>`).join('');
}
function renderNode(n,all,ids){
  const children=all.filter(c=>String(c.parent_id)===String(n.node_id));
  const p=Math.max(0,Math.min(100,Number(n.progress_pct)||0));
  return `<li><div class="node"><span class="type">${esc(n.node_type)}</span><span class="node-title">${esc(n.title)}</span><span class="status">${esc(n.status||'Not Started')}</span><span class="progress"><i style="width:${p}%"></i></span><span class="node-meta">${p}%</span><button class="add-child" data-parent="${esc(n.node_id)}">+ child</button></div>${children.length?`<ul>${children.map(c=>renderNode(c,all,ids)).join('')}</ul>`:''}</li>`;
}
async function load(){
  const badge=document.querySelector('#connection');
  try{const data=await apiGet();nodes=data.nodes||data||[];badge.textContent='Connected';badge.style.background='#e7f5ee';badge.style.color='#26734f';render();}
  catch(e){badge.textContent='API not connected';badge.style.background='#fff0ee';badge.style.color='#a33';document.querySelector('#tree').innerHTML=`<p class="error">${esc(e.message)}. Check the setup steps in README.</p>`;}
}
document.querySelector('#refreshBtn').addEventListener('click',load);
document.querySelector('#search').addEventListener('input',render);
document.querySelector('#typeFilter').addEventListener('change',render);
document.querySelector('#addBtn').addEventListener('click',()=>{document.querySelector('#parentId').value='';document.querySelector('#itemDialog').showModal();});
document.querySelector('#closeDialog').addEventListener('click',()=>document.querySelector('#itemDialog').close());
document.querySelector('#tree').addEventListener('click',e=>{const b=e.target.closest('[data-parent]');if(b){document.querySelector('#parentId').value=b.dataset.parent;document.querySelector('#itemDialog').showModal();}});
document.querySelector('#itemForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const node={parent_id:document.querySelector('#parentId').value,node_type:document.querySelector('#nodeType').value,
    title:document.querySelector('#nodeTitle').value.trim(),description:document.querySelector('#nodeDescription').value.trim(),
    success_criteria:document.querySelector('#nodeCriteria').value.trim(),next_action:document.querySelector('#nodeNext').value.trim(),
    priority:document.querySelector('#nodePriority').value};
  try{await apiPost({action:'createNode',node});document.querySelector('#itemDialog').close();e.target.reset();await load();}
  catch(err){alert(err.message);}
});
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
load();