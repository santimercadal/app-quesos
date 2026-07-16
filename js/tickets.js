// ==========================================
// TICKETS (imagen PNG: compartir, guardar o imprimir)
// Sin librerías externas: se dibuja en un <canvas>.
// ==========================================
let _ticketBlob = null;
let _ticketNombre = 'ticket';

const _TK_W = 480, _TK_PAD = 26;

// Alto en px de cada tipo de bloque
function _tkAlto(b){
  switch(b.t){
    case 'marca': return 42;
    case 'sub':   return 30;
    case 'kv':    return 26;
    case 'item':  return b.det ? 46 : 26;
    case 'sep':   return 18;
    case 'total': return 40;
    case 'nota':  return 20;
    case 'esp':   return 10;
    default:      return 24;
  }
}

function _tkRecortar(ctx, txt, max){
  txt = String(txt == null ? '' : txt);
  if(ctx.measureText(txt).width <= max) return txt;
  while(txt.length > 1 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1);
  return txt + '…';
}

function _dibujarTicket(bloques, opts){
  opts = opts || {};
  const alto = bloques.reduce((s, b) => s + _tkAlto(b), 0) + _TK_PAD * 2 + (opts.sinPie ? 6 : 40);
  const c = document.createElement('canvas');
  c.width = _TK_W; c.height = alto;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
  const maxW = _TK_W - _TK_PAD * 2;
  let y = _TK_PAD + 8;
  bloques.forEach(b => {
    switch(b.t){
      case 'marca':
        x.fillStyle = '#111'; x.font = 'bold 25px Arial'; x.textAlign = 'center';
        x.fillText('🧀 QUESOS LOS WEYS', _TK_W / 2, y + 20); break;
      case 'sub':
        x.fillStyle = '#111'; x.font = 'bold 18px Arial'; x.textAlign = 'center';
        x.fillText(b.txt, _TK_W / 2, y + 16); break;
      case 'nota':
        x.fillStyle = '#666'; x.font = '13px Arial'; x.textAlign = 'center';
        x.fillText(_tkRecortar(x, b.txt, maxW), _TK_W / 2, y + 12); break;
      case 'sep':
        x.strokeStyle = '#999'; x.setLineDash([4, 4]); x.beginPath();
        x.moveTo(_TK_PAD, y + 9); x.lineTo(_TK_W - _TK_PAD, y + 9);
        x.stroke(); x.setLineDash([]); break;
      case 'kv':
        x.font = '15px Arial'; x.fillStyle = '#555'; x.textAlign = 'left';
        x.fillText(b.k, _TK_PAD, y + 16);
        x.font = 'bold 15px Arial'; x.fillStyle = '#111'; x.textAlign = 'right';
        x.fillText(_tkRecortar(x, b.v, maxW * 0.55), _TK_W - _TK_PAD, y + 16); break;
      case 'item':
        x.fillStyle = '#111'; x.font = 'bold 15px Arial'; x.textAlign = 'left';
        x.fillText(_tkRecortar(x, b.nombre, maxW - 110), _TK_PAD, y + 16);
        x.textAlign = 'right'; x.fillText(b.monto, _TK_W - _TK_PAD, y + 16);
        if(b.det){
          x.font = '13px Arial'; x.fillStyle = '#666'; x.textAlign = 'left';
          x.fillText(_tkRecortar(x, b.det, maxW - 40), _TK_PAD, y + 34);
        }
        break;
      case 'total':
        x.fillStyle = '#111'; x.font = 'bold 21px Arial'; x.textAlign = 'left';
        x.fillText(b.k || 'TOTAL', _TK_PAD, y + 26);
        x.textAlign = 'right'; x.fillText(b.v, _TK_W - _TK_PAD, y + 26); break;
    }
    y += _tkAlto(b);
  });
  if(!opts.sinPie){
    x.font = '12px Arial'; x.fillStyle = '#999'; x.textAlign = 'center';
    x.fillText('Generado el ' + fmtFecha(hoy()) + ' · App Quesos Los Weys', _TK_W / 2, alto - 14);
  }
  return c;
}

function _ticketBase(titulo, subtitulo){
  const b = [{t:'marca'}, {t:'sub', txt: titulo}];
  if(subtitulo) b.push({t:'nota', txt: subtitulo});
  b.push({t:'sep'});
  return b;
}

