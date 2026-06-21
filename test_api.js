// ============================================================
// TEST SUITE COMPLETO — App Quesos API
// Pegar en la consola del navegador mientras la app está abierta
// ============================================================
(async () => {

const _API = 'https://script.google.com/macros/s/AKfycbyFQZz8DgsMEfJlCYgOYZrdIK8PvTIIMBgXgCSFxRfjkVd_v1GtMNoWaIjXdVRQRumzlg/exec';
const HOY = new Date().toISOString().split('T')[0];

async function GET(accion, params = {}) {
  const qs = new URLSearchParams({ accion, ...params }).toString();
  const r = await fetch(`${_API}?${qs}`);
  return r.json();
}
async function POST(accion, datos) {
  const r = await fetch(_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ accion, datos })
  });
  return r.json();
}

// ─── CONTADORES ─────────────────────────────────────────────
let ok = 0, fail = 0, warn = 0;
const resultados = [];

function check(nombre, condicion, detalle = '') {
  if (condicion) {
    console.log(`  ✅ ${nombre}`);
    ok++;
    resultados.push({ nombre, estado: 'ok' });
  } else {
    console.error(`  ❌ ${nombre}${detalle ? ' → ' + detalle : ''}`);
    fail++;
    resultados.push({ nombre, estado: 'fail', detalle });
  }
}

function deberiaFallar(nombre, res) {
  if (!res.ok) {
    console.log(`  ✅ ${nombre} (bloqueado: "${res.error}")`);
    ok++;
    resultados.push({ nombre, estado: 'ok' });
  } else {
    console.error(`  ❌ ${nombre} — NO fue bloqueado, respondió OK`);
    fail++;
    resultados.push({ nombre, estado: 'fail', detalle: 'debería haber fallado' });
  }
}

function seccion(titulo) {
  console.log(`\n%c${'─'.repeat(46)}`, 'color:#aaa');
  console.log(`%c  ${titulo}`, 'font-weight:bold;font-size:13px;color:#1b4332');
  console.log(`%c${'─'.repeat(46)}`, 'color:#aaa');
}

// ─── DATOS BASE ──────────────────────────────────────────────
// Obtener un producto real para las pruebas
const rProds = await GET('getProductos');
const prodReal = rProds.datos?.[0];
const PROD = prodReal?.nombre || null;
const PRECIO = prodReal?.precio || 1000;

console.log('%c', '');
console.log('%c╔══════════════════════════════════════════════╗', 'color:#40916c;font-weight:bold');
console.log('%c║     TEST SUITE COMPLETO — App Quesos        ║', 'color:#40916c;font-weight:bold;font-size:14px');
console.log('%c╚══════════════════════════════════════════════╝', 'color:#40916c;font-weight:bold');
console.log(`%c  Producto de prueba: ${PROD || '(ninguno — algunos tests salteados)'}`, 'color:#6c757d');
console.log(`%c  Precio: $${PRECIO}`, 'color:#6c757d');

// ════════════════════════════════════════════════════════════
// 1. LECTURAS BÁSICAS
// ════════════════════════════════════════════════════════════
seccion('1 · LECTURAS BÁSICAS');

const r = {};
r.prods    = await GET('getProductos');
r.clis     = await GET('getClientes');
r.provs    = await GET('getProveedores');
r.hoy      = await GET('getVentasHoy');
r.deudaCli = await GET('getDeudaClientes');
r.deudaProv= await GET('getDeudaProveedores');
r.ganancia = await GET('getGanancia', { desde: '2026-01-01', hasta: '2026-12-31' });
r.ventas   = await GET('getVentas',   { desde: '2026-01-01', hasta: '2026-12-31' });
r.compras  = await GET('getCompras',  { desde: '2026-01-01', hasta: '2026-12-31' });

check('getProductos devuelve array',        r.prods.ok    && Array.isArray(r.prods.datos));
check('getClientes devuelve array',         r.clis.ok     && Array.isArray(r.clis.datos));
check('getProveedores devuelve array',      r.provs.ok    && Array.isArray(r.provs.datos));
check('getVentasHoy tiene pedidos+totales', r.hoy.ok      && 'pedidos' in r.hoy.datos && 'total_ventas' in r.hoy.datos);
check('getDeudaClientes devuelve array',    r.deudaCli.ok && Array.isArray(r.deudaCli.datos));
check('getDeudaProveedores devuelve array', r.deudaProv.ok&& Array.isArray(r.deudaProv.datos));
check('getGanancia tiene campos clave',     r.ganancia.ok && 'ganancia' in r.ganancia.datos && 'total_ventas' in r.ganancia.datos);
check('getVentas tiene pedidos',            r.ventas.ok   && 'pedidos' in r.ventas.datos);
check('getCompras tiene compras',           r.compras.ok  && 'compras' in r.compras.datos);

