// ==========================================
// TICKETS (imagen PNG: compartir, guardar o imprimir)
// Sin librerías externas: se dibuja en un <canvas>.
//
// Diseño "comprobante": banda oscura con el logo arriba, tabla de items con
// columnas (cantidad / descripcion / precio unitario / subtotal), caja de TOTAL
// y franja de estado de pago. El ticket SIEMPRE se dibuja sobre papel blanco,
// aunque la app este en modo noche: se comparte por WhatsApp y se imprime.
// ==========================================
let _ticketBlob = null;
let _ticketNombre = 'ticket';

const _TK_W = 560, _TK_PAD = 24;

const _TKC = {
  tinta:  '#1b2733',
  gris:   '#6b7684',
  suave:  '#98a1ad',
  banda:  '#22303c',
  ambar:  '#e0a032',
  ambarS: '#fbf1dc',
  linea:  '#e4dfd5',
  zebra:  '#faf8f4',
  verde:  '#1c8a4e',
  verdeS: '#e9f6ee',
  rojo:   '#c0392b',
  rojoS:  '#fdeceb'
};

// Columnas de la tabla de items
const _COL_CANT = _TK_PAD;                  // borde izquierdo (texto a la izq.)
const _COL_DESC = _TK_PAD + 66;             // descripcion
const _COL_PU   = _TK_W - _TK_PAD - 104;    // borde DERECHO del precio unitario
const _COL_SUB  = _TK_W - _TK_PAD;          // borde DERECHO del subtotal
const _DESC_W   = _COL_PU - _COL_DESC - 56; // ancho util de la descripcion

// ------------------------------------------
// Logo: se carga una sola vez y se reusa. Si falla (sin red, archivo movido),
// el ticket igual sale: en su lugar va el emoji del queso.
// ------------------------------------------
let _logoImg = null, _logoProm = null;
function _cargarLogo(){
  if(_logoProm) return _logoProm;
  _logoProm = new Promise(res => {
    try{
      const im = new Image();
      im.onload  = () => { _logoImg = im; res(im); };
      im.onerror = () => res(null);
      im.src = 'iso.png';
    }catch(e){ res(null); }
  });
  return _logoProm;
}

// ------------------------------------------
// Helpers de dibujo
// ------------------------------------------
function _rr(x, px, py, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py,     px + w, py + h, r);
  x.arcTo(px + w, py + h, px,     py + h, r);
  x.arcTo(px,     py + h, px,     py,     r);
  x.arcTo(px,     py,     px + w, py,     r);
  x.closePath();
}

// Parte el texto en lineas que entran en `max`. Si una palabra sola no entra
// (un nombre larguisimo sin espacios), la corta. Nunca devuelve "...".
function _tkWrap(ctx, txt, max){
  txt = String(txt == null ? '' : txt).trim();
  if(!txt) return [''];
  const palabras = txt.split(/\s+/);
  const lineas = [];
  let act = '';
  palabras.forEach(p => {
    while(ctx.measureText(p).width > max && p.length > 1){
      let corte = p;
      while(corte.length > 1 && ctx.measureText(corte).width > max) corte = corte.slice(0, -1);
      if(act){ lineas.push(act); act = ''; }
      lineas.push(corte);
      p = p.slice(corte.length);
    }
    const prueba = act ? act + ' ' + p : p;
    if(!act || ctx.measureText(prueba).width <= max) act = prueba;
    else { lineas.push(act); act = p; }
  });
  if(act) lineas.push(act);
  return lineas.length ? lineas : [''];
}

// Recorte con puntos suspensivos: solo para campos donde una linea sola alcanza
// (forma de pago, etiquetas cortas). La descripcion de los items NO se recorta.
function _tkRecortar(ctx, txt, max){
  txt = String(txt == null ? '' : txt);
  if(ctx.measureText(txt).width <= max) return txt;
  while(txt.length > 1 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1);
  return txt + '…';
}

let _tkMedidor = null;
function _tkCtxMed(){
  if(!_tkMedidor) _tkMedidor = document.createElement('canvas').getContext('2d');
  return _tkMedidor;
}

