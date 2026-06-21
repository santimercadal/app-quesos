# Paso 2 (v2) — Apps Script Actualizado

## Cambios respecto a la versión anterior

- La hoja `Ventas` se divide en dos: **`Pedidos`** (cabecera) + **`Ventas`** (ítems)
- Los pedidos pueden tener múltiples productos
- Se agrega hoja `Clientes` con nombre, apellido y celular
- Nuevas funciones: `registrarPedido`, `editarPedido`, `getHistorialCliente`

## Pasos para actualizar

1. Abrí tu proyecto en [script.google.com](https://script.google.com)
2. **Borrá todo** el código existente y pegá el nuevo código de abajo
3. Guardá (Ctrl+S)
4. Ejecutá **`inicializarHojas`** — va a crear las nuevas hojas y actualizar las existentes
5. Desplegá nueva versión: **Implementar → Administrar implementaciones → ✏️ Editar → Nueva versión → Implementar**

> La URL del Web App no cambia. Solo se actualiza el código.

---

## Código completo

```javascript
// ==========================================
// CONFIGURACIÓN
// ==========================================
const SHEET_ID = '1Zo43UB2Fop1h7EHE1J-kjW6fVJXwyWSkKumt1ID2YNc';
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';


// ==========================================
// INICIALIZACIÓN
// ==========================================

function inicializarHojas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const hojas = [
    { nombre: 'Productos',         encabezados: ['nombre', 'unidad', 'precio', 'precio_costo', 'proveedor'] },
    // Pedidos: cabecera de cada venta (cliente, pago, total)
    { nombre: 'Pedidos',           encabezados: ['pedido_id', 'fecha', 'cliente', 'forma_pago', 'monto_pagado', 'total', 'descripcion'] },
    // Ventas: líneas de cada pedido (un producto por fila)
    { nombre: 'Ventas',            encabezados: ['id', 'pedido_id', 'producto', 'cantidad', 'precio_unitario', 'subtotal'] },
    { nombre: 'Pagos Clientes',    encabezados: ['id', 'fecha', 'cliente', 'monto', 'nota'] },
    { nombre: 'Compras',           encabezados: ['id', 'fecha', 'proveedor', 'producto_insumo', 'cantidad', 'costo_unitario', 'total', 'forma_pago', 'monto_pagado'] },
    { nombre: 'Pagos Proveedores', encabezados: ['id', 'fecha', 'proveedor', 'monto'] },
    { nombre: 'Clientes',          encabezados: ['nombre', 'apellido', 'celular'] },
    { nombre: 'Proveedores',       encabezados: ['nombre', 'contacto'] },
  ];

  hojas.forEach(({ nombre, encabezados }) => {
    let hoja = ss.getSheetByName(nombre);

    // Si la hoja Ventas tiene el esquema viejo (9 columnas), renombrarla como respaldo
    if (nombre === 'Ventas' && hoja && hoja.getLastRow() > 0) {
      const primeraCelda = hoja.getRange(1,1).getValue();
      const segundaCelda = hoja.getRange(1,2).getValue();
      if (primeraCelda === 'id' && segundaCelda === 'fecha') {
        // Esquema viejo detectado → respaldar y recrear
        hoja.setName('Ventas_v1_bak');
        hoja = null;
      }
    }

    if (!hoja) {
      hoja = ss.insertSheet(nombre);
    }

    if (hoja.getLastRow() === 0) {
      hoja.appendRow(encabezados);
      hoja.getRange(1, 1, 1, encabezados.length).setFontWeight('bold').setBackground('#f0f0f0');
    }
  });

  // Eliminar hojas vacías por defecto
  const nombresNuestros = hojas.map(h => h.nombre);
  ss.getSheets().forEach(h => {
    const n = h.getName();
    if (!nombresNuestros.includes(n) && !n.includes('bak') && h.getLastRow() <= 1) {
      try { ss.deleteSheet(h); } catch(e) {}
    }
  });

  SpreadsheetApp.flush();
  Logger.log('✅ Hojas inicializadas correctamente');
}


// ==========================================
// RESPUESTA
// ==========================================

function crearRespuesta(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}


// ==========================================
// doGet — LECTURAS
// ==========================================

function doGet(e) {
  try {
    const accion = e.parameter.accion;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let resultado;

    switch (accion) {
      case 'getProductos':        resultado = getProductos(ss); break;
      case 'getClientes':         resultado = getClientes(ss); break;
      case 'getProveedores':      resultado = getProveedores(ss); break;
      case 'getVentasHoy':        resultado = getVentasHoy(ss); break;
      case 'getVentas':           resultado = getVentas(ss, e.parameter.desde, e.parameter.hasta); break;
      case 'getCompras':          resultado = getCompras(ss, e.parameter.desde, e.parameter.hasta); break;
      case 'getGanancia':         resultado = getGanancia(ss, e.parameter.desde, e.parameter.hasta); break;
      case 'getDeudaClientes':    resultado = getDeudaClientes(ss); break;
      case 'getDeudaProveedores': resultado = getDeudaProveedores(ss); break;
      case 'getHistorialCliente': resultado = getHistorialCliente(ss, e.parameter.cliente); break;
      default: resultado = { error: 'Acción no reconocida: ' + accion };
    }

    return crearRespuesta({ ok: true, datos: resultado });
  } catch (err) {
    return crearRespuesta({ ok: false, error: err.toString() });
  }
}


// ==========================================
// doPost — ESCRITURAS
// ==========================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const accion = body.accion;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let resultado;

    switch (accion) {
      case 'agregarProducto':        resultado = agregarProducto(ss, body.datos); break;
      case 'editarProducto':         resultado = editarProducto(ss, body.datos); break;
      case 'registrarPedido':        resultado = registrarPedido(ss, body.datos); break;
      case 'editarPedido':           resultado = editarPedido(ss, body.datos); break;
      case 'registrarCompra':        resultado = registrarCompra(ss, body.datos); break;
      case 'registrarPagoCliente':   resultado = registrarPagoCliente(ss, body.datos); break;
      case 'registrarPagoProveedor': resultado = registrarPagoProveedor(ss, body.datos); break;
      case 'agregarCliente':         resultado = agregarCliente(ss, body.datos); break;
      case 'editarCliente':          resultado = editarCliente(ss, body.datos); break;
      case 'eliminarCliente':        resultado = eliminarCliente(ss, body.datos); break;
      case 'agregarProveedor':       resultado = agregarProveedor(ss, body.datos); break;
      case 'editarProveedor':        resultado = editarProveedor(ss, body.datos); break;
      case 'eliminarProveedor':      resultado = eliminarProveedor(ss, body.datos); break;
      default: resultado = { error: 'Acción no reconocida: ' + accion };
    }

    return crearRespuesta({ ok: true, datos: resultado });
  } catch (err) {
    return crearRespuesta({ ok: false, error: err.toString() });
  }
}


// ==========================================
// HELPERS
// ==========================================

function hojaAObjetos(hoja) {
  const datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return [];
  const enc = datos[0];
  return datos.slice(1).map(fila => {
    const obj = {};
    enc.forEach((k, i) => {
      obj[k] = fila[i] instanceof Date
        ? Utilities.formatDate(fila[i], ZONA_HORARIA, 'yyyy-MM-dd')
        : fila[i];
    });
    return obj;
  });
}

function generarId(hoja, prefijo) {
  // ID basado en timestamp + random para evitar colisiones en requests concurrentes
  // Formato: P-20260621-143052-4729
  const ahora = new Date();
  const fecha = Utilities.formatDate(ahora, ZONA_HORARIA, 'yyyyMMdd');
  const hora  = Utilities.formatDate(ahora, ZONA_HORARIA, 'HHmmss');
  const rand  = Math.floor(Math.random() * 9000) + 1000; // 4 dígitos
  return prefijo + '-' + fecha + '-' + hora + '-' + rand;
}

function validarPositivo(valor, nombre) {
  if (isNaN(valor) || Number(valor) <= 0) throw new Error(nombre + ' debe ser número positivo');
}

// Permite cero (para monto_pagado, precio_costo, etc.)
function validarNoNegativo(valor, nombre) {
  if (isNaN(valor) || Number(valor) < 0) throw new Error(nombre + ' no puede ser negativo');
}

function hoyStr() {
  return Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd');
}

function filtrarFecha(lista, desde, hasta) {
  return lista.filter(item => {
    const f = (item.fecha || '').toString().substring(0, 10);
    return (!desde || f >= desde) && (!hasta || f <= hasta);
  });
}


// ==========================================
// PRODUCTOS
// ==========================================

function getProductos(ss) {
  return hojaAObjetos(ss.getSheetByName('Productos'));
}

function agregarProducto(ss, d) {
  if (!d.nombre?.trim()) throw new Error('El nombre es obligatorio');
  if (!['kg','unidad'].includes(d.unidad)) throw new Error('Unidad debe ser kg o unidad');
  validarPositivo(Number(d.precio), 'El precio');

  const hoja = ss.getSheetByName('Productos');
  const existentes = hojaAObjetos(hoja);
  if (existentes.some(p => p.nombre.toLowerCase() === d.nombre.trim().toLowerCase())) {
    throw new Error('Ya existe ese producto. Usá Editar para modificarlo.');
  }

  hoja.appendRow([d.nombre.trim(), d.unidad, Number(d.precio), Number(d.precio_costo) || 0, d.proveedor?.trim() || '']);
  return { mensaje: 'Producto agregado: ' + d.nombre };
}

function editarProducto(ss, d) {
  if (!d.nombre) throw new Error('Nombre obligatorio para editar');
  const hoja = ss.getSheetByName('Productos');
  const filas = hoja.getDataRange().getValues();
  let num = -1;
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0].toString().toLowerCase() === d.nombre.toLowerCase()) { num = i + 1; break; }
  }
  if (num === -1) throw new Error('Producto no encontrado: ' + d.nombre);

  if (d.unidad) hoja.getRange(num, 2).setValue(d.unidad);
  if (d.precio !== undefined) { validarPositivo(Number(d.precio), 'Precio'); hoja.getRange(num, 3).setValue(Number(d.precio)); }
  if (d.precio_costo !== undefined) { validarPositivo(Number(d.precio_costo), 'Costo'); hoja.getRange(num, 4).setValue(Number(d.precio_costo)); }
  if (d.proveedor !== undefined) hoja.getRange(num, 5).setValue(d.proveedor?.trim() || '');

  return { mensaje: 'Producto actualizado: ' + d.nombre };
}


// ==========================================
// PEDIDOS (VENTAS MULTI-PRODUCTO)
// ==========================================

function registrarPedido(ss, d) {
  // d = { fecha, cliente, forma_pago, monto_pagado, total, descripcion, items: [{producto, cantidad, precio_unitario, subtotal}] }
  if (!d.items || d.items.length === 0) throw new Error('El pedido no tiene productos');
  validarPositivo(Number(d.total), 'El total');
  validarNoNegativo(Number(d.monto_pagado), 'El monto pagado');
  if (Number(d.monto_pagado) > Number(d.total)) throw new Error('El monto pagado no puede superar el total');

  const formasValidas = ['efectivo', 'transferencia', 'crédito'];
  if (!formasValidas.includes(d.forma_pago)) throw new Error('Forma de pago inválida');

  // Si es crédito, el cliente es obligatorio
  if (d.forma_pago === 'crédito' && !d.cliente?.trim()) {
    throw new Error('Para ventas a crédito el cliente es obligatorio');
  }

  const hojaPedidos = ss.getSheetByName('Pedidos');
  const hojaVentas  = ss.getSheetByName('Ventas');

  const pedido_id = generarId(hojaPedidos, 'P');
  const fecha = d.fecha || hoyStr();

  // Guardar cabecera en Pedidos
  hojaPedidos.appendRow([
    pedido_id,
    fecha,
    d.cliente?.trim() || '',
    d.forma_pago,
    Number(d.monto_pagado),
    Number(d.total),
    d.descripcion || ''
  ]);

  // Guardar cada ítem en Ventas
  d.items.forEach(item => {
    const id = generarId(hojaVentas, 'V');
    hojaVentas.appendRow([
      id,
      pedido_id,
      item.producto,
      Number(item.cantidad),
      Number(item.precio_unitario),
      Number(item.subtotal)
    ]);
  });

  SpreadsheetApp.flush();
  return { pedido_id, mensaje: 'Pedido registrado: ' + pedido_id };
}

function editarPedido(ss, d) {
  // d = { pedido_id, fecha?, cliente?, forma_pago?, monto_pagado?, items?: [{id, subtotal, cantidad}] }
  if (!d.pedido_id) throw new Error('pedido_id obligatorio');

  const hojaPedidos = ss.getSheetByName('Pedidos');
  const filasPed = hojaPedidos.getDataRange().getValues();
  let numPed = -1;
  for (let i = 1; i < filasPed.length; i++) {
    if (filasPed[i][0] === d.pedido_id) { numPed = i + 1; break; }
  }
  if (numPed === -1) throw new Error('Pedido no encontrado: ' + d.pedido_id);

  if (d.fecha)        hojaPedidos.getRange(numPed, 2).setValue(d.fecha);
  if (d.cliente !== undefined) hojaPedidos.getRange(numPed, 3).setValue(d.cliente);
  if (d.forma_pago)   hojaPedidos.getRange(numPed, 4).setValue(d.forma_pago);
  if (d.monto_pagado !== undefined) {
    validarNoNegativo(Number(d.monto_pagado), 'Monto pagado');
    const total = Number(filasPed[numPed - 1][5]);
    if (Number(d.monto_pagado) > total) throw new Error('Monto pagado no puede superar el total (' + total + ')');
    hojaPedidos.getRange(numPed, 5).setValue(Number(d.monto_pagado));
  }

  // Editar ítems si se enviaron
  if (d.items && d.items.length > 0) {
    const hojaVentas = ss.getSheetByName('Ventas');
    const filasVentas = hojaVentas.getDataRange().getValues();

    d.items.forEach(item => {
      for (let i = 1; i < filasVentas.length; i++) {
        if (filasVentas[i][0] === item.id) {
          if (item.subtotal !== undefined) hojaVentas.getRange(i+1, 6).setValue(Number(item.subtotal));
          if (item.cantidad !== undefined) hojaVentas.getRange(i+1, 4).setValue(Number(item.cantidad));
          break;
        }
      }
    });

    // Recalcular total del pedido
    const itemsDelPedido = hojaAObjetos(hojaVentas).filter(v => v.pedido_id === d.pedido_id);
    const nuevoTotal = itemsDelPedido.reduce((s, v) => s + Number(v.subtotal), 0);
    hojaPedidos.getRange(numPed, 6).setValue(nuevoTotal);

    // Recalcular descripcion
    const nuevaDesc = itemsDelPedido.map(v => v.producto).join(', ');
    hojaPedidos.getRange(numPed, 7).setValue(nuevaDesc);
  }

  SpreadsheetApp.flush();
  return { mensaje: 'Pedido actualizado: ' + d.pedido_id };
}


// ==========================================
// LECTURAS DE VENTAS
// ==========================================

function getVentasHoy(ss) {
  const hoy = hoyStr();
  const pedidos = hojaAObjetos(ss.getSheetByName('Pedidos')).filter(p => p.fecha === hoy);
  const todasVentas = hojaAObjetos(ss.getSheetByName('Ventas'));

  const resultado = pedidos.map(p => ({
    ...p,
    items: todasVentas.filter(v => v.pedido_id === p.pedido_id)
  }));

  return {
    pedidos: resultado.reverse(), // más reciente primero
    total_ventas: pedidos.reduce((s, p) => s + Number(p.total), 0),
    total_cobrado: pedidos.reduce((s, p) => s + Number(p.monto_pagado), 0),
    cantidad: pedidos.length
  };
}

function getVentas(ss, desde, hasta) {
  const pedidos = filtrarFecha(hojaAObjetos(ss.getSheetByName('Pedidos')), desde, hasta);
  const todasVentas = hojaAObjetos(ss.getSheetByName('Ventas'));

  return {
    pedidos: pedidos.map(p => ({ ...p, items: todasVentas.filter(v => v.pedido_id === p.pedido_id) })),
    total: pedidos.reduce((s, p) => s + Number(p.total), 0),
    cantidad: pedidos.length
  };
}


// ==========================================
// CLIENTES Y DEUDAS
// ==========================================

function getClientes(ss) {
  const deHoja = hojaAObjetos(ss.getSheetByName('Clientes'));
  // También incluir clientes que aparecen en pedidos
  const dePedidos = hojaAObjetos(ss.getSheetByName('Pedidos'))
    .map(p => p.cliente)
    .filter(c => c && !deHoja.some(cl => cl.nombre === c));

  const nombresExtra = [...new Set(dePedidos)].map(n => ({ nombre: n, apellido: '', celular: '' }));
  return [...deHoja, ...nombresExtra].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function agregarCliente(ss, d) {
  if (!d.nombre?.trim()) throw new Error('El nombre es obligatorio');
  const hoja = ss.getSheetByName('Clientes');
  const existentes = hojaAObjetos(hoja);
  if (existentes.some(c => c.nombre.toLowerCase() === d.nombre.trim().toLowerCase())) {
    throw new Error('Ya existe un cliente con ese nombre');
  }
  hoja.appendRow([d.nombre.trim(), d.apellido?.trim() || '', d.celular?.trim() || '']);
  return { mensaje: 'Cliente agregado: ' + d.nombre };
}

function editarCliente(ss, d) {
  if (!d.nombre) throw new Error('Nombre obligatorio');
  const hoja = ss.getSheetByName('Clientes');
  const filas = hoja.getDataRange().getValues();
  let num = -1;
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0].toLowerCase() === d.nombre.toLowerCase()) { num = i + 1; break; }
  }
  if (num === -1) throw new Error('Cliente no encontrado: ' + d.nombre);
  if (d.apellido !== undefined) hoja.getRange(num, 2).setValue(d.apellido);
  if (d.celular  !== undefined) hoja.getRange(num, 3).setValue(d.celular);
  return { mensaje: 'Cliente actualizado' };
}

function eliminarCliente(ss, d) {
  // Nota: los pedidos previos conservan el nombre del cliente como texto, no se pierden datos.
  if (!d.nombre) throw new Error('Nombre obligatorio');
  const hoja = ss.getSheetByName('Clientes');
  const filas = hoja.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0].toLowerCase() === d.nombre.toLowerCase()) {
      hoja.deleteRow(i + 1);
      return { mensaje: 'Cliente eliminado: ' + d.nombre };
    }
  }
  throw new Error('Cliente no encontrado: ' + d.nombre);
}

function agregarProveedor(ss, d) {
  if (!d.nombre?.trim()) throw new Error('El nombre es obligatorio');
  const hoja = ss.getSheetByName('Proveedores');
  const existentes = hojaAObjetos(hoja);
  if (existentes.some(p => p.nombre.toLowerCase() === d.nombre.trim().toLowerCase())) {
    throw new Error('Ya existe ese proveedor');
  }
  hoja.appendRow([d.nombre.trim(), d.contacto?.trim() || '']);
  return { mensaje: 'Proveedor agregado: ' + d.nombre };
}

function editarProveedor(ss, d) {
  if (!d.nombre) throw new Error('Nombre obligatorio');
  const hoja = ss.getSheetByName('Proveedores');
  const filas = hoja.getDataRange().getValues();
  let num = -1;
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0].toLowerCase() === d.nombre.toLowerCase()) { num = i + 1; break; }
  }
  if (num === -1) throw new Error('Proveedor no encontrado: ' + d.nombre);
  if (d.contacto !== undefined) hoja.getRange(num, 2).setValue(d.contacto);
  return { mensaje: 'Proveedor actualizado' };
}

function eliminarProveedor(ss, d) {
  if (!d.nombre) throw new Error('Nombre obligatorio');
  const hoja = ss.getSheetByName('Proveedores');
  const filas = hoja.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0].toLowerCase() === d.nombre.toLowerCase()) {
      hoja.deleteRow(i + 1);
      return { mensaje: 'Proveedor eliminado: ' + d.nombre };
    }
  }
  throw new Error('Proveedor no encontrado: ' + d.nombre);
}

function getDeudaClientes(ss) {
  const pedidos = hojaAObjetos(ss.getSheetByName('Pedidos'));
  const pagos   = hojaAObjetos(ss.getSheetByName('Pagos Clientes'));

  const saldos = {};

  pedidos.forEach(p => {
    if (!p.cliente) return;
    const c = p.cliente;
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0 };
    saldos[c].total_ventas  += Number(p.total);
    saldos[c].pagado_ventas += Number(p.monto_pagado);
  });

  pagos.forEach(p => {
    const c = p.cliente;
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0 };
    saldos[c].abonos += Number(p.monto);
  });

  return Object.entries(saldos)
    .map(([cliente, s]) => ({
      cliente,
      deuda: s.total_ventas - s.pagado_ventas - s.abonos,
      total_ventas: s.total_ventas
    }))
    .filter(c => c.deuda > 0.01)
    .sort((a, b) => b.deuda - a.deuda);
}

function getHistorialCliente(ss, cliente) {
  if (!cliente) throw new Error('Cliente obligatorio');

  const pedidos = hojaAObjetos(ss.getSheetByName('Pedidos')).filter(p => p.cliente === cliente);
  const ventas  = hojaAObjetos(ss.getSheetByName('Ventas'));
  const pagos   = hojaAObjetos(ss.getSheetByName('Pagos Clientes')).filter(p => p.cliente === cliente);

  // Armar línea de tiempo unificada
  const movimientos = [
    ...pedidos.map(p => ({
      tipo: 'compra',
      fecha: p.fecha,
      id: p.pedido_id,
      descripcion: p.descripcion || pedidos.map(v => v.producto).join(', '),
      debe: Number(p.total),
      haber: Number(p.monto_pagado), // lo pagado al momento de la venta
    })),
    ...pagos.map(p => ({
      tipo: 'abono',
      fecha: p.fecha,
      id: p.id,
      descripcion: p.nota || 'Abono',
      debe: 0,
      haber: Number(p.monto),
    }))
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Calcular saldo acumulado
  let saldo = 0;
  movimientos.forEach(m => {
    saldo += m.debe - m.haber;
    m.saldo = saldo;
  });

  // Para cada pedido, incluir sus ítems
  const conItems = movimientos.map(m => {
    if (m.tipo === 'compra') {
      m.items = ventas.filter(v => v.pedido_id === m.id);
    }
    return m;
  });

  return { cliente, movimientos: conItems, saldo_total: saldo };
}

function registrarPagoCliente(ss, d) {
  if (!d.cliente) throw new Error('Cliente obligatorio');
  validarPositivo(Number(d.monto), 'El monto');
  if (Number(d.monto) === 0) throw new Error('El monto debe ser mayor a cero');

  const hoja = ss.getSheetByName('Pagos Clientes');
  const id = generarId(hoja, 'PC');
  hoja.appendRow([id, d.fecha || hoyStr(), d.cliente, Number(d.monto), d.nota || '']);
  return { id, mensaje: 'Abono registrado' };
}


// ==========================================
// PROVEEDORES Y DEUDAS
// ==========================================

function getProveedores(ss) {
  const deHoja = hojaAObjetos(ss.getSheetByName('Proveedores')).map(p => ({ nombre: p.nombre, contacto: p.contacto || '' }));
  const nombresHoja = new Set(deHoja.map(p => p.nombre.toLowerCase()));
  const deCompras = [...new Set(hojaAObjetos(ss.getSheetByName('Compras')).map(c => c.proveedor).filter(p => p && !nombresHoja.has(p.toLowerCase())))]
    .map(n => ({ nombre: n, contacto: '' }));
  return [...deHoja, ...deCompras].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function getDeudaProveedores(ss) {
  const compras = hojaAObjetos(ss.getSheetByName('Compras'));
  const pagos   = hojaAObjetos(ss.getSheetByName('Pagos Proveedores'));
  const saldos  = {};

  compras.forEach(c => {
    const p = c.proveedor || '(sin nombre)';
    if (!saldos[p]) saldos[p] = { total: 0, pagado: 0, abonos: 0 };
    saldos[p].total  += Number(c.total);
    saldos[p].pagado += Number(c.monto_pagado);
  });

  pagos.forEach(p => {
    const prov = p.proveedor || '(sin nombre)';
    if (!saldos[prov]) saldos[prov] = { total: 0, pagado: 0, abonos: 0 };
    saldos[prov].abonos += Number(p.monto);
  });

  return Object.entries(saldos)
    .map(([proveedor, s]) => ({ proveedor, deuda: s.total - s.pagado - s.abonos, total_compras: s.total }))
    .filter(p => p.deuda > 0.01)
    .sort((a, b) => b.deuda - a.deuda);
}

function registrarPagoProveedor(ss, d) {
  if (!d.proveedor) throw new Error('Proveedor obligatorio');
  validarPositivo(Number(d.monto), 'El monto');
  const hoja = ss.getSheetByName('Pagos Proveedores');
  const id = generarId(hoja, 'PP');
  hoja.appendRow([id, d.fecha || hoyStr(), d.proveedor, Number(d.monto)]);
  return { id, mensaje: 'Pago a proveedor registrado' };
}


// ==========================================
// COMPRAS
// ==========================================

function registrarCompra(ss, d) {
  if (!d.proveedor)       throw new Error('Proveedor obligatorio');
  if (!d.producto_insumo) throw new Error('Producto/insumo obligatorio');
  validarPositivo(Number(d.cantidad), 'Cantidad');
  validarPositivo(Number(d.total), 'Total');
  validarNoNegativo(Number(d.monto_pagado), 'Monto pagado');
  if (Number(d.monto_pagado) > Number(d.total)) throw new Error('Monto pagado no puede superar el total');

  const hoja = ss.getSheetByName('Compras');
  const id = generarId(hoja, 'C');
  hoja.appendRow([id, d.fecha || hoyStr(), d.proveedor, d.producto_insumo,
    Number(d.cantidad), Number(d.costo_unitario), Number(d.total), d.forma_pago, Number(d.monto_pagado)]);
  return { id, mensaje: 'Compra registrada' };
}

function getCompras(ss, desde, hasta) {
  const todas = filtrarFecha(hojaAObjetos(ss.getSheetByName('Compras')), desde, hasta);
  return { compras: todas, total: todas.reduce((s, c) => s + Number(c.total), 0), cantidad: todas.length };
}


// ==========================================
// REPORTES
// ==========================================

function getGanancia(ss, desde, hasta) {
  const pedidos = filtrarFecha(hojaAObjetos(ss.getSheetByName('Pedidos')), desde, hasta);
  const compras = filtrarFecha(hojaAObjetos(ss.getSheetByName('Compras')), desde, hasta);

  const totalVentas  = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const totalCompras = compras.reduce((s, c) => s + Number(c.total), 0);

  return {
    desde: desde || 'inicio',
    hasta: hasta || hoyStr(),
    total_ventas:  totalVentas,
    total_compras: totalCompras,
    ganancia: totalVentas - totalCompras,
    cantidad_ventas:  pedidos.length,
    cantidad_compras: compras.length
  };
}
```

---

## Cómo probarlo

Después de redesplegar, abrí:
```
https://script.google.com/macros/s/AKfycbyFQZz8DgsMEfJlCYgOYZrdIK8PvTIIMBgXgCSFxRfjkVd_v1GtMNoWaIjXdVRQRumzlg/exec?accion=getProductos
```
Deberías ver los productos que ya cargaste.
