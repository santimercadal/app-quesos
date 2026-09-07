// ==========================================
// HISTORIAL DE MOVIMIENTOS (auditoría)
// ==========================================
const HIST_META={
  registrarPedido:{ico:'🛒',label:'Venta'},
  editarPedido:{ico:'✏️',label:'Venta editada'},
  eliminarPedido:{ico:'🗑️',label:'Venta eliminada'},
  registrarCompra:{ico:'📦',label:'Compra'},
  editarCompra:{ico:'✏️',label:'Compra editada'},
  eliminarCompra:{ico:'🗑️',label:'Compra eliminada'},
  registrarPagoCliente:{ico:'💰',label:'Cobro a cliente'},
  editarPagoCliente:{ico:'✏️',label:'Cobro editado'},
  eliminarPagoCliente:{ico:'🗑️',label:'Cobro eliminado'},
  registrarPagoProveedor:{ico:'📤',label:'Pago a proveedor'},
  editarPagoProveedor:{ico:'✏️',label:'Pago editado'},
  eliminarPagoProveedor:{ico:'🗑️',label:'Pago eliminado'},
  agregarCliente:{ico:'👤',label:'Cliente nuevo'},
  editarCliente:{ico:'✏️',label:'Cliente editado'},
  eliminarCliente:{ico:'🗑️',label:'Cliente eliminado'},
  renombrarCliente:{ico:'✏️',label:'Cliente renombrado'},
  agregarProveedor:{ico:'🏭',label:'Proveedor nuevo'},
  editarProveedor:{ico:'✏️',label:'Proveedor editado'},
  eliminarProveedor:{ico:'🗑️',label:'Proveedor eliminado'},
  renombrarProveedor:{ico:'✏️',label:'Proveedor renombrado'},
  agregarProducto:{ico:'🧀',label:'Producto nuevo'},
  editarProducto:{ico:'✏️',label:'Producto editado'},
  renombrarProducto:{ico:'✏️',label:'Producto renombrado'},
  registrarDevolucion:{ico:'↩️',label:'Devolución'},
  editarDevolucion:{ico:'✏️',label:'Devolución editada'},
  eliminarDevolucion:{ico:'🗑️',label:'Devolución eliminada'},
  resolverDevolucion:{ico:'✅',label:'Devolución resuelta'},
  guardarOperadores:{ico:'👥',label:'Operadores'},
  ajustarStock:{ico:'📦',label:'Ajuste de stock'}
};

let _histVista='actividad';   // actividad | ventas | compras
let _histPeriodo='semana';
// La lista COMPLETA del periodo. Antes no existia: renderHistVentas terminaba con
// `_histVR = pedidos`, o sea pisaba la lista entera con la ya filtrada, y borrar
// el texto del buscador no restauraba nada. Ahora `_histVFull` es la fuente y
// `_histVR` queda como la lista PINTADA, que es contra la que indexan los botones.
let _histVFull=[], _histCFull=[];

// Se parte SIEMPRE del "hoy" de Montevideo (hoy() ya lo resuelve) y se cuenta
// desde ahi. Antes se usaba new Date() crudo, o sea el huso del telefono: con el
// celular en otro huso los periodos salian corridos un dia.
function _histRango(periodo){
  const h=hoy();
  const base=new Date(h+'T12:00:00');
  const f=d=>new Intl.DateTimeFormat('en-CA').format(d);
  if(periodo==='hoy') return {desde:h, hasta:h};
  if(periodo==='ayer'){ const d=new Date(base); d.setDate(d.getDate()-1); return {desde:f(d), hasta:f(d)}; }
  if(periodo==='semana'){ const d=new Date(base); const dia=d.getDay()||7; d.setDate(d.getDate()-dia+1); return {desde:f(d), hasta:h}; }
  if(periodo==='mes') return {desde:h.slice(0,7)+'-01', hasta:h};
  return {desde:'2000-01-01', hasta:'2099-12-31'};
}

function cambiarVistaHistorial(v){
  _histVista=v;
  ['actividad','ventas','compras'].forEach(k=>{
    const btn=document.getElementById('hv-'+k);
    if(btn) btn.className='btn btn-sm '+(k===v?'btn-p':'btn-s');
  });
  cargarHistorial(_histPeriodo);
}

