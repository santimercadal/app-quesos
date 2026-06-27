// ==========================================
// CONFIG
// ==========================================
const API = 'https://script.google.com/macros/s/AKfycbyFQZz8DgsMEfJlCYgOYZrdIK8PvTIIMBgXgCSFxRfjkVd_v1GtMNoWaIjXdVRQRumzlg/exec';

// ==========================================
// ESTADO
// ==========================================
let productos = [];
let productosCompraCache = [];
let clientesCache = [];
let proveedoresCache = [];
let carrito = [];
let periodoReporte = 'hoy';
let pedidoEnEdicion = null;
let carritoEdit = [];
// Listas en pantalla referenciadas por índice desde los onclick (evita inyectar
// nombres/objetos en el HTML, que rompía botones con apóstrofos, ej: "D'Angelo").
let _pedidosHoy = [];
let _deudaCli = [];
let _deudaProv = [];

// ==========================================
// OPERADORES
// ==========================================
const OP_KEY     = 'quesos-operador';
const OP_DEFAULT = ['Silvana', 'Juan', 'Santi', 'Pollo', 'Bruno'];

let operadorActual = '';
let operadoresCache = [...OP_DEFAULT];  // default hasta que llegue la API

function seleccionarOperador(nombre) {
  operadorActual = nombre;
  localStorage.setItem(OP_KEY, nombre);
  actualizarChipOperador();
  cerrarModal('modal-operador');
}

function actualizarChipOperador() {
  const val = operadorActual || '—';
  const chip = document.getElementById('chip-operador');
  if (chip) chip.textContent = val;
  const chipMas = document.getElementById('chip-operador-mas');
  if (chipMas) chipMas.textContent = val;
}

function renderListaOperadores(forzado) {
  const cont = document.getElementById('op-lista');
  const lista = operadoresCache.length ? operadoresCache : OP_DEFAULT;
  cont.innerHTML = '';
  lista.forEach(n => {
    const fila = document.createElement('div');
    fila.style.cssText = 'display:flex;gap:8px;align-items:center';

    const btn = document.createElement('button');
    const activo = operadorActual === n;
    btn.style.cssText = [
      'flex:1;padding:16px;border-radius:var(--radio);font-size:16px;cursor:pointer;text-align:left',
      activo ? 'border:2px solid var(--azul-c);background:var(--azul-s);color:var(--azul);font-weight:700'
             : 'border:2px solid var(--borde);background:var(--gris-c);color:var(--texto);font-weight:400'
    ].join(';');
    btn.textContent = (activo ? '✓ ' : '') + n;
    btn.onclick = () => seleccionarOperador(n);
    fila.appendChild(btn);

    if (!forzado) {
      const del = document.createElement('button');
      del.style.cssText = 'padding:12px;border:2px solid var(--rojo-s);border-radius:var(--radio);background:var(--rojo-s);color:var(--rojo);font-size:18px;cursor:pointer;line-height:1';
      del.textContent = '🗑';
      del.onclick = () => eliminarOperador(n);
      fila.appendChild(del);
    }

    cont.appendChild(fila);
  });
}

function abrirSelectorOperador(forzado = false) {
  renderListaOperadores(forzado);
  document.getElementById('op-gestion').style.display = forzado ? 'none' : 'block';
  document.getElementById('op-titulo').textContent = forzado ? '¿Quién va a usar la app?' : 'Cambiar operador';
  document.getElementById('btn-cerrar-op').style.display = forzado ? 'none' : 'block';
  document.getElementById('modal-operador').classList.add('visible');
}

async function agregarOperador() {
  const inp = document.getElementById('op-nuevo');
  const nombre = inp.value.trim();
  if (!nombre) { toast('Ingresá un nombre', 'error'); return; }
  if (operadoresCache.includes(nombre)) { toast('Ya existe ese operador', 'error'); return; }
  const nuevaLista = [...operadoresCache, nombre];
  await _guardarOperadoresAPI(nuevaLista);
  inp.value = '';
  toast('✅ ' + nombre + ' agregado', 'exito');
}

async function eliminarOperador(nombre) {
  if (!confirm(`¿Eliminar a ${nombre} de la lista?\n\nSus movimientos anteriores no se borran.`)) return;
  let nuevaLista = operadoresCache.filter(n => n !== nombre);
  if (nuevaLista.length === 0) nuevaLista = [...OP_DEFAULT];
  await _guardarOperadoresAPI(nuevaLista);
  if (operadorActual === nombre) {
    operadorActual = '';
    localStorage.removeItem(OP_KEY);
    actualizarChipOperador();
  }
}

async function _guardarOperadoresAPI(lista) {
  try {
    toast('Guardando...', 'guardando');
    await apiPost('guardarOperadores', { lista });
    operadoresCache = lista;
    renderListaOperadores(false);
    toast('✅ Guardado', 'exito');
  } catch(e) {
    console.error('guardarOperadores error:', e);
    toast('Error: ' + (e.message || 'no se pudo guardar'), 'error');
  }
}

// ==========================================
// API
// ==========================================
async function apiGet(accion, params={}) {
  const qs = new URLSearchParams({accion,...params}).toString();
  const r = await fetch(`${API}?${qs}`);
  if (!r.ok) throw new Error('Error de red ('+r.status+')');
  const d = await r.json();
  if (!d.ok) throw new Error(d.error||'Error del servidor');
  return d.datos;
}
async function apiPost(accion, datos) {
  const r = await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({accion,datos})});
  if (!r.ok) throw new Error('Error de red ('+r.status+')');
  const d = await r.json();
  if (!d.ok) throw new Error(d.error||'Error del servidor');
  return d.datos;
}

// ==========================================
// TOAST
// ==========================================
let toastTimer;
function toast(msg,tipo='exito'){
  clearTimeout(toastTimer);
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='visible '+tipo;
  if(tipo!=='guardando') toastTimer=setTimeout(()=>t.className='',3000);
}
function ocultarToast(){clearTimeout(toastTimer);document.getElementById('toast').className='';}

