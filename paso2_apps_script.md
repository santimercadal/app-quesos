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
    { nombre: 'Pedidos',           encabezados: ['pedido_id', 'fecha', 'cliente', 'forma_pago', 'monto_pagado', 'total', 'descripcion', 'operador'] },
    // Ventas: líneas de cada pedido (un producto por fila)
    { nombre: 'Ventas',            encabezados: ['id', 'pedido_id', 'producto', 'cantidad', 'precio_unitario', 'subtotal'] },
    { nombre: 'Pagos Clientes',    encabezados: ['id', 'fecha', 'cliente', 'monto', 'nota', 'operador'] },
    { nombre: 'Compras',           encabezados: ['id', 'fecha', 'proveedor', 'producto_insumo', 'cantidad', 'costo_unitario', 'total', 'forma_pago', 'monto_pagado', 'operador'] },
    { nombre: 'Pagos Proveedores', encabezados: ['id', 'fecha', 'proveedor', 'monto', 'operador'] },
    { nombre: 'Clientes',          encabezados: ['nombre', 'apellido', 'celular'] },
    { nombre: 'Proveedores',       encabezados: ['nombre', 'contacto'] },
    // Devoluciones: registro inmutable de mercadería devuelta (a proveedores o de clientes)
    { nombre: 'Devoluciones',      encabezados: ['id', 'fecha', 'tipo', 'contraparte', 'referencia_id', 'producto', 'cantidad', 'monto', 'motivo', 'resolucion', 'operador'] },
    { nombre: 'Operadores',        encabezados: ['nombre'] },
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
      // Poblar valores iniciales para Operadores
      if (nombre === 'Operadores') {
        ['Mamá', 'Papá', 'Santi'].forEach(op => hoja.appendRow([op]));
      }
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
      case 'getDeudaContactos':    resultado = getDeudaContactos(ss); break;
      case 'getHistorialContacto': resultado = getHistorialContacto(ss, e.parameter.contacto); break;
      case 'getHistorialCliente':   resultado = getHistorialCliente(ss, e.parameter.cliente); break;
      case 'getHistorialProveedor': resultado = getHistorialProveedor(ss, e.parameter.proveedor); break;
      case 'getDevoluciones':       resultado = getDevoluciones(ss, e.parameter.desde, e.parameter.hasta, e.parameter.tipo); break;
      case 'getOperadores':         resultado = getOperadoresList(ss); break;
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
  // LockService serializa las escrituras: con varios operadores a la vez,
  // evita que dos requests se pisen y corrompan datos en la planilla.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // esperar hasta 30s a que se libere
  } catch (errLock) {
    return crearRespuesta({ ok: false, error: 'El sistema está ocupado, probá de nuevo en unos segundos.' });
  }
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
      case 'registrarDevolucion':    resultado = registrarDevolucion(ss, body.datos); break;
      case 'resolverDevolucion':     resultado = resolverDevolucion(ss, body.datos); break;
      case 'guardarOperadores':      resultado = guardarOperadores(ss, body.datos); break;
      default: resultado = { error: 'Acción no reconocida: ' + accion };
    }

    return crearRespuesta({ ok: true, datos: resultado });
  } catch (err) {
    return crearRespuesta({ ok: false, error: err.toString() });
  } finally {
    lock.releaseLock();
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
// OPERADORES
// ==========================================

function getOperadoresList(ss) {
  const hoja = ss.getSheetByName('Operadores');
  if (!hoja || hoja.getLastRow() <= 1) return ['Mamá', 'Papá', 'Santi'];
  const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues();
  return vals.map(r => r[0]).filter(n => n && n.toString().trim());
}

function guardarOperadores(ss, d) {
  if (!Array.isArray(d.lista) || d.lista.length === 0) throw new Error('Lista de operadores inválida o vacía');
  const hoja = ss.getSheetByName('Operadores');
  if (!hoja) throw new Error('Hoja Operadores no encontrada. Ejecutá inicializarHojas primero.');
  // Limpiar filas de datos (mantener encabezado en fila 1)
  const lastRow = hoja.getLastRow();
  if (lastRow > 1) {
    hoja.getRange(2, 1, lastRow - 1, 1).clearContent();
  }
  // Escribir lista nueva
  d.lista.forEach((nombre, i) => {
    hoja.getRange(2 + i, 1).setValue(nombre.toString().trim());
  });
  SpreadsheetApp.flush();
  return { mensaje: 'Operadores guardados: ' + d.lista.length };
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
  if (d.precio_costo !== undefined) { validarNoNegativo(Number(d.precio_costo), 'Costo'); hoja.getRange(num, 4).setValue(Number(d.precio_costo)); }
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
    d.descripcion || '',
    d.operador?.trim() || ''
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
  // d = { pedido_id, fecha?, cliente?, forma_pago?, monto_pagado?, items?: [{producto, cantidad, precio_unitario, subtotal, unidad}] }
  // Los ítems se reemplazan por completo: permite agregar y quitar productos.
  if (!d.pedido_id) throw new Error('pedido_id obligatorio');

  const hojaPedidos = ss.getSheetByName('Pedidos');
  const filasPed = hojaPedidos.getDataRange().getValues();
  let numPed = -1;
  for (let i = 1; i < filasPed.length; i++) {
    if (filasPed[i][0] === d.pedido_id) { numPed = i + 1; break; }
  }
  if (numPed === -1) throw new Error('Pedido no encontrado: ' + d.pedido_id);

  if (d.fecha)                 hojaPedidos.getRange(numPed, 2).setValue(d.fecha);
  if (d.cliente !== undefined) hojaPedidos.getRange(numPed, 3).setValue(d.cliente);
  if (d.forma_pago)            hojaPedidos.getRange(numPed, 4).setValue(d.forma_pago);

  // Reemplazo completo de los ítems (si se enviaron)
  if (Array.isArray(d.items)) {
    if (d.items.length === 0) throw new Error('El pedido debe tener al menos un producto');

    const hojaVentas = ss.getSheetByName('Ventas');
    const filasVentas = hojaVentas.getDataRange().getValues();
    // Borrar las líneas existentes de este pedido (de abajo hacia arriba)
    for (let i = filasVentas.length - 1; i >= 1; i--) {
      if (filasVentas[i][1] === d.pedido_id) hojaVentas.deleteRow(i + 1);
    }
    // Insertar las líneas nuevas
    d.items.forEach(item => {
      if (!item.producto) throw new Error('Cada producto del pedido debe tener nombre');
      const id = generarId(hojaVentas, 'V');
      hojaVentas.appendRow([
        id, d.pedido_id, item.producto,
        Number(item.cantidad) || 0, Number(item.precio_unitario) || 0, Number(item.subtotal) || 0
      ]);
    });

    // Recalcular total y descripción
    const nuevoTotal = d.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
    hojaPedidos.getRange(numPed, 6).setValue(nuevoTotal);
    const nuevaDesc = d.items.map(it => {
      const cant = Number(it.cantidad) > 0 ? ' (' + Number(it.cantidad).toFixed(2) + ' ' + (it.unidad || 'kg') + ')' : '';
      return it.producto + cant;
    }).join(', ');
    hojaPedidos.getRange(numPed, 7).setValue(nuevaDesc);
  }

  // Validar monto_pagado contra el total ACTUAL (recalculado si cambiaron los ítems)
  if (d.monto_pagado !== undefined) {
    validarNoNegativo(Number(d.monto_pagado), 'Monto pagado');
    const totalActual = Number(hojaPedidos.getRange(numPed, 6).getValue());
    if (Number(d.monto_pagado) > totalActual) throw new Error('Monto pagado no puede superar el total (' + totalActual + ')');
    hojaPedidos.getRange(numPed, 5).setValue(Number(d.monto_pagado));
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

  // Pagos recibidos de clientes hoy (abonos de deudas)
  const pagosHoy = hojaAObjetos(ss.getSheetByName('Pagos Clientes')).filter(p => p.fecha === hoy);
  const totalAbonos = pagosHoy.reduce((s, p) => s + Number(p.monto), 0);

  return {
    pedidos: resultado.reverse(), // más reciente primero
    total_ventas: pedidos.reduce((s, p) => s + Number(p.total), 0),
    total_cobrado: pedidos.reduce((s, p) => s + Number(p.monto_pagado), 0) + totalAbonos,
    pagos_clientes: pagosHoy.reverse(), // abonos de hoy
    total_abonos: totalAbonos,
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
  const norm = s => (s || '').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  const deHoja = hojaAObjetos(ss.getSheetByName('Clientes'));
  // Identidades ya conocidas: el nombre COMPLETO normalizado de cada cliente de la hoja.
  const conocidos = new Set(deHoja.map(cl => norm([cl.nombre, cl.apellido].filter(Boolean).join(' '))));
  // Incluir nombres que aparecen en pedidos y NO coinciden con ningún cliente de la hoja
  // (comparando por nombre completo normalizado → evita el fantasma "Juan" vs "Juan Pérez").
  const dePedidos = hojaAObjetos(ss.getSheetByName('Pedidos'))
    .map(p => p.cliente)
    .filter(c => c && !conocidos.has(norm(c)));

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
  const pedidos      = hojaAObjetos(ss.getSheetByName('Pedidos'));
  const pagos        = hojaAObjetos(ss.getSheetByName('Pagos Clientes'));
  const devoluciones = hojaAObjetos(ss.getSheetByName('Devoluciones'))
                         .filter(d => d.tipo === 'cliente');

  const saldos = {};

  pedidos.forEach(p => {
    if (!p.cliente) return;
    const c = p.cliente;
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0, devoluciones: 0 };
    saldos[c].total_ventas  += Number(p.total);
    saldos[c].pagado_ventas += Number(p.monto_pagado);
  });

  pagos.forEach(p => {
    const c = p.cliente;
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0, devoluciones: 0 };
    saldos[c].abonos += Number(p.monto);
  });

  // Las devoluciones de clientes reducen lo que nos deben
  devoluciones.forEach(d => {
    const c = d.contraparte;
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0, devoluciones: 0 };
    saldos[c].devoluciones += Number(d.monto);
  });

  return Object.entries(saldos)
    .map(([cliente, s]) => ({
      cliente,
      deuda:        s.total_ventas - s.pagado_ventas - s.abonos - s.devoluciones,
      total_ventas: s.total_ventas,
      devoluciones: s.devoluciones
    }))
    .filter(c => c.deuda > 0.01)
    .sort((a, b) => b.deuda - a.deuda);
}

