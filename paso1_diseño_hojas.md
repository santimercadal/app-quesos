# Paso 1 — Diseño de la Google Sheet

Creá una Google Sheet nueva y agregá estas 7 hojas (pestañas) con exactamente estos nombres y columnas. El orden de las columnas importa porque el Apps Script las va a leer por posición.

---

## Hoja 1: `Productos`

| A | B | C | D |
|---|---|---|---|
| nombre | unidad | precio | precio_costo |
| Queso brie | kg | 8500 | 5000 |
| Queso cremoso | kg | 6000 | 3500 |
| Queso en horma | unidad | 12000 | 7000 |

**Notas:**
- `unidad`: escribir `kg` o `unidad` (la app va a mostrar estas opciones al registrar ventas)
- `precio`: precio de venta (sin símbolos, solo el número)
- `precio_costo`: precio de compra/costo del producto. Permite ver el margen estimado por producto en la app.
- El margen por producto = `precio` − `precio_costo`
- Esta hoja la van a editar desde la app — no hace falta tocarla manualmente

---

## Hoja 2: `Ventas`

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| id | fecha | producto | cantidad | precio_unitario | total | forma_pago | monto_pagado | cliente |
| V001 | 2026-06-20 | Queso brie | 2 | 8500 | 17000 | efectivo | 17000 | Juan Pérez |

**Notas:**
- `id`: generado automáticamente por el Apps Script (V001, V002, ...)
- `fecha`: formato AAAA-MM-DD
- `forma_pago`: valores posibles → `efectivo`, `transferencia`, `crédito`
- `monto_pagado`: puede ser menor que `total` (venta a crédito). La diferencia es deuda del cliente.
- `cliente`: nombre libre. Si no se ingresa, queda vacío.

---

## Hoja 3: `Pagos Clientes`

| A | B | C | D |
|---|---|---|---|
| id | fecha | cliente | monto |
| PC001 | 2026-06-20 | Juan Pérez | 5000 |

**Notas:**
- Registra abonos posteriores a las ventas. No reemplaza el `monto_pagado` de la venta original.
- `id`: generado automáticamente (PC001, PC002, ...)
- La deuda de un cliente = (suma de sus ventas) − (suma de `monto_pagado` en ventas + suma de abonos aquí)

---

## Hoja 4: `Compras`

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| id | fecha | proveedor | producto_insumo | cantidad | costo_unitario | total | forma_pago | monto_pagado |
| C001 | 2026-06-20 | Tambo Don Pedro | Leche cruda | 100 | 500 | 50000 | transferencia | 50000 |

**Notas:**
- `id`: generado automáticamente (C001, C002, ...)
- `producto_insumo`: texto libre (leche, packaging, etc.)
- `forma_pago`: `efectivo`, `transferencia`, `crédito`
- `monto_pagado`: lo que se pagó en el momento. La diferencia es deuda al proveedor.

---

## Hoja 5: `Pagos Proveedores`

| A | B | C | D |
|---|---|---|---|
| id | fecha | proveedor | monto |
| PP001 | 2026-06-20 | Tambo Don Pedro | 20000 |

**Notas:**
- Abonos posteriores a las compras.
- `id`: generado automáticamente (PP001, PP002, ...)
- Lo que debemos a un proveedor = (suma de sus compras) − (suma de `monto_pagado` en compras + suma de abonos aquí)

---

## Hoja 6: `Clientes` *(opcional pero recomendada)*

| A | B |
|---|---|
| nombre | contacto |
| Juan Pérez | 11-2345-6789 |

**Notas:**
- Sirve para que la app autocomplete el nombre del cliente al registrar ventas.
- Si no la usás, el cliente se puede escribir a mano en cada venta igual.

---

## Hoja 7: `Proveedores` *(opcional pero recomendada)*

| A | B |
|---|---|
| nombre | contacto |
| Tambo Don Pedro | 11-9876-5432 |

**Notas:**
- Igual que Clientes, sirve para autocompletar al registrar compras.

---

## Resumen de lógica de negocio

| Cálculo | Fórmula |
|---|---|
| Deuda de un cliente | Σ(ventas.total) − Σ(ventas.monto_pagado) − Σ(pagos_clientes.monto) |
| Deuda a un proveedor | Σ(compras.total) − Σ(compras.monto_pagado) − Σ(pagos_proveedores.monto) |
| Ganancia por período | Σ(ventas.total del período) − Σ(compras.total del período) |
| Margen estimado por producto | `productos.precio` − `productos.precio_costo` |

> ⚠️ La ganancia por período NO es margen por producto — es ingreso total de ventas menos gasto total en compras del mismo período. La app lo va a aclarar en pantalla.

---

## Cómo probarlo

Creá la Sheet, agregá las 7 pestañas con los nombres exactos de arriba, y cargá una fila de ejemplo en cada una. En el Paso 2 vas a pegar el Apps Script que leerá y escribirá en estas hojas.
