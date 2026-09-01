# Quesos Los Weys — App de Gestión

PWA para la gestión de **Quesos Los Weys**: ventas, compras, stock, deudas con clientes y proveedores, devoluciones y reportes. Diseñada para usarse desde el celular como una app nativa.

## Funcionalidades

- **Ventas** — carrito multi-producto, cálculo automático de precios, soporte para crédito/fiado
- **Compras** — registro de insumos, costos, asociación automática con proveedores
- **Deudas** — libro de cuentas corriente unificado (clientes + proveedores), abonos, pagos parciales/totales
- **Stock** — ajuste por recuento o delta, se actualiza automáticamente con cada venta y compra
- **Devoluciones** — registro y resolución (pendiente/acreditado/devuelto), afectan deudas automáticamente
- **Reportes** — período libre por fechas (arranca en el mes en curso), comparación con el período anterior, evolución día por día, ganancia real vs. neta, márgenes por producto
- **Tickets** — comprobante, estado de cuenta, lista de precios, compra, devolución y resumen del período, como imagen PNG lista para WhatsApp o imprimir
- **Operadores** — múltiples usuarios con selector y gestión de nombres
- **Modo oscuro** — toggle en el header
- **PWA** — instalable en el celular; el shell funciona offline (los datos requieren conexión)

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla modular (SPA) |
| Backend | Google Apps Script (Web App) |
| Base de datos | Google Sheets (12 pestañas) |
| Hosting | GitHub Pages |
| Service Worker | Cache-first con revalidación para el shell; la API siempre va a la red |

## Arquitectura

El frontend es una SPA: `index.html` + `style.css` + la lógica en **módulos JS** dentro de `js/` (scripts clásicos cargados en orden, sin build ni dependencias). Se comunica con un Web App de Google Apps Script mediante `fetch()` (GET para lecturas, POST para escrituras). Los datos se persisten en una Google Sheet con 12 hojas:

`Productos` · `Pedidos` · `Ventas` · `Pagos Clientes` · `Compras` · `Pagos Proveedores` · `Clientes` · `Proveedores` · `Devoluciones` · `Operadores` · `Auditoria` · `Ajustes Stock`

> `Productos` incluye una columna `stock`, y `Compras` una columna `compra_id` (ambas se crean solas). La auditoría registra cada escritura con fecha, detalle y operador.

## Estructura del proyecto

**App (se publica en GitHub Pages):**

- `index.html` — markup y modales
- `style.css` — estilos e identidad visual (turquesa / azul marino / verde gramilla)
- `js/` — lógica modularizada por dominio, cargada **en este orden**:
  - `core.js` — config, estado global, API + cache liviano, formato, navegación
  - `ventas.js` — inicio + carrito de venta (por kg) + editar pedido
  - `compras.js` — carrito de compra multi-producto
  - `deudas.js` — cuentas corrientes + cuenta unificada por contacto
  - `catalogo.js` — productos + clientes
  - `reportes.js` — reportes (período por fechas, comparación, evolución, ganancia real, márgenes)
  - `gestion.js` — modales, proveedores, devoluciones, correcciones
  - `extras.js` — historial/auditoría, stock, modo oscuro
  - `tickets.js` — motor de tickets PNG dibujados en canvas (diseño "comprobante")
  - `init.js` — arranque (debe cargarse **último**)
- `sw.js` — service worker (cache del shell, network-first)
- `manifest.json`, `logo-192.png`, `logo-512.png` — PWA e íconos

**Backend:**

- `paso2_apps_script.md` — código de Google Apps Script (se pega en el editor)

**Documentación / histórico** (no son parte de la app):

- `paso1_diseño_hojas.md`, `paso4_github_pages.md` — guías del armado inicial
- `test_api.js` — tests de la API (se corren en la consola del navegador)

> Si agregás un módulo nuevo a `js/`, sumá su `<script>` en `index.html` (antes de `init.js`) y su ruta a `ARCHIVOS` en `sw.js`.

## Desarrollo local

No requiere build ni dependencias. Abrí `index.html` en un navegador o servilo con cualquier servidor estático:

```bash
npx serve .
```

## Despliegue

La app tiene **dos partes** que se publican por separado:

**1. Frontend (GitHub Pages):** subí los archivos estáticos (`index.html`, la carpeta `js/`, `style.css`, `tema.css`, `sw.js`, `manifest.json`, íconos). El service worker es cache-first con revalidación: abre al instante y, si encuentra archivos distintos en el servidor, muestra la barra "Hay una versión nueva". **Cada vez que cambiés un archivo cacheado hay que subir el número de `CACHE` en `sw.js`**, si no la PWA instalada sigue con la copia vieja.

**2. Backend (Google Apps Script):** el código está en `paso2_apps_script.md`. Para actualizarlo:
1. Abrí el proyecto en [script.google.com](https://script.google.com) y pegá el código.
2. Guardá (Ctrl+S).
3. **Implementar → Administrar implementaciones → ✏️ Editar → Versión: "Nueva versión" → Implementar.**

> ⚠️ Guardar el código **no** actualiza el Web App. El paso clave es publicar una **versión nueva**; si no, la app sigue usando la versión vieja.

## Reportes

El período lo definen **siempre** los dos campos de fecha (`#r-desde` / `#r-hasta`): son la única fuente de verdad. Los botones **Hoy · Semana · Mes · Mes pasado** no son un "modo", solo llenan esos campos. Al entrar, la pantalla arranca en el **mes en curso** (del 1 al día de hoy).

La **comparación con el período anterior** se pide en un request aparte, *después* de pintar el reporte: si tarda o falla, el reporte igual se ve. Si el período arranca el día 1 de un mes, compara contra el mismo tramo del mes anterior (del 1 al 12 de agosto contra del 1 al 12 de julio); para cualquier otro rango, contra la ventana del mismo largo que termina justo antes.

La **evolución** son barras verticales dibujadas con divs (sin librerías). Hasta 45 días muestra un día por barra; más que eso agrupa por semana. El mejor día queda en ámbar.

El **margen por producto** usa el `precio_costo` de la hoja `Productos`. Los productos sin costo cargado no ensucian el cálculo: se listan aparte con un aviso para completarlos.

## Tickets

`js/tickets.js` dibuja los tickets en un `<canvas>` y los entrega como PNG (Web Share API, con fallback a descarga e impresión). No usa librerías. Un ticket es una lista de bloques (`hdr`, `para`, `thead`, `trow`, `tot`, `estado`, `kv`, `movh`/`movi`/`movs`, `nota`, `sep`, `esp`); el alto de cada bloque **se mide antes de dibujar**, así los textos largos se parten en varias líneas en vez de recortarse con "…".

Los seis tickets comparten el diseño: banda oscura con el logo (`iso.png`, fondo transparente), título, N° y fecha; tabla de ítems con columnas; caja de TOTAL en ámbar. El de **estado de cuenta** abre cada venta en detalle (una línea por producto con cantidad × precio, el total, cuánto pagó y el saldo resultante), que es lo que permite reclamar una deuda sin discusión.

`OCULTOS_LISTA_PRECIOS` en `tickets.js` lista los productos que **no** salen en la lista de precios que se manda a clientes (anotaciones internas, no mercadería).

## Tests

El archivo `test_api.js` contiene una suite de tests que se ejecuta en la consola del navegador mientras la app está abierta. Cubre lecturas básicas, validaciones, integridad de flujos completos (ventas + pagos, compras + devoluciones) y concurrencia.
