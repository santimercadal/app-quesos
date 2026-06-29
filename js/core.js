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
let _clientesRender = [];
let _histAll = [];

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
  invalidarCache(); // cualquier escritura invalida el cache de lecturas
  return d.datos;
}

// Cache liviano de datos maestros (productos/clientes/proveedores).
// Navegación instantánea; cualquier escritura (apiPost) lo limpia, así nunca
// quedás con datos viejos. TTL corto como red de seguridad.
const _cache = {};
const _CACHE_TTL = 90000;
async function apiGetCached(accion, params){
  const key = accion + '|' + JSON.stringify(params||{});
  const e = _cache[key];
  if(e && (Date.now() - e.ts) < _CACHE_TTL) return e.data;
  const data = await apiGet(accion, params||{});
  _cache[key] = {data, ts: Date.now()};
  return data;
}
function invalidarCache(accion){
  Object.keys(_cache).forEach(k=>{ if(!accion || k.indexOf(accion+'|')===0) delete _cache[k]; });
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