// Alto en px de cada bloque (se mide de verdad: los textos largos suman lineas)
function _tkAlto(b, m){
  switch(b.t){
    case 'hdr':    return 100;
    case 'para':   return b.extra ? 56 : 42;
    case 'label':  return 24;
    case 'sub':    return 30;
    case 'thead':  return 28;
    case 'trow': {
      m.font = 'bold 14px Arial';
      return 28 + (_tkWrap(m, b.desc, _DESC_W + (b.sinCant ? 58 : 0)).length - 1) * 17;
    }
    case 'kv':     return 25;
    case 'item':   return b.det ? 44 : 26;
    case 'sep':    return 16;
    case 'tot':    return 48;
    case 'estado': return 44;
    case 'movh':   return 30;
    case 'movi': {
      m.font = '13px Arial';
      return _tkWrap(m, b.desc, _DESC_W + 20).length * 19;
    }
    case 'movs':   return 21;
    case 'nota': {
      m.font = '13px Arial';
      return _tkWrap(m, b.txt, _TK_W - _TK_PAD * 2).length * 18 + 2;
    }
    case 'esp':    return b.h || 10;
    default:       return 22;
  }
}

// ------------------------------------------
// Render
// ------------------------------------------
function _dibujarTicket(bloques, opts){
  opts = opts || {};
  const m = _tkCtxMed();
  const altos = bloques.map(b => _tkAlto(b, m));
  const pie = opts.pie ? 34 : 18;
  const alto = altos.reduce((s, h) => s + h, 0) + pie + (bloques[0] && bloques[0].t === 'hdr' ? 14 : _TK_PAD);

  const c = document.createElement('canvas');
  c.width = _TK_W; c.height = Math.round(alto);
  const x = c.getContext('2d');
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);

  const maxW = _TK_W - _TK_PAD * 2;
  let y = (bloques[0] && bloques[0].t === 'hdr') ? 0 : _TK_PAD;

  bloques.forEach((b, i) => {
    const h = altos[i];
    switch(b.t){

      // --- Banda superior con logo, titulo, numero y fecha ---
      case 'hdr': {
        x.fillStyle = _TKC.banda; x.fillRect(0, 0, _TK_W, h - 4);
        x.fillStyle = _TKC.ambar; x.fillRect(0, h - 4, _TK_W, 4);
        // logo directo sobre la banda: el PNG ya tiene el fondo transparente,
        // asi que no lleva ningun circulo atras.
        if(_logoImg) x.drawImage(_logoImg, _TK_PAD, 20, 56, 56);
        else { x.fillStyle = '#ffffff'; x.font = '32px Arial'; x.textAlign = 'center'; x.fillText('🧀', _TK_PAD + 28, 60); }
        // nombre
        x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = 'bold 17px Arial';
        x.fillText('QUESOS LOS WEYS', _TK_PAD + 70, 54);
        // titulo + datos a la derecha
        // El titulo se achica solo si es largo, para no pisar el nombre del negocio
        x.textAlign = 'right'; x.fillStyle = _TKC.ambar;
        const tit = b.titulo || 'COMPROBANTE';
        const dispo = _TK_W - _TK_PAD - (_TK_PAD + 70 + 150 + 14);
        let fs = 23;
        x.font = 'bold ' + fs + 'px Arial';
        while(fs > 14 && x.measureText(tit).width > dispo){ fs -= 1; x.font = 'bold ' + fs + 'px Arial'; }
        x.fillText(tit, _TK_W - _TK_PAD, 42);
        x.font = '11px Arial'; x.fillStyle = '#c3cdd8';
        let yy = 60;
        if(b.num){ x.fillText(_tkRecortar(x, 'N° ' + b.num, 250), _TK_W - _TK_PAD, yy); yy += 15; }
        if(b.fecha) x.fillText('Fecha: ' + b.fecha, _TK_W - _TK_PAD, yy);
        break;
      }

      // --- "FACTURADO A" / "PROVEEDOR" + nombre ---
      case 'para': {
        x.textAlign = 'left';
        x.font = 'bold 10px Arial'; x.fillStyle = _TKC.suave;
        x.fillText((b.label || '').toUpperCase(), _TK_PAD, y + 14);
        x.font = 'bold 18px Arial'; x.fillStyle = _TKC.tinta;
        x.fillText(_tkRecortar(x, b.valor || '—', maxW), _TK_PAD, y + 34);
        if(b.extra){
          x.font = '13px Arial'; x.fillStyle = _TKC.gris;
          x.fillText(_tkRecortar(x, b.extra, maxW), _TK_PAD, y + 50);
        }
        break;
      }

      // --- Etiqueta chica de seccion ---
      case 'label':
        x.textAlign = 'left'; x.font = 'bold 10px Arial'; x.fillStyle = _TKC.suave;
        x.fillText((b.txt || '').toUpperCase(), _TK_PAD, y + 15);
        break;

      case 'sub':
        x.textAlign = 'left'; x.font = 'bold 15px Arial'; x.fillStyle = _TKC.tinta;
        x.fillText(b.txt, _TK_PAD, y + 18);
        x.strokeStyle = _TKC.linea; x.lineWidth = 1;
        x.beginPath(); x.moveTo(_TK_PAD, y + 26); x.lineTo(_TK_W - _TK_PAD, y + 26); x.stroke();
        break;

      // --- Encabezado de la tabla de items ---
      case 'thead': {
        const cols = b.cols || ['Cant.', 'Descripción', 'P. unit.', 'Subtotal'];
        x.fillStyle = _TKC.zebra;
        x.fillRect(_TK_PAD, y, maxW, h);
        x.strokeStyle = _TKC.linea; x.lineWidth = 1;
        x.strokeRect(_TK_PAD + .5, y + .5, maxW - 1, h - 1);
        x.font = 'bold 11px Arial'; x.fillStyle = _TKC.gris;
        x.textAlign = 'left';
        if(!b.sinCant) x.fillText(cols[0], _COL_CANT + 8, y + 18);
        x.fillText(cols[1], b.sinCant ? _COL_CANT + 8 : _COL_DESC, y + 18);
        x.textAlign = 'right';  x.fillText(cols[2], _COL_PU, y + 18);
        x.fillText(cols[3], _COL_SUB - 8, y + 18);
        break;
      }

      // --- Fila de la tabla ---
      case 'trow': {
        if(b.zebra){ x.fillStyle = _TKC.zebra; x.fillRect(_TK_PAD, y, maxW, h); }
        x.font = 'bold 14px Arial';
        const lineas = _tkWrap(x, b.desc, _DESC_W + (b.sinCant ? 58 : 0));
        const dx = b.sinCant ? _COL_CANT + 8 : _COL_DESC;
        x.fillStyle = _TKC.tinta; x.textAlign = 'left';
        lineas.forEach((ln, k) => x.fillText(ln, dx, y + 19 + k * 17));
        x.font = '13px Arial'; x.fillStyle = _TKC.gris;
        if(b.cant !== undefined && b.cant !== '') x.fillText(String(b.cant), _COL_CANT + 8, y + 19);
        x.textAlign = 'right';
        if(b.punit !== undefined && b.punit !== '') x.fillText(String(b.punit), _COL_PU, y + 19);
        x.font = 'bold 14px Arial'; x.fillStyle = _TKC.tinta;
        if(b.sub !== undefined && b.sub !== '') x.fillText(String(b.sub), _COL_SUB - 8, y + 19);
        x.strokeStyle = _TKC.linea; x.lineWidth = 1;
        x.beginPath(); x.moveTo(_TK_PAD, y + h - .5); x.lineTo(_TK_W - _TK_PAD, y + h - .5); x.stroke();
        break;
      }

      // --- Caja de TOTAL ---
      case 'tot': {
        const ancho = b.ancho || maxW;
        const px = _TK_W - _TK_PAD - ancho;
        x.fillStyle = _TKC.ambarS;
        _rr(x, px, y + 4, ancho, h - 10, 8); x.fill();
        x.strokeStyle = _TKC.ambar; x.lineWidth = 1.5;
        _rr(x, px, y + 4, ancho, h - 10, 8); x.stroke();
        x.font = 'bold 16px Arial'; x.fillStyle = _TKC.tinta; x.textAlign = 'left';
        x.fillText(b.k || 'TOTAL', px + 16, y + 30);
        x.font = 'bold 21px Arial'; x.textAlign = 'right';
        x.fillText(b.v, _TK_W - _TK_PAD - 16, y + 31);
        break;
      }

      // --- Franja de estado de pago ---
      case 'estado': {
        x.fillStyle = b.ok ? _TKC.verdeS : _TKC.rojoS;
        _rr(x, _TK_PAD, y + 4, maxW, h - 10, 8); x.fill();
        x.font = 'bold 15px Arial'; x.textAlign = 'center';
        x.fillStyle = b.ok ? _TKC.verde : _TKC.rojo;
        x.fillText(b.txt, _TK_W / 2, y + 27);
        break;
      }

      // --- Par etiqueta/valor ---
      case 'kv':
        x.font = '14px Arial'; x.fillStyle = _TKC.gris; x.textAlign = 'left';
        x.fillText(b.k, _TK_PAD, y + 17);
        x.font = 'bold 14px Arial'; x.fillStyle = b.color || _TKC.tinta; x.textAlign = 'right';
        x.fillText(_tkRecortar(x, b.v, maxW * 0.55), _TK_W - _TK_PAD, y + 17);
        break;

      // --- Movimiento de cuenta corriente: cabecera ---
      case 'movh': {
        x.fillStyle = _TKC.zebra; x.fillRect(_TK_PAD, y, maxW, h);
        x.fillStyle = b.tono || _TKC.ambar; x.fillRect(_TK_PAD, y, 3, h);
        x.font = 'bold 13px Arial'; x.fillStyle = _TKC.tinta; x.textAlign = 'left';
        x.fillText(_tkRecortar(x, b.txt, maxW - 120), _TK_PAD + 12, y + 19);
        if(b.monto){
          x.font = 'bold 14px Arial'; x.fillStyle = b.color || _TKC.tinta; x.textAlign = 'right';
          x.fillText(b.monto, _TK_W - _TK_PAD - 8, y + 19);
        }
        break;
      }

      // --- Movimiento: linea de detalle (producto) ---
      case 'movi': {
        x.font = '13px Arial';
        const lns = _tkWrap(x, b.desc, _DESC_W + 20);
        x.fillStyle = _TKC.gris; x.textAlign = 'left';
        lns.forEach((ln, k) => x.fillText(ln, _TK_PAD + 22, y + 14 + k * 19));
        if(b.monto){
          x.textAlign = 'right'; x.fillStyle = _TKC.tinta;
          x.fillText(b.monto, _TK_W - _TK_PAD - 8, y + 14);
        }
        break;
      }

      // --- Movimiento: saldo despues del movimiento ---
      case 'movs':
        x.font = 'italic 12px Arial'; x.fillStyle = _TKC.suave; x.textAlign = 'right';
        x.fillText(b.txt, _TK_W - _TK_PAD - 8, y + 13);
        break;

      case 'nota': {
        x.font = '13px Arial'; x.fillStyle = b.color || _TKC.gris; x.textAlign = 'center';
        _tkWrap(x, b.txt, maxW).forEach((ln, k) => x.fillText(ln, _TK_W / 2, y + 14 + k * 18));
        break;
      }

      case 'sep':
        x.strokeStyle = _TKC.linea; x.lineWidth = 1; x.setLineDash([4, 4]);
        x.beginPath(); x.moveTo(_TK_PAD, y + 8.5); x.lineTo(_TK_W - _TK_PAD, y + 8.5);
        x.stroke(); x.setLineDash([]);
        break;

      // --- Compatibilidad: item viejo de una linea ---
      case 'item':
        x.fillStyle = _TKC.tinta; x.font = 'bold 14px Arial'; x.textAlign = 'left';
        x.fillText(_tkRecortar(x, b.nombre, maxW - 110), _TK_PAD, y + 16);
        x.textAlign = 'right'; x.fillText(b.monto, _TK_W - _TK_PAD, y + 16);
        if(b.det){
          x.font = '13px Arial'; x.fillStyle = _TKC.gris; x.textAlign = 'left';
          x.fillText(_tkRecortar(x, b.det, maxW - 40), _TK_PAD, y + 33);
        }
        break;
    }
    y += h;
  });

  if(opts.pie){
    x.font = '11px Arial'; x.fillStyle = '#b3bcc6'; x.textAlign = 'center';
    x.fillText(opts.pie, _TK_W / 2, c.height - 13);
  }
  return c;
}