// ════════════════════════════════════════════════════════════
// 2. ACCIONES INVÁLIDAS
// ════════════════════════════════════════════════════════════
seccion('2 · ACCIONES INVÁLIDAS');

const rAccInvGet  = await GET('accionQueNoExiste');
const rAccInvPost = await POST('accionQueNoExiste', {});
check('GET acción inválida → responde sin explotar',  rAccInvGet  !== undefined);
check('POST acción inválida → responde sin explotar', rAccInvPost !== undefined);

// ════════════════════════════════════════════════════════════
// 3. VALIDACIONES DE CLIENTES
// ════════════════════════════════════════════════════════════
seccion('3 · VALIDACIONES DE CLIENTES');

deberiaFallar('agregarCliente sin nombre',           await POST('agregarCliente', { nombre: '', apellido: 'X', celular: '123' }));
deberiaFallar('agregarCliente solo espacios',        await POST('agregarCliente', { nombre: '   ', apellido: 'X', celular: '123' }));
deberiaFallar('editarCliente nombre inexistente',    await POST('editarCliente',  { nombre: '__NoExiste99__', celular: '123' }));
deberiaFallar('eliminarCliente nombre inexistente',  await POST('eliminarCliente',{ nombre: '__NoExiste99__' }));

// ════════════════════════════════════════════════════════════
// 4. CARACTERES ESPECIALES EN CLIENTES
// ════════════════════════════════════════════════════════════
seccion('4 · CARACTERES ESPECIALES');

const nombresEspeciales = [
  { nombre: 'María', apellido: 'Gómez', celular: '1111' },
  { nombre: 'José', apellido: "D'Angelo", celular: '2222' },
  { nombre: 'Ñoño', apellido: 'Pérez', celular: '3333' },
  { nombre: 'Ana "La" Cruz', apellido: '', celular: '4444' },
];

for (const c of nombresEspeciales) {
  const rAdd = await POST('agregarCliente', c);
  check(`agregarCliente "${c.nombre}" (caracteres especiales)`, rAdd.ok);
  if (rAdd.ok) {
    const rDel = await POST('eliminarCliente', { nombre: c.nombre });
    check(`eliminarCliente "${c.nombre}" (limpieza)`, rDel.ok);
  }
}

// Nombre muy largo
const nombreLargo = 'A'.repeat(200);
const rLargo = await POST('agregarCliente', { nombre: nombreLargo, apellido: '', celular: '' });
if (rLargo.ok) {
  await POST('eliminarCliente', { nombre: nombreLargo });
  check('agregarCliente nombre muy largo (200 chars) → aceptado o rechazado limpiamente', true);
  console.log('  ℹ️  Nombres muy largos son aceptados — considerá agregar límite');
  warn++;
} else {
  check('agregarCliente nombre muy largo → rechazado', true);
}

// ════════════════════════════════════════════════════════════
// 5. VALIDACIONES DE PRODUCTOS
// ════════════════════════════════════════════════════════════
seccion('5 · VALIDACIONES DE PRODUCTOS');

deberiaFallar('agregarProducto sin nombre',          await POST('agregarProducto', { nombre: '', unidad: 'kg', precio: 100, precio_costo: 50 }));
deberiaFallar('agregarProducto precio negativo',     await POST('agregarProducto', { nombre: '__TestProd__', unidad: 'kg', precio: -1, precio_costo: 0 }));
deberiaFallar('agregarProducto precio cero',         await POST('agregarProducto', { nombre: '__TestProd__', unidad: 'kg', precio: 0, precio_costo: 0 }));
deberiaFallar('agregarProducto unidad inválida',     await POST('agregarProducto', { nombre: '__TestProd__', unidad: 'litro', precio: 100, precio_costo: 0 }));
deberiaFallar('editarProducto nombre inexistente',   await POST('editarProducto',  { nombre: '__NoExiste99__', precio: 100 }));

if (PROD) {
  deberiaFallar(`agregarProducto duplicado (${PROD})`, await POST('agregarProducto', { nombre: PROD, unidad: 'kg', precio: PRECIO, precio_costo: 0 }));
}