function getHistorialCliente(ss, cliente) {
  if (!cliente) throw new Error('Cliente obligatorio');

  const pedidos = hojaAObjetos(ss.getSheetByName('Pedidos')).filter(p => p.cliente === cliente);
  const ventas  = hojaAObjetos(ss.getSheetByName('Ventas'));
  const pagos   = hojaAObjetos(ss.getSheetByName('Pagos Clientes')).filter(p => p.cliente === cliente);
  const devoluciones = hojaAObjetos(ss.getSheetByName('Devoluciones'))
                         .filter(d => d.tipo === 'cliente' && d.contraparte === cliente);

  // Armar línea de tiempo unificada
  const movimientos = [
    ...pedidos.map(p => ({
      tipo: 'compra',
      fecha: p.fecha,
      id: p.pedido_id,
      descripcion: p.descripcion || 'Venta',
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
    })),
    ...devoluciones.map(d => ({
      tipo: 'devolucion',
      fecha: d.fecha,
      id: d.id,
      descripcion: `Devolución: ${d.producto} · ${d.cantidad} · ${d.motivo}`,
      debe: 0,
      haber: Number(d.monto),
      resolucion: d.resolucion
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
  hoja.appendRow([id, d.fecha || hoyStr(), d.cliente, Number(d.monto), d.nota || '', d.operador?.trim() || '']);
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
  const compras      = hojaAObjetos(ss.getSheetByName('Compras'));
  const pagos        = hojaAObjetos(ss.getSheetByName('Pagos Proveedores'));
  const devoluciones = hojaAObjetos(ss.getSheetByName('Devoluciones'))
                         .filter(d => d.tipo === 'proveedor');
  const saldos = {};

  compras.forEach(c => {
    const p = c.proveedor || '(sin nombre)';
    if (!saldos[p]) saldos[p] = { total: 0, pagado: 0, abonos: 0, devoluciones: 0 };
    saldos[p].total  += Number(c.total);
    saldos[p].pagado += Number(c.monto_pagado);
  });

  pagos.forEach(p => {
    const prov = p.proveedor || '(sin nombre)';
    if (!saldos[prov]) saldos[prov] = { total: 0, pagado: 0, abonos: 0, devoluciones: 0 };
    saldos[prov].abonos += Number(p.monto);
  });

  // Las devoluciones a proveedores reducen lo que les debemos
  devoluciones.forEach(d => {
    const prov = d.contraparte || '(sin nombre)';
    if (!saldos[prov]) saldos[prov] = { total: 0, pagado: 0, abonos: 0, devoluciones: 0 };
    saldos[prov].devoluciones += Number(d.monto);
  });

  return Object.entries(saldos)
    .map(([proveedor, s]) => ({
      proveedor,
      deuda:        s.total - s.pagado - s.abonos - s.devoluciones,
      total_compras: s.total,
      devoluciones: s.devoluciones
    }))
    .filter(p => p.deuda > 0.01)
    .sort((a, b) => b.deuda - a.deuda);
}

function registrarPagoProveedor(ss, d) {
  if (!d.proveedor) throw new Error('Proveedor obligatorio');
  validarPositivo(Number(d.monto), 'El monto');
  const hoja = ss.getSheetByName('Pagos Proveedores');
  const id = generarId(hoja, 'PP');
  hoja.appendRow([id, d.fecha || hoyStr(), d.proveedor, Number(d.monto), d.operador?.trim() || '']);
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
    Number(d.cantidad), Number(d.costo_unitario), Number(d.total), d.forma_pago, Number(d.monto_pagado), d.operador?.trim() || '']);
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
  const pedidos      = filtrarFecha(hojaAObjetos(ss.getSheetByName('Pedidos')), desde, hasta);
  const compras      = filtrarFecha(hojaAObjetos(ss.getSheetByName('Compras')), desde, hasta);
  const devoluciones = filtrarFecha(hojaAObjetos(ss.getSheetByName('Devoluciones')), desde, hasta);
  const abonos       = filtrarFecha(hojaAObjetos(ss.getSheetByName('Pagos Clientes')), desde, hasta);

  const totalAbonos       = abonos.reduce((s, p) => s + Number(p.monto), 0);
  const totalVentas       = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const totalCompras      = compras.reduce((s, c) => s + Number(c.total), 0);
  const devAProveedores   = devoluciones.filter(d => d.tipo === 'proveedor').reduce((s, d) => s + Number(d.monto), 0);
  const devDeClientes     = devoluciones.filter(d => d.tipo === 'cliente').reduce((s, d) => s + Number(d.monto), 0);

  // Ganancia neta: ventas − devoluciones de clientes − (compras − devoluciones a proveedores)
  const ventasNetas  = totalVentas - devDeClientes;
  const comprasNetas = totalCompras - devAProveedores;

  return {
    desde: desde || 'inicio',
    hasta: hasta || hoyStr(),
    total_ventas:         totalVentas,
    total_compras:        totalCompras,
    dev_a_proveedores:    devAProveedores,
    dev_de_clientes:      devDeClientes,
    abonos_clientes:      totalAbonos,
    ventas_netas:         ventasNetas,
    compras_netas:        comprasNetas,
    ganancia:             ventasNetas - comprasNetas,
    cantidad_ventas:      pedidos.length,
    cantidad_compras:     compras.length
  };
}

// ==========================================
// DEVOLUCIONES
// ==========================================

function registrarDevolucion(ss, d) {
  // Validaciones
  if (!d.tipo || !['proveedor', 'cliente'].includes(d.tipo))
    throw new Error('Tipo debe ser "proveedor" o "cliente"');
  if (!d.contraparte?.trim())
    throw new Error('Nombre del proveedor/cliente obligatorio');
  if (!d.producto?.trim())
    throw new Error('Producto obligatorio');
  validarPositivo(Number(d.cantidad), 'Cantidad');
  validarPositivo(Number(d.monto), 'Monto');
  if (!d.motivo?.trim())
    throw new Error('Motivo obligatorio');

  const resoluciones = ['pendiente', 'acreditado', 'devuelto_dinero'];
  const resolucion = d.resolucion || 'pendiente';
  if (!resoluciones.includes(resolucion))
    throw new Error('Resolución inválida. Usá: pendiente, acreditado o devuelto_dinero');

  const hoja = ss.getSheetByName('Devoluciones');
  const id = generarId(hoja, 'DEV');

  hoja.appendRow([
    id,
    d.fecha || hoyStr(),
    d.tipo,
    d.contraparte.trim(),
    d.referencia_id?.trim() || '',
    d.producto.trim(),
    Number(d.cantidad),
    Number(d.monto),
    d.motivo.trim(),
    resolucion,
    d.operador?.trim() || ''
  ]);

  SpreadsheetApp.flush();
  return { id, mensaje: `Devolución registrada: ${id}` };
}

function resolverDevolucion(ss, d) {
  // Permite actualizar la resolución de una devolución existente
  if (!d.id) throw new Error('ID de devolución obligatorio');
  const resoluciones = ['pendiente', 'acreditado', 'devuelto_dinero'];
  if (!resoluciones.includes(d.resolucion))
    throw new Error('Resolución inválida. Usá: pendiente, acreditado o devuelto_dinero');

  const hoja = ss.getSheetByName('Devoluciones');
  const filas = hoja.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0] === d.id) {
      hoja.getRange(i + 1, 10).setValue(d.resolucion); // columna resolucion
      SpreadsheetApp.flush();
      return { mensaje: `Devolución ${d.id} marcada como: ${d.resolucion}` };
    }
  }
  throw new Error('Devolución no encontrada: ' + d.id);
}

