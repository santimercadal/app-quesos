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
- **PWA** — instalable en el celular, funciona offline con datos cacheados

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla (SPA) |
| Backend | Google Apps Script (Web App) |
| Base de datos | Google Sheets (11 pestañas) |
| Hosting | GitHub Pages |
| Service Worker | Cache-first para assets, network-first para API |

## Arquitectura

El frontend es una SPA en un solo archivo (`index.html`) con toda la lógica de negocio en `app.js`. Se comunica con un Web App de Google Apps Script mediante `fetch()` (GET para lecturas, POST para escrituras). Los datos se persisten en una Google Sheet con 11 hojas:

`Productos` · `Pedidos` · `Ventas` · `Pagos Clientes` · `Compras` · `Pagos Proveedores` · `Clientes` · `Proveedores` · `Devoluciones` · `Operadores` · `Auditoria`

## Desarrollo local

No requiere build ni dependencias. Abrí `index.html` en un navegador o servilo con cualquier servidor estático:

```bash
npx serve .
```

## Tests

El archivo `test_api.js` contiene una suite de tests que se ejecuta en la consola del navegador mientras la app está abierta. Cubre lecturas básicas, validaciones, integridad de flujos completos (ventas + pagos, compras + devoluciones) y concurrencia.
