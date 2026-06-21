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
  console.log(`\n%c${'─'.repeat(50)}`, 'color:#aaa');
  console.log(`%c  ${titulo}`, 'font-weight:bold;font-size:13px;color:#1b4332');
  console.log(`%c${'─'.repeat(50)}`, 'color:#aaa');
}

// ─── DATOS BASE ──────────────────────────────────────────────
const rProds = await GET('getProductos');
const prodReal = rProds.datos?.[0];
const PROD = prodReal?.nombre || null;
const PRECIO = prodReal?.precio || 1000;

const rProvs = await GET('getProveedores');
const provReal = rProvs.datos?.[0]?.nombre || null;

console.log('%c', '');
console.log('%c╔════════════════════════════════════════════════════╗', 'color:#40916c;font-weight:bold');
console.log('%c║       TEST SUITE COMPLETO — App Quesos            ║', 'color:#40916c;font-weight:bold;font-size:14px');
console.log('%c╚════════════════════════════════════════════════════╝', 'color:#40916c;font-weight:bold');
console.log(`%c  Producto: ${PROD || '(ninguno)'} · Proveedor: ${provReal || '(ninguno)'}`, 'color:#6c757d');

// ════════════════════════════════════════════════════════════
// 1. LECTURAS BÁSICAS
// ════════════════════════════════════════════════════════════
seccion('1 · LECTURAS BÁSICAS');

const r = {};
r.prods     = await GET('getProductos');
r.clis      = await GET('getClientes');
r.provs     = await GET('getProveedores');
r.hoy       = await GET('getVentasHoy');
r.deudaCli  = await GET('getDeudaClientes');
r.deudaProv = await GET('getDeudaProveedores');
r.ganancia  = await GET('getGanancia', { desde: '2026-01-01', hasta: '2026-12-31' });
r.ventas    = await GET('getVentas',   { desde: '2026-01-01', hasta: '2026-12-31' });
r.compras   = await GET('getCompras',  { desde: '2026-01-01', hasta: '2026-12-31' });
r.devs      = await GET('getDevoluciones', { desde: '2026-01-01', hasta: '2026-12-31' });

check('getProductos devuelve array',          r.prods.ok    && Array.isArray(r.prods.datos));
check('getClientes devuelve array',           r.clis.ok     && Array.isArray(r.clis.datos));
check('getProveedores devuelve array',        r.provs.ok    && Array.isArray(r.provs.datos));
check('getVentasHoy tiene pedidos+pagos',     r.hoy.ok      && 'pedidos' in r.hoy.datos && 'pagos_clientes' in r.hoy.datos);
check('getVentasHoy total_cobrado suma abonos', r.hoy.ok    && 'total_abonos' in r.hoy.datos);
check('getDeudaClientes devuelve array',      r.deudaCli.ok && Array.isArray(r.deudaCli.datos));
check('getDeudaProveedores devuelve array',   r.deudaProv.ok&& Array.isArray(r.deudaProv.datos));
check('getGanancia tiene ventas_netas',       r.ganancia.ok && 'ventas_netas' in r.ganancia.datos);
check('getGanancia tiene compras_netas',      r.ganancia.ok && 'compras_netas' in r.ganancia.datos);
check('getGanancia tiene dev_a_proveedores',  r.ganancia.ok && 'dev_a_proveedores' in r.ganancia.datos);
check('getVentas devuelve pedidos',           r.ventas.ok   && 'pedidos' in r.ventas.datos);
check('getCompras devuelve compras',          r.compras.ok  && 'compras' in r.compras.datos);
check('getDevoluciones devuelve array',       r.devs.ok     && Array.isArray(r.devs.datos?.devoluciones));
check('getDevoluciones tiene totales',        r.devs.ok     && 'total_pendiente' in r.devs.datos);

// ════════════════════════════════════════════════════════════
// 2. ACCIONES INVÁLIDAS
// ════════════════════════════════════════════════════════════
seccion('2 · ACCIONES INVÁLIDAS');

