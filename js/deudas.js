// ==========================================
// DEUDAS UNIFICADAS (tabs clientes / proveedores)
// ==========================================
// getDeudaContactos es de las consultas más caras (~4 s). Mostramos los saldos
// que ya conocíamos y los corregimos cuando llega la respuesta; después de
// registrar un cobro o un pago el caché queda vencido y ahí sí espera.
function _pintarDeudas(contactos){
  contactos = contactos || [];
  renderTeDeben(contactos.filter(c=>c.neto>0.01));
  renderLeDebes(contactos.filter(c=>c.neto<-0.01));
}

async function cargarDeudas(tab){
  cambiarTabDeuda(tab);
  const previo=cacheLocal('getDeudaContactos');
  if(previo) _pintarDeudas(previo);
  else{
    document.getElementById('cont-clientes-deuda').innerHTML=skeleton();
    document.getElementById('cont-proveedores').innerHTML=skeleton();
  }
  try{
    _pintarDeudas(await apiGetCached('getDeudaContactos'));
  }catch(e){
    if(!previo) _pintarDeudas([]);
  }
}

function cambiarTabDeuda(tab){
  const esCli=tab==='clientes';
  document.getElementById('cont-clientes-deuda').style.display=esCli?'block':'none';
  document.getElementById('cont-proveedores').style.display=esCli?'none':'block';
  document.getElementById('tab-clientes').className='btn '+(esCli?'btn-p':'btn-s');
  document.getElementById('tab-proveedores').className='btn '+(esCli?'btn-s':'btn-p');
}

