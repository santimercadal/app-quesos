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
let _cuentaRango = '30d';       // período elegido para el ticket de estado de cuenta
let _origNombre = '';
let _origApellido = '';
let _stockList = [];
let compraCarrito = [];
let _clientesRender = [];
let _histAll = [];
let _comprasHoy = [];          // compras del día en el feed de inicio
let _histVR = [];              // ventas renderizadas en Historial
let _histCR = [];              // compras renderizadas en Historial
let _ultimaCompraTicket = null; // última compra guardada (para su ticket)

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
  const chipSide = document.getElementById('chip-operador-side');
  if (chipSide) chipSide.textContent = val;
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
// API + CACHE
// ==========================================
// Cada llamada al Apps Script cuesta ~2 s fijos, sin importar cuántos datos
// devuelva. Por eso acá el objetivo no es que las consultas sean rápidas sino
// (a) hacer menos, (b) no repetir la misma dos veces, y (c) no hacer esperar a
// nadie: se pinta lo último que sabemos y se corrige cuando llega lo fresco.

const _cache    = {};   // memoria de esta sesión:  clave -> {data, ts}
const _inflight = {};   // pedidos en curso:        clave -> Promise
const _sucio    = {};   // claves que una escritura dejó vencidas
const _CACHE_TTL = 90000;
const LSK = 'qc-';      // prefijo de las claves en localStorage

function _ck(accion, params){ return accion + '|' + JSON.stringify(params||{}); }

function _lsLeer(k){
  try{ const r = localStorage.getItem(LSK+k); return r ? JSON.parse(r) : null; }
  catch(e){ return null; }
}
function _lsGuardar(k, data){
  try{ localStorage.setItem(LSK+k, JSON.stringify({data, ts:Date.now()})); }
  catch(e){ _lsBorrarTodo(); }   // sin espacio: tiramos el caché y seguimos
}
function _lsClaves(){
  const out = [];
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.indexOf(LSK)===0) out.push(k.slice(LSK.length)); } }
  catch(e){}
  return out;
}
function _lsBorrarTodo(){
  try{ _lsClaves().forEach(k=>localStorage.removeItem(LSK+k)); }catch(e){}
}

// ---------- LECTURA CRUDA ----------
// Con timeout: si la señal está mal, falla en 12 s en vez de quedar colgado.
async function apiGet(accion, params={}, ms=12000){
  const qs = new URLSearchParams({accion,...params}).toString();
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const reloj = ctrl ? setTimeout(()=>ctrl.abort(), ms) : null;
  let r;
  try{
    r = await fetch(`${API}?${qs}`, ctrl ? {signal:ctrl.signal} : undefined);
  }catch(e){
    if(reloj) clearTimeout(reloj);
    if(e && e.name === 'AbortError') throw new Error('La conexión tardó demasiado');
    throw new Error('Sin conexión');
  }
  if(reloj) clearTimeout(reloj);
  if(!r.ok) throw new Error('Error de red ('+r.status+')');
  const d = await r.json();
  if(!d.ok) throw new Error(d.error||'Error del servidor');
  return d.datos;
}

// ---------- ESCRITURA ----------
// A propósito SIN timeout: cortar un POST que ya llegó al servidor haría creer
// que no se guardó, y una venta registrada dos veces es peor que una espera.
async function apiPost(accion, datos) {
  const payload = Object.assign({operador: operadorActual}, datos||{});
  const r = await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({accion,datos:payload})});
  if (!r.ok) throw new Error('Error de red ('+r.status+')');
  const d = await r.json();
  if (!d.ok) throw new Error(d.error||'Error del servidor');
  invalidarCache(accion);
  return d.datos;
}

// ---------- PEDIDO DEDUPLICADO ----------
// Si dos pantallas piden lo mismo en el mismo instante, sale un solo request y
// la segunda se cuelga del primero.
function apiGetDedup(accion, params){
  const k = _ck(accion, params);
  if(_inflight[k]) return _inflight[k];
  const p = apiGet(accion, params||{}).then(data=>{
    _cache[k] = {data, ts:Date.now()};
    delete _sucio[k];
    _lsGuardar(k, data);
    delete _inflight[k];
    return data;
  }).catch(e=>{ delete _inflight[k]; throw e; });
  _inflight[k] = p;
  return p;
}

// Caché en memoria con vencimiento corto.
async function apiGetCached(accion, params){
  const k = _ck(accion, params);
  const e = _cache[k];
  if(e && !_sucio[k] && (Date.now()-e.ts) < _CACHE_TTL) return e.data;
  return apiGetDedup(accion, params);
}