check('GET acción inválida → no explota',  (await GET('accionInexistente')) !== undefined);
check('POST acción inválida → no explota', (await POST('accionInexistente', {})) !== undefined);

// ════════════════════════════════════════════════════════════
// 3. VALIDACIONES DE CLIENTES
// ════════════════════════════════════════════════════════════
seccion('3 · VALIDACIONES DE CLIENTES');

deberiaFallar('agregarCliente sin nombre',          await POST('agregarCliente', { nombre: '' }));
deberiaFallar('agregarCliente solo espacios',       await POST('agregarCliente', { nombre: '   ' }));
deberiaFallar('editarCliente inexistente',          await POST('editarCliente',  { nombre: '__NoExiste99__', celular: '123' }));
deberiaFallar('eliminarCliente inexistente',        await POST('eliminarCliente',{ nombre: '__NoExiste99__' }));

// ════════════════════════════════════════════════════════════
// 4. CARACTERES ESPECIALES
// ════════════════════════════════════════════════════════════
seccion('4 · CARACTERES ESPECIALES');

const nombresEspeciales = [
  { nombre: 'María', apellido: 'Gómez' },
  { nombre: 'José', apellido: "D'Angelo" },
  { nombre: 'Ñoño', apellido: 'Pérez' },
];
for (const c of nombresEspeciales) {
  const rAdd = await POST('agregarCliente', { ...c, celular: '1111' });
  check(`agregarCliente "${c.nombre}"`, rAdd.ok);
  if (rAdd.ok) {
    const rDel = await POST('eliminarCliente', { nombre: c.nombre });
    check(`eliminarCliente "${c.nombre}" (limpieza)`, rDel.ok);
  }
}

// ════════════════════════════════════════════════════════════
// 5. VALIDACIONES DE PRODUCTOS
// ════════════════════════════════════════════════════════════
seccion('5 · VALIDACIONES DE PRODUCTOS');

deberiaFallar('agregarProducto sin nombre',         await POST('agregarProducto', { nombre: '', unidad: 'kg', precio: 100 }));
deberiaFallar('agregarProducto precio negativo',    await POST('agregarProducto', { nombre: '__T__', unidad: 'kg', precio: -1 }));
deberiaFallar('agregarProducto precio cero',        await POST('agregarProducto', { nombre: '__T__', unidad: 'kg', precio: 0 }));
deberiaFallar('agregarProducto unidad inválida',    await POST('agregarProducto', { nombre: '__T__', unidad: 'litro', precio: 100 }));
deberiaFallar('editarProducto inexistente',         await POST('editarProducto',  { nombre: '__NoExiste99__', precio: 100 }));
if (PROD) deberiaFallar(`agregarProducto duplicado (${PROD})`,
  await POST('agregarProducto', { nombre: PROD, unidad: 'kg', precio: PRECIO }));

// ════════════════════════════════════════════════════════════
// 6. VALIDACIONES DE PEDIDOS
// ════════════════════════════════════════════════════════════
seccion('6 · VALIDACIONES DE PEDIDOS');

const itemBase = PROD ? [{ producto: PROD, cantidad: 1, precio_unitario: PRECIO, subtotal: PRECIO }] : null;

if (itemBase) {
  deberiaFallar('registrarPedido sin items',        await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'efectivo', monto_pagado: 0, total: 0, items: [] }));
  deberiaFallar('registrarPedido total negativo',   await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'efectivo', monto_pagado: 0, total: -100, items: itemBase }));
  deberiaFallar('registrarPedido pagado > total',   await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'efectivo', monto_pagado: PRECIO*2, total: PRECIO, items: itemBase }));
  deberiaFallar('registrarPedido crédito sin cli',  await POST('registrarPedido', { fecha: HOY, cliente: '', forma_pago: 'crédito', monto_pagado: 0, total: PRECIO, items: itemBase }));
  deberiaFallar('registrarPedido forma_pago rara',  await POST('registrarPedido', { fecha: HOY, cliente: 'X', forma_pago: 'bitcoin', monto_pagado: PRECIO, total: PRECIO, items: itemBase }));
} else {
  console.warn('  ⚠️  Sin productos — saltando tests de pedidos'); warn++;
}
deberiaFallar('editarPedido ID inexistente',        await POST('editarPedido', { pedido_id: 'P-99999999-999999-9999', monto_pagado: 100 }));

