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

function _histRango(periodo){
  let desde='2000-01-01', hasta='2099-12-31';
  const h=hoy();
  if(periodo==='hoy'){ desde=h; hasta=h; }
  else if(periodo==='semana'){ const d=new Date(); const dia=d.getDay()||7; d.setDate(d.getDate()-dia+1); desde=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(d); hasta=h; }
  else if(periodo==='mes'){ const d=new Date(); desde=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; hasta=h; }
  return {desde,hasta};
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
      const r=await apiGet('getVentas',{desde,hasta});
      _histVR=(r.pedidos||[]).slice().reverse(); // más reciente primero
    } else if(_histVista==='compras'){
      const r=await apiGet('getCompras',{desde,hasta});
      _histCR=(r.compras||[]).slice().reverse();
    } else {
      const r=await apiGet('getAuditoria',{desde,hasta});
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
    const lista=term?_histVR.filter(p=>((p.cliente||'')+' '+(p.descripcion||'')+' '+(p.operador||'')+' '+(p.forma_pago||'')).toLowerCase().includes(term)):_histVR;
    renderHistVentas(lista);
  } else if(_histVista==='compras'){
    const lista=term?_histCR.filter(c=>((c.proveedor||'')+' '+(c.forma_pago||'')+' '+(c.items||[]).map(i=>i.producto_insumo).join(' ')).toLowerCase().includes(term)):_histCR;
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
          <span>· ${escH(it.producto)} (${Number(it.cantidad)})</span><span>${$$(it.subtotal)}</span>
        </div>`).join('');
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${escH(p.cliente||'(sin nombre)')} <span class="badge ${badge}">${p.forma_pago||''}</span></div>
            <div class="item-det" style="font-size:12px;color:var(--gris)">${fmtFecha(p.fecha)} · 👤 ${p.operador||'—'}</div>
            ${itemsHtml}
            ${deuda>0?`<div class="item-det" style="color:var(--rojo);font-size:12px">Pendiente: ${$$(deuda)}</div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">✅ Pagado</div>'}
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
          <span>· ${escH(it.producto_insumo)} (${Number(it.cantidad)})</span><span>${$$(it.total)}</span>
        </div>`).join('');
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${escH(c.proveedor||'(sin proveedor)')} <span class="badge ${badge}">${c.forma_pago||''}</span></div>
            <div class="item-det" style="font-size:12px;color:var(--gris)">${fmtFecha(c.fecha)}</div>
            ${itemsHtml}
            ${deuda>0?`<div class="item-det" style="color:var(--rojo);font-size:12px">Pendiente: ${$$(deuda)}</div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">✅ Pagado</div>'}
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
          <div class="item-nombre">${meta.label}</div>
          <div class="item-det">${m.detalle||''}</div>
          <div class="item-det" style="font-size:11px;color:var(--gris)">👤 ${m.operador||'—'} · ${fch}${hora?' '+hora:''}</div>
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
    const lista=await apiGet('getStock');
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
            <div class="item-nombre">${p.nombre}</div>
            <div class="item-det">Costo: ${$$(p.precio_costo)} · ${p.unidad}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="item-val" style="color:${bajo?'var(--rojo)':'var(--verde-c)'}">${stock.toLocaleString('es-AR')} ${p.unidad}</div>
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
  document.getElementById('modal-ajuste-stock').classList.add('visible');
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
}