// ════════════════════════════════════════════════════════════
// 6. VALIDACIONES DE PEDIDOS
// ════════════════════════════════════════════════════════════
seccion('6 · VALIDACIONES DE PEDIDOS');

const itemBase = PROD ? [{ producto: PROD, cantidad: 1, precio_unitario: PRECIO, subtotal: PRECIO }] : null;

if (itemBase) {
  deberiaFallar('registrarPedido sin items',
    await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'efectivo', monto_pagado: 0, total: 0, descripcion: '', items: [] }));

  deberiaFallar('registrarPedido total negativo',
    await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'efectivo', monto_pagado: 0, total: -100, descripcion: '', items: itemBase }));

  deberiaFallar('registrarPedido monto_pagado > total',
    await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'efectivo', monto_pagado: PRECIO * 2, total: PRECIO, descripcion: '', items: itemBase }));

  deberiaFallar('registrarPedido crédito sin cliente',
    await POST('registrarPedido', { fecha: HOY, cliente: '', forma_pago: 'crédito', monto_pagado: 0, total: PRECIO, descripcion: '', items: itemBase }));

  deberiaFallar('registrarPedido forma_pago inválida',
    await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'bitcoin', monto_pagado: PRECIO, total: PRECIO, descripcion: '', items: itemBase }));
} else {
  console.warn('  ⚠️  Sin productos reales — saltando tests de pedidos');
  warn++;
}

deberiaFallar('editarPedido ID inexistente',
  await POST('editarPedido', { pedido_id: 'P999', monto_pagado: 100 }));

// ════════════════════════════════════════════════════════════
// 7. VALIDACIONES DE COMPRAS
// ════════════════════════════════════════════════════════════
seccion('7 · VALIDACIONES DE COMPRAS');

deberiaFallar('registrarCompra sin proveedor',
  await POST('registrarCompra', { fecha: HOY, proveedor: '', producto_insumo: 'Leche', cantidad: 10, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 1000 }));

deberiaFallar('registrarCompra sin producto',
  await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: '', cantidad: 10, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 1000 }));

deberiaFallar('registrarCompra cantidad negativa',
  await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: 'Leche', cantidad: -5, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 1000 }));

deberiaFallar('registrarCompra total negativo',
  await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: 'Leche', cantidad: 10, costo_unitario: 100, total: -1000, forma_pago: 'efectivo', monto_pagado: 0 }));

deberiaFallar('registrarCompra monto_pagado > total',
  await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: 'Leche', cantidad: 10, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 9999 }));

// ════════════════════════════════════════════════════════════
// 8. VALIDACIONES DE PAGOS
// ════════════════════════════════════════════════════════════
seccion('8 · VALIDACIONES DE PAGOS');

deberiaFallar('registrarPagoCliente sin cliente',   await POST('registrarPagoCliente',   { cliente: '', monto: 100, fecha: HOY }));
deberiaFallar('registrarPagoCliente monto cero',    await POST('registrarPagoCliente',   { cliente: 'Alguien', monto: 0, fecha: HOY }));
deberiaFallar('registrarPagoCliente monto negativo',await POST('registrarPagoCliente',   { cliente: 'Alguien', monto: -50, fecha: HOY }));
deberiaFallar('registrarPagoProveedor sin proveedor',await POST('registrarPagoProveedor',{ proveedor: '', monto: 100, fecha: HOY }));

// ════════════════════════════════════════════════════════════
// 9. INTEGRIDAD DE DATOS (FLUJO COMPLETO)
// ════════════════════════════════════════════════════════════
seccion('9 · INTEGRIDAD DE DATOS (flujo completo)');