// ════════════════════════════════════════════════════════════
// 7. VALIDACIONES DE COMPRAS
// ════════════════════════════════════════════════════════════
seccion('7 · VALIDACIONES DE COMPRAS');

deberiaFallar('registrarCompra sin proveedor',      await POST('registrarCompra', { fecha: HOY, proveedor: '', producto_insumo: 'Leche', cantidad: 10, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 1000 }));
deberiaFallar('registrarCompra sin producto',       await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: '', cantidad: 10, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 1000 }));
deberiaFallar('registrarCompra cantidad negativa',  await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: 'X', cantidad: -5, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 1000 }));
deberiaFallar('registrarCompra total negativo',     await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: 'X', cantidad: 10, costo_unitario: 100, total: -1000, forma_pago: 'efectivo', monto_pagado: 0 }));
deberiaFallar('registrarCompra pagado > total',     await POST('registrarCompra', { fecha: HOY, proveedor: 'Prov', producto_insumo: 'X', cantidad: 10, costo_unitario: 100, total: 1000, forma_pago: 'efectivo', monto_pagado: 9999 }));

// ════════════════════════════════════════════════════════════
// 8. VALIDACIONES DE PAGOS
// ════════════════════════════════════════════════════════════
seccion('8 · VALIDACIONES DE PAGOS');

deberiaFallar('pagoCliente sin cliente',            await POST('registrarPagoCliente',   { cliente: '', monto: 100, fecha: HOY }));
deberiaFallar('pagoCliente monto cero',             await POST('registrarPagoCliente',   { cliente: 'X', monto: 0, fecha: HOY }));
deberiaFallar('pagoCliente monto negativo',         await POST('registrarPagoCliente',   { cliente: 'X', monto: -50, fecha: HOY }));
deberiaFallar('pagoProveedor sin proveedor',        await POST('registrarPagoProveedor', { proveedor: '', monto: 100, fecha: HOY }));

// ════════════════════════════════════════════════════════════
// 9. VALIDACIONES DE DEVOLUCIONES
// ════════════════════════════════════════════════════════════
seccion('9 · VALIDACIONES DE DEVOLUCIONES');

const devBase = { tipo: 'proveedor', contraparte: '__TestProv__', producto: 'Leche', cantidad: 5, monto: 500, motivo: 'Mal estado', resolucion: 'pendiente', fecha: HOY };

deberiaFallar('devolucion tipo inválido',           await POST('registrarDevolucion', { ...devBase, tipo: 'otro' }));
deberiaFallar('devolucion sin contraparte',         await POST('registrarDevolucion', { ...devBase, contraparte: '' }));
deberiaFallar('devolucion sin producto',            await POST('registrarDevolucion', { ...devBase, producto: '' }));
deberiaFallar('devolucion cantidad cero',           await POST('registrarDevolucion', { ...devBase, cantidad: 0 }));
deberiaFallar('devolucion monto negativo',          await POST('registrarDevolucion', { ...devBase, monto: -100 }));
deberiaFallar('devolucion sin motivo',              await POST('registrarDevolucion', { ...devBase, motivo: '' }));
deberiaFallar('devolucion resolución inválida',     await POST('registrarDevolucion', { ...devBase, resolucion: 'magicamente_resuelta' }));
deberiaFallar('resolverDevolucion ID inválido',     await POST('resolverDevolucion',  { id: 'DEV-INEXISTENTE', resolucion: 'acreditado' }));
deberiaFallar('resolverDevolucion resolución rara', await POST('resolverDevolucion',  { id: 'DEV-cualquiera', resolucion: 'magia' }));

