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
let _contTeDeben = [];
let _contLeDebes = [];
let _cuentaSaldo = 0;
let _histCompras = [];
let _devsRender = [];
let _cuentaMovs = [];
let _cuentaNombre = '';
let _origNombre = '';
let _origApellido = '';
let _stockList = [];
let compraCarrito = [];

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
  const payload = Object.assign({operador: operadorActual}, datos||{});
  const r = await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({accion,datos:payload})});
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
function _norm(s){return (s||'').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ')}

// ==========================================
// NAVEGACIÓN
// ==========================================
const TITULOS={inicio:'Quesos Los Weys',venta:'Nueva Venta',compra:'Nueva Compra',deudas:'Deudas',mas:'Más opciones',productos:'Productos',clientes:'Clientes','proveedores-mgt':'Proveedores',reportes:'Reportes',devoluciones:'Devoluciones',historial:'Historial',stock:'Stock'};
const NAV_MAP={inicio:'nav-inicio',venta:'nav-venta',compra:'nav-compra',deudas:'nav-deudas',mas:'nav-mas',productos:'nav-mas',clientes:'nav-mas','proveedores-mgt':'nav-mas',reportes:'nav-mas',devoluciones:'nav-devoluciones',historial:'nav-mas',stock:'nav-mas'};

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
  if(p==='historial') cargarHistorial();
  if(p==='stock') cargarStock();
}

// ==========================================
// INICIO
// ==========================================
async function cargarInicio(){
  try{
    const d = await apiGet('getVentasHoy');
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
    const l=document.getElementById('ventas-hoy-lista');
    if(l) l.innerHTML='<div class="vacio"><span class="ico">❌</span>Sin conexión · '+e.message+'</div>';
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
  if(carrito.length===0){carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];}
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
  carrito.push({producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''});
  renderCarrito();
}

function quitarDelCarrito(i){
  if(carrito.length===1){toast('El pedido debe tener al menos un producto','error');return;}
  carrito.splice(i,1);
  renderCarrito();
}

function _hintVenta(item){
  const precio=Number(item.precio_unitario)||0, kg=Number(item.kg)||0, monto=Number(item.monto)||0;
  if(!(precio>0&&kg>0)) return '';
  const lista=Math.round(kg*precio);
  const red=monto-lista;
  let txt='Precio lista: '+$$(lista);
  if(monto>0&&red!==0) txt+=' · Redondeo: '+(red>0?'+':'−')+$$(Math.abs(red));
  return txt;
}

function renderCarrito(){
  const el=document.getElementById('carrito-items');
  el.innerHTML=carrito.map((item,i)=>{
    const unidLabel=item.unidad==='unidad'?'Cantidad (unid)':'Peso (kg)';
    return `
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
          <div class="fila" style="gap:8px">
            <div class="campo" style="margin-bottom:0">
              <label>${unidLabel}</label>
              <input type="number" id="kg-${i}" value="${item.kg}" placeholder="0" min="0" step="0.01"
                oninput="alCambiarKgCarrito(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
            <div class="campo" style="margin-bottom:0">
              <label>Monto a cobrar ($)</label>
              <input type="number" id="monto-${i}" value="${item.monto}" placeholder="0" min="0" step="1"
                oninput="alCambiarMontoVenta(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
          </div>
          <div class="hint" id="hint-${i}">${_hintVenta(item)}</div>
        </div>
        <button onclick="quitarDelCarrito(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>`;
  }).join('');
  actualizarTotalCarrito();
}

function alElegirProdCarrito(i,sel){
  const opt=sel.options[sel.selectedIndex];
  carrito[i].producto=sel.value;
  carrito[i].precio_unitario=Number(opt.dataset.precio)||0;
  carrito[i].unidad=opt.dataset.unidad||'kg';
  if(carrito[i].precio_unitario>0&&Number(carrito[i].kg)>0) carrito[i].monto=Math.round(Number(carrito[i].kg)*carrito[i].precio_unitario);
  renderCarrito();
}

