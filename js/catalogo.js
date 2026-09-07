// ==========================================
// PRODUCTOS
// ==========================================
// Muestra al instante la última lista conocida y la corrige cuando llega la
// del servidor. Solo espera con esqueleto si nunca se guardó nada o si una
// escritura dejó la lista vencida.
async function cargarProductos(){
  const cont=document.getElementById('cont-productos');
  const previo=cacheLocal('getProductos');
  if(previo && previo.length){ productos=previo; _pintarProductos(); }
  else cont.innerHTML=skeleton();
  try{
    productos=await apiGetCached('getProductos');
    _pintarProductos();
  }catch(e){
    if(!(previo && previo.length)) cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';
  }
}

function _pintarProductos(){
  const cont=document.getElementById('cont-productos');
  if(!cont) return;
  if(!productos.length){cont.innerHTML='<div class="vacio"><span class="ico">🧀</span>No hay productos todavía.<br>Agregá el primero.</div>';return;}
  cont.innerHTML=productos.map((p,i)=>{
      const margen=p.precio>0&&p.precio_costo>0?Math.round((p.precio-p.precio_costo)/p.precio*100)+'%':null;
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${esc(p.nombre)}</div>
            <div class="item-det">Costo: ${$$(p.precio_costo)} · ${esc(p.unidad)}${margen?' · Margen: '+margen:''}${(p.stock!==undefined&&p.stock!=='')?' · Stock: '+Number(p.stock).toLocaleString('es-AR')+' '+esc(p.unidad):''}</div>
            ${p.proveedor?`<div class="item-det" style="color:var(--verde-c)">🏭 ${esc(p.proveedor)}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="item-val">${$$(p.precio)}</div>
            <button class="btn btn-s btn-sm" onclick="abrirModalProducto(productos[${i}])">Editar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function abrirModalProducto(p){
  const editar=!!p;
  document.getElementById('titulo-modal-prod').textContent=editar?'Editar producto':'Agregar producto';
  document.getElementById('p-modo').value=editar?'editar':'agregar';
  document.getElementById('p-nombre').value=editar?p.nombre:'';
  document.getElementById('p-nombre').readOnly=false;
  document.getElementById('p-nombre').style.background='';
  _origNombre=editar?p.nombre:'';
  document.getElementById('p-unidad').value=editar?p.unidad:'kg';
  document.getElementById('p-precio').value=editar?p.precio:'';
  document.getElementById('p-costo').value=editar?p.precio_costo:'';
  document.getElementById('p-margen').textContent='';
  // El desplegable de proveedores se llena ya con lo que tenemos guardado para
  // que el modal no abra vacío, y se refresca si el servidor devuelve otra cosa.
  const pintarProvs = provs => {
    const sel=document.getElementById('p-proveedor');
    if(!sel || !provs) return;
    sel.innerHTML='<option value="">Sin proveedor asignado</option>'+
      provs.map(pv=>`<option value="${esc(pv.nombre)}" ${editar&&p.proveedor===pv.nombre?'selected':''}>${esc(pv.nombre)}</option>`).join('');
  };
  pintarProvs(cacheLocal('getProveedores'));
  apiGetCached('getProveedores').then(pintarProvs).catch(()=>{});
  if(editar) mostrarMargen();
  document.getElementById('p-aviso-precio').style.display=editar?'block':'none';
  document.getElementById('modal-producto').classList.add('visible');
}

function mostrarMargen(){
  const precio=parseFloat(document.getElementById('p-precio').value)||0;
  const costo=parseFloat(document.getElementById('p-costo').value)||0;
  const el=document.getElementById('p-margen');
  if(precio>0&&costo>0){
    const m=((precio-costo)/precio*100).toFixed(1);
    el.textContent=`Margen: ${m}% · Ganás ${$$(precio-costo)} por ${document.getElementById('p-unidad').value}`;
    el.style.color=precio>costo?'var(--verde-c)':'var(--rojo)';
  }else el.textContent='';
}

async function guardarProducto(){
  const modo=document.getElementById('p-modo').value;
  const nombre=document.getElementById('p-nombre').value.trim();
  const unidad=document.getElementById('p-unidad').value;
  const precio=parseFloat(document.getElementById('p-precio').value);
  const costo=parseFloat(document.getElementById('p-costo').value)||0;
  const proveedor=document.getElementById('p-proveedor').value;
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  if(!(precio>0)){toast('El precio de venta debe ser mayor a 0','error');return;}
  toast('Guardando...','guardando');
  try{
    if(modo==='agregar'){
      await apiPost('agregarProducto',{nombre,unidad,precio,precio_costo:costo,proveedor});
    }else{
      if(_origNombre && _norm(nombre)!==_norm(_origNombre)){
        await apiPost('renombrarProducto',{nombre:_origNombre, nombre_nuevo:nombre});
      }
      await apiPost('editarProducto',{nombre,unidad,precio,precio_costo:costo,proveedor});
    }
    cerrarModal('modal-producto'); ocultarToast(); toast('✅ Producto guardado','exito');
    cargarProductos();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// CLIENTES
// ==========================================
async function cargarClientes(){
  const cont=document.getElementById('cont-clientes');
  const bq=document.getElementById('buscar-clientes'); if(bq) bq.value='';
  const previo=cacheLocal('getClientes');
  if(previo && previo.length){ clientesCache=previo; renderClientesLista(''); }
  else cont.innerHTML=skeleton();
  try{
    clientesCache=await apiGetCached('getClientes');
    // Respetar lo que ya haya escrito en el buscador mientras esperaba.
    renderClientesLista(bq ? bq.value : '');
  }catch(e){
    if(!(previo && previo.length)) cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';
  }
}
function filtrarClientes(q){ renderClientesLista(q); }
function renderClientesLista(q){
  const cont=document.getElementById('cont-clientes');
  if(!clientesCache.length){cont.innerHTML='<div class="vacio"><span class="ico">👤</span>No hay clientes todavía.</div>';return;}
  const term=(q||'').trim().toLowerCase();
  _clientesRender = term ? clientesCache.filter(c=>nombreCompleto(c).toLowerCase().includes(term)||String(c.celular||'').toLowerCase().includes(term)) : clientesCache;
  if(!_clientesRender.length){cont.innerHTML='<div class="vacio"><span class="ico">🔎</span>Sin resultados</div>';return;}
  cont.innerHTML=_clientesRender.map((c,i)=>`
      <div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${esc(nombreCompleto(c))}</div>
            <div class="item-det">${esc(c.celular||'Sin celular')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-s btn-sm" onclick="abrirCuentaContacto(nombreCompleto(_clientesRender[${i}]))">Ver cuenta</button>
            <button class="btn btn-s btn-sm" onclick="abrirModalCliente(_clientesRender[${i}])">Editar</button>
          </div>
        </div>
      </div>`).join('');
}

function abrirModalCliente(c){
  const editar=!!c;
  document.getElementById('titulo-modal-cli').textContent=editar?'Editar cliente':'Agregar cliente';
  document.getElementById('cli-modo').value=editar?'editar':'agregar';
  document.getElementById('cli-nombre').value=editar?c.nombre:'';
  document.getElementById('cli-nombre').readOnly=false;
  document.getElementById('cli-nombre').style.background='';
  document.getElementById('cli-apellido').value=editar?c.apellido:'';
  _origNombre=editar?(c.nombre||''):'';
  _origApellido=editar?(c.apellido||''):'';
  document.getElementById('cli-celular').value=editar?c.celular:'';
  document.getElementById('cli-eliminar-zona').style.display=editar?'block':'none';
  document.getElementById('modal-cliente').classList.add('visible');
}

async function confirmarEliminarCliente(){
  const nombre=_origNombre||document.getElementById('cli-nombre').value;
  if(!confirm(`¿Eliminar a ${nombre} del listado de clientes?\n\nSus ventas anteriores no se borran.`)) return;
  toast('Eliminando...','guardando');
  try{
    await apiPost('eliminarCliente',{nombre});
    cerrarModal('modal-cliente'); ocultarToast();
    toast('✅ Cliente eliminado','exito');
    cargarClientes();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

async function guardarCliente(){
  const modo=document.getElementById('cli-modo').value;
  const nombre=document.getElementById('cli-nombre').value.trim();
  const apellido=document.getElementById('cli-apellido').value.trim();
  const celular=document.getElementById('cli-celular').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  toast('Guardando...','guardando');
  try{
    if(modo==='agregar'){
      await apiPost('agregarCliente',{nombre,apellido,celular});
    }else{
      const fv=_norm([_origNombre,_origApellido].filter(Boolean).join(' '));
      const fn=_norm([nombre,apellido].filter(Boolean).join(' '));
      if(fv && fv!==fn){
        await apiPost('renombrarCliente',{nombre:_origNombre, apellido:_origApellido, nombre_nuevo:nombre, apellido_nuevo:apellido});
      }
      await apiPost('editarCliente',{nombre,apellido,celular});
    }
    cerrarModal('modal-cliente'); ocultarToast(); toast('✅ Cliente guardado','exito');
    cargarClientes();
    clientesCache=await apiGetCached('getClientes');
    _pintarDatalistClientes();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

function abrirQuickCliente(){
  document.getElementById('qcli-nombre').value='';
  document.getElementById('qcli-apellido').value='';
  document.getElementById('qcli-celular').value='';
  document.getElementById('modal-quick-cli').classList.add('visible');
}

async function guardarQuickCliente(){
  const nombre=document.getElementById('qcli-nombre').value.trim();
  const apellido=document.getElementById('qcli-apellido').value.trim();
  const celular=document.getElementById('qcli-celular').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  const completo=[nombre,apellido].filter(Boolean).join(' ');
  const yaExiste=(clientesCache||[]).some(c=>nombreCompleto(c).toLowerCase()===completo.toLowerCase());
  toast('Guardando...','guardando');
  try{
    if(!yaExiste){
      try{ await apiPost('agregarCliente',{nombre,apellido,celular}); }
      catch(err){ if(!/existe/i.test(err.message||'')) throw err; } // si ya existía en el backend, lo usamos igual
    }
    cerrarModal('modal-quick-cli'); ocultarToast(); toast('✅ '+completo+' listo','exito');
    document.getElementById('v-cliente').value=completo;
    clientesCache=await apiGetCached('getClientes');
    _pintarDatalistClientes();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}


// ==========================================
// FUSIONAR CUENTAS DUPLICADAS (clientes y proveedores)
// ==========================================
// El problema real: los nombres se escriben a mano en cada venta, así que la
// misma persona termina como "Zulma" y "Zulm", o "Lucas" y "Lucas tejeras", y
// cada una arrastra su propio saldo. Acá se elige UNA cuenta de referencia (la
// que queda) y se tildan las que se absorben: sus ventas, compras, pagos y
// devoluciones pasan a la de referencia y la ficha duplicada se borra.
let _fusTipo = 'cliente';
let _fusTodas = [];        // [{nombre, detalle, saldo}]
let _fusRef = '';
let _fusMarcadas = {};

function _fusNombre(x){ return _fusTipo === 'cliente' ? nombreCompleto(x) : x.nombre; }

// Distancia de edición, para poner arriba los nombres que se parecen al elegido.
function _dist(a, b){
  a = _norm(a); b = _norm(b);
  if(a === b) return 0;
  if(a.includes(b) || b.includes(a)) return 0.5;
  const m = a.length, n = b.length;
  if(!m || !n) return Math.max(m, n);
  let prev = Array.from({length: n + 1}, (_, j) => j);
  for(let i = 1; i <= m; i++){
    const cur = [i];
    for(let j = 1; j <= n; j++){
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

async function abrirFusion(tipo){
  _fusTipo = tipo;
  _fusRef = '';
  _fusMarcadas = {};
  document.getElementById('fus-titulo').textContent =
    tipo === 'cliente' ? 'Fusionar clientes duplicados' : 'Fusionar proveedores duplicados';
  document.getElementById('fus-buscar').value = '';
  document.getElementById('fus-lista').innerHTML = skeleton(2);
  document.getElementById('modal-fusion').classList.add('visible');
  try{
    const [lista, contactos] = await Promise.all([
      apiGetCached(tipo === 'cliente' ? 'getClientes' : 'getProveedores'),
      apiGetCached('getDeudaContactos').catch(() => [])
    ]);
    const saldos = {};
    (contactos || []).forEach(c => { saldos[_norm(c.contacto)] = c.neto; });
    _fusTodas = (lista || []).map(x => {
      const n = _fusNombre(x);
      return {nombre: n, detalle: x.celular || x.contacto || '', saldo: saldos[_norm(n)] || 0};
    }).filter(x => x.nombre);
    renderFusion();
  }catch(e){
    document.getElementById('fus-lista').innerHTML = '<div class="vacio">Error: ' + esc(e.message) + '</div>';
  }
}

function fusElegirRef(nombre){
  _fusRef = nombre;
  _fusMarcadas = {};
  renderFusion();
}

function fusToggle(nombre){
  _fusMarcadas[nombre] = !_fusMarcadas[nombre];
  renderFusion();
}

function filtrarFusion(){ renderFusion(); }

function renderFusion(){
  const cont = document.getElementById('fus-lista');
  const term = _norm(document.getElementById('fus-buscar').value);

  // Paso 1: todavía no se eligió la cuenta que queda.
  if(!_fusRef){
    document.getElementById('fus-paso').textContent = '1 de 2 · Elegí la cuenta que queda (la de referencia)';
    document.getElementById('fus-resumen').innerHTML = '';
    document.getElementById('btn-fus-confirmar').style.display = 'none';
    const lista = _fusTodas.filter(x => !term || _norm(x.nombre).includes(term));
    cont.innerHTML = lista.length ? lista.map(x => `
      <div onclick="fusElegirRef('${escJS(x.nombre)}')" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:2px solid var(--borde);border-radius:var(--radio);margin-bottom:6px;cursor:pointer">
        <div style="min-width:0">
          <div style="font-weight:600">${esc(x.nombre)}</div>
          <div style="font-size:12px;color:var(--gris)">${esc(x.detalle || 'Sin contacto')}</div>
        </div>
        <div style="font-size:12px;color:var(--gris);white-space:nowrap">${x.saldo ? $$(Math.abs(x.saldo)) : ''} →</div>
      </div>`).join('') : '<div class="vacio"><span class="ico">🔎</span>Sin resultados</div>';
    return;
  }

  // Paso 2: se tildan las que se absorben, ordenadas por parecido al nombre elegido.
  document.getElementById('fus-paso').textContent = '2 de 2 · Tildá las cuentas que son la misma persona';
  const candidatas = _fusTodas
    .filter(x => x.nombre !== _fusRef)
    .filter(x => !term || _norm(x.nombre).includes(term))
    .sort((a, b) => _dist(a.nombre, _fusRef) - _dist(b.nombre, _fusRef));

  cont.innerHTML =
    `<div style="background:var(--verde-s);border-left:4px solid var(--verde-c);border-radius:var(--radio);padding:10px 12px;margin-bottom:10px">
       <div style="font-size:11px;color:var(--gris);text-transform:uppercase;letter-spacing:.5px">Queda esta cuenta</div>
       <div style="font-weight:700;font-size:16px">${esc(_fusRef)}</div>
       <button class="btn btn-s btn-sm" onclick="fusElegirRef('')" style="margin-top:6px">Cambiar</button>
     </div>` +
    (candidatas.length ? candidatas.map(x => {
      const m = !!_fusMarcadas[x.nombre];
      const parecida = _dist(x.nombre, _fusRef) <= 2;
      return `<div onclick="fusToggle('${escJS(x.nombre)}')" style="display:flex;gap:10px;align-items:center;padding:10px;border:2px solid ${m ? 'var(--rojo)' : 'var(--borde)'};background:${m ? 'var(--rojo-s)' : 'var(--blanco)'};border-radius:var(--radio);margin-bottom:6px;cursor:pointer">
        <div style="font-size:20px">${m ? '☑️' : '⬜'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${esc(x.nombre)}${parecida ? ' <span style="font-size:11px;color:var(--amarillo);font-weight:700">se parece</span>' : ''}</div>
          <div style="font-size:12px;color:var(--gris)">${esc(x.detalle || 'Sin contacto')}${x.saldo ? ' · saldo ' + $$(Math.abs(x.saldo)) : ''}</div>
        </div>
      </div>`;
    }).join('') : '<div class="vacio"><span class="ico">🔎</span>Sin resultados</div>');

  const elegidas = Object.keys(_fusMarcadas).filter(k => _fusMarcadas[k]);
  document.getElementById('fus-resumen').innerHTML = elegidas.length
    ? `<div style="font-size:13px">Se van a mover todos los movimientos de <strong>${esc(elegidas.join(', '))}</strong> a <strong>${esc(_fusRef)}</strong>, y esas fichas se borran del listado.</div>`
    : '<div style="font-size:13px;color:var(--gris)">Todavía no tildaste ninguna.</div>';
  const btn = document.getElementById('btn-fus-confirmar');
  btn.style.display = 'block';
  btn.disabled = !elegidas.length;
  btn.style.opacity = elegidas.length ? 1 : .5;
  btn.textContent = elegidas.length ? `Fusionar ${elegidas.length} en "${_fusRef}"` : 'Fusionar';
}

async function confirmarFusion(){
  const absorbidos = Object.keys(_fusMarcadas).filter(k => _fusMarcadas[k]);
  if(!_fusRef || !absorbidos.length) return;
  if(!confirm('Se van a pasar todos los movimientos de:\n\n' + absorbidos.join('\n') +
              '\n\na la cuenta "' + _fusRef + '", y esas fichas se borran.\n\nEsto no se puede deshacer. ¿Seguir?')) return;
  toast('Fusionando...', 'guardando');
  try{
    const r = await apiPost('fusionarContactos', {tipo: _fusTipo, canonico: _fusRef, absorbidos});
    cerrarModal('modal-fusion');
    ocultarToast();
    toast('✅ ' + (r && r.celdas_reescritas != null ? r.celdas_reescritas + ' movimientos pasados a "' + _fusRef + '"' : 'Cuentas fusionadas'), 'exito');
    if(_fusTipo === 'cliente'){ cargarClientes(); clientesCache = await apiGetCached('getClientes'); _pintarDatalistClientes(); }
    else cargarProveedoresMgt();
  }catch(e){ ocultarToast(); toast('❌ ' + e.message, 'error'); }
}
