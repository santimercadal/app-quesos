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
