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

// ---------- TICKET DE LISTA DE PRECIOS (para mandar a clientes) ----------
// Solo productos con stock disponible (stock > 0). Pide el stock fresco al
// servidor, sin caché, para no compartir precios ni disponibilidad viejos.
async function ticketListaPrecios(){
  toast('Generando lista...', 'guardando');
  try{
    const prods = await apiGet('getStock');
    ocultarToast();
    const disp = (prods || []).filter(p => Number(p.stock) > 1);
    if(!disp.length){
      toast('No hay productos con stock cargado', 'error');
      return;
    }
    disp.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    const b = _ticketBase('LISTA DE PRECIOS', 'Precios vigentes al ' + fmtFecha(hoy()));
    disp.forEach(p => b.push({
      t:'item', nombre: p.nombre,
      det: 'por ' + (p.unidad || 'unidad'),
      monto: $$(p.precio)
    }));
    b.push({t:'sep'});
    b.push({t:'nota', txt: 'Sujeto a disponibilidad · Hacé tu pedido'});
    mostrarTicket(b, 'precios-' + hoy());
  }catch(e){ ocultarToast(); toast('❌ ' + e.message, 'error'); }
}

// ---------- TICKET DE ESTADO DE CUENTA (cliente o proveedor) ----------
// Usa los movimientos ya cargados en el modal de cuenta (_cuentaMovs).
// Se puede generar siempre, incluso con saldo 0 o sin movimientos.
function _rangoCuenta(rango){
  const h = hoy();
  if(rango === 'mes') return {desde: h.slice(0, 7) + '-01', hasta: h, label: 'Mes actual'};
  if(rango === '30d'){
    const d = new Date(h + 'T12:00:00');
    d.setDate(d.getDate() - 29);
    const desde = new Intl.DateTimeFormat('en-CA').format(d);
    return {desde, hasta: h, label: 'Últimos 30 días'};
  }
  return {desde: '', hasta: h, label: 'Todo el historial'};
}

function ticketEstadoCuenta(){
  const movs = _cuentaMovs || [];
  const nombre = _cuentaNombre || document.getElementById('cuenta-nombre').value || '';
  const r = _rangoCuenta(typeof _cuentaRango !== 'undefined' ? _cuentaRango : '30d');

  const enRango  = r.desde ? movs.filter(m => String(m.fecha) >= r.desde) : movs.slice();
  const previos  = r.desde ? movs.filter(m => String(m.fecha) <  r.desde) : [];
  const saldoAnt = previos.length ? Number(previos[previos.length - 1].saldo) : 0;
  const saldo    = movs.length ? Number(movs[movs.length - 1].saldo) : Number(_cuentaSaldo) || 0;

  const b = _ticketBase('ESTADO DE CUENTA', nombre || '(sin nombre)');
  b.push({t:'kv', k:'Emitido', v: fmtFecha(hoy())});
  b.push({t:'kv', k:'Período', v: r.desde ? (fmtFecha(r.desde) + ' al ' + fmtFecha(r.hasta)) : 'Todo el historial'});
  b.push({t:'sep'});

  if(r.desde && (previos.length || Math.abs(saldoAnt) > 0.01)){
    b.push({t:'kv', k:'Saldo anterior', v: (saldoAnt >= 0 ? '' : '−') + $$(Math.abs(saldoAnt))});
  }

  if(enRango.length){
    enRango.forEach(m => {
      const d = Number(m.delta) || 0;
      // Una venta cobrada en el momento no mueve el saldo: se muestra como "—"
      // en vez de "+$0", que confunde al cliente.
      const monto = Math.abs(d) < 0.01 ? '—' : (d > 0 ? '+' : '−') + $$(Math.abs(d));
      b.push({
        t:'item',
        nombre: fmtFecha(m.fecha) + ' · ' + (m.descripcion || ''),
        det: 'Saldo: ' + (Number(m.saldo) < -0.01 ? '−' : '') + $$(Math.abs(Number(m.saldo))),
        monto: monto
      });
    });
  }else{
    b.push({t:'esp'});
    b.push({t:'nota', txt: 'Sin movimientos en el período'});
    b.push({t:'esp'});
  }

  b.push({t:'sep'});
  if(saldo > 0.01)       b.push({t:'total', k:'DEBE', v: $$(saldo)});
  else if(saldo < -0.01) b.push({t:'total', k:'A FAVOR', v: $$(-saldo)});
  else                   b.push({t:'total', k:'SALDO', v: '✅ Al día'});
  b.push({t:'esp'});
  b.push({t:'nota', txt: saldo > 0.01 ? 'Saldo pendiente de pago' : '¡Gracias por su confianza!'});

  const slug = (nombre || 'cuenta').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  mostrarTicket(b, 'cuenta-' + (slug || 'contacto') + '-' + hoy());
}

// ---------- TICKET DE REPORTE (período elegido en Reportes) ----------
async function ticketReporte(){
  const f = getFechas();
  if(!f.desde || !f.hasta){ toast('Elegí un período primero', 'error'); return; }
  toast('Generando ticket...', 'guardando');
  try{
    const [g, ventas] = await Promise.all([
      apiGet('getGanancia', {desde: f.desde, hasta: f.hasta}),
      apiGet('getVentas',   {desde: f.desde, hasta: f.hasta}).catch(() => ({pedidos: []}))
    ]);
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

    // --- Top clientes del período ---
    const tc = {};
    ((ventas && ventas.pedidos) || []).forEach(p => {
      const k = (p.cliente || '').toString().trim() || 'Consumidor final';
      tc[k] = (tc[k] || 0) + Number(p.total);
    });
    const tcTop = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if(tcTop.length){
      b.push({t:'nota', txt: 'Clientes que más compraron'});
      tcTop.forEach(([cli, monto], i) => b.push({t:'kv', k: (i + 1) + '. ' + cli, v: $$(monto)}));
      b.push({t:'sep'});
    }

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