// Dibuja y abre el modal de vista previa
function mostrarTicket(bloques, nombre, opts){
  const c = _dibujarTicket(bloques, opts);
  _ticketNombre = nombre;
  c.toBlob(blob => {
    _ticketBlob = blob;
    const img = document.getElementById('ticket-img');
    if(img.src) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(blob);
    document.getElementById('modal-ticket-view').classList.add('visible');
  }, 'image/png');
}

// Compartir (WhatsApp, etc.) o descargar como imagen
async function compartirTicketActual(){
  if(!_ticketBlob) return;
  const file = new File([_ticketBlob], _ticketNombre + '.png', {type: 'image/png'});
  if(navigator.canShare && navigator.canShare({files: [file]})){
    try{ await navigator.share({files: [file], title: _ticketNombre}); return; }
    catch(e){ if(e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(_ticketBlob);
  const a = document.createElement('a');
  a.href = url; a.download = _ticketNombre + '.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('🎟️ Ticket descargado', 'exito');
}

// Imprimir (desde la impresora del celu/compu también se puede "Guardar como PDF")
function imprimirTicketActual(){
  const img = document.getElementById('ticket-img');
  if(!img.src) return;
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.contentDocument.write('<img src="' + img.src + '" style="width:100%;max-width:300px" onload="setTimeout(function(){window.print()},150)">');
  f.contentDocument.close();
  setTimeout(() => f.remove(), 60000);
}

// ---------- TICKET DE VENTA / PEDIDO ----------
// Versión simplificada: sin marca, sin N° de transacción, sin operador ni pie.
function ticketVenta(p){
  if(!p) return;
  const b = [{t:'sub', txt:'TICKET DE VENTA'}, {t:'sep'}];
  b.push({t:'kv', k:'Fecha', v: fmtFecha(p.fecha)});
  b.push({t:'kv', k:'Cliente', v: p.cliente || '(sin nombre)'});
  b.push({t:'sep'});
  const items = p.items || [];
  items.forEach(it => b.push({
    t:'item', nombre: it.producto,
    det: Number(it.cantidad) + (it.unidad ? ' ' + it.unidad : '') + (Number(it.precio_unitario) > 0 ? ' × ' + $$(it.precio_unitario) : ''),
    monto: $$(it.subtotal)
  }));
  if(!items.length && p.descripcion) b.push({t:'item', nombre: p.descripcion, monto: $$(p.total)});
  b.push({t:'sep'});
  b.push({t:'total', v: $$(p.total)});
  b.push({t:'kv', k:'Forma de pago', v: p.forma_pago || '—'});
  b.push({t:'kv', k:'Pagado', v: $$(p.monto_pagado)});
  const resta = Number(p.total) - Number(p.monto_pagado);
  b.push({t:'kv', k:'Saldo pendiente', v: resta > 0 ? $$(resta) : '✅ Pagado'});
  b.push({t:'esp'});
  b.push({t:'nota', txt: '¡Gracias por su compra!'});
  mostrarTicket(b, 'venta-' + (p.fecha || hoy()), {sinPie: true});
}

// ---------- TICKET DE COMPRA ----------
function ticketCompra(c){
  if(!c) return;
  const b = _ticketBase('COMPROBANTE DE COMPRA', (c.compra_id || c.id) ? 'N° ' + (c.compra_id || c.id) : '');
  b.push({t:'kv', k:'Fecha', v: fmtFecha(c.fecha)});
  b.push({t:'kv', k:'Proveedor', v: c.proveedor || '(sin proveedor)'});
  b.push({t:'sep'});
  (c.items || []).forEach(it => b.push({
    t:'item', nombre: it.producto_insumo || it.producto,
    det: 'Cant.: ' + Number(it.cantidad) + (Number(it.costo_unitario) > 0 ? ' × $' + Number(it.costo_unitario).toFixed(2) : ''),
    monto: $$(it.total)
  }));
  b.push({t:'sep'});
  b.push({t:'total', v: $$(c.total)});
  b.push({t:'kv', k:'Forma de pago', v: c.forma_pago || '—'});
  b.push({t:'kv', k:'Pagado', v: $$(c.monto_pagado)});
  const deuda = Number(c.total) - Number(c.monto_pagado);
  b.push({t:'kv', k:'Saldo pendiente', v: deuda > 0 ? $$(deuda) : '✅ Pagado'});
  b.push({t:'esp'});
  b.push({t:'nota', txt: 'Comprobante para control interno / proveedor'});
  mostrarTicket(b, 'compra-' + (c.fecha || hoy()));
}

// ---------- TICKET DE DEVOLUCIÓN ----------
function ticketDevolucion(d){
  if(!d) return;
  const labelRes = {pendiente:'⏳ Pendiente', acreditado:'✅ Acreditado', devuelto_dinero:'💰 Dinero devuelto'};
  const b = _ticketBase('CONSTANCIA DE DEVOLUCIÓN', d.id ? 'N° ' + d.id : '');
  b.push({t:'kv', k:'Fecha', v: fmtFecha(d.fecha)});
  b.push({t:'kv', k:'Tipo', v: d.tipo === 'proveedor' ? 'A proveedor' : 'De cliente'});
  b.push({t:'kv', k: d.tipo === 'proveedor' ? 'Proveedor' : 'Cliente', v: d.contraparte || '—'});
  b.push({t:'sep'});
  b.push({t:'item', nombre: d.producto || '—', det: 'Cant.: ' + Number(d.cantidad || 0), monto: $$(d.monto)});
  b.push({t:'kv', k:'Motivo', v: d.motivo || '—'});
  if(d.referencia_id) b.push({t:'kv', k:'Ref. compra/pedido', v: d.referencia_id});
  b.push({t:'sep'});
  b.push({t:'total', k:'MONTO', v: $$(d.monto)});
  b.push({t:'kv', k:'Estado', v: labelRes[d.resolucion] || d.resolucion || '—'});
  b.push({t:'esp'});
  b.push({t:'nota', txt: 'Constancia de devolución de mercadería'});
  mostrarTicket(b, 'devolucion-' + (d.fecha || hoy()));
}

// ---------- TICKET DE REPORTE (período elegido en Reportes) ----------
async function ticketReporte(){
  const f = getFechas();
  if(!f.desde || !f.hasta){ toast('Elegí un período primero', 'error'); return; }
  toast('Generando ticket...', 'guardando');
  try{
    const g = await apiGet('getGanancia', {desde: f.desde, hasta: f.hasta});
    ocultarToast();
    const b = _ticketBase('RESUMEN DEL PERÍODO', fmtFecha(f.desde) + ' al ' + fmtFecha(f.hasta));

    // --- Ventas ---
    b.push({t:'kv', k:'Ventas (' + g.cantidad_ventas + ')', v: $$(g.total_ventas)});
    const tProm = Number(g.cantidad_ventas) > 0 ? Math.round(Number(g.total_ventas) / Number(g.cantidad_ventas)) : 0;
    b.push({t:'kv', k:'Ticket promedio', v: tProm > 0 ? $$(tProm) : '—'});
    if(Number(g.dev_de_clientes) > 0){
      b.push({t:'kv', k:'Dev. de clientes', v: '−' + $$(g.dev_de_clientes)});
      b.push({t:'kv', k:'Ventas netas', v: $$(g.ventas_netas)});
    }
    if(Number(g.abonos_clientes) > 0) b.push({t:'kv', k:'Cobros de deudas', v: '+' + $$(g.abonos_clientes)});
    if(g.redondeo !== undefined) b.push({t:'kv', k:'Redondeo', v: (Number(g.redondeo) >= 0 ? '+' : '−') + $$(Math.abs(Number(g.redondeo)))});
    b.push({t:'sep'});

    // --- Compras y costos ---
    b.push({t:'kv', k:'Compras (' + g.cantidad_compras + ')', v: $$(g.total_compras)});
    if(Number(g.dev_a_proveedores) > 0){
      b.push({t:'kv', k:'Dev. a proveedores', v: '−' + $$(g.dev_a_proveedores)});
      b.push({t:'kv', k:'Compras netas', v: $$(g.compras_netas)});
    }
    if(g.costo_mercaderia !== undefined) b.push({t:'kv', k:'Costo de lo vendido', v: $$(g.costo_mercaderia)});
    b.push({t:'sep'});

    // --- Resultados ---
    const gr = (g.ganancia_real !== undefined) ? Number(g.ganancia_real) : Number(g.ganancia);
    b.push({t:'total', k:'GANANCIA REAL', v: $$(gr)});
    b.push({t:'kv', k:'Ganancia neta (vtas − compras)', v: $$(g.ganancia)});
    b.push({t:'esp'});
    b.push({t:'nota', txt: 'Ganancia real = ventas netas − costo de lo vendido'});
    b.push({t:'nota', txt: 'Documento de uso interno'});
    mostrarTicket(b, 'reporte-' + f.desde + '-al-' + f.hasta);
  }catch(e){ ocultarToast(); toast('❌ ' + e.message, 'error'); }
}