if (PROD) {
  // Crear cliente de prueba
  await POST('agregarCliente', { nombre: '__IntTest__', apellido: 'Integridad', celular: '9999' });

  // Registrar venta a crédito por $1000, paga $300
  const rV = await POST('registrarPedido', {
    fecha: HOY, cliente: '__IntTest__', forma_pago: 'crédito',
    monto_pagado: 300, total: 1000, descripcion: `${PROD} (integridad)`,
    items: [{ producto: PROD, cantidad: 1, precio_unitario: 1000, subtotal: 1000 }]
  });
  check('Venta a crédito registrada', rV.ok);

  // Verificar que la deuda es $700
  const rD1 = await GET('getDeudaClientes');
  const deuda1 = rD1.datos?.find(d => d.cliente === '__IntTest__');
  check('Deuda inicial = $700 (1000 - 300)', deuda1 && Math.abs(deuda1.deuda - 700) < 1,
    deuda1 ? `deuda real: $${deuda1.deuda}` : 'cliente no encontrado en deudas');

  // Registrar abono de $400
  await POST('registrarPagoCliente', { cliente: '__IntTest__', monto: 400, fecha: HOY, nota: 'test integridad' });

  // Verificar que la deuda bajó a $300
  const rD2 = await GET('getDeudaClientes');
  const deuda2 = rD2.datos?.find(d => d.cliente === '__IntTest__');
  check('Deuda tras abono $400 = $300', deuda2 && Math.abs(deuda2.deuda - 300) < 1,
    deuda2 ? `deuda real: $${deuda2.deuda}` : 'no aparece (puede ser correcto si saldo=0)');

  // Verificar historial tiene 2 movimientos (compra + abono)
  const rH = await GET('getHistorialCliente', { cliente: '__IntTest__' });
  check('Historial tiene 2 movimientos', rH.ok && rH.datos.movimientos.length === 2,
    `tiene ${rH.datos?.movimientos?.length}`);
  check('Saldo en historial = $300', rH.ok && Math.abs(rH.datos.saldo_total - 300) < 1,
    `saldo real: $${rH.datos?.saldo_total}`);

  // Liquidar todo
  await POST('registrarPagoCliente', { cliente: '__IntTest__', monto: 300, fecha: HOY, nota: 'liquidación' });
  const rD3 = await GET('getDeudaClientes');
  const deuda3 = rD3.datos?.find(d => d.cliente === '__IntTest__');
  check('Tras liquidar: cliente NO aparece en deudas', !deuda3);

  // Registrar compra y verificar en getGanancia
  const gananciaAntes = r.ganancia.datos?.ganancia || 0;
  await POST('registrarCompra', {
    fecha: HOY, proveedor: '__IntProv__', producto_insumo: PROD,
    cantidad: 2, costo_unitario: 200, total: 400,
    forma_pago: 'efectivo', monto_pagado: 400
  });
  const rG2 = await GET('getGanancia', { desde: HOY, hasta: HOY });
  check('Compra impacta en getGanancia',
    rG2.ok && rG2.datos.total_compras >= 400,
    `total_compras: $${rG2.datos?.total_compras}`);

  // Limpieza
  await POST('eliminarCliente', { nombre: '__IntTest__' });
} else {
  console.warn('  ⚠️  Sin productos reales — saltando tests de integridad');
  warn++;
}

// ════════════════════════════════════════════════════════════
// 10. CONCURRENCIA
// ════════════════════════════════════════════════════════════
seccion('10 · CONCURRENCIA (5 pedidos simultáneos)');

if (PROD) {
  console.log('  ⏳ Enviando 5 pedidos al mismo tiempo...');
  const pedidosConcurrentes = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      POST('registrarPedido', {
        fecha: HOY, cliente: `__Concurrente${i+1}__`, forma_pago: 'efectivo',
        monto_pagado: PRECIO, total: PRECIO,
        descripcion: `Concurrencia test #${i+1}`,
        items: [{ producto: PROD, cantidad: 1, precio_unitario: PRECIO, subtotal: PRECIO }]
      })
    )
  );

  const todos_ok = pedidosConcurrentes.every(r => r.ok);
  const ids = pedidosConcurrentes.map(r => r.datos?.pedido_id).filter(Boolean);
  const ids_unicos = new Set(ids).size === ids.length;

  check('Los 5 pedidos concurrentes se guardaron', todos_ok, `${pedidosConcurrentes.filter(r=>r.ok).length}/5 OK`);
  check('Los 5 IDs son únicos (sin colisiones)', ids_unicos && ids.length === 5, `IDs: ${ids.join(', ')}`);

  if (!ids_unicos) {
    console.error('  ⚠️  CRÍTICO: hay IDs duplicados. Problema de concurrencia en generarId()');
  }

  // Limpieza clientes concurrentes
  for (let i = 1; i <= 5; i++) {
    await POST('eliminarCliente', { nombre: `__Concurrente${i}__` }).catch(() => {});
  }
} else {
  console.warn('  ⚠️  Sin productos reales — saltando tests de concurrencia');
  warn++;
}

// ════════════════════════════════════════════════════════════
// 11. REPORTES — CASOS BORDE
// ════════════════════════════════════════════════════════════
seccion('11 · REPORTES — CASOS BORDE');