// Lo último que sabemos, sin pedir nada al servidor.
// Devuelve null si nunca se guardó o si una escritura lo dejó vencido.
function cacheLocal(accion, params){
  const k = _ck(accion, params);
  if(_sucio[k]) return null;
  if(_cache[k]) return _cache[k].data;
  const ls = _lsLeer(k);
  if(ls && ls.data !== undefined){
    _cache[k] = {data: ls.data, ts: 0};   // ts 0 => vencido, se revalida igual
    return ls.data;
  }
  return null;
}

function _sembrar(accion, params, data){
  if(data === undefined || data === null) return;
  const k = _ck(accion, params);
  _cache[k] = {data, ts: Date.now()};
  delete _sucio[k];
  _lsGuardar(k, data);
}

// ---------- INVALIDACIÓN ----------
// Qué caché ensucia cada escritura. Lo que NO está en esta tabla ensucia todo
// (red de seguridad: preferimos un request de más antes que un dato viejo).
// "Ensuciar" no borra: marca la clave como vencida. Así seguimos teniendo el
// último valor en disco por si hace falta, pero nunca se muestra como bueno.
const _ENSUCIA = {
  agregarProducto:   ['getProductos','getStock','getBootstrap'],
  editarProducto:    ['getProductos','getStock','getBootstrap'],
  ajustarStock:      ['getProductos','getStock','getBootstrap'],
  agregarCliente:    ['getClientes','getBootstrap'],
  editarCliente:     ['getClientes','getBootstrap'],
  eliminarCliente:   ['getClientes','getBootstrap'],
  agregarProveedor:  ['getProveedores','getBootstrap'],
  editarProveedor:   ['getProveedores','getBootstrap'],
  eliminarProveedor: ['getProveedores','getBootstrap'],
  guardarOperadores: ['getOperadores','getBootstrap']
  // renombrar* y todo lo de ventas/compras/pagos/devoluciones cae en "todo".
};

function invalidarCache(accion){
  const lista = accion ? _ENSUCIA[accion] : null;
  const todas = new Set(Object.keys(_cache).concat(_lsClaves()));
  const marcar = k => { _sucio[k] = true; if(_cache[k]) _cache[k].ts = 0; };
  if(!lista){ todas.forEach(marcar); return; }
  const set = new Set(lista);
  todas.forEach(k => { if(set.has(k.split('|')[0])) marcar(k); });
}

// ==========================================
// LLAMADAS COMBINADAS
// ==========================================
// El Apps Script nuevo trae getBootstrap / getInicio / getReporte, que juntan
// en un solo viaje lo que antes eran 4, 2 y 4 requests. Si todavía no lo
// republicaste, cada una detecta que el servidor no la conoce y cae sola a los
// endpoints de siempre: podés subir el frontend hoy y el script cuando quieras.
// Si el Apps Script todavía no conoce un endpoint combinado, lo anotamos por
// 24 h en el teléfono: así no gastamos un request en preguntar de nuevo en cada
// apertura. Pasado ese día vuelve a probar solo, y el día que republiques el
// script la app se pasa sola a la vía rápida sin que toques nada.
const _noSoportado = {};
const NOSOP_TTL = 86400000;
function _esDesconocida(e){ return /no reconocida/i.test((e && e.message) || ''); }
function _soporta(accion){
  if(_noSoportado[accion]) return false;
  try{
    const t = Number(localStorage.getItem(LSK+'nosop-'+accion) || 0);
    if(t && (Date.now()-t) < NOSOP_TTL){ _noSoportado[accion] = true; return false; }
  }catch(e){}
  return true;
}
function _marcarNoSoportado(accion){
  _noSoportado[accion] = true;
  try{ localStorage.setItem(LSK+'nosop-'+accion, String(Date.now())); }catch(e){}
}

// Datos maestros: productos + clientes + proveedores + operadores.
async function cargarMaestros(){
  if(_soporta('getBootstrap')){
    try{
      const b = await apiGetDedup('getBootstrap', {});
      _sembrar('getProductos',   {}, b.productos);
      _sembrar('getClientes',    {}, b.clientes);
      _sembrar('getProveedores', {}, b.proveedores);
      _sembrar('getOperadores',  {}, b.operadores);
      return b;
    }catch(e){
      if(!_esDesconocida(e)) throw e;
      _marcarNoSoportado('getBootstrap');
    }
  }
  const [prods, clis, provs, ops] = await Promise.all([
    apiGetCached('getProductos'),
    apiGetCached('getClientes'),
    apiGetCached('getProveedores'),
    apiGetCached('getOperadores').catch(()=>null)
  ]);
  return {productos:prods, clientes:clis, proveedores:provs, operadores:ops};
}