async function cargarHistorial(periodo, btn){
  periodo=periodo||_histPeriodo; _histPeriodo=periodo;
  if(btn){ document.querySelectorAll('#pantalla-historial .tab').forEach(t=>t.classList.remove('activo')); btn.classList.add('activo'); }
  const cont=document.getElementById('cont-historial');
  cont.innerHTML=skeleton();
  const {desde,hasta}=_histRango(periodo);
  try{
    if(_histVista==='ventas'){
      const r=await apiGetCached('getVentas',{desde,hasta});
      _histVFull=(r.pedidos||[]).slice().reverse(); // más reciente primero
    } else if(_histVista==='compras'){
      const r=await apiGetCached('getCompras',{desde,hasta});
      _histCFull=(r.compras||[]).slice().reverse();
    } else {
      const r=await apiGetCached('getAuditoria',{desde,hasta});
      _histAll=r.movimientos||[];
    }
    const bq=document.getElementById('buscar-historial'); if(bq) bq.value='';
    _renderHistorialVista('');
  }catch(e){ cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>'; }
}

function filtrarHistorial(q){ _renderHistorialVista(q); }

function _renderHistorialVista(q){
  const term=(q||'').trim().toLowerCase();
  if(_histVista==='ventas'){
    const lista=term?_histVFull.filter(p=>((p.cliente||'')+' '+(p.descripcion||'')+' '+(p.operador||'')+' '+(p.forma_pago||'')).toLowerCase().includes(term)):_histVFull;
    renderHistVentas(lista);
  } else if(_histVista==='compras'){
    const lista=term?_histCFull.filter(c=>((c.proveedor||'')+' '+(c.forma_pago||'')+' '+(c.items||[]).map(i=>i.producto_insumo).join(' ')).toLowerCase().includes(term)):_histCFull;
    renderHistCompras(lista);
  } else {
    const lista=term?_histAll.filter(m=>{
      const label=(HIST_META[m.accion]?HIST_META[m.accion].label:m.accion)||'';
      return ((m.detalle||'')+' '+(m.operador||'')+' '+label).toLowerCase().includes(term);
    }):_histAll;
    renderHistorial(lista);
  }
}

// Ventas pasadas con detalle completo (items, pagos) + ticket + edición
function renderHistVentas(pedidos){
  const cont=document.getElementById('cont-historial');
  _histVR=pedidos;
  if(!pedidos.length){ cont.innerHTML='<div class="vacio"><span class="ico">🛒</span>Sin ventas en este período</div>'; return; }
  const total=pedidos.reduce((s,p)=>s+Number(p.total),0);
  cont.innerHTML=
    `<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
      <span style="font-size:13px;color:var(--gris)">${pedidos.length} venta/s del período</span>
      <strong style="font-size:18px;color:var(--azul)">${$$(total)}</strong>
    </div>`+
    pedidos.map((p,idx)=>{
      const badge=p.forma_pago==='efectivo'?'badge-efectivo':p.forma_pago==='transferencia'?'badge-trans':'badge-credito';
      const deuda=Number(p.total)-Number(p.monto_pagado);
      const itemsHtml=(p.items||[]).map(it=>
        `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--gris);padding:1px 0">
          <span>· ${esc(it.producto)} (${Number(it.cantidad)})</span><span>${$$(it.subtotal)}</span>
        </div>`).join('');
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${esc(p.cliente||'(sin nombre)')} <span class="badge ${badge}">${esc(p.forma_pago||'')}</span></div>
            <div class="item-det" style="font-size:12px;color:var(--gris)">${fmtFecha(p.fecha)} · 👤 ${esc(p.operador||'—')}</div>
            ${itemsHtml}
            ${deuda>0?`<div class="item-det" style="font-size:12px"><span style="color:var(--rojo)">Deuda al emitir: ${$$(deuda)}</span> · <span onclick="abrirCuentaContacto(_histVR[${idx}].cliente)" style="color:var(--azul-c);text-decoration:underline;cursor:pointer">Ver cuenta actual</span></div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">✅ Pagado</div>'}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-s btn-sm" onclick="ticketVenta(_histVR[${idx}])">🎟️ Ticket</button>
              <button class="btn btn-s btn-sm" onclick="abrirEdicionPedido(_histVR[${idx}])">✏️ Editar</button>
            </div>
          </div>
          <div class="item-val">${$$(p.total)}</div>
        </div>
      </div>`;
    }).join('');
}

// Compras pasadas con detalle + ticket + edición
function renderHistCompras(compras){
  const cont=document.getElementById('cont-historial');
  _histCR=compras;
  if(!compras.length){ cont.innerHTML='<div class="vacio"><span class="ico">📦</span>Sin compras en este período</div>'; return; }
  const total=compras.reduce((s,c)=>s+Number(c.total),0);
  cont.innerHTML=
    `<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
      <span style="font-size:13px;color:var(--gris)">${compras.length} compra/s del período</span>
      <strong style="font-size:18px;color:var(--rojo)">${$$(total)}</strong>
    </div>`+
    compras.map((c,idx)=>{
      const badge=c.forma_pago==='efectivo'?'badge-efectivo':c.forma_pago==='transferencia'?'badge-trans':'badge-credito';
      const deuda=Number(c.total)-Number(c.monto_pagado);
      const itemsHtml=(c.items||[]).map(it=>
        `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--gris);padding:1px 0">
          <span>· ${esc(it.producto_insumo)} (${Number(it.cantidad)})</span><span>${$$(it.total)}</span>
        </div>`).join('');
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${esc(c.proveedor||'(sin proveedor)')} <span class="badge ${badge}">${esc(c.forma_pago||'')}</span></div>
            <div class="item-det" style="font-size:12px;color:var(--gris)">${fmtFecha(c.fecha)}</div>
            ${itemsHtml}
            ${deuda>0?`<div class="item-det" style="font-size:12px"><span style="color:var(--rojo)">Deuda al emitir: ${$$(deuda)}</span> · <span onclick="abrirCuentaContacto(_histCR[${idx}].proveedor)" style="color:var(--azul-c);text-decoration:underline;cursor:pointer">Ver cuenta actual</span></div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">✅ Pagado</div>'}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-s btn-sm" onclick="ticketCompra(_histCR[${idx}])">🎟️ Ticket</button>
              <button class="btn btn-s btn-sm" onclick="abrirEdicionCompraObj(_histCR[${idx}])">✏️ Editar</button>
            </div>
          </div>
          <div class="item-val" style="color:var(--rojo)">−${$$(c.total)}</div>
        </div>
      </div>`;
    }).join('');
}

function renderHistorial(movs){
  const cont=document.getElementById('cont-historial');
  if(!movs.length){ cont.innerHTML='<div class="vacio"><span class="ico">📜</span>Sin movimientos en este período</div>'; return; }
  cont.innerHTML=movs.map(m=>{
    const meta=HIST_META[m.accion]||{ico:'📝',label:m.accion};
    const ts=(m.timestamp||'').toString();
    const hora=ts.length>=16?ts.substring(11,16):'';
    const fch=fmtFecha((m.fecha||ts.substring(0,10)));
    return `<div class="item">
      <div class="item-head">
        <div style="font-size:20px;margin-right:10px;flex-shrink:0">${meta.ico}</div>
        <div style="flex:1;min-width:0">
          <div class="item-nombre">${esc(meta.label)}</div>
          <div class="item-det">${esc(m.detalle||'')}</div>
          <div class="item-det" style="font-size:11px;color:var(--gris)">👤 ${esc(m.operador||'—')} · ${fch}${hora?' '+hora:''}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ==========================================
// STOCK (Fase 4A)
// ==========================================
async function cargarStock(){
  const cont=document.getElementById('cont-stock');
  cont.innerHTML=skeleton();
  try{
    const lista=await apiGetCached('getStock');
    _stockList=lista;
    if(!lista.length){ cont.innerHTML='<div class="vacio"><span class="ico">🧀</span>No hay productos. Agregá productos primero.</div>'; document.getElementById('stock-resumen').innerHTML=''; return; }
    const valorTotal=lista.reduce((s,p)=>s+(Number(p.stock)||0)*(Number(p.precio_costo)||0),0);
    document.getElementById('stock-resumen').innerHTML=
      `<div class="card" style="background:var(--azul-s);border-left:4px solid var(--azul-c)">
        <div class="card-titulo">Valor del stock (a costo)</div>
        <div class="card-valor" style="color:var(--azul)">${$$(valorTotal)}</div>
      </div>`;
    cont.innerHTML=lista.map((p,i)=>{
      const stock=Number(p.stock)||0;
      const bajo=stock<=0;
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${esc(p.nombre)}</div>
            <div class="item-det">Costo: ${$$(p.precio_costo)} · ${esc(p.unidad)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="item-val" style="color:${bajo?'var(--rojo)':'var(--verde-c)'}">${stock.toLocaleString('es-AR')} ${esc(p.unidad)}</div>
            <button class="btn btn-s btn-sm" onclick="abrirAjusteStock(${i})">Ajustar</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }catch(e){ cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>'; }
}

function abrirAjusteStock(i){
  const p=_stockList[i]; if(!p) return;
  document.getElementById('aj-titulo').textContent='Ajustar: '+p.nombre;
  document.getElementById('aj-producto').value=p.nombre;
  document.getElementById('aj-modo').value='set';
  document.getElementById('aj-cantidad').value=Number(p.stock)||0;
  document.getElementById('aj-motivo').value='';
  ajCambioModo();
  abrirModal('modal-ajuste-stock');
}
function ajCambioModo(){
  const modo=document.getElementById('aj-modo').value;
  document.getElementById('aj-cant-label').textContent= modo==='set'?'Stock contado (cantidad real)':'Cantidad a sumar (negativo para restar)';
  document.getElementById('aj-hint').textContent= modo==='set'?'Reemplaza el stock por este número (ideal para recuento/inventario).':'Suma al stock actual. Ej: -3 para descontar una merma.';
}
async function guardarAjusteStock(){
  const producto=document.getElementById('aj-producto').value;
  const modo=document.getElementById('aj-modo').value;
  const cantidad=parseFloat(document.getElementById('aj-cantidad').value);
  const motivo=document.getElementById('aj-motivo').value.trim();
  if(isNaN(cantidad)){ toast('Ingresá una cantidad','error'); return; }
  toast('Guardando...','guardando');
  try{
    await apiPost('ajustarStock',{producto,modo,cantidad,motivo});
    cerrarModal('modal-ajuste-stock'); ocultarToast(); toast('✅ Stock actualizado','exito');
    cargarStock();
  }catch(e){ ocultarToast(); toast('❌ '+e.message,'error'); }
}

// ==========================================
// DARK MODE
// ==========================================
function toggleModo(){
  const dark=document.body.classList.toggle('dark');
  document.getElementById('btn-modo').textContent=dark?'☀️':'🌙';
  localStorage.setItem('quesos-dark',dark?'1':'0');
  aplicarColorBarra();
}