function renderTeDeben(lista){
  _contTeDeben=lista;
  const cont=document.getElementById('cont-clientes-deuda');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>Nadie te debe nada</div>';return;}
  const total=lista.reduce((s,d)=>s+d.neto,0);
  cont.innerHTML=
    `<div class="card" style="background:var(--azul-s);border-left:4px solid var(--azul-c);margin-bottom:16px">
       <div class="card-titulo">Total por cobrar</div>
       <div class="card-valor" style="color:var(--azul)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirCuentaContacto(_contTeDeben[${i}].contacto)">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${esc(d.contacto)}</div>
          <div class="item-det">${d.total_compras>0?'🔁 También le comprás · ':''}Ventas: ${$$(d.total_ventas)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(d.neto)}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

function renderLeDebes(lista){
  _contLeDebes=lista;
  const cont=document.getElementById('cont-proveedores');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>No le debés nada a nadie</div>';return;}
  const total=lista.reduce((s,d)=>s+Math.abs(d.neto),0);
  cont.innerHTML=
    `<div class="card" style="background:var(--rojo-s);margin-bottom:16px">
       <div class="card-titulo">Total por pagar</div>
       <div class="card-valor" style="color:var(--rojo)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirCuentaContacto(_contLeDebes[${i}].contacto)">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${esc(d.contacto)}</div>
          <div class="item-det">${d.total_ventas>0?'🔁 También te compra · ':''}Compras: ${$$(d.total_compras)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(Math.abs(d.neto))}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

// Período del ticket de estado de cuenta (mes / 30d / todo)
function setCuentaRango(r){
  _cuentaRango=r;
  document.querySelectorAll('#cuenta-rango button').forEach(b=>{
    b.className='btn btn-sm '+(b.dataset.r===r?'btn-p':'btn-s');
  });
}

// Los botones de ticket arrancan DESHABILITADOS y se prenden recién cuando llega
// el historial. Antes se podía tocar "Ticket de estado de cuenta" durante el
// medio segundo del esqueleto, con _cuentaMovs vacío y _cuentaSaldo en 0, y salía
// un comprobante prolijo diciendo "✅ Al día" a alguien que te debía $10.000.
let _cuentaListo = false;

function _botonesCuenta(hayVentas, hayCompras){
  const set = (id, mostrar) => {
    const b = document.getElementById(id);
    if(!b) return;
    b.style.display = mostrar ? 'block' : 'none';
    b.disabled = !_cuentaListo;
    b.style.opacity = _cuentaListo ? 1 : .5;
  };
  set('btn-ticket-cuenta', true);
  set('btn-boleta-ventas', !!hayVentas);
  set('btn-registro-compras', !!hayCompras);
}

async function abrirCuentaContacto(nombre){
  document.getElementById('cuenta-titulo').textContent='Cuenta: '+nombre;
  document.getElementById('cuenta-nombre').value=nombre;
  _cuentaNombre=nombre;
  _cuentaMovs=[]; _cuentaSaldo=0; _cuentaListo=false;
  setCuentaRango(_cuentaRango||'30d');
  _botonesCuenta(false, false);
  document.getElementById('cuenta-tabla').innerHTML=skeleton(2);
  document.getElementById('modal-contacto').classList.add('visible');
  try{
    const h=await apiGet('getHistorialContacto',{contacto:nombre});
    if(_cuentaNombre!==nombre) return;   // el usuario ya abrió otra cuenta
    _cuentaSaldo=h.saldo_total;
    _cuentaListo=true;
    renderCuentaContacto(h);
  }catch(e){document.getElementById('cuenta-tabla').innerHTML='<div class="vacio">Error: '+esc(e.message)+'</div>';}
}

function renderCuentaContacto(h){
  _cuentaMovs=h.movimientos; _cuentaNombre=h.contacto;
  _botonesCuenta(h.movimientos.some(m=>m.tipo==='venta'), h.movimientos.some(m=>m.tipo==='compra'));
  const rows=h.movimientos.map((m,i)=>{
    const pos=m.delta>=0;
    const colorMonto=pos?'var(--rojo)':'var(--verde-c)';
    const colorSaldo=m.saldo>0.01?'var(--rojo)':(m.saldo<-0.01?'var(--azul)':'var(--gris)');
    return `<div class="ledger-row">
      <div style="flex:1">
        <div style="font-weight:500">${fmtFecha(m.fecha)}</div>
        <div style="font-size:12px;color:var(--gris)">${esc(m.descripcion)}</div>
        ${(m.tipo==='pago_cli'||m.tipo==='pago_prov')?`<div style="margin-top:4px;display:flex;gap:6px"><button class="btn btn-s btn-sm" onclick="editarPagoMov(${i})">✏️</button><button class="btn btn-s btn-sm" onclick="borrarPagoMov(${i})">🗑️</button></div>`:''}
      </div>
      <div style="text-align:right;color:${colorMonto};font-weight:600;white-space:nowrap">${pos?'+':'−'}${$$(Math.abs(m.delta))}</div>
      <div class="ledger-saldo" style="width:84px;text-align:right;color:${colorSaldo}">${$$(Math.abs(m.saldo))}</div>
    </div>`;
  }).join('');
  const header=`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris);font-weight:600;padding:0 0 8px;text-transform:uppercase;letter-spacing:.4px"><span>Movimiento</span><span style="width:84px;text-align:right">Saldo</span></div>`;
  document.getElementById('cuenta-tabla').innerHTML=h.movimientos.length?header+rows:'<div class="vacio"><span class="ico">📋</span>Sin movimientos</div>';

  const saldo=h.saldo_total;
  const box=document.getElementById('cuenta-saldo-box');
  const lbl=document.getElementById('cuenta-saldo-label');
  const val=document.getElementById('cuenta-saldo');
  const btnT=document.getElementById('btn-cuenta-total');
  const btnP=document.getElementById('btn-cuenta-parcial');
  if(saldo>0.01){
    box.style.background='var(--rojo-s)'; lbl.textContent='Te debe'; lbl.style.color='var(--rojo)';
    val.textContent=$$(saldo); val.style.color='var(--rojo)';
    btnT.style.display='block'; btnT.textContent='Registrar cobro total ('+$$(saldo)+')';
    btnP.style.display='block'; btnP.textContent='Registrar cobro parcial';
  }else if(saldo<-0.01){
    box.style.background='var(--azul-s)'; lbl.textContent='Le debés'; lbl.style.color='var(--azul)';
    val.textContent=$$(-saldo); val.style.color='var(--azul)';
    btnT.style.display='block'; btnT.textContent='Registrar pago total ('+$$(-saldo)+')';
    btnP.style.display='block'; btnP.textContent='Registrar pago parcial';
  }else{
    box.style.background='var(--verde-s)'; lbl.textContent='Al día'; lbl.style.color='var(--verde-c)';
    val.textContent=$$(0); val.style.color='var(--verde-c)';
    btnT.style.display='none'; btnP.style.display='none';
  }
}

function cuentaSaldarTotal(){
  const nombre=document.getElementById('cuenta-nombre').value;
  cerrarModal('modal-contacto');
  if(_cuentaSaldo>0){
    document.getElementById('ab-cliente').value=nombre;
    document.getElementById('ab-monto').value=Math.round(_cuentaSaldo);
    document.getElementById('ab-fecha').value=hoy();
    document.getElementById('ab-nota').value='Liquidación total';
    document.getElementById('modal-abono').classList.add('visible');
  }else{
    document.getElementById('ab-prov').value=nombre;
    document.getElementById('ab-monto-prov').value=Math.round(-_cuentaSaldo);
    document.getElementById('ab-fecha-prov').value=hoy();
    document.getElementById('modal-abono-prov').classList.add('visible');
  }
}

function cuentaSaldarParcial(){
  const nombre=document.getElementById('cuenta-nombre').value;
  cerrarModal('modal-contacto');
  if(_cuentaSaldo>0){
    document.getElementById('ab-cliente').value=nombre;
    document.getElementById('ab-monto').value='';
    document.getElementById('ab-fecha').value=hoy();
    document.getElementById('ab-nota').value='';
    document.getElementById('modal-abono').classList.add('visible');
  }else{
    document.getElementById('ab-prov').value=nombre;
    document.getElementById('ab-monto-prov').value='';
    document.getElementById('ab-fecha-prov').value=hoy();
    document.getElementById('modal-abono-prov').classList.add('visible');
  }
}

async function guardarAbono(){
  const cliente=document.getElementById('ab-cliente').value;
  const monto=parseFloat(document.getElementById('ab-monto').value);
  const fecha=document.getElementById('ab-fecha').value||hoy();
  const nota=document.getElementById('ab-nota').value.trim();
  if(!(monto>0)){toast('Ingresá un monto válido','error');return;}
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarPagoCliente',{cliente,monto,fecha,nota,operador:operadorActual});
    cerrarModal('modal-abono');
    ocultarToast(); toast('✅ Abono registrado','exito');
    cargarDeudas('clientes');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

async function guardarAbonoProv(){
  const proveedor=document.getElementById('ab-prov').value;
  const monto=parseFloat(document.getElementById('ab-monto-prov').value);
  const fecha=document.getElementById('ab-fecha-prov').value||hoy();
  if(!(monto>0)){toast('Ingresá un monto válido','error');return;}
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarPagoProveedor',{proveedor,monto,fecha,operador:operadorActual});
    cerrarModal('modal-abono-prov');
    ocultarToast(); toast('✅ Pago registrado','exito');
    cargarDeudas('proveedores');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}



// ==========================================
// SELECCIÓN DE VENTAS / COMPRAS PARA UN SOLO COMPROBANTE
// ==========================================
// El flujo del rubro: cada venta que hacés es una entrega (un remito), y después
// se juntan varias en un solo papel para cobrar. Acá se abre con las que tienen
// saldo pendiente ya tildadas (el caso normal es "cobrame todo lo que debe") y
// están los botones para marcar o desmarcar todas y elegir a mano.
let _selTipo = 'venta';
let _selLista = [];
let _selMarcadas = {};

function _selPendiente(m){ return (Number(m.total)||0) - (Number(m.pagado)||0) > 0.01; }

function abrirSeleccion(tipo){
  if(!_cuentaListo) return;
  _selTipo = tipo;
  _selLista = (_cuentaMovs||[]).filter(m => m.tipo === tipo).slice().reverse();  // la más nueva arriba
  if(!_selLista.length){ toast(tipo==='venta'?'Este contacto no tiene ventas':'No hay compras a este contacto','error'); return; }
  _selMarcadas = {};
  _selLista.forEach((m,i) => { _selMarcadas[i] = _selPendiente(m) && !m.facturado; });
  document.getElementById('sel-titulo').textContent =
    (tipo==='venta' ? 'Boleta de ' : 'Registro de compras de ') + _cuentaNombre;
  document.getElementById('sel-ayuda').textContent = tipo==='venta'
    ? 'Vienen tildadas las ventas que todavía tienen saldo. Destildá lo que no va en esta boleta.'
    : 'Elegí las compras que querés juntar en un solo registro interno.';
  renderSeleccion();
  document.getElementById('modal-seleccion').classList.add('visible');
}

function selMarcarTodas(v){
  _selLista.forEach((m,i) => { _selMarcadas[i] = v; });
  renderSeleccion();
}

function selToggle(i){
  _selMarcadas[i] = !_selMarcadas[i];
  renderSeleccion();
}

function renderSeleccion(){
  const cont = document.getElementById('sel-lista');
  cont.innerHTML = _selLista.map((m,i) => {
    const pend = (Number(m.total)||0) - (Number(m.pagado)||0);
    const marcada = !!_selMarcadas[i];
    const detalle = (m.items||[]).map(it =>
      esc(it.producto || it.producto_insumo || '') + ' (' + _cantCorta(it.cantidad) + ')'
    ).join(', ');
    return `<div onclick="selToggle(${i})" style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:2px solid ${marcada?'var(--azul-c)':'var(--borde)'};background:${marcada?'var(--azul-s)':'var(--blanco)'};border-radius:var(--radio);margin-bottom:6px;cursor:pointer">
      <div style="font-size:20px;line-height:1.1">${marcada?'☑️':'⬜'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${fmtFecha(m.fecha)}${m.id?` · N° ${esc(String(m.id).slice(-5))}`:''}</div>
        ${detalle?`<div style="font-size:12px;color:var(--gris)">${detalle}</div>`:''}
        <div style="font-size:12px;margin-top:2px">
          ${pend > 0.01
            ? `<span style="color:var(--rojo);font-weight:600">Pendiente ${$$(pend)}</span>`
            : `<span style="color:var(--verde-c);font-weight:600">Pagada</span>`}
          ${m.facturado?`<span style="color:var(--gris)"> · 🧾 ya facturada ${fmtFecha(m.facturado)}</span>`:''}
        </div>
      </div>
      <div style="font-weight:700;white-space:nowrap">${$$(m.total)}</div>
    </div>`;
  }).join('');

  const elegidas = _selLista.filter((m,i) => _selMarcadas[i]);
  const total = elegidas.reduce((a,m) => a + (Number(m.total)||0), 0);
  const pend  = elegidas.reduce((a,m) => a + Math.max(0,(Number(m.total)||0)-(Number(m.pagado)||0)), 0);
  document.getElementById('sel-resumen').innerHTML =
    `<div style="display:flex;justify-content:space-between"><span style="color:var(--gris)">Seleccionadas</span><strong>${elegidas.length} de ${_selLista.length}</strong></div>
     <div style="display:flex;justify-content:space-between"><span style="color:var(--gris)">Total</span><strong>${$$(total)}</strong></div>
     <div style="display:flex;justify-content:space-between"><span style="color:var(--gris)">${_selTipo==='venta'?'Queda a cobrar':'Queda a pagar'}</span><strong style="color:${pend>0.01?'var(--rojo)':'var(--verde-c)'}">${pend>0.01?$$(pend):'Nada'}</strong></div>`;
  const btn = document.getElementById('btn-sel-generar');
  btn.disabled = !elegidas.length;
  btn.style.opacity = elegidas.length ? 1 : .5;
  btn.textContent = _selTipo==='venta'
    ? (elegidas.length ? `🧾 Generar boleta (${elegidas.length})` : '🧾 Generar boleta')
    : (elegidas.length ? `📦 Generar registro (${elegidas.length})` : '📦 Generar registro');
}

function _cantCorta(n){
  const v = Math.round((Number(n)||0)*100)/100;
  return v.toLocaleString('es-AR',{maximumFractionDigits:2});
}

async function selGenerar(){
  const elegidas = _selLista.filter((m,i) => _selMarcadas[i]);
  if(!elegidas.length) return;
  cerrarModal('modal-seleccion');
  if(_selTipo === 'venta'){
    await ticketBoletaVentas(_cuentaNombre, elegidas, _cuentaSaldo);
    _marcarFacturadas(elegidas);
  }else{
    await ticketRegistroCompras(_cuentaNombre, elegidas);
  }
}

// Deja anotado en la planilla qué ventas salieron en una boleta, para no cobrar
// dos veces la misma entrega. No bloquea nada: si falla, la boleta ya está hecha.
async function _marcarFacturadas(elegidas){
  const ids = elegidas.map(m => m.id).filter(Boolean);
  if(!ids.length) return;
  try{
    await apiPost('marcarFacturado', {pedido_ids: ids, fecha: hoy()});
    elegidas.forEach(m => { m.facturado = hoy(); });
    toast('🧾 ' + ids.length + (ids.length===1?' venta marcada como facturada':' ventas marcadas como facturadas'), 'exito');
  }catch(e){
    toast('La boleta salió, pero no se pudo marcar como facturada: ' + e.message, 'error');
  }
}