// ════════════════════════════════════════════════════════════
// 10. INTEGRIDAD DE DEVOLUCIONES (flujo completo)
// ════════════════════════════════════════════════════════════
seccion('10 · INTEGRIDAD DE DEVOLUCIONES (flujo completo)');

if (PROD && provReal) {
  // Registrar una compra a crédito por $2000, pagamos $1000
  const rC = await POST('registrarCompra', {
    fecha: HOY, proveedor: provReal, producto_insumo: PROD,
    cantidad: 10, costo_unitario: 200, total: 2000,
    forma_pago: 'crédito', monto_pagado: 1000
  });
  check('Compra de prueba registrada', rC.ok);

  // Verificar deuda inicial con el proveedor = $1000
  const rDP1 = await GET('getDeudaProveedores');
  const deudaProv1 = rDP1.datos?.find(d => d.proveedor === provReal);
  const deudaAntes = deudaProv1?.deuda || 0;
  check('Deuda inicial con proveedor ≥ $1000', deudaAntes >= 1000,
    `deuda: $${deudaAntes}`);

  // Registrar devolución de $500 (mal estado, pendiente)
  const rDev = await POST('registrarDevolucion', {
    tipo: 'proveedor', contraparte: provReal, referencia_id: rC.datos?.id || '',
    producto: PROD, cantidad: 2.5, monto: 500,
    motivo: 'Mercadería en mal estado', resolucion: 'pendiente', fecha: HOY
  });
  check('Devolución registrada OK', rDev.ok, rDev.error);
  const devId = rDev.datos?.id;

  // Verificar que la deuda bajó $500
  const rDP2 = await GET('getDeudaProveedores');
  const deudaProv2 = rDP2.datos?.find(d => d.proveedor === provReal);
  const deudaDespues = deudaProv2?.deuda || 0;
  check('Deuda bajó $500 tras devolución', Math.abs((deudaAntes - deudaDespues) - 500) < 1,
    `antes: $${deudaAntes} · después: $${deudaDespues}`);

  // Verificar que getGanancia refleja la devolución
  const rG = await GET('getGanancia', { desde: HOY, hasta: HOY });
  check('getGanancia.dev_a_proveedores ≥ 500', rG.ok && rG.datos.dev_a_proveedores >= 500,
    `dev_a_proveedores: $${rG.datos?.dev_a_proveedores}`);
  check('compras_netas < total_compras', rG.ok && rG.datos.compras_netas < rG.datos.total_compras);

  // Verificar historial del proveedor incluye la devolución
  const rHP = await GET('getHistorialProveedor', { proveedor: provReal });
  check('getHistorialProveedor OK', rHP.ok);
  const tieneDevEnHistorial = rHP.datos?.movimientos?.some(m => m.tipo === 'devolucion');
  check('Historial proveedor incluye la devolución', tieneDevEnHistorial);

  // Resolver la devolución → "acreditado"
  if (devId) {
    const rRes = await POST('resolverDevolucion', { id: devId, resolucion: 'acreditado' });
    check('resolverDevolucion → acreditado', rRes.ok, rRes.error);

    // Verificar que getDevoluciones la muestra como acreditada
    const rDevs = await GET('getDevoluciones', { desde: HOY, hasta: HOY });
    const devActualizada = rDevs.datos?.devoluciones?.find(d => d.id === devId);
    check('Devolución aparece como acreditada', devActualizada?.resolucion === 'acreditado',
      `resolucion: ${devActualizada?.resolucion}`);
  }
} else {
  console.warn('  ⚠️  Sin producto/proveedor real — saltando tests de integridad de devoluciones'); warn++;
}

// ════════════════════════════════════════════════════════════
// 11. INTEGRIDAD CLIENTE + DEVOLUCIÓN
// ════════════════════════════════════════════════════════════
seccion('11 · INTEGRIDAD CLIENTE + DEVOLUCIÓN');

