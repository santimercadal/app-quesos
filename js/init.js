// ==========================================
// INIT
// ==========================================
// Arranque en dos requests (antes eran siete): getBootstrap trae productos,
// clientes, proveedores y operadores de una; getInicio trae el movimiento del
// día. Y antes de que salga ninguno de los dos ya se pintó la pantalla con lo
// último que quedó guardado en el teléfono.

function _pintarDatalistClientes(){
  const dl = document.getElementById('lista-clientes');
  if(dl) dl.innerHTML = (clientesCache||[]).map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
}

function _aplicarMaestros(m){
  if(!m) return;
  if(m.productos && m.productos.length){ productos = m.productos; productosCompraCache = m.productos; }
  if(m.clientes)    { clientesCache = m.clientes; _pintarDatalistClientes(); }
  if(m.proveedores) { proveedoresCache = m.proveedores; }
  if(Array.isArray(m.operadores) && m.operadores.length) operadoresCache = m.operadores;
  if(productos.length) renderPreciosInicio();
}

function init(){
  // Restaurar operador (nombre guardado en este dispositivo)
  operadorActual = localStorage.getItem(OP_KEY) || '';
  actualizarChipOperador();

  document.getElementById('v-fecha').value=hoy();
  document.getElementById('c-fecha').value=hoy();
  carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];

  if(localStorage.getItem('quesos-dark')==='1'){
    document.body.classList.add('dark');
    document.getElementById('btn-modo').textContent='☀️';
  }
  aplicarColorBarra();

  // 1) Lo que ya sabemos, al instante y sin red.
  _aplicarMaestros({
    productos:   cacheLocal('getProductos'),
    clientes:    cacheLocal('getClientes'),
    proveedores: cacheLocal('getProveedores'),
    operadores:  cacheLocal('getOperadores')
  });

  // Si nadie eligió operador, el selector abre ya (con la lista guardada o la
  // de fábrica); si llega una lista distinta del servidor se redibuja sola.
  if(!operadorActual) abrirSelectorOperador(true);

  // 2) Lo fresco, por atrás.
  cargarInicio();
  cargarMaestros().then(m=>{
    _aplicarMaestros(m);
    const modal=document.getElementById('modal-operador');
    if(modal && modal.classList.contains('visible')) renderListaOperadores(!operadorActual);
  }).catch(e=>{
    console.warn('No se pudieron cargar los datos maestros:', e.message);
  });

  registrarServiceWorker();
}

// ==========================================
// SERVICE WORKER + AVISO DE VERSIÓN NUEVA
// ==========================================
// El service worker sirve la app desde el caché (abre al instante) y chequea
// si hay archivos nuevos por atrás. Cuando encuentra alguno avisa acá y
// mostramos la barrita; nadie se queda con una versión vieja, pero tampoco
// paga la descarga cada vez que abre la app.
function registrarServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(()=>{});
  navigator.serviceWorker.addEventListener('message', ev=>{
    if(ev.data && ev.data.tipo === 'version-nueva') mostrarBarraUpdate();
  });
}

let _updateMostrado = false;
function mostrarBarraUpdate(){
  if(_updateMostrado) return;
  _updateMostrado = true;
  const b = document.getElementById('barra-update');
  if(b) b.classList.add('visible');
}

function aplicarUpdate(){
  const b = document.getElementById('barra-update');
  if(b) b.textContent = 'Actualizando…';
  location.reload();
}

function cerrarBarraUpdate(){
  const b = document.getElementById('barra-update');
  if(b) b.classList.remove('visible');
}

init();
