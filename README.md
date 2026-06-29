# Quesos Los Weys — App de Gestión

PWA para la gestión de **Quesos Los Weys**: ventas, compras, stock, deudas con clientes y proveedores, devoluciones y reportes. Diseñada para usarse desde el celular como una app nativa.

## Funcionalidades

- **Ventas** — carrito multi-producto, cálculo automático de precios, soporte para crédito/fiado
- **Compras** — registro de insumos, costos, asociación automática con proveedores
- **Deudas** — libro de cuentas corriente unificado (clientes + proveedores), abonos, pagos parciales/totales
- **Stock** — ajuste por recuento o delta, se actualiza automáticamente con cada venta y compra
- **Devoluciones** — registro y resolución (pendiente/acreditado/devuelto), afectan deudas automáticamente
- **Reportes** — ganancia real vs. neta, ventas, compras, márgenes por producto
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
| Service Worker | Network-first para el shell; la API siempre va a la red |

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
  - `reportes.js` — reportes (ganancia real, redondeo, pendientes)
  - `gestion.js` — modales, proveedores, devoluciones, correcciones
  - `extras.js` — historial/auditoría, stock, modo oscuro
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

**1. Frontend (GitHub Pages):** subí los archivos estáticos (`index.html`, la carpeta `js/`, `style.css`, `sw.js`, `manifest.json`, íconos). El service worker es network-first, así que las actualizaciones llegan solas a la PWA instalada. Si cambiás archivos cacheados, subí el número de versión de `CACHE` en `sw.js`.

**2. Backend (Google Apps Script):** el código está en `paso2_apps_script.md`. Para actualizarlo:
1. Abrí el proyecto en [script.google.com](https://script.google.com) y pegá el código.
2. Guardá (Ctrl+S).
3. **Implementar → Administrar implementaciones → ✏️ Editar → Versión: "Nueva versión" → Implementar.**

> ⚠️ Guardar el código **no** actualiza el Web App. El paso clave es publicar una **versión nueva**; si no, la app sigue usando la versión vieja.

## Tests

El archivo `test_api.js` contiene una suite de tests que se ejecuta en la consola del navegador mientras la app está abierta. Cubre lecturas básicas, validaciones, integridad de flujos completos (ventas + pagos, compras + devoluciones) y concurrencia.