if (PROD) {
  // Crear cliente de prueba
  await POST('agregarCliente', { nombre: '__IntDev__', apellido: 'Test', celular: '0000' });

  // Venta a crédito por $600
  const rV = await POST('registrarPedido', {
    fecha: HOY, cliente: '__IntDev__', forma_pago: 'crédito',
    monto_pagado: 0, total: 600, descripcion: 'Test devolucion',
    items: [{ producto: PROD, cantidad: 2, precio_unitario: 300, subtotal: 600 }]
  });
  check('Venta de prueba registrada', rV.ok);

  // Verificar deuda = $600
  const rDC1 = await GET('getDeudaClientes');
  const dc1 = rDC1.datos?.find(d => d.cliente === '__IntDev__');
  check('Deuda cliente inicial = $600', dc1 && Math.abs(dc1.deuda - 600) < 1,
    `deuda: $${dc1?.deuda}`);

  // Cliente devuelve $200 de mercadería (por ejemplo, vino mal)
  const rDevCli = await POST('registrarDevolucion', {
    tipo: 'cliente', contraparte: '__IntDev__', producto: PROD,
    cantidad: 1, monto: 200, motivo: 'Producto llegó dañado',
    resolucion: 'pendiente', fecha: HOY
  });
  check('Devolución de cliente registrada', rDevCli.ok, rDevCli.error);

  // Verificar que la deuda bajó a $400
  const rDC2 = await GET('getDeudaClientes');
  const dc2 = rDC2.datos?.find(d => d.cliente === '__IntDev__');
  check('Deuda cliente bajó a $400 tras devolución', dc2 && Math.abs(dc2.deuda - 400) < 1,
    `deuda: $${dc2?.deuda}`);

  // getGanancia refleja devolución de cliente
  const rG2 = await GET('getGanancia', { desde: HOY, hasta: HOY });
  check('getGanancia.dev_de_clientes ≥ 200', rG2.ok && rG2.datos.dev_de_clientes >= 200,
    `dev_de_clientes: $${rG2.datos?.dev_de_clientes}`);
  check('ventas_netas < total_ventas', rG2.ok && rG2.datos.ventas_netas < rG2.datos.total_ventas);

  // Limpieza
  await POST('eliminarCliente', { nombre: '__IntDev__' });
} else {
  console.warn('  ⚠️  Sin productos reales — saltando tests de devolución de cliente'); warn++;
}

// ════════════════════════════════════════════════════════════
// 12. INTEGRIDAD DE VENTAS + PAGOS (flujo completo)
// ════════════════════════════════════════════════════════════
seccion('12 · INTEGRIDAD VENTAS + PAGOS');

if (PROD) {
  await POST('agregarCliente', { nombre: '__IntTest__', apellido: 'Integridad', celular: '9999' });

  const rV = await POST('registrarPedido', {
    fecha: HOY, cliente: '__IntTest__', forma_pago: 'crédito',
    monto_pagado: 300, total: 1000, descripcion: 'Test integr',
    items: [{ producto: PROD, cantidad: 1, precio_unitario: 1000, subtotal: 1000 }]
  });
  check('Venta a crédito registrada ($700 pendiente)', rV.ok);

  const rD1 = await GET('getDeudaClientes');
  const d1 = rD1.datos?.find(d => d.cliente === '__IntTest__');
  check('Deuda inicial = $700', d1 && Math.abs(d1.deuda - 700) < 1, `$${d1?.deuda}`);

  await POST('registrarPagoCliente', { cliente: '__IntTest__', monto: 400, fecha: HOY });

  const rD2 = await GET('getDeudaClientes');
  const d2 = rD2.datos?.find(d => d.cliente === '__IntTest__');
  check('Tras abono $400 → deuda = $300', d2 && Math.abs(d2.deuda - 300) < 1, `$${d2?.deuda}`);

  // Verificar que getVentasHoy incluye el pago recibido
  const rHoy = await GET('getVentasHoy');
  const tieneAbono = rHoy.datos?.pagos_clientes?.some(p => p.cliente === '__IntTest__');
  check('getVentasHoy incluye el abono recibido hoy', tieneAbono);
  check('total_abonos > 0', rHoy.datos?.total_abonos >= 400, `$${rHoy.datos?.total_abonos}`);

  await POST('registrarPagoCliente', { cliente: '__IntTest__', monto: 300, fecha: HOY });
  const rD3 = await GET('getDeudaClientes');
  check('Tras liquidar → NO aparece en deudas', !rD3.datos?.find(d => d.cliente === '__IntTest__'));

  await POST('eliminarCliente', { nombre: '__IntTest__' });
} else {
  console.warn('  ⚠️  Sin productos — saltando tests de integridad de ventas'); warn++;
}

