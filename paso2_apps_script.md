# Paso 2 — Apps Script (Backend)

## Cómo usarlo

1. Abrí [script.google.com](https://script.google.com) e iniciá sesión con tu cuenta de Google
2. Hacé clic en **"Nuevo proyecto"**
3. Borrá todo el código que aparece por defecto
4. Pegá **todo el código** que está más abajo
5. En la línea que dice `const SHEET_ID = 'TU_ID_AQUI'`, reemplazá `TU_ID_AQUI` con el ID de tu Google Sheet  
   *(El ID está en la URL de la Sheet: `docs.google.com/spreadsheets/d/`**[ESTE_ES_EL_ID]**`/edit`)*
6. Guardá el proyecto (Ctrl+S) y ponerle un nombre, por ejemplo: `Backend Quesos`

---

## Primer paso: inicializar las hojas

Antes de desplegar, ejecutá `inicializarHojas` para que se creen las 7 pestañas automáticamente:

1. En el menú superior del editor, donde dice `Seleccionar función`, elegí **`inicializarHojas`**
2. Hacé clic en el botón ▶ **Ejecutar**
3. La primera vez te va a pedir permisos — aceptalos todos
4. Revisá el Log (Ver → Registros) y deberías ver: `✅ Hojas inicializadas correctamente`

---

## Desplegar como Web App

1. Hacé clic en **Implementar** → **Nueva implementación**
2. En "Tipo", elegí **Aplicación web**
3. Configurá así:
   - **Descripción**: `Backend Quesos v1`
   - **Ejecutar como**: `Yo (tu cuenta)`
   - **Quién tiene acceso**: `Cualquier persona`  
     *(Esto es necesario para que la app desde GitHub Pages pueda comunicarse)*
4. Hacé clic en **Implementar**
5. Copiá la **URL de la aplicación web** que aparece — la vas a necesitar en el Paso 3 (frontend)

> ⚠️ Cada vez que modifiques el script, tenés que ir a **Implementar → Administrar implementaciones → Editar → Nueva versión** para que los cambios tengan efecto.

---

## Cómo probarlo

Después de desplegar, pegá esta URL en el navegador reemplazando con tu URL real:

```
https://script.google.com/macros/s/TU_URL/exec?accion=getProductos
```

Deberías ver una respuesta JSON como: `{"ok":true,"datos":[]}`

---

## Código completo

```javascript
// ==========================================
// CONFIGURACIÓN
// ==========================================
// Reemplazá con el ID de tu Google Sheet
// Lo encontrás en la URL: docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
const SHEET_ID = 'TU_ID_AQUI';

// Zona horaria del negocio
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';


// ==========================================
// INICIALIZACIÓN DE HOJAS
// ==========================================
// Ejecutá esta función UNA SOLA VEZ para crear todas las pestañas con sus encabezados

function inicializarHojas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const hojas = [
    { nombre: 'Productos',         encabezados: ['nombre', 'unidad', 'precio', 'precio_costo'] },
    { nombre: 'Ventas',            encabezados: ['id', 'fecha', 'producto', 'cantidad', 'precio_unitario', 'total', 'forma_pago', 'monto_pagado', 'cliente'] },
    { nombre: 'Pagos Clientes',    encabezados: ['id', 'fecha', 'cliente', 'monto'] },
    { nombre: 'Compras',           encabezados: ['id', 'fecha', 'proveedor', 'producto_insumo', 'cantidad', 'costo_unitario', 'total', 'forma_pago', 'monto_pagado'] },
    { nombre: 'Pagos Proveedores', encabezados: ['id', 'fecha', 'proveedor', 'monto'] },
    { nombre: 'Clientes',          encabezados: ['nombre', 'contacto'] },
    { nombre: 'Proveedores',       encabezados: ['nombre', 'contacto'] },
  ];

  hojas.forEach(({ nombre, encabezados }) => {
    let hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
    }
    // Solo escribir encabezados si la hoja está vacía
    if (hoja.getLastRow() === 0) {
      hoja.appendRow(encabezados);
      hoja.getRange(1, 1, 1, encabezados.length)
        .setFontWeight('bold')
        .setBackground('#f0f0f0');
    }
  });

  // Eliminar hojas por defecto vacías (Hoja1, Sheet1, etc.)
  const nombresNuestros = hojas.map(h => h.nombre);
  ss.getSheets().forEach(hoja => {
    if (!nombresNuestros.includes(hoja.getName()) && hoja.getLastRow() <= 1) {
      try { ss.deleteSheet(hoja); } catch(e) {}
    }
  });

  SpreadsheetApp.flush();
  Logger.log('✅ Hojas inicializadas correctamente');
}


// ==========================================
// RESPUESTA Y CORS
// ==========================================
// Nota sobre CORS: Apps Script agrega Access-Control-Allow-Origin: * automáticamente.
// Para evitar el preflight del navegador, el frontend envía POST con Content-Type: text/plain.
// El cuerpo sigue siendo JSON válido — solo cambia el header para que sea una "simple request".

function crearRespuesta(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}


// ==========================================
// doGet — LEER DATOS
// ==========================================

function doGet(e) {
  try {
    const accion = e.parameter.accion;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let resultado;

    switch (accion) {
      case 'getProductos':
        resultado = getProductos(ss);
        break;
      case 'getClientes':
        resultado = getClientes(ss);
        break;
      case 'getProveedores':
        resultado = getProveedores(ss);
        break;
      case 'getVentasHoy':
        resultado = getVentasHoy(ss);
        break;
      case 'getVentas':
        resultado = getVentas(ss, e.parameter.desde, e.parameter.hasta);
        break;
      case 'getCompras':
        resultado = getCompras(ss, e.parameter.desde, e.parameter.hasta);
        break;
      case 'getGanancia':
        resultado = getGanancia(ss, e.parameter.desde, e.parameter.hasta);
        break;
      case 'getDeudaClientes':
        resultado = getDeudaClientes(ss);
        break;
      case 'getDeudaProveedores':
        resultado = getDeudaProveedores(ss);
        break;
      default:
        resultado = { error: 'Acción no reconocida: ' + accion };
    }

    return crearRespuesta({ ok: true, datos: resultado });

  } catch (err) {
    return crearRespuesta({ ok: false, error: err.toString() });
  }
}


// ==========================================
// doPost — ESCRIBIR DATOS
// ==========================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const accion = body.accion;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let resultado;

    switch (accion) {
      case 'agregarProducto':
        resultado = agregarProducto(ss, body.datos);
        break;
      case 'editarProducto':
        resultado = editarProducto(ss, body.datos);
        break;
      case 'registrarVenta':
        resultado = registrarVenta(ss, body.datos);
        break;
      case 'registrarCompra':
        resultado = registrarCompra(ss, body.datos);
        break;
      case 'registrarPagoCliente':
        resultado = registrarPagoCliente(ss, body.datos);
        break;
      case 'registrarPagoProveedor':
        resultado = registrarPagoProveedor(ss, body.datos);
        break;
      default:
        resultado = { error: 'Acción no reconocida: ' + accion };
    }

    return crearRespuesta({ ok: true, datos: resultado });

  } catch (err) {
    return crearRespuesta({ ok: false, error: err.toString() });
  }
}


// ==========================================
// HELPERS INTERNOS
// ==========================================

// Convierte los datos de una hoja en un array de objetos usando la primera fila como claves
function hojaAObjetos(hoja) {
  const datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return [];
  const encabezados = datos[0];
  return datos.slice(1).map(fila => {
    const obj = {};
    encabezados.forEach((enc, i) => {
      // Convertir fechas de Google Sheets a string AAAA-MM-DD
      obj[enc] = fila[i] instanceof Date
        ? Utilities.formatDate(fila[i], ZONA_HORARIA, 'yyyy-MM-dd')
        : fila[i];
    });
    return obj;
  });
}

// Genera el próximo ID correlativo (ej: V001, V002...)
function generarId(hoja, prefijo) {
  const lastRow = hoja.getLastRow();
  if (lastRow <= 1) return prefijo + '001';
  const ultimoId = hoja.getRange(lastRow, 1).getValue().toString();
  const num = parseInt(ultimoId.replace(prefijo, '')) + 1;
  return prefijo + String(num).padStart(3, '0');
}

// Valida que un valor sea número no negativo
function validarPositivo(valor, nombre) {
  if (isNaN(valor) || Number(valor) < 0) {
    throw new Error(nombre + ' debe ser un número positivo');
  }
}

// Fecha de hoy como string AAAA-MM-DD en zona horaria Argentina
function hoyStr() {
  return Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd');
}

// Filtra un array de objetos por rango de fechas
function filtrarPorFecha(lista, desde, hasta) {
  return lista.filter(item => {
    const fecha = item.fecha ? item.fecha.toString().substring(0, 10) : '';
    return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  });
}


// ==========================================
// PRODUCTOS
// ==========================================

function getProductos(ss) {
  return hojaAObjetos(ss.getSheetByName('Productos'));
}

function agregarProducto(ss, datos) {
  const { nombre, unidad, precio, precio_costo } = datos;

  if (!nombre || nombre.trim() === '') throw new Error('El nombre del producto es obligatorio');
  if (!['kg', 'unidad'].includes(unidad)) throw new Error('La unidad debe ser "kg" o "unidad"');
  validarPositivo(Number(precio), 'El precio de venta');
  validarPositivo(Number(precio_costo), 'El precio de costo');

  const hoja = ss.getSheetByName('Productos');

  // Verificar que no exista ya un producto con ese nombre
  const existentes = hojaAObjetos(hoja);
  if (existentes.some(p => p.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
    throw new Error('Ya existe un producto con ese nombre. Usá "editarProducto" para modificarlo.');
  }

  hoja.appendRow([nombre.trim(), unidad, Number(precio), Number(precio_costo)]);
  return { mensaje: 'Producto agregado: ' + nombre.trim() };
}

function editarProducto(ss, datos) {
  const { nombre, unidad, precio, precio_costo } = datos;
  if (!nombre) throw new Error('El nombre del producto es obligatorio para editar');

  const hoja = ss.getSheetByName('Productos');
  const filas = hoja.getDataRange().getValues();

  let filaNum = -1;
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0].toString().toLowerCase() === nombre.toLowerCase()) {
      filaNum = i + 1; // Sheets es 1-indexed
      break;
    }
  }

  if (filaNum === -1) throw new Error('Producto no encontrado: ' + nombre);

  if (unidad !== undefined) {
    if (!['kg', 'unidad'].includes(unidad)) throw new Error('La unidad debe ser "kg" o "unidad"');
    hoja.getRange(filaNum, 2).setValue(unidad);
  }
  if (precio !== undefined) {
    validarPositivo(Number(precio), 'El precio de venta');
    hoja.getRange(filaNum, 3).setValue(Number(precio));
  }
  if (precio_costo !== undefined) {
    validarPositivo(Number(precio_costo), 'El precio de costo');
    hoja.getRange(filaNum, 4).setValue(Number(precio_costo));
  }

  return { mensaje: 'Producto actualizado: ' + nombre };
}


// ==========================================
// VENTAS
// ==========================================

function registrarVenta(ss, datos) {
  const { fecha, producto, cantidad, precio_unitario, total, forma_pago, monto_pagado, cliente } = datos;

  if (!producto) throw new Error('El producto es obligatorio');
  validarPositivo(Number(cantidad), 'La cantidad');
  validarPositivo(Number(precio_unitario), 'El precio unitario');
  validarPositivo(Number(total), 'El total');
  validarPositivo(Number(monto_pagado), 'El monto pagado');

  if (Number(monto_pagado) > Number(total)) {
    throw new Error('El monto pagado no puede ser mayor al total');
  }

  const formasValidas = ['efectivo', 'transferencia', 'crédito'];
  if (!formasValidas.includes(forma_pago)) {
    throw new Error('Forma de pago inválida. Opciones: efectivo, transferencia, crédito');
  }

  const hoja = ss.getSheetByName('Ventas');
  const id = generarId(hoja, 'V');

  hoja.appendRow([
    id,
    fecha || hoyStr(),
    producto,
    Number(cantidad),
    Number(precio_unitario),
    Number(total),
    forma_pago,
    Number(monto_pagado),
    cliente || ''
  ]);

  return { id, mensaje: 'Venta registrada correctamente' };
}

function getVentasHoy(ss) {
  const todas = hojaAObjetos(ss.getSheetByName('Ventas'));
  const hoy = hoyStr();
  const ventasHoy = todas.filter(v => v.fecha === hoy);

  return {
    ventas: ventasHoy,
    total_ventas: ventasHoy.reduce((s, v) => s + Number(v.total), 0),
    total_cobrado: ventasHoy.reduce((s, v) => s + Number(v.monto_pagado), 0),
    cantidad: ventasHoy.length
  };
}

function getVentas(ss, desde, hasta) {
  const todas = hojaAObjetos(ss.getSheetByName('Ventas'));
  const filtradas = filtrarPorFecha(todas, desde, hasta);
  return {
    ventas: filtradas,
    total: filtradas.reduce((s, v) => s + Number(v.total), 0),
    cantidad: filtradas.length
  };
}


// ==========================================
// CLIENTES Y DEUDAS
// ==========================================

function getClientes(ss) {
  // Clientes de la hoja Clientes
  const deHoja = hojaAObjetos(ss.getSheetByName('Clientes')).map(c => ({
    nombre: c.nombre,
    contacto: c.contacto || ''
  }));

  // Clientes que aparecen en ventas pero no están en la hoja
  const nombresEnHoja = new Set(deHoja.map(c => c.nombre.toLowerCase()));
  const ventas = hojaAObjetos(ss.getSheetByName('Ventas'));
  const deVentas = [...new Set(ventas.map(v => v.cliente).filter(c => c && !nombresEnHoja.has(c.toLowerCase())))]
    .map(nombre => ({ nombre, contacto: '' }));

  return [...deHoja, ...deVentas].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function getDeudaClientes(ss) {
  const ventas = hojaAObjetos(ss.getSheetByName('Ventas'));
  const pagos = hojaAObjetos(ss.getSheetByName('Pagos Clientes'));

  const saldos = {};

  ventas.forEach(v => {
    const c = v.cliente || '(sin nombre)';
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0 };
    saldos[c].total_ventas += Number(v.total);
    saldos[c].pagado_ventas += Number(v.monto_pagado);
  });

  pagos.forEach(p => {
    const c = p.cliente || '(sin nombre)';
    if (!saldos[c]) saldos[c] = { total_ventas: 0, pagado_ventas: 0, abonos: 0 };
    saldos[c].abonos += Number(p.monto);
  });

  return Object.entries(saldos)
    .map(([cliente, s]) => ({
      cliente,
      deuda: s.total_ventas - s.pagado_ventas - s.abonos,
      total_ventas: s.total_ventas
    }))
    .filter(c => c.deuda > 0.01) // Ignorar diferencias de centavos
    .sort((a, b) => b.deuda - a.deuda);
}

function registrarPagoCliente(ss, datos) {
  const { cliente, monto, fecha } = datos;
  if (!cliente) throw new Error('El cliente es obligatorio');
  validarPositivo(Number(monto), 'El monto');
  if (Number(monto) === 0) throw new Error('El monto debe ser mayor a cero');

  const hoja = ss.getSheetByName('Pagos Clientes');
  const id = generarId(hoja, 'PC');

  hoja.appendRow([id, fecha || hoyStr(), cliente, Number(monto)]);
  return { id, mensaje: 'Abono de cliente registrado' };
}


// ==========================================
// COMPRAS
// ==========================================

function registrarCompra(ss, datos) {
  const { fecha, proveedor, producto_insumo, cantidad, costo_unitario, total, forma_pago, monto_pagado } = datos;

  if (!proveedor) throw new Error('El proveedor es obligatorio');
  if (!producto_insumo) throw new Error('El producto/insumo es obligatorio');
  validarPositivo(Number(cantidad), 'La cantidad');
  validarPositivo(Number(costo_unitario), 'El costo unitario');
  validarPositivo(Number(total), 'El total');
  validarPositivo(Number(monto_pagado), 'El monto pagado');

  if (Number(monto_pagado) > Number(total)) {
    throw new Error('El monto pagado no puede ser mayor al total');
  }

  const formasValidas = ['efectivo', 'transferencia', 'crédito'];
  if (!formasValidas.includes(forma_pago)) {
    throw new Error('Forma de pago inválida. Opciones: efectivo, transferencia, crédito');
  }

  const hoja = ss.getSheetByName('Compras');
  const id = generarId(hoja, 'C');

  hoja.appendRow([
    id,
    fecha || hoyStr(),
    proveedor,
    producto_insumo,
    Number(cantidad),
    Number(costo_unitario),
    Number(total),
    forma_pago,
    Number(monto_pagado)
  ]);

  return { id, mensaje: 'Compra registrada correctamente' };
}

function getCompras(ss, desde, hasta) {
  const todas = hojaAObjetos(ss.getSheetByName('Compras'));
  const filtradas = filtrarPorFecha(todas, desde, hasta);
  return {
    compras: filtradas,
    total: filtradas.reduce((s, c) => s + Number(c.total), 0),
    cantidad: filtradas.length
  };
}


// ==========================================
// PROVEEDORES Y DEUDAS
// ==========================================

function getProveedores(ss) {
  const deHoja = hojaAObjetos(ss.getSheetByName('Proveedores')).map(p => ({
    nombre: p.nombre,
    contacto: p.contacto || ''
  }));

  const nombresEnHoja = new Set(deHoja.map(p => p.nombre.toLowerCase()));
  const compras = hojaAObjetos(ss.getSheetByName('Compras'));
  const deCompras = [...new Set(compras.map(c => c.proveedor).filter(p => p && !nombresEnHoja.has(p.toLowerCase())))]
    .map(nombre => ({ nombre, contacto: '' }));

  return [...deHoja, ...deCompras].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function getDeudaProveedores(ss) {
  const compras = hojaAObjetos(ss.getSheetByName('Compras'));
  const pagos = hojaAObjetos(ss.getSheetByName('Pagos Proveedores'));

  const saldos = {};

  compras.forEach(c => {
    const p = c.proveedor || '(sin nombre)';
    if (!saldos[p]) saldos[p] = { total_compras: 0, pagado_compras: 0, abonos: 0 };
    saldos[p].total_compras += Number(c.total);
    saldos[p].pagado_compras += Number(c.monto_pagado);
  });

  pagos.forEach(p => {
    const prov = p.proveedor || '(sin nombre)';
    if (!saldos[prov]) saldos[prov] = { total_compras: 0, pagado_compras: 0, abonos: 0 };
    saldos[prov].abonos += Number(p.monto);
  });

  return Object.entries(saldos)
    .map(([proveedor, s]) => ({
      proveedor,
      deuda: s.total_compras - s.pagado_compras - s.abonos,
      total_compras: s.total_compras
    }))
    .filter(p => p.deuda > 0.01)
    .sort((a, b) => b.deuda - a.deuda);
}

function registrarPagoProveedor(ss, datos) {
  const { proveedor, monto, fecha } = datos;
  if (!proveedor) throw new Error('El proveedor es obligatorio');
  validarPositivo(Number(monto), 'El monto');
  if (Number(monto) === 0) throw new Error('El monto debe ser mayor a cero');

  const hoja = ss.getSheetByName('Pagos Proveedores');
  const id = generarId(hoja, 'PP');

  hoja.appendRow([id, fecha || hoyStr(), proveedor, Number(monto)]);
  return { id, mensaje: 'Pago a proveedor registrado' };
}


// ==========================================
// REPORTES
// ==========================================

function getGanancia(ss, desde, hasta) {
  const resultVentas = getVentas(ss, desde, hasta);
  const resultCompras = getCompras(ss, desde, hasta);

  const totalVentas = resultVentas.total;
  const totalCompras = resultCompras.total;

  return {
    desde: desde || 'inicio',
    hasta: hasta || hoyStr(),
    total_ventas: totalVentas,
    total_compras: totalCompras,
    // Ganancia = ingresos por ventas MENOS gastos en compras del período
    // No es margen por producto — es resultado global del período
    ganancia: totalVentas - totalCompras,
    cantidad_ventas: resultVentas.cantidad,
    cantidad_compras: resultCompras.cantidad
  };
}
```

---

## Cómo probarlo

Después de desplegar, abrí esta URL en el navegador (con tu URL real):
```
https://script.google.com/macros/s/TU_URL_AQUI/exec?accion=getProductos
```
Deberías ver: `{"ok":true,"datos":[]}`

Si ves eso, el backend está funcionando. Avisame y pasamos al **Paso 3: el frontend**.