// Rango sin datos
const rSinDatos = await GET('getGanancia', { desde: '2000-01-01', hasta: '2000-01-31' });
check('getGanancia rango sin datos → devuelve 0s (no error)', rSinDatos.ok && rSinDatos.datos.total_ventas === 0 && rSinDatos.datos.ganancia === 0);

// Rango invertido (desde > hasta)
const rInvertido = await GET('getGanancia', { desde: '2026-12-31', hasta: '2026-01-01' });
check('getGanancia desde > hasta → no explota', rInvertido.ok);

// Sin parámetros de fecha
const rSinFecha = await GET('getGanancia');
check('getGanancia sin parámetros → no explota', rSinFecha.ok);

// Historial cliente inexistente
const rHistInex = await GET('getHistorialCliente', { cliente: '__NoExiste99__' });
check('getHistorialCliente cliente inexistente → responde (saldo 0)', rHistInex.ok && rHistInex.datos.saldo_total === 0);

// getVentas con rango específico → solo devuelve pedidos de ese rango
const rVenFuturo = await GET('getVentas', { desde: '2099-01-01', hasta: '2099-12-31' });
check('getVentas rango futuro → array vacío', rVenFuturo.ok && rVenFuturo.datos.pedidos.length === 0);

// ════════════════════════════════════════════════════════════
// 12. PROVEEDORES — VALIDACIONES
// ════════════════════════════════════════════════════════════
seccion('12 · VALIDACIONES DE PROVEEDORES');

deberiaFallar('agregarProveedor sin nombre', await POST('agregarProveedor', { nombre: '', contacto: '123' }));
deberiaFallar('editarProveedor inexistente', await POST('editarProveedor', { nombre: '__NoExiste99__', contacto: '123' }));

// Limpiar si quedó de corrida anterior
await POST('eliminarProveedor', { nombre: '__ProvDup__' }).catch(() => {});

// Agregar y duplicado
const rProv1 = await POST('agregarProveedor', { nombre: '__ProvDup__', contacto: '000' });
check('agregarProveedor válido', rProv1.ok);
deberiaFallar('agregarProveedor duplicado', await POST('agregarProveedor', { nombre: '__ProvDup__', contacto: '111' }));

// Editar
const rProvEdit = await POST('editarProveedor', { nombre: '__ProvDup__', contacto: '999' });
check('editarProveedor → OK', rProvEdit.ok);

// Eliminar proveedor de test
const rProvDel = await POST('eliminarProveedor', { nombre: '__ProvDup__' });
check('eliminarProveedor → OK', rProvDel.ok);
deberiaFallar('eliminarProveedor inexistente', await POST('eliminarProveedor', { nombre: '__ProvDup__' }));

// ════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ════════════════════════════════════════════════════════════
const total = ok + fail;
const pct = Math.round(ok / total * 100);
const emoji = fail === 0 ? '🎉' : fail <= 3 ? '⚠️' : '❌';

console.log('\n%c╔══════════════════════════════════════════════╗', 'color:#40916c;font-weight:bold');
console.log(`%c║   ${emoji}  ${ok}/${total} tests pasados (${pct}%)${''.padEnd(20 - String(ok+'/'+total).length)}║`, `color:${fail===0?'#40916c':'#e63946'};font-weight:bold;font-size:14px`);
if (warn > 0) console.log(`%c║   ⚠️  ${warn} advertencias                          ║`, 'color:#f4a261;font-weight:bold');
console.log('%c╚══════════════════════════════════════════════╝', 'color:#40916c;font-weight:bold');

if (fail > 0) {
  console.log('\n%cTests fallidos:', 'font-weight:bold;color:#e63946');
  resultados.filter(r => r.estado === 'fail').forEach(r => {
    console.log(`  ❌ ${r.nombre}${r.detalle ? ' → ' + r.detalle : ''}`);
  });
}

console.log('\n%c  Datos de prueba que quedaron en la hoja:', 'color:#6c757d;font-size:11px');
console.log('%c  • Compra de __IntProv__ (sección 9 — integridad)', 'color:#6c757d;font-size:11px');
console.log('%c  • Pedidos de concurrencia P### (sección 10)', 'color:#6c757d;font-size:11px');
console.log('%c  • Clientes __IntTest__ y __ConcurrenteN__ fueron limpiados automáticamente', 'color:#6c757d;font-size:11px');
console.log('%c  • Proveedor __ProvDup__ fue limpiado automáticamente', 'color:#6c757d;font-size:11px');

})();