// ════════════════════════════════════════════════════════════
// 13. CONCURRENCIA (5 pedidos simultáneos)
// ════════════════════════════════════════════════════════════
seccion('13 · CONCURRENCIA (5 pedidos simultáneos)');

if (PROD) {
  console.log('  ⏳ Enviando 5 pedidos al mismo tiempo...');
  const pedidosConcurrentes = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      POST('registrarPedido', {
        fecha: HOY, cliente: `__Conc${i+1}__`, forma_pago: 'efectivo',
        monto_pagado: PRECIO, total: PRECIO,
        items: [{ producto: PROD, cantidad: 1, precio_unitario: PRECIO, subtotal: PRECIO }]
      })
    )
  );
  const todos_ok = pedidosConcurrentes.every(r => r.ok);
  const ids = pedidosConcurrentes.map(r => r.datos?.pedido_id).filter(Boolean);
  const ids_unicos = new Set(ids).size === ids.length && ids.length === 5;

  check('Los 5 pedidos concurrentes se guardaron', todos_ok, `${pedidosConcurrentes.filter(r=>r.ok).length}/5 OK`);
  check('Los 5 IDs son únicos (sin colisiones)', ids_unicos, `IDs: ${ids.join(', ')}`);

  // 5 devoluciones simultáneas
  console.log('  ⏳ Enviando 5 devoluciones al mismo tiempo...');
  const devsConcurrentes = await Promise.all(
    Array.from({ length: 5 }, () =>
      POST('registrarDevolucion', {
        tipo: 'proveedor', contraparte: provReal || 'TestProv',
        producto: PROD, cantidad: 1, monto: 100,
        motivo: 'Test concurrencia', resolucion: 'pendiente', fecha: HOY
      })
    )
  );
  const devIds = devsConcurrentes.map(r => r.datos?.id).filter(Boolean);
  const devIdsUnicos = new Set(devIds).size === devIds.length && devIds.length === 5;
  check('5 devoluciones concurrentes → IDs únicos', devIdsUnicos, `IDs: ${devIds.join(', ')}`);

  // Limpieza clientes concurrentes
  for (let i = 1; i <= 5; i++) {
    await POST('eliminarCliente', { nombre: `__Conc${i}__` }).catch(() => {});
  }
} else {
  console.warn('  ⚠️  Sin productos — saltando tests de concurrencia'); warn++;
}

// ════════════════════════════════════════════════════════════
// 14. REPORTES — CASOS BORDE
// ════════════════════════════════════════════════════════════
seccion('14 · REPORTES — CASOS BORDE');

const rSinDatos = await GET('getGanancia', { desde: '2000-01-01', hasta: '2000-01-31' });
check('getGanancia rango vacío → zeros (no error)', rSinDatos.ok && rSinDatos.datos.total_ventas === 0 && rSinDatos.datos.ganancia === 0);
check('getGanancia vacío → dev_a_proveedores = 0', rSinDatos.ok && rSinDatos.datos.dev_a_proveedores === 0);

const rInv = await GET('getGanancia', { desde: '2026-12-31', hasta: '2026-01-01' });
check('getGanancia desde > hasta → no explota', rInv.ok);

const rFuturo = await GET('getVentas', { desde: '2099-01-01', hasta: '2099-12-31' });
check('getVentas futuro → pedidos vacío', rFuturo.ok && rFuturo.datos.pedidos.length === 0);