function getDevoluciones(ss, desde, hasta, tipo) {
  let devs = filtrarFecha(hojaAObjetos(ss.getSheetByName('Devoluciones')), desde, hasta);
  if (tipo) devs = devs.filter(d => d.tipo === tipo);
  devs = devs.reverse(); // más reciente primero

  const totalPendiente  = devs.filter(d => d.resolucion === 'pendiente').reduce((s, d) => s + Number(d.monto), 0);
  const totalAcreditado = devs.filter(d => d.resolucion !== 'pendiente').reduce((s, d) => s + Number(d.monto), 0);

  return {
    devoluciones: devs,
    total_pendiente:  totalPendiente,
    total_acreditado: totalAcreditado,
    cantidad: devs.length
  };
}

function getHistorialProveedor(ss, proveedor) {
  if (!proveedor) throw new Error('Proveedor obligatorio');

  const compras      = hojaAObjetos(ss.getSheetByName('Compras')).filter(c => c.proveedor === proveedor);
  const pagos        = hojaAObjetos(ss.getSheetByName('Pagos Proveedores')).filter(p => p.proveedor === proveedor);
  const devoluciones = hojaAObjetos(ss.getSheetByName('Devoluciones'))
                         .filter(d => d.tipo === 'proveedor' && d.contraparte === proveedor);

  const movimientos = [
    ...compras.map(c => ({
      tipo: 'compra',
      fecha: c.fecha,
      id: c.id,
      descripcion: `${c.producto_insumo} · ${c.cantidad} kg`,
      debe: Number(c.total),
      haber: Number(c.monto_pagado),
      forma_pago: c.forma_pago
    })),
    ...pagos.map(p => ({
      tipo: 'pago',
      fecha: p.fecha,
      id: p.id,
      descripcion: 'Pago realizado',
      debe: 0,
      haber: Number(p.monto)
    })),
    ...devoluciones.map(d => ({
      tipo: 'devolucion',
      fecha: d.fecha,
      id: d.id,
      descripcion: `Devolución: ${d.producto} · ${d.cantidad} · ${d.motivo}`,
      debe: 0,
      haber: Number(d.monto),
      resolucion: d.resolucion
    }))
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  let saldo = 0;
  movimientos.forEach(m => {
    saldo += m.debe - m.haber;
    m.saldo = saldo;
  });

  return {
    proveedor,
    movimientos: movimientos.reverse(),
    saldo_total: saldo
  };
}

// ==========================================
// CUENTA ÚNICA POR CONTACTO (Fase 3)
// Neto = (lo que te debe como cliente) - (lo que le debés como proveedor)
// Positivo = te debe ; Negativo = le debés.
// ==========================================

function getDeudaContactos(ss) {
  const norm = s => (s || '').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  const pedidos = hojaAObjetos(ss.getSheetByName('Pedidos'));
  const pagosC  = hojaAObjetos(ss.getSheetByName('Pagos Clientes'));
  const compras = hojaAObjetos(ss.getSheetByName('Compras'));
  const pagosP  = hojaAObjetos(ss.getSheetByName('Pagos Proveedores'));
  const devs    = hojaAObjetos(ss.getSheetByName('Devoluciones'));

  const map = {};
  const get = (name) => {
    const k = norm(name);
    if (!k) return null;
    if (!map[k]) map[k] = { contacto: name, cli: 0, prov: 0, total_ventas: 0, total_compras: 0 };
    return map[k];
  };

  pedidos.forEach(p => { const g = get(p.cliente); if (g) { g.cli += Number(p.total) - Number(p.monto_pagado); g.total_ventas += Number(p.total); } });
  pagosC.forEach(p => { const g = get(p.cliente); if (g) g.cli -= Number(p.monto); });
  devs.filter(d => d.tipo === 'cliente').forEach(d => { const g = get(d.contraparte); if (g) g.cli -= Number(d.monto); });

  compras.forEach(c => { const g = get(c.proveedor); if (g) { g.prov += Number(c.total) - Number(c.monto_pagado); g.total_compras += Number(c.total); } });
  pagosP.forEach(p => { const g = get(p.proveedor); if (g) g.prov -= Number(p.monto); });
  devs.filter(d => d.tipo === 'proveedor').forEach(d => { const g = get(d.contraparte); if (g) g.prov -= Number(d.monto); });

  return Object.values(map)
    .map(g => ({
      contacto: g.contacto,
      neto: g.cli - g.prov,
      debe_cliente: g.cli,
      debe_proveedor: g.prov,
      total_ventas: g.total_ventas,
      total_compras: g.total_compras
    }))
    .filter(g => Math.abs(g.neto) > 0.01)
    .sort((a, b) => b.neto - a.neto);
}

function getHistorialContacto(ss, contacto) {
  if (!contacto) throw new Error('Contacto obligatorio');
  const norm = s => (s || '').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  const key = norm(contacto);
  const match = v => norm(v) === key;

  const ventasItems = hojaAObjetos(ss.getSheetByName('Ventas'));
  const pedidos = hojaAObjetos(ss.getSheetByName('Pedidos')).filter(p => match(p.cliente));
  const pagosC  = hojaAObjetos(ss.getSheetByName('Pagos Clientes')).filter(p => match(p.cliente));
  const compras = hojaAObjetos(ss.getSheetByName('Compras')).filter(c => match(c.proveedor));
  const pagosP  = hojaAObjetos(ss.getSheetByName('Pagos Proveedores')).filter(p => match(p.proveedor));
  const devs    = hojaAObjetos(ss.getSheetByName('Devoluciones')).filter(d => match(d.contraparte));

  const mov = [];
  pedidos.forEach(p => mov.push({
    tipo: 'venta', fecha: p.fecha, id: p.pedido_id,
    descripcion: p.descripcion || 'Venta',
    delta: Number(p.total) - Number(p.monto_pagado),
    total: Number(p.total), pagado: Number(p.monto_pagado),
    items: ventasItems.filter(v => v.pedido_id === p.pedido_id)
  }));
  pagosC.forEach(p => mov.push({ tipo: 'pago_cli', fecha: p.fecha, id: p.id, descripcion: p.nota || 'Pago recibido', delta: -Number(p.monto) }));
  compras.forEach(c => mov.push({ tipo: 'compra', fecha: c.fecha, id: c.id, descripcion: 'Compra: ' + c.producto_insumo + ' · ' + c.cantidad, delta: -(Number(c.total) - Number(c.monto_pagado)), total: Number(c.total), pagado: Number(c.monto_pagado) }));
  pagosP.forEach(p => mov.push({ tipo: 'pago_prov', fecha: p.fecha, id: p.id, descripcion: 'Pago que le hiciste', delta: Number(p.monto) }));
  devs.filter(d => d.tipo === 'cliente').forEach(d => mov.push({ tipo: 'dev_cli', fecha: d.fecha, id: d.id, descripcion: 'Devolución de cliente: ' + d.producto, delta: -Number(d.monto) }));
  devs.filter(d => d.tipo === 'proveedor').forEach(d => mov.push({ tipo: 'dev_prov', fecha: d.fecha, id: d.id, descripcion: 'Devolución a proveedor: ' + d.producto, delta: Number(d.monto) }));

  mov.sort((a, b) => (a.fecha || '').toString().localeCompare((b.fecha || '').toString()));
  let saldo = 0;
  mov.forEach(m => { saldo += m.delta; m.saldo = saldo; });

  return { contacto, movimientos: mov, saldo_total: saldo };
}

// ==========================================
// LIMPIEZA DE CONTACTOS (Fase 2)
// Correr MANUALMENTE desde el editor. Hacé una COPIA de la planilla antes de
// fusionar (Archivo → Hacer una copia). auditarContactos() es solo lectura.
// ==========================================

function _normNombre(s) {
  return (s || '').toString().normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

// 1) AUDITORÍA (solo lectura). Resultado en Ver → Registros (Logs).
function auditarContactos() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const clientes    = hojaAObjetos(ss.getSheetByName('Clientes'));
  const proveedores = hojaAObjetos(ss.getSheetByName('Proveedores'));
  const pedidos     = hojaAObjetos(ss.getSheetByName('Pedidos'));
  const pagosC      = hojaAObjetos(ss.getSheetByName('Pagos Clientes'));
  const compras     = hojaAObjetos(ss.getSheetByName('Compras'));
  const pagosP      = hojaAObjetos(ss.getSheetByName('Pagos Proveedores'));
  const devs        = hojaAObjetos(ss.getSheetByName('Devoluciones'));

  function contar(nombres) {
    const m = {};
    nombres.filter(Boolean).forEach(n => {
      const k = _normNombre(n);
      if (!m[k]) m[k] = { display: n, usos: 0 };
      m[k].usos++;
    });
    return m;
  }

  const usadosCli = contar([].concat(
    pedidos.map(p => p.cliente),
    pagosC.map(p => p.cliente),
    devs.filter(d => d.tipo === 'cliente').map(d => d.contraparte)
  ));
  const usadosProv = contar([].concat(
    compras.map(c => c.proveedor),
    pagosP.map(p => p.proveedor),
    devs.filter(d => d.tipo === 'proveedor').map(d => d.contraparte)
  ));

  function reporte(titulo, hojaObjs, keyFull, usados) {
    Logger.log('=== ' + titulo + ' ===');
    Logger.log('En la hoja (' + hojaObjs.length + '):');
    hojaObjs.forEach(o => Logger.log('   - "' + keyFull(o) + '"'));
    Logger.log('Usados en movimientos (' + Object.keys(usados).length + '):');
    Object.values(usados).sort((a, b) => a.display.localeCompare(b.display))
      .forEach(u => Logger.log('   - "' + u.display + '"  (' + u.usos + ' usos)'));
    const lista = Object.values(usados).map(u => u.display);
    const sosp = [];
    for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
      const a = _normNombre(lista[i]), b = _normNombre(lista[j]);
      if (a === b) continue;
      if (a.startsWith(b + ' ') || b.startsWith(a + ' ') || a.split(' ')[0] === b.split(' ')[0])
        sosp.push('   ? "' + lista[i] + '"  <->  "' + lista[j] + '"');
    }
    Logger.log('Posibles duplicados a revisar:');
    (sosp.length ? sosp : ['   (ninguno obvio)']).forEach(x => Logger.log(x));
    Logger.log('');
  }

  reporte('CLIENTES', clientes, c => [c.nombre, c.apellido].filter(Boolean).join(' '), usadosCli);
  reporte('PROVEEDORES', proveedores, p => p.nombre, usadosProv);
  Logger.log('Para fusionar:  fusionarNombres({ "Juan": "Juan Perez" }, "cliente")');
}