// Feed del inicio: ventas del día + compras del día.
async function cargarInicioDatos(){
  const h = hoy();
  if(_soporta('getInicio')){
    try{
      const r = await apiGetDedup('getInicio', {});
      return {ventas: r.ventas, compras: r.compras};
    }catch(e){
      if(!_esDesconocida(e)) throw e;
      _marcarNoSoportado('getInicio');
    }
  }
  const [v, c] = await Promise.all([
    apiGetDedup('getVentasHoy', {}),
    apiGetDedup('getCompras',{desde:h,hasta:h}).catch(()=>({compras:[]}))
  ]);
  return {ventas:v, compras:c};
}

// Lo último que sabemos del día, sin red. Sirve tanto si el servidor ya tiene
// getInicio como si todavía responde con los dos endpoints separados.
function cacheInicio(){
  const r = cacheLocal('getInicio');
  if(r && r.ventas) return {ventas:r.ventas, compras:r.compras||{compras:[]}};
  const v = cacheLocal('getVentasHoy');
  if(!v) return null;
  const h = hoy();
  return {ventas:v, compras: cacheLocal('getCompras',{desde:h,hasta:h}) || {compras:[]}};
}

// Reportes: ganancia + ventas + compras + deudas de un período.
async function cargarReporteDatos(desde, hasta){
  if(_soporta('getReporte')){
    try{
      const r = await apiGetDedup('getReporte', {desde, hasta});
      return r;
    }catch(e){
      if(!_esDesconocida(e)) throw e;
      _marcarNoSoportado('getReporte');
    }
  }
  const [ganancia, ventas, compras, contactos] = await Promise.all([
    apiGet('getGanancia',{desde,hasta}),
    apiGet('getVentas',{desde,hasta}),
    apiGet('getCompras',{desde,hasta}),
    apiGet('getDeudaContactos').catch(()=>[])
  ]);
  return {ganancia, ventas, compras, contactos};
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

function skeleton(n){
  n=n||3; let h='';
  for(let i=0;i<n;i++) h+='<div class="skel-item"><div class="skel skel-line" style="width:55%"></div><div class="skel skel-line" style="width:82%"></div><div class="skel skel-line" style="width:38%"></div></div>';
  return h;
}

// ==========================================
// FORMATO
// ==========================================
function $$(n){return '$'+Number(n).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0})}
// Fecha local (Uruguay) en formato yyyy-mm-dd (no UTC).
// Evita que las ventas de la noche queden con fecha del día siguiente.
function hoy(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo'}).format(new Date())}
function fmtFecha(f){if(!f)return'';const[y,m,d]=f.split('-');return`${d}/${m}/${y}`}
function escH(s){return String(s).replace(/'/g,"\\'")}
function nombreCompleto(c){return [c.nombre,c.apellido].filter(Boolean).join(' ')}
function _norm(s){return (s||'').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ')}

// ==========================================
// NAVEGACIÓN
// ==========================================
const TITULOS={inicio:'Quesos Los Weys',venta:'Nueva Venta',compra:'Nueva Compra',deudas:'Deudas',mas:'Más opciones',productos:'Productos',clientes:'Clientes','proveedores-mgt':'Proveedores',reportes:'Reportes',devoluciones:'Devoluciones',historial:'Historial',stock:'Stock'};
const NAV_MAP={inicio:'nav-inicio',venta:'nav-venta',compra:'nav-compra',deudas:'nav-deudas',mas:'nav-inicio',productos:'nav-productos',clientes:'nav-clientes','proveedores-mgt':'nav-proveedores-mgt',reportes:'nav-reportes',devoluciones:'nav-devoluciones',historial:'nav-historial',stock:'nav-stock'};

function irA(p, tab){
  document.querySelectorAll('.pantalla').forEach(x=>x.classList.remove('activa'));
  document.getElementById('pantalla-'+p).classList.add('activa');
  document.getElementById('header-title').textContent=TITULOS[p]||'App Quesos';
  document.querySelectorAll('.sidebar-btn').forEach(b=>b.classList.remove('activo'));
  const n=NAV_MAP[p];
  const btn = document.getElementById(n);
  if(n && btn) btn.classList.add('activo');
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
// SIDEBAR
// ==========================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if(sidebar.classList.contains('activa')) {
    sidebar.classList.remove('activa');
    backdrop.classList.remove('activa');
  } else {
    sidebar.classList.add('activa');
    backdrop.classList.add('activa');
  }
}

function irASidebar(p) {
  irA(p);
  // Actualizar estado activo en los botones del sidebar
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('activo'));
  const btn = document.getElementById('nav-' + p);
  if(btn) btn.classList.add('activo');
  toggleSidebar();
}