// Dibuja y abre el modal de vista previa. Espera al logo antes de dibujar.
async function mostrarTicket(bloques, nombre, opts){
  await _cargarLogo();
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

// Imprimir (desde la impresora del celu/compu tambien se puede "Guardar como PDF")
function imprimirTicketActual(){
  const img = document.getElementById('ticket-img');
  if(!img.src) return;
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.contentDocument.write('<img src="' + img.src + '" style="width:100%;max-width:360px" onload="setTimeout(function(){window.print()},150)">');
  f.contentDocument.close();
  setTimeout(() => f.remove(), 60000);
}

// ------------------------------------------
// Helpers de contenido
// ------------------------------------------
function _cabecera(titulo, num, fecha){
  return {t:'hdr', titulo: titulo, num: num || '', fecha: fecha || fmtFecha(hoy())};
}

// "2 kg" / "1,5 kg" / "3 unid" — sin decimales de mas
function _cant(n, unidad){
  const v = Number(n) || 0;
  const txt = (Math.round(v * 100) / 100).toLocaleString('es-AR', {maximumFractionDigits: 2});
  return txt + (unidad ? ' ' + (unidad === 'unidad' ? 'un' : unidad) : '');
}

// La hoja "Ventas" no guarda la unidad: se busca en el catalogo de productos.
function _unidadDe(nombre){
  const p = (productos || []).find(z => _norm(z.nombre) === _norm(nombre));
  return p && p.unidad ? p.unidad : '';
}

function _celular(nombre){
  const c = (clientesCache || []).find(cl => _norm(nombreCompleto(cl)) === _norm(nombre));
  return c && c.celular ? c.celular : '';
}

// ---------- TICKET DE VENTA ----------
function ticketVenta(p){
  if(!p) return;
  const total  = Number(p.total) || 0;
  const pagado = Number(p.monto_pagado) || 0;
  const resta  = total - pagado;
  const cliente = (p.cliente || '').toString().trim();

  const b = [_cabecera('COMPROBANTE', p.pedido_id || p.id || '', fmtFecha(p.fecha))];
  b.push({t:'esp', h:14});
  b.push({t:'para', label:'Comprobante para', valor: cliente || 'Consumidor final', extra: _celular(cliente)});
  b.push({t:'esp', h:6});

  const items = p.items || [];
  b.push({t:'thead'});
  if(items.length){
    items.forEach((it, i) => b.push({
      t:'trow', zebra: i % 2 === 1,
      cant: _cant(it.cantidad, it.unidad || _unidadDe(it.producto)),
      desc: it.producto,
      punit: Number(it.precio_unitario) > 0 ? $$(it.precio_unitario) : '',
      sub: $$(it.subtotal)
    }));
  }else{
    b.push({t:'trow', cant:'', desc: p.descripcion || 'Venta', punit:'', sub: $$(total)});
  }

  b.push({t:'esp', h:10});
  b.push({t:'tot', k:'TOTAL', v: $$(total)});
  b.push({t:'esp', h:6});
  b.push({t:'kv', k:'Forma de pago', v: p.forma_pago || '—'});
  b.push({t:'kv', k:'Monto pagado', v: $$(pagado)});
  b.push({t:'esp', h:6});
  b.push(resta > 0.01
    ? {t:'estado', ok:false, txt:'SALDO PENDIENTE: ' + $$(resta)}
    : {t:'estado', ok:true,  txt:'✅ PAGADO'});
  b.push({t:'esp', h:8});
  b.push({t:'nota', txt:'¡Gracias por su compra!'});
  mostrarTicket(b, 'comprobante-' + (p.fecha || hoy()));
}

// ---------- TICKET DE COMPRA ----------
function ticketCompra(c){
  if(!c) return;
  const total  = Number(c.total) || 0;
  const pagado = Number(c.monto_pagado) || 0;
  const deuda  = total - pagado;

  const b = [_cabecera('COMPRA', c.compra_id || c.id || '', fmtFecha(c.fecha))];
  b.push({t:'esp', h:14});
  b.push({t:'para', label:'Proveedor', valor: c.proveedor || '(sin proveedor)'});
  b.push({t:'esp', h:6});
  b.push({t:'thead', cols:['Cant.', 'Producto / insumo', 'Costo un.', 'Total']});
  (c.items || []).forEach((it, i) => b.push({
    t:'trow', zebra: i % 2 === 1,
    cant: _cant(it.cantidad, it.unidad || _unidadDe(it.producto_insumo || it.producto)),
    desc: it.producto_insumo || it.producto || '—',
    punit: Number(it.costo_unitario) > 0 ? $$(it.costo_unitario) : '',
    sub: $$(it.total)
  }));
  b.push({t:'esp', h:10});
  b.push({t:'tot', k:'TOTAL', v: $$(total)});
  b.push({t:'esp', h:6});
  b.push({t:'kv', k:'Forma de pago', v: c.forma_pago || '—'});
  b.push({t:'kv', k:'Monto pagado', v: $$(pagado)});
  b.push({t:'esp', h:6});
  b.push(deuda > 0.01
    ? {t:'estado', ok:false, txt:'QUEDA A PAGAR: ' + $$(deuda)}
    : {t:'estado', ok:true,  txt:'✅ PAGADA'});
  mostrarTicket(b, 'compra-' + (c.fecha || hoy()), {pie:'Documento de uso interno · generado el ' + fmtFecha(hoy())});
}

// ---------- TICKET DE DEVOLUCION ----------
function ticketDevolucion(d){
  if(!d) return;
  const aProv = d.tipo === 'proveedor';
  const est = {
    pendiente:       {ok:false, txt:'⏳ PENDIENTE DE RESOLUCIÓN'},
    acreditado:      {ok:true,  txt:'✅ ACREDITADO EN CUENTA'},
    devuelto_dinero: {ok:true,  txt:'💰 DINERO DEVUELTO'}
  }[d.resolucion] || {ok:false, txt:'—'};

  const b = [_cabecera('DEVOLUCIÓN', d.id || '', fmtFecha(d.fecha))];
  b.push({t:'esp', h:14});
  b.push({t:'para', label: aProv ? 'Devuelto a proveedor' : 'Devuelto por cliente', valor: d.contraparte || '—'});
  b.push({t:'esp', h:6});
  b.push({t:'thead', cols:['Cant.', 'Producto', '', 'Monto']});
  b.push({t:'trow', cant: _cant(d.cantidad, _unidadDe(d.producto)), desc: d.producto || '—', punit:'', sub: $$(d.monto)});
  b.push({t:'esp', h:8});
  b.push({t:'kv', k:'Motivo', v: d.motivo || '—'});
  if(d.referencia_id) b.push({t:'kv', k:'Ref. compra/pedido', v: d.referencia_id});
  b.push({t:'esp', h:6});
  b.push({t:'tot', k:'MONTO', v: $$(d.monto)});
  b.push({t:'esp', h:6});
  b.push({t:'estado', ok: est.ok, txt: est.txt});
  mostrarTicket(b, 'devolucion-' + (d.fecha || hoy()), {pie:'Constancia de devolución de mercadería'});
}

// ---------- TICKET DE LISTA DE PRECIOS ----------
// Productos que NO salen en la lista que se manda a clientes: son anotaciones
// internas, no mercaderia. Si aparece otra, se agrega aca.
const OCULTOS_LISTA_PRECIOS = ['Pollero'];
function _ocultoEnPrecios(nombre){
  const n = _norm(nombre);
  return OCULTOS_LISTA_PRECIOS.some(z => _norm(z) === n);
}

async function ticketListaPrecios(){
  toast('Generando lista...', 'guardando');
  try{
    const prods = await apiGet('getStock');
    ocultarToast();
    const disp = (prods || []).filter(p => Number(p.stock) > 0 && !_ocultoEnPrecios(p.nombre));
    if(!disp.length){ toast('No hay productos con stock cargado', 'error'); return; }
    disp.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));

    const b = [_cabecera('LISTA DE PRECIOS', '', fmtFecha(hoy()))];
    b.push({t:'esp', h:14});
    b.push({t:'label', txt:'Precios vigentes al ' + fmtFecha(hoy())});
    b.push({t:'thead', sinCant:true, cols:['', 'Producto', 'Unidad', 'Precio']});
    disp.forEach((p, i) => b.push({
      t:'trow', zebra: i % 2 === 1, sinCant:true,
      cant:'', desc: p.nombre,
      punit:'por ' + (p.unidad || 'unidad'),
      sub: $$(p.precio)
    }));
    b.push({t:'esp', h:12});
    b.push({t:'nota', txt:'Sujeto a disponibilidad · Hacé tu pedido y te lo preparamos'});
    mostrarTicket(b, 'precios-' + hoy());
  }catch(e){ ocultarToast(); toast('❌ ' + e.message, 'error'); }
}