// 2) FUSIÓN. Reescribe TODAS las apariciones del nombre viejo por el canónico y
//    borra la fila duplicada de la hoja de contactos. tipo = "cliente" | "proveedor".
//    Ej:  fusionarNombres({ "Juan": "Juan Perez", "JUAN PEREZ": "Juan Perez" }, "cliente")
function fusionarNombres(mapa, tipo) {
  if (!mapa || typeof mapa !== 'object') throw new Error('Pasá un mapa { "viejo": "canónico", ... }');
  if (['cliente', 'proveedor'].indexOf(tipo) === -1) throw new Error('tipo debe ser "cliente" o "proveedor"');
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const mapaNorm = {};
  Object.keys(mapa).forEach(k => { mapaNorm[_normNombre(k)] = mapa[k]; });

  function reescribirCol(nombreHoja, col, condCol, tipoEsperado) {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja || hoja.getLastRow() < 2) return 0;
    const rng = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn());
    const vals = rng.getValues();
    let cambios = 0;
    for (let i = 0; i < vals.length; i++) {
      if (condCol && vals[i][condCol - 1] !== tipoEsperado) continue;
      const actual = vals[i][col - 1];
      const dest = mapaNorm[_normNombre(actual)];
      if (dest && dest !== actual) { vals[i][col - 1] = dest; cambios++; }
    }
    if (cambios) rng.setValues(vals);
    return cambios;
  }

  let total = 0;
  if (tipo === 'cliente') {
    total += reescribirCol('Pedidos', 3);
    total += reescribirCol('Pagos Clientes', 3);
    total += reescribirCol('Devoluciones', 4, 3, 'cliente');
  } else {
    total += reescribirCol('Compras', 3);
    total += reescribirCol('Pagos Proveedores', 3);
    total += reescribirCol('Devoluciones', 4, 3, 'proveedor');
  }

  // Borrar de la hoja de contactos solo las filas cuyo NOMBRE COMPLETO es una
  // clave del mapa que apunta a un canónico distinto (la fila vieja duplicada).
  const hojaC = ss.getSheetByName(tipo === 'cliente' ? 'Clientes' : 'Proveedores');
  let borradas = 0;
  if (hojaC && hojaC.getLastRow() > 1) {
    const filas = hojaC.getDataRange().getValues();
    for (let i = filas.length - 1; i >= 1; i--) {
      const full = tipo === 'cliente'
        ? _normNombre([filas[i][0], filas[i][1]].filter(Boolean).join(' '))
        : _normNombre(filas[i][0]);
      const dest = mapaNorm[full];
      if (dest && _normNombre(dest) !== full) { hojaC.deleteRow(i + 1); borradas++; }
    }
  }

  SpreadsheetApp.flush();
  Logger.log('OK fusión (' + tipo + '): ' + total + ' celdas reescritas, ' + borradas + ' filas borradas.');
  return { celdas_reescritas: total, filas_borradas: borradas };
}

```

---

## Cómo probarlo

Después de redesplegar, abrí:
```
https://script.google.com/macros/s/AKfycbyFQZz8DgsMEfJlCYgOYZrdIK8PvTIIMBgXgCSFxRfjkVd_v1GtMNoWaIjXdVRQRumzlg/exec?accion=getProductos
```
Deberías ver los productos que ya cargaste.
