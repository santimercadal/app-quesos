// ==========================================
// MODALES
// ==========================================
function cerrarModal(id){document.getElementById(id).classList.remove('visible');}
document.querySelectorAll('.modal-fondo').forEach(f=>{
  f.addEventListener('click',e=>{if(e.target===f) f.classList.remove('visible');});
});

// ==========================================
// GESTIÓN PROVEEDORES
// ==========================================
async function cargarProveedoresMgt(){
  const cont=document.getElementById('cont-proveedores-mgt');
  cont.innerHTML=skeleton();
  try{
    const lista=await apiGetCached('getProveedores');
    proveedoresCache=lista;
    if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🏭</span>No hay proveedores todavía.</div>';return;}
    cont.innerHTML=lista.map((p,i)=>`
      <div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${p.nombre}</div>
            <div class="item-det">${p.contacto||'Sin contacto'}</div>
          </div>
          <button class="btn btn-s btn-sm" onclick="abrirModalProveedor(proveedoresCache[${i}])">Editar</button>
        </div>
      </div>`).join('');
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}

function abrirModalProveedor(p){
  const editar=p!==null;
  document.getElementById('titulo-modal-prov').textContent=editar?'Editar proveedor':'Agregar proveedor';
  document.getElementById('prov-modo').value=editar?'editar':'agregar';
  document.getElementById('prov-nombre').value=editar?p.nombre:'';
  document.getElementById('prov-nombre').readOnly=false;
  document.getElementById('prov-nombre').style.background='';
  document.getElementById('prov-contacto').value=editar?p.contacto:'';
  document.getElementById('prov-eliminar-zona').style.display=editar?'block':'none';
  _origNombre=editar?(p.nombre||''):'';
  document.getElementById('modal-proveedor').classList.add('visible');
}

async function guardarProveedor(){
  const modo=document.getElementById('prov-modo').value;
  const nombre=document.getElementById('prov-nombre').value.trim();
  const contacto=document.getElementById('prov-contacto').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  toast('Guardando...','guardando');
  try{
    if(modo==='agregar'){
      await apiPost('agregarProveedor',{nombre,contacto});
    }else{
      if(_origNombre && _norm(nombre)!==_norm(_origNombre)){
        await apiPost('renombrarProveedor',{nombre:_origNombre, nombre_nuevo:nombre});
      }
      await apiPost('editarProveedor',{nombre,contacto});
    }
    cerrarModal('modal-proveedor'); ocultarToast(); toast('✅ Proveedor guardado','exito');
    cargarProveedoresMgt();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// DEVOLUCIONES
// ==========================================
let _devolucionesCache = null;

async function abrirModalDevolucion(refId='', tipo='proveedor'){
  document.getElementById('dev-edit-id').value = '';
  document.getElementById('dev-modal-titulo').textContent = 'Registrar devolución';
  document.getElementById('dev-tipo').value = tipo;
  document.getElementById('dev-referencia').value = refId;
  document.getElementById('dev-fecha').value = hoy();
  document.getElementById('dev-resolucion').value = 'pendiente';
  document.getElementById('dev-motivo-sel').selectedIndex = 0;
  document.getElementById('dev-motivo-custom').style.display = 'none';
  document.getElementById('dev-cantidad').value = '';
  document.getElementById('dev-monto').value = '';
  try {
    const [prods, clis, provs] = await Promise.all([
      apiGetCached('getProductos'),
      apiGetCached('getClientes'),
      apiGetCached('getProveedores')
    ]);
    const selProd = document.getElementById('dev-producto');
    selProd.innerHTML = prods.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    actualizarModalDev(clis, provs);
  } catch(e) {}
  document.getElementById('modal-devolucion').classList.add('visible');
}

function actualizarModalDev(clis, provs){
  const tipo = document.getElementById('dev-tipo').value;
  const label = document.getElementById('dev-contraparte-label');
  const sel = document.getElementById('dev-contraparte');
  if(tipo === 'proveedor'){
    label.textContent = 'Proveedor';
    if(provs) sel.innerHTML = provs.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
  } else {
    label.textContent = 'Cliente';
    if(clis) sel.innerHTML = clis.map(c => `<option value="${nombreCompleto(c)}">${nombreCompleto(c)}</option>`).join('');
  }
}

function toggleMotivoCustom(){
  const sel = document.getElementById('dev-motivo-sel');
  document.getElementById('dev-motivo-custom').style.display = sel.value === 'otro' ? 'block' : 'none';
}

async function guardarDevolucion(){
  const tipo        = document.getElementById('dev-tipo').value;
  const contraparte = document.getElementById('dev-contraparte').value;
  const referencia  = document.getElementById('dev-referencia').value.trim();
  const producto    = document.getElementById('dev-producto').value;
  const cantidad    = parseFloat(document.getElementById('dev-cantidad').value);
  const monto       = parseFloat(document.getElementById('dev-monto').value);
  const motivoSel   = document.getElementById('dev-motivo-sel').value;
  const motivoCust  = document.getElementById('dev-motivo-custom').value.trim();
  const motivo      = motivoSel === 'otro' ? motivoCust : motivoSel;
  const resolucion  = document.getElementById('dev-resolucion').value;
  const fecha       = document.getElementById('dev-fecha').value || hoy();

  if(!contraparte){ toast('Seleccioná un '+(tipo==='proveedor'?'proveedor':'cliente'),'error'); return; }
  if(!producto){ toast('Seleccioná el producto', 'error'); return; }
  if(!(cantidad > 0)){ toast('Ingresá la cantidad', 'error'); return; }
  if(!(monto > 0)){ toast('Ingresá el monto', 'error'); return; }
  if(!motivo){ toast('Describí el motivo', 'error'); return; }

  const editId=document.getElementById('dev-edit-id').value;
  toast('Guardando...','guardando');
  try {
    if(editId){
      await apiPost('editarDevolucion', { id:editId, contraparte, referencia_id: referencia, producto, cantidad, monto, motivo, resolucion, fecha });
    } else {
      await apiPost('registrarDevolucion', { tipo, contraparte, referencia_id: referencia, producto, cantidad, monto, motivo, resolucion, fecha, operador: operadorActual });
    }
    cerrarModal('modal-devolucion');
    ocultarToast();
    toast(editId?'✅ Devolución actualizada':'↩️ Devolución registrada', 'exito');
    _devolucionesCache = null;
    invalidarCacheDeudas();
    if(document.getElementById('pantalla-devoluciones').classList.contains('activa')){
      cargarDevoluciones('todos');
    }
  } catch(e){ ocultarToast(); toast('❌ '+e.message,'error'); }
}

async function resolverDevolucion(id, resolucion){
  try {
    await apiPost('resolverDevolucion', { id, resolucion });
    toast('✅ Estado actualizado','exito');
    _devolucionesCache = null;
    cargarDevoluciones(_filtroDevActual || 'todos');
  } catch(e){ toast('❌ '+e.message,'error'); }
}

let _filtroDevActual = 'todos';
let _todasDevoluciones = [];

async function cargarDevoluciones(filtro){
  _filtroDevActual = filtro;
  const lista = document.getElementById('lista-devoluciones');
  lista.innerHTML=skeleton();
  try {
    const r = await apiGet('getDevoluciones', { desde:'2000-01-01', hasta:'2099-12-31' });
    _todasDevoluciones = r.devoluciones || [];
    filtrarDevoluciones(filtro);
  } catch(e){ lista.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>'; }
}

function filtrarDevoluciones(filtro){
  _filtroDevActual = filtro;
  ['todos','proveedor','cliente'].forEach(f => {
    const btn = document.getElementById('fdev-'+f);
    if(btn) btn.className = 'btn '+(f===filtro?'btn-p':'btn-s');
  });

  const devs = filtro === 'todos' ? _todasDevoluciones
               : _todasDevoluciones.filter(d => d.tipo === filtro);
  _devsRender = devs;

  const lista = document.getElementById('lista-devoluciones');
  const resumen = document.getElementById('resumen-devoluciones');

  const pendientes = devs.filter(d => d.resolucion === 'pendiente');
  const resueltas  = devs.filter(d => d.resolucion !== 'pendiente');
  const totalPend  = pendientes.reduce((s,d) => s+Number(d.monto), 0);
  const totalRes   = resueltas.reduce((s,d) => s+Number(d.monto), 0);

  resumen.innerHTML = devs.length === 0 ? '' :
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
       <div class="card" style="margin:0;padding:10px">
         <div class="card-titulo" style="font-size:11px">⏳ Pendiente</div>
         <div style="font-weight:700;font-size:18px;color:var(--rojo)">${$$(totalPend)}</div>
         <div style="font-size:11px;color:var(--gris)">${pendientes.length} devolución/es</div>
       </div>
       <div class="card" style="margin:0;padding:10px">
         <div class="card-titulo" style="font-size:11px">✅ Resuelto</div>
         <div style="font-weight:700;font-size:18px;color:var(--verde-c)">${$$(totalRes)}</div>
         <div style="font-size:11px;color:var(--gris)">${resueltas.length} devolución/es</div>
       </div>
     </div>`;

  if(!devs.length){
    lista.innerHTML='<div class="vacio"><span class="ico">↩️</span>Sin devoluciones registradas</div>';
    return;
  }

  const iconTipo = { proveedor:'🏭', cliente:'👤' };
  const labelRes = { pendiente:'⏳ Pendiente', acreditado:'✅ Acreditado', devuelto_dinero:'💰 Dinero devuelto' };
  const colorRes = { pendiente:'var(--rojo)', acreditado:'var(--verde-c)', devuelto_dinero:'var(--verde-c)' };

  lista.innerHTML = devs.map((d,i) => `
    <div class="item">
      <div class="item-head">
        <div style="font-size:22px;margin-right:10px;flex-shrink:0">${iconTipo[d.tipo]||'↩️'}</div>
        <div style="flex:1;min-width:0">
          <div class="item-nombre">${escH(d.contraparte)}</div>
          <div class="item-det">${escH(d.producto)} · ${d.cantidad} · ${fmtFecha(d.fecha)}</div>
          <div class="item-det" style="color:var(--gris)">${escH(d.motivo)}</div>
          ${d.referencia_id?`<div class="item-det" style="font-size:11px;color:var(--gris)">Ref: ${escH(d.referencia_id)}</div>`:''}
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
            <span style="font-size:12px;color:${colorRes[d.resolucion]||'var(--gris)'};font-weight:600">${labelRes[d.resolucion]||d.resolucion}</span>
            ${d.resolucion==='pendiente'?`
              <button class="btn btn-s btn-sm" onclick="resolverDevolucion('${escH(d.id)}','acreditado')">Acreditado</button>
              <button class="btn btn-s btn-sm" onclick="resolverDevolucion('${escH(d.id)}','devuelto_dinero')">Devolvieron $$</button>
            `:''}
            <button class="btn btn-s btn-sm" onclick="abrirEditarDevolucion(${i})">✏️ Editar</button>
            <button class="btn btn-s btn-sm" onclick="borrarDevolucion('${escH(d.id)}')">🗑️</button>
          </div>
        </div>
        <div class="item-val" style="color:var(--rojo);flex-shrink:0">${$$(d.monto)}</div>
      </div>
    </div>`).join('');
}

// ==========================================
// CORRECCIONES (editar / borrar)
// ==========================================
async function abrirEdicionCompra(i){
  const c=_histCompras[i]; if(!c) return;
  document.getElementById('ec-id').value=c.id;
  document.getElementById('ec-producto').value=c.producto_insumo||'';
  document.getElementById('ec-cantidad').value=c.cantidad;
  document.getElementById('ec-total').value=c.total;
  document.getElementById('ec-pago').value=c.forma_pago||'efectivo';
  document.getElementById('ec-pagado').value=c.monto_pagado;
  document.getElementById('ec-fecha').value=c.fecha;
  try{
    const provs=await apiGetCached('getProveedores');
    document.getElementById('ec-proveedor').innerHTML='<option value="">Sin proveedor</option>'+
      provs.map(p=>`<option value="${escH(p.nombre)}" ${c.proveedor===p.nombre?'selected':''}>${p.nombre}</option>`).join('');
  }catch(e){}
  document.getElementById('modal-editar-compra').classList.add('visible');
}
async function guardarEdicionCompra(){
  const id=document.getElementById('ec-id').value;
  const proveedor=document.getElementById('ec-proveedor').value;
  const producto_insumo=document.getElementById('ec-producto').value.trim();
  const cantidad=parseFloat(document.getElementById('ec-cantidad').value);
  const total=parseFloat(document.getElementById('ec-total').value);
  const forma_pago=document.getElementById('ec-pago').value;
  const monto_pagado=parseFloat(document.getElementById('ec-pagado').value)||0;
  const fecha=document.getElementById('ec-fecha').value||hoy();
  if(!proveedor){toast('Ingresá el proveedor','error');return;}
  if(!producto_insumo){toast('Ingresá el producto','error');return;}
  if(!(cantidad>0)){toast('Ingresá la cantidad','error');return;}
  if(!(total>0)){toast('Ingresá el total','error');return;}
  if(monto_pagado>total){toast('Monto pagado no puede superar el total','error');return;}
  const costo_unitario=cantidad>0?total/cantidad:0;
  toast('Guardando...','guardando');
  try{
    await apiPost('editarCompra',{id,proveedor,producto_insumo,cantidad,total,costo_unitario,forma_pago,monto_pagado,fecha});
    cerrarModal('modal-editar-compra'); ocultarToast(); toast('✅ Compra actualizada','exito');
    cargarHistorialCompras();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}
async function eliminarCompraActual(){
  const id=document.getElementById('ec-id').value;
  if(!confirm('¿Eliminar esta compra?\n\nNo se puede deshacer.')) return;
  toast('Eliminando...','guardando');
  try{
    await apiPost('eliminarCompra',{id});
    cerrarModal('modal-editar-compra'); ocultarToast(); toast('✅ Compra eliminada','exito');
    cargarHistorialCompras();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

async function eliminarPedidoActual(){
  const pedido_id=document.getElementById('edit-pedido-id').value;
  if(!confirm('¿Eliminar este pedido completo?\n\nSe borra la venta y sus productos. No se puede deshacer.')) return;
  toast('Eliminando...','guardando');
  try{
    await apiPost('eliminarPedido',{pedido_id});
    cerrarModal('modal-editar-pedido'); ocultarToast(); toast('✅ Pedido eliminado','exito');
    cargarInicio();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

async function abrirEditarDevolucion(i){
  const d=_devsRender[i]; if(!d) return;
  document.getElementById('dev-edit-id').value=d.id;
  document.getElementById('dev-modal-titulo').textContent='Editar devolución';
  document.getElementById('dev-tipo').value=d.tipo;
  document.getElementById('dev-referencia').value=d.referencia_id||'';
  document.getElementById('dev-fecha').value=d.fecha;
  document.getElementById('dev-resolucion').value=d.resolucion||'pendiente';
  document.getElementById('dev-cantidad').value=d.cantidad;
  document.getElementById('dev-monto').value=d.monto;
  const sel=document.getElementById('dev-motivo-sel'); let found=false;
  for(let k=0;k<sel.options.length;k++){ if(sel.options[k].value===d.motivo){ sel.selectedIndex=k; found=true; break; } }
  if(found){ document.getElementById('dev-motivo-custom').style.display='none'; }
  else { sel.value='otro'; document.getElementById('dev-motivo-custom').style.display='block'; document.getElementById('dev-motivo-custom').value=d.motivo||''; }
  try{
    const [prods, clis, provs]=await Promise.all([apiGetCached('getProductos'),apiGetCached('getClientes'),apiGetCached('getProveedores')]);
    document.getElementById('dev-producto').innerHTML=prods.map(p=>`<option value="${p.nombre}" ${p.nombre===d.producto?'selected':''}>${p.nombre}</option>`).join('');
    actualizarModalDev(clis, provs);
    document.getElementById('dev-contraparte').value=d.contraparte;
  }catch(e){}
  document.getElementById('modal-devolucion').classList.add('visible');
}
async function borrarDevolucion(id){
  if(!confirm('¿Eliminar esta devolución?\n\nNo se puede deshacer.')) return;
  toast('Eliminando...','guardando');
  try{
    await apiPost('eliminarDevolucion',{id});
    ocultarToast(); toast('✅ Devolución eliminada','exito');
    _devolucionesCache=null; invalidarCacheDeudas();
    cargarDevoluciones(_filtroDevActual||'todos');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

function editarPagoMov(i){
  const m=_cuentaMovs[i]; if(!m) return;
  document.getElementById('ep-id').value=m.id;
  document.getElementById('ep-tipo').value=m.tipo;
  document.getElementById('ep-monto').value=Math.round(Math.abs(m.delta));
  document.getElementById('ep-fecha').value=m.fecha;
  document.getElementById('ep-titulo').textContent=m.tipo==='pago_cli'?'Editar pago del cliente':'Editar pago al proveedor';
  document.getElementById('modal-editar-pago').classList.add('visible');
}
async function guardarEdicionPago(){
  const id=document.getElementById('ep-id').value;
  const tipo=document.getElementById('ep-tipo').value;
  const monto=parseFloat(document.getElementById('ep-monto').value);
  const fecha=document.getElementById('ep-fecha').value||hoy();
  if(!(monto>0)){toast('Ingresá un monto válido','error');return;}
  const accion=tipo==='pago_cli'?'editarPagoCliente':'editarPagoProveedor';
  toast('Guardando...','guardando');
  try{
    await apiPost(accion,{id,monto,fecha});
    cerrarModal('modal-editar-pago'); ocultarToast(); toast('✅ Pago actualizado','exito');
    if(_cuentaNombre) abrirCuentaContacto(_cuentaNombre);
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}
async function eliminarPagoActual(){
  const id=document.getElementById('ep-id').value;
  const tipo=document.getElementById('ep-tipo').value;
  if(!confirm('¿Eliminar este pago?\n\nNo se puede deshacer.')) return;
  const accion=tipo==='pago_cli'?'eliminarPagoCliente':'eliminarPagoProveedor';
  toast('Eliminando...','guardando');
  try{
    await apiPost(accion,{id});
    cerrarModal('modal-editar-pago'); ocultarToast(); toast('✅ Pago eliminado','exito');
    if(_cuentaNombre) abrirCuentaContacto(_cuentaNombre);
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}
function borrarPagoMov(i){
  const m=_cuentaMovs[i]; if(!m) return;
  document.getElementById('ep-id').value=m.id;
  document.getElementById('ep-tipo').value=m.tipo;
  eliminarPagoActual();
}

async function confirmarEliminarProveedor(){
  const nombre=_origNombre||document.getElementById('prov-nombre').value;
  if(!confirm('¿Eliminar a '+nombre+' del listado de proveedores?\n\nSus compras anteriores no se borran.')) return;
  toast('Eliminando...','guardando');
  try{
    await apiPost('eliminarProveedor',{nombre});
    cerrarModal('modal-proveedor'); ocultarToast(); toast('✅ Proveedor eliminado','exito');
    cargarProveedoresMgt();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