// ---------- TICKET DE ESTADO DE CUENTA ----------
function _rangoCuenta(rango){
  const h = hoy();
  if(rango === 'mes') return {desde: h.slice(0, 7) + '-01', hasta: h, label:'Mes actual'};
  if(rango === '30d'){
    const d = new Date(h + 'T12:00:00');
    d.setDate(d.getDate() - 29);
    return {desde: new Intl.DateTimeFormat('en-CA').format(d), hasta: h, label:'Últimos 30 días'};
  }
  return {desde:'', hasta: h, label:'Todo el historial'};
}

function _saldoTxt(s){ return (s < -0.01 ? '−' : '') + $$(Math.abs(s)); }

function ticketEstadoCuenta(){
  const movs = _cuentaMovs || [];
  const nombre = _cuentaNombre || document.getElementById('cuenta-nombre').value || '';
  const r = _rangoCuenta(typeof _cuentaRango !== 'undefined' ? _cuentaRango : '30d');

  const enRango  = r.desde ? movs.filter(m => String(m.fecha) >= r.desde) : movs.slice();
  const previos  = r.desde ? movs.filter(m => String(m.fecha) <  r.desde) : [];
  const saldoAnt = previos.length ? Number(previos[previos.length - 1].saldo) : 0;
  const saldo    = movs.length ? Number(movs[movs.length - 1].saldo) : Number(_cuentaSaldo) || 0;

  const b = [_cabecera('ESTADO DE CUENTA', '', fmtFecha(hoy()))];
  b.push({t:'esp', h:14});
  b.push({t:'para', label:'Cuenta de', valor: nombre || '(sin nombre)', extra: _celular(nombre)});
  b.push({t:'kv', k:'Período', v: r.desde ? (fmtFecha(r.desde) + ' al ' + fmtFecha(r.hasta)) : 'Todo el historial'});
  if(r.desde && (previos.length || Math.abs(saldoAnt) > 0.01))
    b.push({t:'kv', k:'Saldo anterior', v: _saldoTxt(saldoAnt)});
  b.push({t:'esp', h:8});
  b.push({t:'label', txt:'Detalle de movimientos'});

  if(enRango.length){
    enRango.forEach(mv => {
      const d = Number(mv.delta) || 0;
      const suma = d > 0.01, resta = d < -0.01;
      const monto = (!suma && !resta) ? '' : (suma ? '+' : '−') + $$(Math.abs(d));
      const esVenta = mv.tipo === 'venta' || mv.tipo === 'compra';

      b.push({
        t:'movh',
        txt: fmtFecha(mv.fecha) + '  ·  ' + _tituloMov(mv),
        monto: monto,
        color: suma ? _TKC.rojo : (resta ? _TKC.verde : _TKC.suave),
        tono:  suma ? _TKC.rojo : (resta ? _TKC.verde : _TKC.suave)
      });

      // EL DETALLE: una linea por producto de esa venta/compra.
      const items = mv.items || [];
      if(items.length){
        items.forEach(it => b.push({
          t:'movi',
          desc: _cant(it.cantidad, it.unidad || _unidadDe(it.producto)) + '  ' + (it.producto || '') +
                (Number(it.precio_unitario) > 0 ? '  × ' + $$(it.precio_unitario) : ''),
          monto: $$(it.subtotal)
        }));
      }else if(mv.descripcion && esVenta){
        b.push({t:'movi', desc: mv.descripcion, monto:''});
      }

      if(esVenta && mv.total !== undefined){
        const pg = Number(mv.pagado) || 0;
        b.push({t:'movi', desc:'Total ' + $$(mv.total) + (pg > 0 ? '  ·  pagó ' + $$(pg) : '  ·  sin pago'), monto:''});
      }
      b.push({t:'movs', txt:'Saldo después de este movimiento: ' + _saldoTxt(Number(mv.saldo))});
    });
  }else{
    b.push({t:'esp', h:8});
    b.push({t:'nota', txt:'Sin movimientos en el período'});
    b.push({t:'esp', h:8});
  }

  b.push({t:'esp', h:10});
  if(saldo > 0.01)       b.push({t:'tot', k:'SALDO A PAGAR', v: $$(saldo)});
  else if(saldo < -0.01) b.push({t:'tot', k:'SALDO A FAVOR',  v: $$(-saldo)});
  else                   b.push({t:'tot', k:'SALDO',          v:'✅ Al día'});
  b.push({t:'esp', h:6});
  b.push({t:'nota', txt: saldo > 0.01 ? 'Cualquier duda con el detalle, avisanos.' : '¡Gracias por su confianza!'});

  const slug = (nombre || 'cuenta').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  mostrarTicket(b, 'cuenta-' + (slug || 'contacto') + '-' + hoy());
}