const rHistInex = await GET('getHistorialCliente', { cliente: '__NoExiste99__' });
check('getHistorialCliente inexistente → saldo 0', rHistInex.ok && rHistInex.datos.saldo_total === 0);

const rHistProvInex = await GET('getHistorialProveedor', { proveedor: '__NoExiste99__' });
check('getHistorialProveedor inexistente → saldo 0', rHistProvInex.ok && rHistProvInex.datos.saldo_total === 0);

const rDevFiltro = await GET('getDevoluciones', { desde: '2000-01-01', hasta: '2099-12-31', tipo: 'proveedor' });
check('getDevoluciones filtro tipo=proveedor → solo proveedores',
  rDevFiltro.ok && (rDevFiltro.datos.devoluciones||[]).every(d => d.tipo === 'proveedor'));

// ════════════════════════════════════════════════════════════
// 15. PROVEEDORES
// ════════════════════════════════════════════════════════════
seccion('15 · VALIDACIONES DE PROVEEDORES');

await POST('eliminarProveedor', { nombre: '__ProvDup__' }).catch(() => {});
deberiaFallar('agregarProveedor sin nombre',   await POST('agregarProveedor', { nombre: '', contacto: '123' }));
deberiaFallar('editarProveedor inexistente',   await POST('editarProveedor',  { nombre: '__NoExiste99__', contacto: '123' }));
const rP1 = await POST('agregarProveedor', { nombre: '__ProvDup__', contacto: '000' });
check('agregarProveedor válido', rP1.ok);
deberiaFallar('agregarProveedor duplicado',    await POST('agregarProveedor', { nombre: '__ProvDup__', contacto: '111' }));
check('editarProveedor → OK',                  (await POST('editarProveedor', { nombre: '__ProvDup__', contacto: '999' })).ok);
check('eliminarProveedor → OK',                (await POST('eliminarProveedor', { nombre: '__ProvDup__' })).ok);
deberiaFallar('eliminarProveedor ya eliminado',await POST('eliminarProveedor', { nombre: '__ProvDup__' }));

// ════════════════════════════════════════════════════════════
// RESUMEN
// ════════════════════════════════════════════════════════════
const total = ok + fail;
const pct = Math.round(ok / total * 100);
const emoji = fail === 0 ? '🎉' : fail <= 3 ? '⚠️' : '❌';

console.log('\n%c╔════════════════════════════════════════════════════╗', 'color:#40916c;font-weight:bold');
console.log(`%c║  ${emoji}  ${ok}/${total} tests pasados (${pct}%)${''.padEnd(22 - String(ok+'/'+total).length)}║`, `color:${fail===0?'#40916c':'#e63946'};font-weight:bold;font-size:14px`);
if (warn > 0) console.log(`%c║  ⚠️  ${warn} advertencias (faltan datos de prueba)     ║`, 'color:#f4a261;font-weight:bold');
console.log('%c╚════════════════════════════════════════════════════╝', 'color:#40916c;font-weight:bold');

if (fail > 0) {
  console.log('\n%cTests fallidos:', 'font-weight:bold;color:#e63946');
  resultados.filter(r => r.estado === 'fail').forEach(r => {
    console.log(`  ❌ ${r.nombre}${r.detalle ? ' → ' + r.detalle : ''}`);
  });
}

console.log('\n%c  Datos residuales que quedaron en la hoja:', 'color:#6c757d;font-size:11px');
console.log('%c  • Compras de prueba (secciones 10-13)', 'color:#6c757d;font-size:11px');
console.log('%c  • Devoluciones de test (sección 10-11)', 'color:#6c757d;font-size:11px');
console.log('%c  • Pedidos concurrentes (sección 13)', 'color:#6c757d;font-size:11px');
console.log('%c  • Clientes y proveedores de prueba fueron eliminados automáticamente', 'color:#6c757d;font-size:11px');

})();