// ==========================================
// FORMATO
// ==========================================
function $$(n){return '$'+Number(n).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0})}
// Fecha local de Argentina en formato yyyy-mm-dd (no UTC).
// Evita que las ventas de la noche queden con fecha del día siguiente.
function hoy(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date())}
function fmtFecha(f){if(!f)return'';const[y,m,d]=f.split('-');return`${d}/${m}/${y}`}
function escH(s){return String(s).replace(/'/g,"\\'")}
function nombreCompleto(c){return [c.nombre,c.apellido].filter(Boolean).join(' ')}

// ==========================================
// NAVEGACIÓN
// ==========================================
const TITULOS={inicio:'App Quesos 🧀',venta:'Nueva Venta',compra:'Nueva Compra',deudas:'Deudas',mas:'Más opciones',productos:'Productos',clientes:'Clientes','proveedores-mgt':'Proveedores',reportes:'Reportes',devoluciones:'Devoluciones'};
const NAV_MAP={inicio:'nav-inicio',venta:'nav-venta',compra:'nav-compra',deudas:'nav-deudas',mas:'nav-mas',productos:'nav-mas',clientes:'nav-mas','proveedores-mgt':'nav-mas',reportes:'nav-mas',devoluciones:'nav-mas'};

function irA(p, tab){
  document.querySelectorAll('.pantalla').forEach(x=>x.classList.remove('activa'));
  document.getElementById('pantalla-'+p).classList.add('activa');
  document.getElementById('header-title').textContent=TITULOS[p]||'App Quesos';
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('activo'));
  const n=NAV_MAP[p]; if(n) document.getElementById(n).classList.add('activo');
  window.scrollTo(0,0);
  if(p==='inicio') cargarInicio();
  if(p==='venta') cargarDatosVenta();
  if(p==='compra') cargarDatosCompra();
  if(p==='deudas') cargarDeudas(tab||'clientes');
  if(p==='productos') cargarProductos();
  if(p==='clientes') cargarClientes();
  if(p==='proveedores-mgt') cargarProveedoresMgt();
  if(p==='reportes') cargarReporte();
  if(p==='devoluciones') cargarDevoluciones('todos');
}

// ==========================================
// INICIO
// ==========================================
async function cargarInicio(){
  try{
    const [d, deudaCli, deudaProv] = await Promise.all([
      apiGet('getVentasHoy'),
      apiGet('getDeudaClientes').catch(()=>[]),
      apiGet('getDeudaProveedores').catch(()=>[])
    ]);
    document.getElementById('total-hoy').textContent=$$(d.total_ventas);
    document.getElementById('cobrado-hoy').textContent=`Cobrado hoy: ${$$(d.total_cobrado)}`;
    const porCobrar=deudaCli.reduce((s,x)=>s+x.deuda,0);
    const porPagar=deudaProv.reduce((s,x)=>s+x.deuda,0);
    document.getElementById('total-por-cobrar').textContent=porCobrar>0?$$(porCobrar):'✅ Al día';
    document.getElementById('total-por-pagar').textContent=porPagar>0?$$(porPagar):'✅ Al día';
    const lista=document.getElementById('ventas-hoy-lista');
    _pedidosHoy=d.pedidos||[];
    const hayVentas=d.pedidos&&d.pedidos.length>0;
    const hayAbonos=d.pagos_clientes&&d.pagos_clientes.length>0;
    if(!hayVentas&&!hayAbonos){
      lista.innerHTML='<div class="vacio"><span class="ico">🧀</span>Sin movimientos hoy todavía</div>';return;
    }

    const htmlVentas=hayVentas
      ? `<div style="font-size:12px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">🛒 Ventas</div>`+
        d.pedidos.map((p,idx)=>{
          const badge=p.forma_pago==='efectivo'?'badge-efectivo':p.forma_pago==='transferencia'?'badge-trans':'badge-credito';
          const deudaOriginal=Number(p.total)-Number(p.monto_pagado);
          return `<div class="item">
            <div class="item-head">
              <div class="item-info" style="flex:1">
                <div class="item-nombre">${p.cliente||'(sin nombre)'} <span class="badge ${badge}">${p.forma_pago}</span></div>
                <div class="item-det">${p.descripcion||''}</div>
                <div class="item-det" style="font-size:12px;color:var(--gris)">👤 ${p.operador||'—'}</div>
                ${deudaOriginal>0?`<div class="item-det" style="color:var(--rojo);font-size:12px">Pendiente: ${$$(deudaOriginal)}</div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">✅ Pagado</div>'}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                <div class="item-val">${$$(p.total)}</div>
                <button class="btn btn-s btn-sm" onclick="abrirEdicionPedido(_pedidosHoy[${idx}])">Editar</button>
              </div>
            </div>
          </div>`;
        }).join('')
      : '';

    const htmlAbonos=hayAbonos
      ? `<div style="font-size:12px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">💰 Pagos recibidos</div>`+
        d.pagos_clientes.map(pago=>`
          <div class="item">
            <div class="item-head">
              <div class="item-info" style="flex:1">
                <div class="item-nombre">${escH(pago.cliente)}</div>
                <div class="item-det">${pago.nota||'Abono de deuda'}</div>
              </div>
              <div class="item-val" style="color:var(--verde-c)">+${$$(pago.monto)}</div>
            </div>
          </div>`).join('')
      : '';

    lista.innerHTML=htmlVentas+htmlAbonos;
  }catch(e){
    document.getElementById('total-hoy').textContent='—';
    document.getElementById('cobrado-hoy').textContent='Sin conexión · '+e.message;
  }
}

// ==========================================
// CARRITO DE VENTA
// ==========================================
async function cargarDatosVenta(){
  document.getElementById('v-fecha').value=hoy();
  try{
    productos=await apiGet('getProductos');
    clientesCache=await apiGet('getClientes');
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
    renderPreciosInicio();
  }catch(e){toast('Error cargando datos: '+e.message,'error');}
  if(carrito.length===0){carrito=[{producto:'',precio_unitario:0,unidad:'kg',monto:'',cantidad:0}];}
  renderCarrito();
}

function renderPreciosInicio() {
  const cont = document.getElementById('lista-precios-inicio');
  if (!cont || !productos.length) return;
  cont.innerHTML = productos.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--blanco);border-radius:var(--radio);margin-bottom:6px;box-shadow:var(--sombra)">
      <div>
        <div style="font-weight:600;font-size:14px">${escH(p.nombre)}</div>
        <div style="font-size:12px;color:var(--gris)">${p.unidad}</div>
      </div>
      <div style="font-size:18px;font-weight:700;color:var(--azul)">${$$(p.precio)}</div>
    </div>`).join('');
}

function togglePrecios() {
  const cont = document.getElementById('lista-precios-inicio');
  const arrow = document.getElementById('arrow-precios');
  const abierto = cont.style.display !== 'none';
  cont.style.display = abierto ? 'none' : 'block';
  arrow.style.transform = abierto ? '' : 'rotate(180deg)';
}

function agregarItemCarrito(){
  carrito.push({producto:'',precio_unitario:0,unidad:'kg',monto:'',cantidad:0});
  renderCarrito();
}

function quitarDelCarrito(i){
  if(carrito.length===1){toast('El pedido debe tener al menos un producto','error');return;}
  carrito.splice(i,1);
  renderCarrito();
}

function renderCarrito(){
  const el=document.getElementById('carrito-items');
  el.innerHTML=carrito.map((item,i)=>`
    <div class="carrito-item">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div class="campo" style="margin-bottom:8px">
            <label>Producto</label>
            <select onchange="alElegirProdCarrito(${i},this)">
              <option value="">Elegí un producto</option>
              ${productos.map(p=>`<option value="${p.nombre}" data-precio="${p.precio}" data-unidad="${p.unidad}" ${item.producto===p.nombre?'selected':''}>${p.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="campo" style="margin-bottom:${item.precio_unitario>0?'4':'0'}px">
            <label>Monto en pesos ($)</label>
            <input type="number" value="${item.monto}" placeholder="0" min="0" step="1"
              oninput="alCambiarMontoCarrito(${i},this.value)" style="font-size:18px;font-weight:600"/>
          </div>
          ${item.precio_unitario>0&&Number(item.monto)>0?
            `<div class="hint">≈ ${(Number(item.monto)/item.precio_unitario).toFixed(2)} ${item.unidad}</div>`:''}
        </div>
        <button onclick="quitarDelCarrito(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>
  `).join('');
  actualizarTotalCarrito();
}

function alElegirProdCarrito(i,sel){
  const opt=sel.options[sel.selectedIndex];
  carrito[i].producto=sel.value;
  carrito[i].precio_unitario=Number(opt.dataset.precio)||0;
  carrito[i].unidad=opt.dataset.unidad||'kg';
  renderCarrito();
}

function alCambiarMontoCarrito(i,val){
  carrito[i].monto=val;
  carrito[i].cantidad=carrito[i].precio_unitario>0?Number(val)/carrito[i].precio_unitario:0;
  actualizarTotalCarrito();
  const items=document.querySelectorAll('#carrito-items .carrito-item');
  if(!items[i])return;
  let hint=items[i].querySelector('.hint');
  if(carrito[i].precio_unitario>0&&Number(val)>0){
    const txt=`≈ ${(Number(val)/carrito[i].precio_unitario).toFixed(2)} ${carrito[i].unidad}`;
    if(hint){hint.textContent=txt;}
    else{const h=document.createElement('div');h.className='hint';h.textContent=txt;items[i].querySelector('.campo:last-of-type').after(h);}
  }else if(hint){hint.remove();}
}

function actualizarTotalCarrito(){
  const total=carrito.reduce((s,i)=>s+(Number(i.monto)||0),0);
  document.getElementById('v-total-display').textContent=$$(total);
  alCambiarPagoVenta();
}

function alCambiarPagoVenta(){
  const pago=document.getElementById('v-pago').value;
  const total=carrito.reduce((s,i)=>s+(Number(i.monto)||0),0);
  if(pago!=='crédito') document.getElementById('v-pagado').value=total>0?Math.round(total):'';
  else document.getElementById('v-pagado').value='';
}

function abrirConfirmacion(){
  if(carrito.length===0){toast('Agregá al menos un producto','error');return;}
  if(carrito.some(i=>!i.producto||!(Number(i.monto)>0))){toast('Completá todos los productos del pedido','error');return;}
  const total=carrito.reduce((s,i)=>s+Number(i.monto),0);
  const pagado=parseFloat(document.getElementById('v-pagado').value)||0;
  const pago=document.getElementById('v-pago').value;
  const cliente=document.getElementById('v-cliente').value.trim();
  if(pagado>total){toast('El monto pagado no puede superar el total','error');return;}
  if(pago==='crédito'&&!cliente){toast('Para ventas a crédito el cliente es obligatorio','error');return;}
  document.getElementById('conf-items').innerHTML=carrito.map(i=>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee">
      <span>${i.producto}${i.precio_unitario>0&&Number(i.monto)>0?` <span style="color:var(--gris);font-size:12px">(≈${(Number(i.monto)/i.precio_unitario).toFixed(2)} ${i.unidad})</span>`:''}</span>
      <strong>${$$(i.monto)}</strong>
    </div>`
  ).join('');
  document.getElementById('conf-total').textContent=$$(total);
  document.getElementById('conf-pagado').textContent=$$(pagado);
  const resta=total-pagado;
  document.getElementById('conf-resta').textContent=resta>0?$$(resta)+' queda debiendo':'Pagado completo ✅';
  document.getElementById('conf-resta').style.color=resta>0?'var(--rojo)':'var(--verde-c)';
  document.getElementById('conf-cliente').textContent=cliente||'(sin nombre)';
  document.getElementById('conf-pago').textContent=pago;
  document.getElementById('modal-confirmar').classList.add('visible');
}

async function guardarVenta(){
  const btn=document.getElementById('btn-confirmar-venta');
  const total=carrito.reduce((s,i)=>s+Number(i.monto),0);
  const monto_pagado=parseFloat(document.getElementById('v-pagado').value)||0;
  const forma_pago=document.getElementById('v-pago').value;
  const cliente=document.getElementById('v-cliente').value.trim();
  const fecha=document.getElementById('v-fecha').value||hoy();
  const items=carrito.map(i=>({
    producto:i.producto,
    cantidad:i.precio_unitario>0?Number(i.monto)/i.precio_unitario:1,
    precio_unitario:i.precio_unitario,
    subtotal:Number(i.monto)
  }));
  const descripcion=carrito.map(i=>{
    const cant=i.precio_unitario>0?(Number(i.monto)/i.precio_unitario).toFixed(2)+' '+i.unidad:'';
    return i.producto+(cant?' ('+cant+')':'');
  }).join(', ');

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  try{
    await apiPost('registrarPedido',{fecha,cliente,forma_pago,monto_pagado,total,descripcion,items,operador:operadorActual});
    cerrarModal('modal-confirmar');
    toast('✅ Pedido guardado','exito');
    carrito=[{producto:'',precio_unitario:0,unidad:'kg',monto:'',cantidad:0}];
    document.getElementById('v-cliente').value='';
    document.getElementById('v-pago').value='efectivo';
    document.getElementById('v-pagado').value='';
    document.getElementById('v-fecha').value=hoy();
    irA('inicio');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Confirmar y guardar';}
}

// ==========================================
// EDITAR PEDIDO
// ==========================================
async function abrirEdicionPedido(p){
  pedidoEnEdicion=p;
  document.getElementById('edit-pedido-id').value=p.pedido_id;
  document.getElementById('edit-cliente').value=p.cliente||'';
  document.getElementById('edit-pago').value=p.forma_pago||'efectivo';
  document.getElementById('edit-pagado').value=p.monto_pagado;
  document.getElementById('edit-fecha').value=p.fecha;
  // Asegurar lista de productos para los selects
  if(!productos.length){ try{ productos=await apiGet('getProductos'); }catch(e){} }
  carritoEdit=(p.items||[]).map(it=>{
    const prod=productos.find(x=>x.nombre===it.producto);
    return {
      producto:it.producto,
      precio_unitario:Number(it.precio_unitario)||(prod?Number(prod.precio):0)||0,
      unidad:(prod&&prod.unidad)||it.unidad||'kg',
      monto:Number(it.subtotal)||''
    };
  });
  if(!carritoEdit.length) carritoEdit=[{producto:'',precio_unitario:0,unidad:'kg',monto:''}];
  renderCarritoEdit();
  document.getElementById('modal-editar-pedido').classList.add('visible');
}

function renderCarritoEdit(){
  const el=document.getElementById('edit-items-lista');
  el.innerHTML=carritoEdit.map((item,i)=>`
    <div class="carrito-item">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div class="campo" style="margin-bottom:8px">
            <label>Producto</label>
            <select onchange="alElegirProdEdit(${i},this)">
              <option value="">Elegí un producto</option>
              ${productos.map(p=>`<option value="${p.nombre}" data-precio="${p.precio}" data-unidad="${p.unidad}" ${item.producto===p.nombre?'selected':''}>${p.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="campo" style="margin-bottom:0">
            <label>Monto en pesos ($)</label>
            <input type="number" value="${item.monto}" placeholder="0" min="0" step="1"
              oninput="alCambiarMontoEdit(${i},this.value)" style="font-size:18px;font-weight:600"/>
          </div>
          ${item.precio_unitario>0&&Number(item.monto)>0?
            `<div class="hint">≈ ${(Number(item.monto)/item.precio_unitario).toFixed(2)} ${item.unidad}</div>`:''}
        </div>
        <button onclick="quitarItemEdit(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>`).join('')
    + `<button class="btn btn-s" onclick="agregarItemEdit()" style="margin-bottom:6px">+ Agregar producto</button>`;
}

function alElegirProdEdit(i,sel){
  const opt=sel.options[sel.selectedIndex];
  carritoEdit[i].producto=sel.value;
  carritoEdit[i].precio_unitario=Number(opt.dataset.precio)||0;
  carritoEdit[i].unidad=opt.dataset.unidad||'kg';
  renderCarritoEdit();
}

function alCambiarMontoEdit(i,val){
  carritoEdit[i].monto=val;
  const items=document.querySelectorAll('#edit-items-lista .carrito-item');
  if(!items[i])return;
  let hint=items[i].querySelector('.hint');
  if(carritoEdit[i].precio_unitario>0&&Number(val)>0){
    const txt=`≈ ${(Number(val)/carritoEdit[i].precio_unitario).toFixed(2)} ${carritoEdit[i].unidad}`;
    if(hint){hint.textContent=txt;}
    else{const h=document.createElement('div');h.className='hint';h.textContent=txt;items[i].querySelector('.campo:last-of-type').after(h);}
  }else if(hint){hint.remove();}
}

function agregarItemEdit(){
  carritoEdit.push({producto:'',precio_unitario:0,unidad:'kg',monto:''});
  renderCarritoEdit();
}

function quitarItemEdit(i){
  if(carritoEdit.length===1){toast('El pedido debe tener al menos un producto','error');return;}
  carritoEdit.splice(i,1);
  renderCarritoEdit();
}

async function confirmarEdicion(){
  const btn=document.getElementById('btn-guardar-edicion');
  const pedido_id=document.getElementById('edit-pedido-id').value;
  const cliente=document.getElementById('edit-cliente').value.trim();
  const forma_pago=document.getElementById('edit-pago').value;
  const monto_pagado=parseFloat(document.getElementById('edit-pagado').value)||0;
  const fecha=document.getElementById('edit-fecha').value;
  if(carritoEdit.some(it=>!it.producto||!(Number(it.monto)>0))){toast('Completá todos los productos del pedido','error');return;}
  const total=carritoEdit.reduce((s,it)=>s+Number(it.monto),0);
  if(monto_pagado>total){toast('El monto pagado no puede superar el total','error');return;}
  if(forma_pago==='crédito'&&!cliente){toast('Para ventas a crédito el cliente es obligatorio','error');return;}
  const items=carritoEdit.map(it=>({
    producto:it.producto,
    cantidad:it.precio_unitario>0?Number(it.monto)/it.precio_unitario:1,
    precio_unitario:it.precio_unitario,
    subtotal:Number(it.monto),
    unidad:it.unidad
  }));

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  toast('Guardando...','guardando');
  try{
    await apiPost('editarPedido',{pedido_id,cliente,forma_pago,monto_pagado,fecha,items});
    cerrarModal('modal-editar-pedido');
    ocultarToast();
    toast('✅ Pedido actualizado','exito');
    cargarInicio();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Guardar cambios';}
}

// ==========================================
// COMPRA
// ==========================================
async function cargarDatosCompra(){
  document.getElementById('c-fecha').value=hoy();
  try{
    const [prods, provs]=await Promise.all([apiGet('getProductos'),apiGet('getProveedores')]);
    productosCompraCache = prods;
    // Llenar datalist de productos (texto libre + autocomplete)
    document.getElementById('lista-productos-compra').innerHTML=
      prods.map(p=>`<option value="${escH(p.nombre)}">`).join('');
    // Llenar select de proveedores
    const selProv=document.getElementById('c-proveedor');
    selProv.innerHTML='<option value="">Sin proveedor</option>'+
      provs.map(p=>`<option value="${escH(p.nombre)}">${p.nombre}${p.contacto?' · '+p.contacto:''}</option>`).join('');
  }catch(e){}
  cargarHistorialCompras();
}

async function cargarHistorialCompras(){
  const lista=document.getElementById('hist-compras-lista');
  if(!lista) return;
  lista.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  try{
    const r=await apiGet('getCompras',{desde:'2000-01-01',hasta:'2099-12-31'});
    const compras=(r.compras||[]).slice().reverse().slice(0,15);
    if(!compras.length){lista.innerHTML='<div class="vacio"><span class="ico">📦</span>Sin compras registradas</div>';return;}
    lista.innerHTML=compras.map(c=>{
      const deuda=Number(c.total)-Number(c.monto_pagado);
      const badge=c.forma_pago==='efectivo'?'badge-efectivo':c.forma_pago==='transferencia'?'badge-trans':'badge-credito';
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${escH(c.proveedor)} <span class="badge ${badge}">${c.forma_pago||''}</span></div>
            <div class="item-det">${escH(c.producto_insumo)} · ${c.cantidad} · ${fmtFecha(c.fecha)}</div>
            ${deuda>0?`<div class="item-det" style="color:var(--rojo)">Pendiente: ${$$(deuda)}</div>`:''}
            <button class="btn btn-s btn-sm" style="margin-top:6px" onclick="abrirModalDevolucion('${escH(c.id)}','proveedor')">↩️ Devolver</button>
          </div>
          <div class="item-val">${$$(c.total)}</div>
        </div>
      </div>`;
    }).join('');
  }catch(e){lista.innerHTML='<div class="vacio"><span class="ico">❌</span>Error al cargar</div>';}
}

function alElegirProdCompra(){
  const val = document.getElementById('c-producto').value.trim();
  const prod = productosCompraCache.find(p => p.nombre.toLowerCase() === val.toLowerCase());
  document.getElementById('c-prod-hint').textContent = '';
  if(prod && prod.proveedor){
    const selProv=document.getElementById('c-proveedor');
    for(let i=0;i<selProv.options.length;i++){
      if(selProv.options[i].value===prod.proveedor){selProv.selectedIndex=i;break;}
    }
    document.getElementById('c-prov-hint').textContent='Pre-llenado desde el producto';
  } else if(val) {
    document.getElementById('c-prov-hint').textContent='Insumo sin proveedor asignado';
  }
}

function calcCompra(){
  const cant=parseFloat(document.getElementById('c-cantidad').value)||0;
  const total=parseFloat(document.getElementById('c-total').value)||0;
  const costo=cant>0&&total>0?total/cant:0;
  document.getElementById('c-costo').value=costo>0?costo.toFixed(2):'';
  document.getElementById('c-costo-hint').textContent=costo>0?`$${costo.toFixed(2)} por unidad/kg`:'';
  alCambiarPagoCompra();
}

function alCambiarPagoCompra(){
  const pago=document.getElementById('c-pago').value;
  const total=parseFloat(document.getElementById('c-total').value)||0;
  if(pago!=='crédito') document.getElementById('c-pagado').value=total>0?Math.round(total):'';
}

// Abre modal de confirmación antes de guardar
function abrirConfirmacionCompra(){
  const proveedor=document.getElementById('c-proveedor').value;
  const producto_insumo=document.getElementById('c-producto').value.trim();
  const cantidad=parseFloat(document.getElementById('c-cantidad').value);
  const total=parseFloat(document.getElementById('c-total').value);
  const costo_unitario=parseFloat(document.getElementById('c-costo').value)||0;
  const forma_pago=document.getElementById('c-pago').value;
  const monto_pagado=parseFloat(document.getElementById('c-pagado').value)||0;
  const fecha=document.getElementById('c-fecha').value||hoy();

  if(!proveedor){toast('Ingresá el proveedor','error');return;}
  if(!producto_insumo){toast('Ingresá el producto o insumo','error');return;}
  if(!(cantidad>0)){toast('Ingresá el peso o cantidad','error');return;}
  if(!(total>0)){toast('Ingresá el precio total','error');return;}
  if(monto_pagado>total){toast('Monto pagado no puede superar el total','error');return;}

  const badge=forma_pago==='efectivo'?'badge-efectivo':forma_pago==='transferencia'?'badge-trans':'badge-credito';
  const resta=total-monto_pagado;

  document.getElementById('cc-resumen').innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Proveedor</span><strong>${escH(proveedor)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Producto</span><strong>${escH(producto_insumo)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Cantidad</span><strong>${cantidad}${costo_unitario>0?' · $'+costo_unitario.toFixed(2)+'/u':''}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Forma de pago</span><span class="badge ${badge}">${forma_pago}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Total</span><strong style="font-size:18px">${$$(total)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Pagado</span><strong>${$$(monto_pagado)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0">
      <span style="color:var(--gris)">Resta pagar</span>
      <strong style="color:${resta>0?'var(--rojo)':'var(--verde-c)'}">${resta>0?$$(resta)+' pendiente':'Pagado completo ✅'}</strong>
    </div>
    <div style="font-size:12px;color:var(--gris);margin-top:4px">Fecha: ${fmtFecha(fecha)}</div>
  `;
  document.getElementById('modal-confirmar-compra').classList.add('visible');
}

async function guardarCompra(){
  const btn=document.getElementById('btn-confirmar-compra');
  const proveedor=document.getElementById('c-proveedor').value;
  const producto_insumo=document.getElementById('c-producto').value.trim();
  const cantidad=parseFloat(document.getElementById('c-cantidad').value);
  const total=parseFloat(document.getElementById('c-total').value);
  const costo_unitario=parseFloat(document.getElementById('c-costo').value)||0;
  const forma_pago=document.getElementById('c-pago').value;
  const monto_pagado=parseFloat(document.getElementById('c-pagado').value)||0;
  const fecha=document.getElementById('c-fecha').value||hoy();

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarCompra',{fecha,proveedor,producto_insumo,cantidad,costo_unitario,total,forma_pago,monto_pagado,operador:operadorActual});
    cerrarModal('modal-confirmar-compra');
    ocultarToast();
    // Mostrar ticket de confirmación
    const deuda=total-monto_pagado;
    const badge=forma_pago==='efectivo'?'badge-efectivo':forma_pago==='transferencia'?'badge-trans':'badge-credito';
    document.getElementById('ticket-compra-body').innerHTML=`
      <div class="item" style="background:var(--gris-c);border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="font-size:13px;color:var(--gris);margin-bottom:6px">${fmtFecha(fecha)}</div>
        <div style="font-weight:600;font-size:16px;margin-bottom:2px">${escH(proveedor)}</div>
        <div style="color:var(--gris);margin-bottom:8px">${escH(producto_insumo)} · ${cantidad}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge ${badge}">${forma_pago}</span>
          <span style="font-size:18px;font-weight:700">${$$(total)}</span>
        </div>
        ${monto_pagado>0&&monto_pagado<total?`<div style="font-size:13px;color:var(--gris);margin-top:6px">Pagado: ${$$(monto_pagado)} · <span style="color:var(--rojo)">Pendiente: ${$$(deuda)}</span></div>`:''}
        ${monto_pagado===0?`<div style="font-size:13px;color:var(--rojo);margin-top:6px">⚠️ Pendiente total: ${$$(total)}</div>`:''}
        ${monto_pagado>=total?`<div style="font-size:13px;color:var(--verde-c);margin-top:6px">✅ Pagado en su totalidad</div>`:''}
      </div>`;
    document.getElementById('modal-ticket-compra').classList.add('visible');
    // Limpiar formulario
    document.getElementById('c-producto').value='';
    ['c-cantidad','c-total','c-costo','c-pagado'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('c-proveedor').selectedIndex=0;
    document.getElementById('c-costo-hint').textContent='';
    document.getElementById('c-prod-hint').textContent='';
    document.getElementById('c-prov-hint').textContent='Se pre-llena según el producto elegido';
    document.getElementById('c-pago').value='efectivo';
    document.getElementById('c-fecha').value=hoy();
    cargarHistorialCompras();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Confirmar compra';}
}

// ==========================================
// DEUDAS UNIFICADAS (tabs clientes / proveedores)
// ==========================================
function invalidarCacheDeudas(){ /* sin cache, siempre carga fresco */ }

async function cargarDeudas(tab){
  cambiarTabDeuda(tab);
  document.getElementById('cont-clientes-deuda').innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  document.getElementById('cont-proveedores').innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  const [cli,prov]=await Promise.all([
    apiGet('getDeudaClientes').catch(()=>[]),
    apiGet('getDeudaProveedores').catch(()=>[])
  ]);
  renderDeudaClientes(cli);
  renderDeudaProveedores(prov);
}

function cambiarTabDeuda(tab){
  const esCli=tab==='clientes';
  document.getElementById('cont-clientes-deuda').style.display=esCli?'block':'none';
  document.getElementById('cont-proveedores').style.display=esCli?'none':'block';
  document.getElementById('tab-clientes').className='btn '+(esCli?'btn-p':'btn-s');
  document.getElementById('tab-proveedores').className='btn '+(esCli?'btn-s':'btn-p');
}

function renderDeudaClientes(lista){
  _deudaCli=lista;
  const cont=document.getElementById('cont-clientes-deuda');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>¡Ningún cliente debe nada!</div>';return;}
  const total=lista.reduce((s,d)=>s+d.deuda,0);
  cont.innerHTML=
    `<div class="card" style="background:var(--azul-s);border-left:4px solid var(--azul-c);margin-bottom:16px">
       <div class="card-titulo">Total por cobrar</div>
       <div class="card-valor" style="color:var(--azul)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirLedger(_deudaCli[${i}].cliente,${d.deuda})">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${d.cliente}</div>
          <div class="item-det">Total histórico: ${$$(d.total_ventas)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(d.deuda)}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

async function cargarDeudaClientes(){ await cargarDeudas('clientes'); }

async function abrirLedger(cliente, deudaActual){
  document.getElementById('ledger-titulo').textContent='Cuenta: '+cliente;
  document.getElementById('ledger-cliente-nombre').value=cliente;
  document.getElementById('ledger-saldo').textContent=$$(deudaActual);
  document.getElementById('btn-liquidar-todo').textContent='Liquidar todo ('+$$(deudaActual)+')';
  document.getElementById('ledger-tabla').innerHTML='<div class="vacio"><span class="ico">⏳</span></div>';
  document.getElementById('modal-ledger').classList.add('visible');
  try{
    const h=await apiGet('getHistorialCliente',{cliente});
    const rows=h.movimientos.map((m,idx)=>{
      const itemsHtml=m.tipo==='compra'&&m.items&&m.items.length?
        `<div id="ledger-items-${idx}" style="display:none;background:var(--gris-c);border-radius:8px;padding:8px;margin:4px 0 8px;font-size:12px">
          ${m.items.map(it=>`
            <div style="display:flex;justify-content:space-between;padding:3px 0">
              <span>${it.producto} · ${Number(it.cantidad).toFixed(2)} ${it.unidad||''}</span>
              <strong>${$$(it.subtotal)}</strong>
            </div>`).join('')}
          <div style="font-size:11px;color:var(--gris);margin-top:4px">${m.forma_pago||''} · Pagó al momento: ${$$(m.haber)}</div>
        </div>`:''
      ;
      return `<div>
        <div class="ledger-row" ${m.tipo==='compra'&&m.items?.length?`style="cursor:pointer" onclick="toggleLedgerItems(${idx})"`:''}">
          <div style="flex:1">
            <div style="font-weight:500">${fmtFecha(m.fecha)} ${m.tipo==='compra'&&m.items?.length?'<span style="font-size:11px;color:var(--gris)">▶ ver detalle</span>':''}</div>
            <div style="font-size:12px;color:var(--gris)">${m.descripcion}${m.tipo==='compra'&&m.id?` · ${m.id}`:''}</div>
          </div>
          ${m.tipo==='compra'?`
            <div style="text-align:right">
              <div class="ledger-debe">+${$$(m.debe)}</div>
              ${m.haber>0?`<div class="ledger-haber" style="font-size:12px">pagó ${$$(m.haber)}</div>`:''}
            </div>`:`<div class="ledger-haber">-${$$(m.haber)}</div>`}
          <div class="ledger-saldo" style="width:80px;text-align:right;${m.saldo>0?'color:var(--rojo)':'color:var(--verde-c)'}">${$$(m.saldo)}</div>
        </div>
        ${itemsHtml}
      </div>`;
    }).join('');
    const header=`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris);font-weight:600;padding:0 0 8px;text-transform:uppercase;letter-spacing:.4px"><span>Movimiento</span><span style="width:80px;text-align:right">Saldo</span></div>`;
    document.getElementById('ledger-tabla').innerHTML=rows?header+rows:'<div class="vacio"><span class="ico">📋</span>Sin movimientos</div>';
    document.getElementById('ledger-saldo').textContent=$$(h.saldo_total);
    document.getElementById('btn-liquidar-todo').textContent='Liquidar todo ('+$$(h.saldo_total)+')';
  }catch(e){document.getElementById('ledger-tabla').innerHTML='<div class="vacio">Error: '+e.message+'</div>';}
}

function toggleLedgerItems(idx){
  const el=document.getElementById('ledger-items-'+idx);
  if(!el) return;
  const abierto=el.style.display!=='none';
  el.style.display=abierto?'none':'block';
  const rows=document.querySelectorAll('#ledger-tabla .ledger-row');
  const span=rows[idx]?.querySelector('span[style*="font-size:11px"]');
  if(span) span.textContent=abierto?'▶ ver detalle':'▼ ocultar';
}

function liquidarTodo(){
  const cliente=document.getElementById('ledger-cliente-nombre').value;
  const saldoTxt=document.getElementById('ledger-saldo').textContent;
  const monto=Number(saldoTxt.replace(/[$.,\s]/g,'').replace(/\./g,'').replace(',','.'));
  cerrarModal('modal-ledger');
  document.getElementById('ab-cliente').value=cliente;
  document.getElementById('ab-monto').value=Math.round(monto);
  document.getElementById('ab-fecha').value=hoy();
  document.getElementById('ab-nota').value='Liquidación total';
  document.getElementById('modal-abono').classList.add('visible');
}

function abrirAbono(){
  const cliente=document.getElementById('ledger-cliente-nombre').value;
  cerrarModal('modal-ledger');
  document.getElementById('ab-cliente').value=cliente;
  document.getElementById('ab-monto').value='';
  document.getElementById('ab-fecha').value=hoy();
  document.getElementById('ab-nota').value='';
  document.getElementById('modal-abono').classList.add('visible');
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
    invalidarCacheDeudas(); cargarDeudaClientes();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// DEUDA PROVEEDORES
// ==========================================
function renderDeudaProveedores(lista){
  _deudaProv=lista;
  const cont=document.getElementById('cont-proveedores');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>¡No debemos nada a proveedores!</div>';return;}
  const total=lista.reduce((s,d)=>s+d.deuda,0);
  cont.innerHTML=
    `<div class="card" style="background:var(--rojo-s);margin-bottom:16px">
       <div class="card-titulo">Total por pagar</div>
       <div class="card-valor" style="color:var(--rojo)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirLedgerProv(_deudaProv[${i}].proveedor,${d.deuda})">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${d.proveedor}</div>
          <div class="item-det">Total compras: ${$$(d.total_compras)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(d.deuda)}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

async function cargarDeudaProveedores(){ await cargarDeudas('proveedores'); }

// Ledger de proveedor
async function abrirLedgerProv(proveedor, deudaActual){
  document.getElementById('ledger-prov-titulo').textContent='Cuenta: '+proveedor;
  document.getElementById('ledger-prov-nombre').value=proveedor;
  document.getElementById('ledger-prov-saldo').textContent=$$(deudaActual);
  document.getElementById('btn-pago-total-prov').textContent='Pagar todo ('+$$(deudaActual)+')';
  document.getElementById('ledger-prov-tabla').innerHTML='<div class="vacio"><span class="ico">⏳</span></div>';
  document.getElementById('modal-ledger-prov').classList.add('visible');
  try{
    const h=await apiGet('getHistorialProveedor',{proveedor});
    const rows=h.movimientos.map(m=>{
      const colorSaldo=m.saldo>0?'color:var(--rojo)':'color:var(--verde-c)';
      let labelTipo='';
      if(m.tipo==='compra') labelTipo=`<div class="ledger-debe">+${$$(m.debe)}</div>${m.haber>0?`<div style="font-size:12px;color:var(--verde-c)">pagó ${$$(m.haber)}</div>`:''}`;
      else if(m.tipo==='pago') labelTipo=`<div class="ledger-haber">-${$$(m.haber)}</div>`;
      else labelTipo=`<div style="color:var(--amarillo);font-weight:600">↩️ -${$$(m.haber)}</div>`;
      return `<div class="ledger-row">
        <div style="flex:1">
          <div style="font-weight:500">${fmtFecha(m.fecha)}</div>
          <div style="font-size:12px;color:var(--gris)">${m.descripcion}</div>
        </div>
        <div style="text-align:right">${labelTipo}</div>
        <div class="ledger-saldo" style="width:80px;text-align:right;${colorSaldo}">${$$(m.saldo)}</div>
      </div>`;
    }).join('');
    const header=`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris);font-weight:600;padding:0 0 8px;text-transform:uppercase;letter-spacing:.4px"><span>Movimiento</span><span style="width:80px;text-align:right">Saldo</span></div>`;
    document.getElementById('ledger-prov-tabla').innerHTML=rows?header+rows:'<div class="vacio"><span class="ico">📋</span>Sin movimientos</div>';
    document.getElementById('ledger-prov-saldo').textContent=$$(h.saldo_total);
    document.getElementById('btn-pago-total-prov').textContent='Pagar todo ('+$$(h.saldo_total)+')';
  }catch(e){document.getElementById('ledger-prov-tabla').innerHTML='<div class="vacio">Error: '+e.message+'</div>';}
}

function abrirPagoTotalProv(){
  const prov=document.getElementById('ledger-prov-nombre').value;
  const saldoTxt=document.getElementById('ledger-prov-saldo').textContent;
  const monto=Number(saldoTxt.replace(/[$\s.]/g,''));
  cerrarModal('modal-ledger-prov');
  document.getElementById('ab-prov').value=prov;
  document.getElementById('ab-monto-prov').value=Math.round(monto);
  document.getElementById('ab-fecha-prov').value=hoy();
  document.getElementById('modal-abono-prov').classList.add('visible');
}

function abrirPagoParcialProv(){
  const prov=document.getElementById('ledger-prov-nombre').value;
  cerrarModal('modal-ledger-prov');
  document.getElementById('ab-prov').value=prov;
  document.getElementById('ab-monto-prov').value='';
  document.getElementById('ab-fecha-prov').value=hoy();
  document.getElementById('modal-abono-prov').classList.add('visible');
}

function abrirAbonoProv(prov, deuda){
  document.getElementById('ab-prov').value=prov;
  document.getElementById('ab-monto-prov').value=Math.round(deuda);
  document.getElementById('ab-fecha-prov').value=hoy();
  document.getElementById('modal-abono-prov').classList.add('visible');
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
    invalidarCacheDeudas(); cargarDeudaProveedores();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// PRODUCTOS
// ==========================================
async function cargarProductos(){
  const cont=document.getElementById('cont-productos');
  cont.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  try{
    productos=await apiGet('getProductos');
    if(!productos.length){cont.innerHTML='<div class="vacio"><span class="ico">🧀</span>No hay productos todavía.<br>Agregá el primero.</div>';return;}
    cont.innerHTML=productos.map((p,i)=>{
      const margen=p.precio>0&&p.precio_costo>0?Math.round((p.precio-p.precio_costo)/p.precio*100)+'%':null;
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${p.nombre}</div>
            <div class="item-det">Costo: ${$$(p.precio_costo)} · ${p.unidad}${margen?' · Margen: '+margen:''}</div>
            ${p.proveedor?`<div class="item-det" style="color:var(--verde-c)">🏭 ${p.proveedor}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="item-val">${$$(p.precio)}</div>
            <button class="btn btn-s btn-sm" onclick="abrirModalProducto(productos[${i}])">Editar</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}

async function abrirModalProducto(p){
  const editar=p!==null;
  document.getElementById('titulo-modal-prod').textContent=editar?'Editar producto':'Agregar producto';
  document.getElementById('p-modo').value=editar?'editar':'agregar';
  document.getElementById('p-nombre').value=editar?p.nombre:'';
  document.getElementById('p-nombre').readOnly=editar;
  document.getElementById('p-nombre').style.background=editar?'var(--gris-c)':'';
  document.getElementById('p-unidad').value=editar?p.unidad:'kg';
  document.getElementById('p-precio').value=editar?p.precio:'';
  document.getElementById('p-costo').value=editar?p.precio_costo:'';
  document.getElementById('p-margen').textContent='';
  try{
    const provs=await apiGet('getProveedores');
    document.getElementById('p-proveedor').innerHTML=
      '<option value="">Sin proveedor asignado</option>'+
      provs.map(pv=>`<option value="${pv.nombre}" ${editar&&p.proveedor===pv.nombre?'selected':''}>${pv.nombre}</option>`).join('');
  }catch(e){}
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
    await apiPost(modo==='agregar'?'agregarProducto':'editarProducto',{nombre,unidad,precio,precio_costo:costo,proveedor});
    cerrarModal('modal-producto'); ocultarToast(); toast('✅ Producto guardado','exito');
    cargarProductos();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// CLIENTES
// ==========================================
async function cargarClientes(){
  const cont=document.getElementById('cont-clientes');
  cont.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  try{
    const lista=await apiGet('getClientes');
    clientesCache=lista;
    if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">👤</span>No hay clientes todavía.</div>';return;}
    cont.innerHTML=lista.map((c,i)=>`
      <div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${nombreCompleto(c)}</div>
            <div class="item-det">${c.celular||'Sin celular'}</div>
          </div>
          <button class="btn btn-s btn-sm" onclick="abrirModalCliente(clientesCache[${i}])">Editar</button>
        </div>
      </div>`).join('');
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}

function abrirModalCliente(c){
  const editar=c!==null;
  document.getElementById('titulo-modal-cli').textContent=editar?'Editar cliente':'Agregar cliente';
  document.getElementById('cli-modo').value=editar?'editar':'agregar';
  document.getElementById('cli-nombre').value=editar?c.nombre:'';
  document.getElementById('cli-nombre').readOnly=editar;
  document.getElementById('cli-nombre').style.background=editar?'var(--gris-c)':'';
  document.getElementById('cli-apellido').value=editar?c.apellido:'';
  document.getElementById('cli-celular').value=editar?c.celular:'';
  document.getElementById('cli-eliminar-zona').style.display=editar?'block':'none';
  document.getElementById('modal-cliente').classList.add('visible');
}

async function confirmarEliminarCliente(){
  const nombre=document.getElementById('cli-nombre').value;
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
    await apiPost(modo==='agregar'?'agregarCliente':'editarCliente',{nombre,apellido,celular});
    cerrarModal('modal-cliente'); ocultarToast(); toast('✅ Cliente guardado','exito');
    cargarClientes();
    clientesCache=await apiGet('getClientes');
    // Autocomplete con nombre completo
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

function abrirQuickCliente(){
  document.getElementById('qcli-nombre').value='';
  document.getElementById('qcli-celular').value='';
  document.getElementById('modal-quick-cli').classList.add('visible');
}

async function guardarQuickCliente(){
  const nombre=document.getElementById('qcli-nombre').value.trim();
  const celular=document.getElementById('qcli-celular').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  const partes=nombre.split(' ');
  const nom=partes[0];
  const ape=partes.slice(1).join(' ');
  toast('Guardando...','guardando');
  try{
    await apiPost('agregarCliente',{nombre:nom,apellido:ape,celular});
    cerrarModal('modal-quick-cli'); ocultarToast(); toast('✅ '+nombre+' agregado','exito');
    document.getElementById('v-cliente').value=nombre;
    clientesCache=await apiGet('getClientes');
    // Autocomplete con nombre completo
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// REPORTES
// ==========================================
function cambiarTab(periodo,btn){
  periodoReporte=periodo;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('activo'));
  btn.classList.add('activo');
  const custom=document.getElementById('fechas-custom');
  if(periodo==='custom') custom.style.display='';
  else{custom.style.display='none'; cargarReporte();}
}

function getFechas(){
  const h=hoy();
  if(periodoReporte==='hoy') return{desde:h,hasta:h};
  if(periodoReporte==='semana'){const d=new Date();const dia=d.getDay()||7;d.setDate(d.getDate()-dia+1);return{desde:d.toISOString().split('T')[0],hasta:h};}
  if(periodoReporte==='mes'){const d=new Date();return{desde:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,hasta:h};}
  return{desde:document.getElementById('r-desde').value,hasta:document.getElementById('r-hasta').value};
}

async function cargarReporte(){
  const{desde,hasta}=getFechas();
  if(!desde||!hasta) return;
  const cont=document.getElementById('cont-reporte');
  cont.innerHTML='<div class="vacio"><span class="ico">⏳</span>Calculando...</div>';
  try{
    const [g, ventas, compras] = await Promise.all([
      apiGet('getGanancia',{desde,hasta}),
      apiGet('getVentas',{desde,hasta}),
      apiGet('getCompras',{desde,hasta})
    ]);

    const cobrado = ventas.pedidos.reduce((s,p)=>s+Number(p.monto_pagado),0);
    const pendienteDelPeriodo = g.total_ventas - cobrado;
    const ticketPromedio = g.cantidad_ventas > 0 ? g.total_ventas / g.cantidad_ventas : 0;
    const pctCobrado = g.total_ventas > 0 ? Math.round(cobrado / g.total_ventas * 100) : 0;

    // Clientes únicos que compraron en el período
    const clientesUnicos = new Set(ventas.pedidos.map(p=>p.cliente).filter(Boolean)).size;

    // Día con más ventas
    const ventasPorDia = {};
    ventas.pedidos.forEach(p=>{
      const f = p.fecha||'';
      ventasPorDia[f] = (ventasPorDia[f]||0) + Number(p.total);
    });
    const mejorDia = Object.entries(ventasPorDia).sort((a,b)=>b[1]-a[1])[0];

    // Desglose por forma de pago
    const pagos = {};
    ventas.pedidos.forEach(p=>{
      const k=p.forma_pago||'otro';
      pagos[k]=(pagos[k]||0)+Number(p.total);
    });

    // Top productos
    const topProd = {};
    ventas.pedidos.forEach(p=>{
      (p.items||[]).forEach(it=>{
        topProd[it.producto]=(topProd[it.producto]||0)+Number(it.subtotal);
      });
    });
    const topProdSorted = Object.entries(topProd).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Compras por proveedor
    const compProv = {};
    (compras.compras||[]).forEach(c=>{
      const k=c.proveedor||'Sin proveedor';
      compProv[k]=(compProv[k]||0)+Number(c.total);
    });
    const compProvSorted = Object.entries(compProv).sort((a,b)=>b[1]-a[1]);

    function barra(val,max,color){
      const pct=max>0?Math.round(val/max*100):0;
      return `<div style="background:var(--gris-c);border-radius:6px;height:8px;margin-top:4px">
        <div style="background:${color};height:8px;border-radius:6px;width:${pct}%"></div>
      </div>`;
    }

    const neg=g.ganancia<0;
    const hayDev = g.dev_a_proveedores > 0 || g.dev_de_clientes > 0;

    cont.innerHTML=`
      <!-- GANANCIA PRINCIPAL -->
      <div class="rep-grid">
        <div class="rep-card grande">
          <div class="rt">Ganancia del período ${hayDev?'<span style="font-size:10px">(neta, con devoluciones)</span>':''}</div>
          <div class="rv ${neg?'rojo':''}">${$$(g.ganancia)}</div>
          <div style="font-size:11px;color:var(--gris);margin-top:4px">Ventas: ${$$(g.ventas_netas)} · Compras: ${$$(g.compras_netas)}</div>
        </div>
        <div class="rep-card">
          <div class="rt">Ventas (${g.cantidad_ventas})</div>
          <div class="rv">${$$(g.total_ventas)}</div>
        </div>
        <div class="rep-card">
          <div class="rt">Compras (${g.cantidad_compras})</div>
          <div class="rv rojo">${$$(g.total_compras)}</div>
        </div>
      </div>

      <!-- MÉTRICAS CLAVE -->
      <div class="rep-grid-3" style="margin-bottom:12px">
        <div class="rep-card">
          <div class="rt">Ticket promedio</div>
          <div class="rv" style="font-size:16px">${ticketPromedio>0?$$(Math.round(ticketPromedio)):'—'}</div>
        </div>
        <div class="rep-card">
          <div class="rt">Clientes únicos</div>
          <div class="rv" style="font-size:22px">${clientesUnicos||'—'}</div>
        </div>
        <div class="rep-card">
          <div class="rt">Mejor día</div>
          <div class="rv" style="font-size:14px">${mejorDia?fmtFecha(mejorDia[0]):'—'}</div>
          ${mejorDia?`<div style="font-size:11px;color:var(--gris)">${$$(mejorDia[1])}</div>`:''}
        </div>
      </div>

      <!-- COBRADO VS PENDIENTE -->
      <div class="card">
        <div class="card-titulo">Cobrado vs. pendiente del período</div>
        <div class="rep-grid" style="margin-top:10px">
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gris)">Cobrado</div>
            <div style="font-size:20px;font-weight:700;color:var(--verde-c)">${$$(cobrado)}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gris)">Pendiente de cobro</div>
            <div style="font-size:20px;font-weight:700;color:${pendienteDelPeriodo>0?'var(--rojo)':'var(--verde-c)'}">${$$(pendienteDelPeriodo)}</div>
          </div>
        </div>
        ${g.total_ventas>0?barra(cobrado,g.total_ventas,'var(--verde-c)'):''}
        <div style="font-size:11px;color:var(--gris);text-align:right;margin-top:4px">${pctCobrado}% cobrado</div>
      </div>

      <!-- FORMA DE PAGO -->
      ${Object.keys(pagos).length?`
      <div class="card">
        <div class="card-titulo">Ventas por forma de pago</div>
        ${Object.entries(pagos).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
            <span style="font-size:14px">${k}</span>
            <strong>${$$(v)}</strong>
          </div>
          ${barra(v,g.total_ventas,k==='efectivo'?'var(--verde-c)':k==='transferencia'?'var(--azul-c)':'var(--amarillo)')}
        `).join('')}
      </div>`:''}

      <!-- TOP PRODUCTOS -->
      ${topProdSorted.length?`
      <div class="card">
        <div class="card-titulo">Top productos del período</div>
        ${topProdSorted.map(([prod,total],i)=>{
          const pct=topProdSorted[0][1]>0?Math.round(total/g.total_ventas*100):0;
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
            <div style="font-size:16px;font-weight:700;color:var(--gris);width:20px">${i+1}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600">${prod}</div>
              ${barra(total,topProdSorted[0][1],'var(--verde-c)')}
            </div>
            <div style="text-align:right">
              <strong style="white-space:nowrap">${$$(total)}</strong>
              <div style="font-size:11px;color:var(--gris)">${pct}% del total</div>
            </div>
          </div>`;
        }).join('')}
      </div>`:''}

      <!-- COMPRAS POR PROVEEDOR -->
      ${compProvSorted.length?`
      <div class="card">
        <div class="card-titulo">Compras por proveedor</div>
        ${compProvSorted.map(([prov,total])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
            <span style="font-size:14px">${prov}</span>
            <strong style="color:var(--rojo)">${$$(total)}</strong>
          </div>
          ${barra(total,compProvSorted[0][1],'var(--rojo)')}
        `).join('')}
      </div>`:''}

      ${hayDev?`
      <div class="card" style="background:var(--amarillo);color:#5a3d00">
        <div class="card-titulo" style="color:#5a3d00">Devoluciones del período</div>
        <div style="display:flex;justify-content:space-between;padding:4px 0">
          <span>A proveedores (resta deuda)</span><strong>${$$(g.dev_a_proveedores)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0">
          <span>De clientes (resta ingreso)</span><strong>${$$(g.dev_de_clientes)}</strong>
        </div>
      </div>`:''}
    `;
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}

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
  cont.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  try{
    const lista=await apiGet('getProveedores');
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
  document.getElementById('prov-nombre').readOnly=editar;
  document.getElementById('prov-nombre').style.background=editar?'var(--gris-c)':'';
  document.getElementById('prov-contacto').value=editar?p.contacto:'';
  document.getElementById('modal-proveedor').classList.add('visible');
}

async function guardarProveedor(){
  const modo=document.getElementById('prov-modo').value;
  const nombre=document.getElementById('prov-nombre').value.trim();
  const contacto=document.getElementById('prov-contacto').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  toast('Guardando...','guardando');
  try{
    await apiPost(modo==='agregar'?'agregarProveedor':'editarProveedor',{nombre,contacto});
    cerrarModal('modal-proveedor'); ocultarToast(); toast('✅ Proveedor guardado','exito');
    cargarProveedoresMgt();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// DEVOLUCIONES
// ==========================================
let _devolucionesCache = null;

async function abrirModalDevolucion(refId='', tipo='proveedor'){
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
      apiGet('getProductos'),
      apiGet('getClientes'),
      apiGet('getProveedores')
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

  toast('Guardando...','guardando');
  try {
    const r = await apiPost('registrarDevolucion', {
      tipo, contraparte, referencia_id: referencia,
      producto, cantidad, monto, motivo, resolucion, fecha,
      operador: operadorActual
    });
    cerrarModal('modal-devolucion');
    ocultarToast();
    toast(`↩️ Devolución registrada (${r.id})`, 'exito');
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
  lista.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
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

  lista.innerHTML = devs.map(d => `
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
          </div>
        </div>
        <div class="item-val" style="color:var(--rojo);flex-shrink:0">${$$(d.monto)}</div>
      </div>
    </div>`).join('');
}

// ==========================================
// DARK MODE
// ==========================================
function toggleModo(){
  const dark=document.body.classList.toggle('dark');
  document.getElementById('btn-modo').textContent=dark?'☀️':'🌙';
  localStorage.setItem('quesos-dark',dark?'1':'0');
}

// ==========================================
// INIT
// ==========================================
function init(){
  // Restaurar operador (nombre guardado en este dispositivo)
  operadorActual = localStorage.getItem(OP_KEY) || '';
  actualizarChipOperador();

  document.getElementById('v-fecha').value=hoy();
  document.getElementById('c-fecha').value=hoy();
  carrito=[{producto:'',precio_unitario:0,unidad:'kg',monto:'',cantidad:0}];
  cargarDatosVenta();
  cargarDatosCompra();
  cargarInicio();
  if(localStorage.getItem('quesos-dark')==='1'){
    document.body.classList.add('dark');
    document.getElementById('btn-modo').textContent='☀️';
  }
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});

  // Cargar operadores desde Sheets, luego mostrar selector si hace falta
  apiGet('getOperadores').then(lista => {
    if (Array.isArray(lista) && lista.length) operadoresCache = lista;
    // Si el modal ya está abierto, actualizar la lista en vivo
    const modal = document.getElementById('modal-operador');
    if (modal && modal.classList.contains('visible')) renderListaOperadores(true);
    // Si no hay operador elegido, mostrar selector ahora que tenemos la lista real
    if (!operadorActual) abrirSelectorOperador(true);
  }).catch(e => {
    console.warn('getOperadores falló, usando default:', e);
    if (!operadorActual) abrirSelectorOperador(true);
  });
}
init();