function _tituloMov(mv){
  const t = mv.tipo;
  if(t === 'venta')     return 'Pedido' + (mv.id ? ' N° ' + String(mv.id).slice(-4) : '');
  if(t === 'compra')    return 'Compra que te hicimos' + (mv.id ? ' N° ' + String(mv.id).slice(-4) : '');
  if(t === 'pago_cli')  return mv.descripcion || 'Pago recibido';
  if(t === 'pago_prov') return 'Pago realizado';
  if(t === 'dev_cli' || t === 'dev_prov') return mv.descripcion || 'Devolución';
  return mv.descripcion || 'Movimiento';
}

// ---------- TICKET DE REPORTE (periodo elegido en Reportes) ----------
async function ticketReporte(){
  const f = getFechas();
  if(!f.desde || !f.hasta){ toast('Elegí un período primero', 'error'); return; }
  toast('Generando ticket...', 'guardando');
  try{
    const _r = await cargarReporteDatos(f.desde, f.hasta);
    const g = _r.ganancia, ventas = _r.ventas || {pedidos: []};
    ocultarToast();

    const b = [_cabecera('RESUMEN', '', fmtFecha(hoy()))];
    b.push({t:'esp', h:14});
    b.push({t:'para', label:'Período', valor: fmtFecha(f.desde) + ' al ' + fmtFecha(f.hasta)});
    b.push({t:'esp', h:4});

    b.push({t:'sub', txt:'Ventas'});
    b.push({t:'kv', k:'Ventas (' + g.cantidad_ventas + ')', v: $$(g.total_ventas)});
    const tProm = Number(g.cantidad_ventas) > 0 ? Math.round(Number(g.total_ventas) / Number(g.cantidad_ventas)) : 0;
    b.push({t:'kv', k:'Ticket promedio', v: tProm > 0 ? $$(tProm) : '—'});
    if(Number(g.dev_de_clientes) > 0){
      b.push({t:'kv', k:'Dev. de clientes', v:'−' + $$(g.dev_de_clientes)});
      b.push({t:'kv', k:'Ventas netas', v: $$(g.ventas_netas)});
    }
    if(Number(g.abonos_clientes) > 0) b.push({t:'kv', k:'Cobros de deudas', v:'+' + $$(g.abonos_clientes)});
    if(g.redondeo !== undefined) b.push({t:'kv', k:'Redondeo', v: (Number(g.redondeo) >= 0 ? '+' : '−') + $$(Math.abs(Number(g.redondeo)))});

    b.push({t:'esp', h:8});
    b.push({t:'sub', txt:'Compras y costos'});
    b.push({t:'kv', k:'Compras (' + g.cantidad_compras + ')', v: $$(g.total_compras)});
    if(Number(g.dev_a_proveedores) > 0){
      b.push({t:'kv', k:'Dev. a proveedores', v:'−' + $$(g.dev_a_proveedores)});
      b.push({t:'kv', k:'Compras netas', v: $$(g.compras_netas)});
    }
    if(g.costo_mercaderia !== undefined) b.push({t:'kv', k:'Costo de lo vendido', v: $$(g.costo_mercaderia)});

    // Top productos del periodo (monto y cantidad)
    const tp = {};
    ((ventas && ventas.pedidos) || []).forEach(p => (p.items || []).forEach(it => {
      const k = it.producto || '—';
      if(!tp[k]) tp[k] = {monto:0, cant:0, unidad: it.unidad || _unidadDe(k)};
      tp[k].monto += Number(it.subtotal) || 0;
      tp[k].cant  += Number(it.cantidad) || 0;
    }));
    const tpTop = Object.entries(tp).sort((a, b2) => b2[1].monto - a[1].monto).slice(0, 5);
    if(tpTop.length){
      b.push({t:'esp', h:8});
      b.push({t:'sub', txt:'Productos más vendidos'});
      b.push({t:'thead', cols:['#', 'Producto', 'Cantidad', 'Vendido']});
      tpTop.forEach(([prod, v], i) => b.push({
        t:'trow', zebra: i % 2 === 1,
        cant: String(i + 1), desc: prod,
        punit: _cant(v.cant, v.unidad), sub: $$(v.monto)
      }));
    }

    // Top clientes
    const tc = {};
    ((ventas && ventas.pedidos) || []).forEach(p => {
      const k = (p.cliente || '').toString().trim() || 'Consumidor final';
      tc[k] = (tc[k] || 0) + Number(p.total);
    });
    const tcTop = Object.entries(tc).sort((a, b2) => b2[1] - a[1]).slice(0, 5);
    if(tcTop.length){
      b.push({t:'esp', h:8});
      b.push({t:'sub', txt:'Clientes que más compraron'});
      tcTop.forEach(([cli, monto], i) => b.push({t:'kv', k: (i + 1) + '. ' + cli, v: $$(monto)}));
    }

    b.push({t:'esp', h:12});
    const gr = (g.ganancia_real !== undefined) ? Number(g.ganancia_real) : Number(g.ganancia);
    b.push({t:'tot', k:'GANANCIA REAL', v: $$(gr)});
    b.push({t:'esp', h:4});
    b.push({t:'kv', k:'Ganancia neta (ventas − compras)', v: $$(g.ganancia)});
    b.push({t:'esp', h:6});
    b.push({t:'nota', txt:'Ganancia real = ventas netas − costo de lo vendido'});
    mostrarTicket(b, 'reporte-' + f.desde + '-al-' + f.hasta, {pie:'Documento de uso interno · generado el ' + fmtFecha(hoy())});
  }catch(e){ ocultarToast(); toast('❌ ' + e.message, 'error'); }
}