function alCambiarKgCarrito(i,val){
  carrito[i].kg=val;
  if(carrito[i].precio_unitario>0&&Number(val)>0){
    carrito[i].monto=Math.round(Number(val)*carrito[i].precio_unitario);
    const mi=document.getElementById('monto-'+i); if(mi) mi.value=carrito[i].monto;
  }
  const hi=document.getElementById('hint-'+i); if(hi) hi.textContent=_hintVenta(carrito[i]);
  actualizarTotalCarrito();
}

function alCambiarMontoVenta(i,val){
  carrito[i].monto=val;
  const hi=document.getElementById('hint-'+i); if(hi) hi.textContent=_hintVenta(carrito[i]);
  actualizarTotalCarrito();
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
  if(carrito.some(i=>!i.producto||!(Number(i.kg)>0)||!(Number(i.monto)>0))){toast('Completá producto, kg y monto de cada renglón','error');return;}
  const total=carrito.reduce((s,i)=>s+Number(i.monto),0);
  const pagado=parseFloat(document.getElementById('v-pagado').value)||0;
  const pago=document.getElementById('v-pago').value;
  const cliente=document.getElementById('v-cliente').value.trim();
  if(pagado>total){toast('El monto pagado no puede superar el total','error');return;}
  if(pago==='crédito'&&!cliente){toast('Para ventas a crédito el cliente es obligatorio','error');return;}
  document.getElementById('conf-items').innerHTML=carrito.map(i=>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee">
      <span>${i.producto} <span style="color:var(--gris);font-size:12px">(${Number(i.kg)} ${i.unidad})</span></span>
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
    cantidad:Number(i.kg)||0,
    precio_unitario:i.precio_unitario,
    subtotal:Number(i.monto)
  }));
  const descripcion=carrito.map(i=>i.producto+' ('+(Number(i.kg)||0)+' '+i.unidad+')').join(', ');

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  try{
    await apiPost('registrarPedido',{fecha,cliente,forma_pago,monto_pagado,total,descripcion,items,operador:operadorActual});
    cerrarModal('modal-confirmar');
    toast('✅ Pedido guardado','exito');
    carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];
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
      kg:Number(it.cantidad)||'',
      monto:Number(it.subtotal)||''
    };
  });
  if(!carritoEdit.length) carritoEdit=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];
  renderCarritoEdit();
  document.getElementById('modal-editar-pedido').classList.add('visible');
}

function renderCarritoEdit(){
  const el=document.getElementById('edit-items-lista');
  el.innerHTML=carritoEdit.map((item,i)=>{
    const unidLabel=item.unidad==='unidad'?'Cantidad (unid)':'Peso (kg)';
    return `
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
          <div class="fila" style="gap:8px">
            <div class="campo" style="margin-bottom:0">
              <label>${unidLabel}</label>
              <input type="number" id="ekg-${i}" value="${item.kg}" placeholder="0" min="0" step="0.01" oninput="alCambiarKgEdit(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
            <div class="campo" style="margin-bottom:0">
              <label>Monto ($)</label>
              <input type="number" id="emonto-${i}" value="${item.monto}" placeholder="0" min="0" step="1" oninput="alCambiarMontoEdit(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
          </div>
          <div class="hint" id="ehint-${i}">${_hintVenta(item)}</div>
        </div>
        <button onclick="quitarItemEdit(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>`;
  }).join('')
    + `<button class="btn btn-s" onclick="agregarItemEdit()" style="margin-bottom:6px">+ Agregar producto</button>`;
}

function alElegirProdEdit(i,sel){
  const opt=sel.options[sel.selectedIndex];
  carritoEdit[i].producto=sel.value;
  carritoEdit[i].precio_unitario=Number(opt.dataset.precio)||0;
  carritoEdit[i].unidad=opt.dataset.unidad||'kg';
  if(carritoEdit[i].precio_unitario>0&&Number(carritoEdit[i].kg)>0) carritoEdit[i].monto=Math.round(Number(carritoEdit[i].kg)*carritoEdit[i].precio_unitario);
  renderCarritoEdit();
}

