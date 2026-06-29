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
| Frontend | HTML + CSS + JavaScript vanilla (SPA) |
| Backend | Google Apps Script (Web App) |
| Base de datos | Google Sheets (12 pestañas) |
| Hosting | GitHub Pages |
| Service Worker | Network-first para el shell; la API siempre va a la red |

## Arquitectura

El frontend es una SPA en un solo archivo (`index.html`) con toda la lógica de negocio en `app.js`. Se comunica con un Web App de Google Apps Script mediante `fetch()` (GET para lecturas, POST para escrituras). Los datos se persisten en una Google Sheet con 12 hojas:

`Productos` · `Pedidos` · `Ventas` · `Pagos Clientes` · `Compras` · `Pagos Proveedores` · `Clientes` · `Proveedores` · `Devoluciones` · `Operadores` · `Auditoria` · `Ajustes Stock`

> `Productos` incluye una columna `stock`, y `Compras` una columna `compra_id` (ambas se crean solas). La auditoría registra cada escritura con fecha, detalle y operador.

## Desarrollo local

No requiere build ni dependencias. Abrí `index.html` en un navegador o servilo con cualquier servidor estático:

```bash
npx serve .
```

## Despliegue

La app tiene **dos partes** que se publican por separado:

**1. Frontend (GitHub Pages):** subí los archivos estáticos (`index.html`, `app.js`, `style.css`, `sw.js`, `manifest.json`, íconos). El service worker es network-first, así que las actualizaciones llegan solas a la PWA instalada. Si cambiás archivos cacheados, subí el número de versión de `CACHE` en `sw.js`.

**2. Backend (Google Apps Script):** el código está en `paso2_apps_script.md`. Para actualizarlo:
1. Abrí el proyecto en [script.google.com](https://script.google.com) y pegá el código.
2. Guardá (Ctrl+S).
3. **Implementar → Administrar implementaciones → ✏️ Editar → Versión: "Nueva versión" → Implementar.**

> ⚠️ Guardar el código **no** actualiza el Web App. El paso clave es publicar una **versión nueva**; si no, la app sigue usando la versión vieja.

## Tests

El archivo `test_api.js` contiene una suite de tests que se ejecuta en la consola del navegador mientras la app está abierta. Cubre lecturas básicas, validaciones, integridad de flujos completos (ventas + pagos, compras + devoluciones) y concurrencia.