function alCambiarKgEdit(i,val){
  carritoEdit[i].kg=val;
  if(carritoEdit[i].precio_unitario>0&&Number(val)>0){
    carritoEdit[i].monto=Math.round(Number(val)*carritoEdit[i].precio_unitario);
    const mi=document.getElementById('emonto-'+i); if(mi) mi.value=carritoEdit[i].monto;
  }
  const hi=document.getElementById('ehint-'+i); if(hi) hi.textContent=_hintVenta(carritoEdit[i]);
}

function alCambiarMontoEdit(i,val){
  carritoEdit[i].monto=val;
  const hi=document.getElementById('ehint-'+i); if(hi) hi.textContent=_hintVenta(carritoEdit[i]);
}

function agregarItemEdit(){
  carritoEdit.push({producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''});
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
  if(carritoEdit.some(it=>!it.producto||!(Number(it.kg)>0)||!(Number(it.monto)>0))){toast('Completá producto, kg y monto de cada renglón','error');return;}
  const total=carritoEdit.reduce((s,it)=>s+Number(it.monto),0);
  if(monto_pagado>total){toast('El monto pagado no puede superar el total','error');return;}
  if(forma_pago==='crédito'&&!cliente){toast('Para ventas a crédito el cliente es obligatorio','error');return;}
  const items=carritoEdit.map(it=>({
    producto:it.producto,
    cantidad:Number(it.kg)||0,
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
  if(!compraCarrito.length) compraCarrito=[{producto:'',cantidad:'',total:''}];
  renderCompraItems();
  cargarHistorialCompras();
}

async function cargarHistorialCompras(){
  const lista=document.getElementById('hist-compras-lista');
  if(!lista) return;
  lista.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  try{
    const r=await apiGet('getCompras',{desde:'2000-01-01',hasta:'2099-12-31'});
    const compras=(r.compras||[]).slice().reverse().slice(0,15);
    _histCompras=compras;
    if(!compras.length){lista.innerHTML='<div class="vacio"><span class="ico">📦</span>Sin compras registradas</div>';return;}
    lista.innerHTML=compras.map((c,i)=>{
      const deuda=Number(c.total)-Number(c.monto_pagado);
      const badge=c.forma_pago==='efectivo'?'badge-efectivo':c.forma_pago==='transferencia'?'badge-trans':'badge-credito';
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${escH(c.proveedor)} <span class="badge ${badge}">${c.forma_pago||''}</span></div>
            <div class="item-det">${escH(c.producto_insumo)} · ${c.cantidad} · ${fmtFecha(c.fecha)}</div>
            ${deuda>0?`<div class="item-det" style="color:var(--rojo)">Pendiente: ${$$(deuda)}</div>`:''}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-s btn-sm" onclick="abrirEdicionCompra(${i})">✏️ Editar</button>
              <button class="btn btn-s btn-sm" onclick="abrirModalDevolucion('${escH(c.id)}','proveedor')">↩️ Devolver</button>
            </div>
          </div>
          <div class="item-val">${$$(c.total)}</div>
        </div>
      </div>`;
    }).join('');
  }catch(e){lista.innerHTML='<div class="vacio"><span class="ico">❌</span>Error al cargar</div>';}
}

function _prodCat(nombre){
  const n=(nombre||'').toString().trim().toLowerCase();
  return (productosCompraCache||[]).find(p=>p.nombre.toLowerCase()===n)||null;
}

function _hintCompra(i){
  const item=compraCarrito[i]; if(!item) return '';
  const cant=Number(item.cantidad)||0, total=Number(item.total)||0;
  const costo= cant>0&&total>0? total/cant : 0;
  const cat=_prodCat(item.producto);
  const unid= cat? cat.unidad : 'u';
  let hint = costo>0 ? ('Costo: $'+costo.toFixed(2)+'/'+unid) : '';
  if(cat && cat.precio_costo!==undefined && cat.precio_costo!=='') hint += (hint?' · ':'') + 'catálogo $'+Number(cat.precio_costo);
  const mostrar = cat && costo>0 && Math.abs(costo-Number(cat.precio_costo||0))>=1;
  if(mostrar) hint += ` <button class="btn btn-s btn-sm" style="padding:2px 8px;font-size:11px" onclick="actualizarCostoLinea(${i})">Actualizar costo</button>`;
  return hint;
}

function renderCompraItems(){
  const el=document.getElementById('compra-items'); if(!el) return;
  el.innerHTML=compraCarrito.map((item,i)=>`
    <div class="carrito-item">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div class="campo" style="margin-bottom:8px">
            <label>Producto / Insumo</label>
            <input type="text" list="lista-productos-compra" value="${escH(item.producto)}" placeholder="Ej: Mozzarella, leche cruda..." autocomplete="off" oninput="alCambiarProdCompra(${i},this.value)"/>
          </div>
          <div class="fila" style="gap:8px">
            <div class="campo" style="margin-bottom:0">
              <label>Peso / Cantidad</label>
              <input type="number" id="cqty-${i}" value="${item.cantidad}" min="0" step="0.01" placeholder="0" oninput="alCambiarCantCompra(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
            <div class="campo" style="margin-bottom:0">
              <label>Precio total ($)</label>
              <input type="number" id="ctot-${i}" value="${item.total}" min="0" step="1" placeholder="0" oninput="alCambiarTotalCompra(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
          </div>
          <div class="hint gris" id="chint-${i}">${_hintCompra(i)}</div>
        </div>
        <button onclick="quitarItemCompra(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>`).join('');
  actualizarTotalCompra();
}

function agregarItemCompra(){ compraCarrito.push({producto:'',cantidad:'',total:''}); renderCompraItems(); }
function quitarItemCompra(i){ if(compraCarrito.length===1){toast('La compra debe tener al menos un producto','error');return;} compraCarrito.splice(i,1); renderCompraItems(); }

function alCambiarProdCompra(i,val){
  compraCarrito[i].producto=val;
  const cat=_prodCat(val);
  if(cat&&cat.proveedor){
    const selProv=document.getElementById('c-proveedor');
    for(let k=0;k<selProv.options.length;k++){ if(selProv.options[k].value===cat.proveedor){ selProv.selectedIndex=k; break; } }
    document.getElementById('c-prov-hint').textContent='Pre-llenado desde el producto';
  }
  const hi=document.getElementById('chint-'+i); if(hi) hi.innerHTML=_hintCompra(i);
}
function alCambiarCantCompra(i,val){
  compraCarrito[i].cantidad=val;
  const hi=document.getElementById('chint-'+i); if(hi) hi.innerHTML=_hintCompra(i);
}
function alCambiarTotalCompra(i,val){
  compraCarrito[i].total=val;
  const hi=document.getElementById('chint-'+i); if(hi) hi.innerHTML=_hintCompra(i);
  actualizarTotalCompra();
}
function actualizarTotalCompra(){
  const total=compraCarrito.reduce((s,i)=>s+(Number(i.total)||0),0);
  const el=document.getElementById('c-total-display'); if(el) el.textContent=$$(total);
  alCambiarPagoCompra();
}

async function actualizarCostoLinea(i){
  const item=compraCarrito[i]; const cat=_prodCat(item&&item.producto);
  if(!cat) return;
  const cant=Number(item.cantidad)||0, total=Number(item.total)||0;
  const costo=cant>0?total/cant:0;
  if(!(costo>0)) return;
  toast('Actualizando costo...','guardando');
  try{
    await apiPost('editarProducto',{nombre:cat.nombre, precio:Number(cat.precio), unidad:cat.unidad, precio_costo:Math.round(costo), proveedor:cat.proveedor||''});
    productosCompraCache=await apiGet('getProductos'); productos=productosCompraCache;
    renderCompraItems();
    ocultarToast(); toast('✅ Costo de '+cat.nombre+' actualizado','exito');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

function alCambiarPagoCompra(){
  const pago=document.getElementById('c-pago').value;
  const total=compraCarrito.reduce((s,i)=>s+(Number(i.total)||0),0);
  if(pago!=='crédito') document.getElementById('c-pagado').value=total>0?Math.round(total):'';
}

// Abre modal de confirmación antes de guardar
function abrirConfirmacionCompra(){
  const proveedor=document.getElementById('c-proveedor').value;
  const forma_pago=document.getElementById('c-pago').value;
  const monto_pagado=parseFloat(document.getElementById('c-pagado').value)||0;
  const fecha=document.getElementById('c-fecha').value||hoy();
  if(!proveedor){toast('Ingresá el proveedor','error');return;}
  if(compraCarrito.some(it=>!it.producto||!(Number(it.cantidad)>0)||!(Number(it.total)>0))){toast('Completá producto, cantidad y precio de cada renglón','error');return;}
  const total=compraCarrito.reduce((s,it)=>s+Number(it.total),0);
  if(monto_pagado>total){toast('Monto pagado no puede superar el total','error');return;}
  const badge=forma_pago==='efectivo'?'badge-efectivo':forma_pago==='transferencia'?'badge-trans':'badge-credito';
  const resta=total-monto_pagado;
  const lineas=compraCarrito.map(it=>{
    const costo=Number(it.cantidad)>0?Number(it.total)/Number(it.cantidad):0;
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee">
      <span>${escH(it.producto)} <span style="color:var(--gris);font-size:12px">(${Number(it.cantidad)}${costo>0?' · $'+costo.toFixed(2)+'/u':''})</span></span>
      <strong>${$$(it.total)}</strong></div>`;
  }).join('');
  document.getElementById('cc-resumen').innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Proveedor</span><strong>${escH(proveedor)}</strong>
    </div>
    ${lineas}
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
    <div style="font-size:12px;color:var(--gris);margin-top:4px">Fecha: ${fmtFecha(fecha)}</div>`;
  document.getElementById('modal-confirmar-compra').classList.add('visible');
}

async function guardarCompra(){
  const btn=document.getElementById('btn-confirmar-compra');
  const proveedor=document.getElementById('c-proveedor').value;
  const forma_pago=document.getElementById('c-pago').value;
  const monto_pagado=parseFloat(document.getElementById('c-pagado').value)||0;
  const fecha=document.getElementById('c-fecha').value||hoy();
  const items=compraCarrito.map(it=>{
    const cantidad=Number(it.cantidad)||0, total=Number(it.total)||0;
    return {producto:(it.producto||'').trim(), cantidad, total, costo_unitario: cantidad>0?total/cantidad:0};
  });
  const total=items.reduce((s,it)=>s+it.total,0);

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarCompra',{fecha,proveedor,forma_pago,monto_pagado,items});
    cerrarModal('modal-confirmar-compra'); ocultarToast();
    const deuda=total-monto_pagado;
    const badge=forma_pago==='efectivo'?'badge-efectivo':forma_pago==='transferencia'?'badge-trans':'badge-credito';
    const lineasTicket=items.map(it=>`<div style="color:var(--gris)">${escH(it.producto)} · ${it.cantidad}</div>`).join('');
    document.getElementById('ticket-compra-body').innerHTML=`
      <div class="item" style="background:var(--gris-c);border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="font-size:13px;color:var(--gris);margin-bottom:6px">${fmtFecha(fecha)}</div>
        <div style="font-weight:600;font-size:16px;margin-bottom:2px">${escH(proveedor)}</div>
        <div style="margin-bottom:8px">${lineasTicket}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge ${badge}">${forma_pago}</span>
          <span style="font-size:18px;font-weight:700">${$$(total)}</span>
        </div>
        ${monto_pagado>0&&monto_pagado<total?`<div style="font-size:13px;color:var(--gris);margin-top:6px">Pagado: ${$$(monto_pagado)} · <span style="color:var(--rojo)">Pendiente: ${$$(deuda)}</span></div>`:''}
        ${monto_pagado===0?`<div style="font-size:13px;color:var(--rojo);margin-top:6px">⚠️ Pendiente total: ${$$(total)}</div>`:''}
        ${monto_pagado>=total?`<div style="font-size:13px;color:var(--verde-c);margin-top:6px">✅ Pagado en su totalidad</div>`:''}
      </div>`;
    document.getElementById('modal-ticket-compra').classList.add('visible');
    compraCarrito=[{producto:'',cantidad:'',total:''}];
    renderCompraItems();
    document.getElementById('c-pagado').value='';
    document.getElementById('c-proveedor').selectedIndex=0;
    document.getElementById('c-prov-hint').textContent='Se pre-llena según el producto elegido';
    document.getElementById('c-pago').value='efectivo';
    document.getElementById('c-fecha').value=hoy();
    cargarHistorialCompras();
    productos=await apiGet('getProductos'); productosCompraCache=productos;
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
  const contactos=await apiGet('getDeudaContactos').catch(()=>[]);
  renderTeDeben(contactos.filter(c=>c.neto>0.01));
  renderLeDebes(contactos.filter(c=>c.neto<-0.01));
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
          <div class="item-nombre">${d.contacto}</div>
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
          <div class="item-nombre">${d.contacto}</div>
          <div class="item-det">${d.total_ventas>0?'🔁 También te compra · ':''}Compras: ${$$(d.total_compras)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(Math.abs(d.neto))}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

async function abrirCuentaContacto(nombre){
  document.getElementById('cuenta-titulo').textContent='Cuenta: '+nombre;
  document.getElementById('cuenta-nombre').value=nombre;
  _cuentaNombre=nombre;
  document.getElementById('cuenta-tabla').innerHTML='<div class="vacio"><span class="ico">⏳</span></div>';
  document.getElementById('modal-contacto').classList.add('visible');
  try{
    const h=await apiGet('getHistorialContacto',{contacto:nombre});
    _cuentaSaldo=h.saldo_total;
    renderCuentaContacto(h);
  }catch(e){document.getElementById('cuenta-tabla').innerHTML='<div class="vacio">Error: '+e.message+'</div>';}
}

function renderCuentaContacto(h){
  _cuentaMovs=h.movimientos; _cuentaNombre=h.contacto;
  const rows=h.movimientos.map((m,i)=>{
    const pos=m.delta>=0;
    const colorMonto=pos?'var(--rojo)':'var(--verde-c)';
    const colorSaldo=m.saldo>0.01?'var(--rojo)':(m.saldo<-0.01?'var(--azul)':'var(--gris)');
    return `<div class="ledger-row">
      <div style="flex:1">
        <div style="font-weight:500">${fmtFecha(m.fecha)}</div>
        <div style="font-size:12px;color:var(--gris)">${m.descripcion}</div>
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
            <div class="item-det">Costo: ${$$(p.precio_costo)} · ${p.unidad}${margen?' · Margen: '+margen:''}${(p.stock!==undefined&&p.stock!=='')?' · Stock: '+Number(p.stock).toLocaleString('es-AR')+' '+p.unidad:''}</div>
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
  document.getElementById('p-nombre').readOnly=false;
  document.getElementById('p-nombre').style.background='';
  _origNombre=editar?p.nombre:'';
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
    clientesCache=await apiGet('getClientes');
    // Autocomplete con nombre completo
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
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
    clientesCache=await apiGet('getClientes');
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
    const [g, ventas, compras, contactos] = await Promise.all([
      apiGet('getGanancia',{desde,hasta}),
      apiGet('getVentas',{desde,hasta}),
      apiGet('getCompras',{desde,hasta}),
      apiGet('getDeudaContactos').catch(()=>[])
    ]);

    const ticketPromedio = g.cantidad_ventas > 0 ? g.total_ventas / g.cantidad_ventas : 0;
    // Pendiente actual (total y al día, igual que en Deudas)
    const pendienteCobro = (contactos||[]).filter(c=>c.neto>0).reduce((s,c)=>s+c.neto,0);
    const pendientePago  = (contactos||[]).filter(c=>c.neto<0).reduce((s,c)=>s-c.neto,0);

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

    const gananciaReal=(g.ganancia_real!==undefined)?Number(g.ganancia_real):Number(g.ganancia);
    const neg=gananciaReal<0;
    const cogs=Number(g.costo_mercaderia||0);
    const redondeo=Number(g.redondeo||0);
    const hayDev = g.dev_a_proveedores > 0 || g.dev_de_clientes > 0;

    cont.innerHTML=`
      <!-- GANANCIA PRINCIPAL -->
      <div class="rep-grid">
        <div class="rep-card grande">
          <div class="rt">Ganancia real del período <span style="font-size:10px">(ventas − costo de lo vendido)</span></div>
          <div class="rv ${neg?'rojo':''}">${$$(gananciaReal)}</div>
          <div style="font-size:11px;color:var(--gris);margin-top:4px">Ventas: ${$$(g.ventas_netas)} · Costo merc.: ${$$(cogs)}</div>
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

      ${(g.redondeo!==undefined)?`
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="card-titulo">Redondeo del período</div>
          <div style="font-size:11px;color:var(--gris)">Diferencia entre el precio de lista y lo que cobraste</div>
        </div>
        <div style="font-size:20px;font-weight:700;color:${redondeo<0?'var(--rojo)':'var(--verde-c)'}">${redondeo>=0?'+':'−'}${$$(Math.abs(redondeo))}</div>
      </div>`:''}

      <!-- PENDIENTE DE COBRO / PAGO (total y al día, igual que Deudas) -->
      <div class="card">
        <div class="card-titulo">Pendiente (al día de hoy)</div>
        <div class="rep-grid" style="margin-top:10px">
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gris)">Pendiente de cobro</div>
            <div style="font-size:22px;font-weight:800;color:${pendienteCobro>0?'var(--rojo)':'var(--verde-c)'}">${pendienteCobro>0?$$(pendienteCobro):'✅ Al día'}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gris)">Pendiente de pago</div>
            <div style="font-size:22px;font-weight:800;color:${pendientePago>0?'var(--rojo)':'var(--verde-c)'}">${pendientePago>0?$$(pendientePago):'✅ Al día'}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--gris);text-align:center;margin-top:6px">Lo que te deben y lo que debés, total y actualizado</div>
      </div>

      <!-- TICKET PROMEDIO -->
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-titulo" style="margin:0">Ticket promedio</div>
        <div style="font-size:20px;font-weight:800;color:var(--azul)">${ticketPromedio>0?$$(Math.round(ticketPromedio)):'—'}</div>
      </div>

      <!-- FORMA DE PAGO -->
      ${Object.keys(pagos).length?`
      <div class="card">
        <div class="card-titulo">Ventas por forma de pago</div>
        ${Object.entries(pagos).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
          const pct=g.total_ventas>0?Math.round(v/g.total_ventas*100):0;
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
            <span style="font-size:14px">${k}</span>
            <strong>${$$(v)} <span style="font-size:12px;color:var(--gris);font-weight:600">(${pct}%)</span></strong>
          </div>
          ${barra(v,g.total_ventas,k==='efectivo'?'var(--verde-c)':k==='transferencia'?'var(--azul-c)':'var(--amarillo)')}`;
        }).join('')}
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
    const provs=await apiGet('getProveedores');
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
    const [prods, clis, provs]=await Promise.all([apiGet('getProductos'),apiGet('getClientes'),apiGet('getProveedores')]);
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

async function cargarHistorial(periodo='semana', btn){
  if(btn){ document.querySelectorAll('#pantalla-historial .tab').forEach(t=>t.classList.remove('activo')); btn.classList.add('activo'); }
  const cont=document.getElementById('cont-historial');
  cont.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
  let desde='2000-01-01', hasta='2099-12-31';
  const h=hoy();
  if(periodo==='hoy'){ desde=h; hasta=h; }
  else if(periodo==='semana'){ const d=new Date(); const dia=d.getDay()||7; d.setDate(d.getDate()-dia+1); desde=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(d); hasta=h; }
  else if(periodo==='mes'){ const d=new Date(); desde=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; hasta=h; }
  try{
    const r=await apiGet('getAuditoria',{desde,hasta});
    renderHistorial(r.movimientos||[]);
  }catch(e){ cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>'; }
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
  cont.innerHTML='<div class="vacio"><span class="ico">⏳</span>Cargando...</div>';
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

// ==========================================
// INIT
// ==========================================
function init(){
  // Restaurar operador (nombre guardado en este dispositivo)
  operadorActual = localStorage.getItem(OP_KEY) || '';
  actualizarChipOperador();

  document.getElementById('v-fecha').value=hoy();
  document.getElementById('c-fecha').value=hoy();
  carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];
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
