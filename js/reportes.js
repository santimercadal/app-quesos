// ==========================================
// REPORTES
// El periodo lo mandan SIEMPRE los dos campos de fecha (#r-desde / #r-hasta):
// son la unica fuente de verdad. Los botones de arriba (Hoy, Semana, Mes, Mes
// pasado) no son un "modo": lo unico que hacen es llenar esos dos campos.
// Asi, tocar una fecha a mano y tocar un atajo terminan en el mismo lugar.
// ==========================================

let _repToken = 0;   // evita que una respuesta vieja pise un reporte nuevo

function _f(d){ return new Intl.DateTimeFormat('en-CA').format(d); }

// desde/hasta de cada atajo
function _rangoAtajo(periodo){
  const h = hoy();
  if(periodo === 'hoy') return {desde: h, hasta: h};
  if(periodo === 'semana'){
    const d = new Date(h + 'T12:00:00');
    const dia = d.getDay() || 7;              // lunes = 1 ... domingo = 7
    d.setDate(d.getDate() - dia + 1);
    return {desde: _f(d), hasta: h};
  }
  if(periodo === 'mes') return {desde: h.slice(0, 7) + '-01', hasta: h};
  if(periodo === 'mespasado'){
    const d = new Date(h + 'T12:00:00');
    d.setDate(1); d.setMonth(d.getMonth() - 1);
    const ini = new Date(d);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
    return {desde: _f(ini), hasta: _f(fin)};
  }
  return {desde: h.slice(0, 7) + '-01', hasta: h};
}

// Deja los campos con el rango del atajo y marca el boton
function cambiarTab(periodo, btn){
  periodoReporte = periodo;
  const r = _rangoAtajo(periodo);
  document.getElementById('r-desde').value = r.desde;
  document.getElementById('r-hasta').value = r.hasta;
  document.querySelectorAll('#tabs-reporte .tab').forEach(t => t.classList.remove('activo'));
  if(btn) btn.classList.add('activo');
  cargarReporte();
}

// El usuario toco una fecha a mano: ningun atajo queda marcado
function fechaManual(){
  periodoReporte = 'custom';
  document.querySelectorAll('#tabs-reporte .tab').forEach(t => t.classList.remove('activo'));
  const d = document.getElementById('r-desde').value;
  const h = document.getElementById('r-hasta').value;
  // Si invirtio el rango sin querer, se acomoda solo en vez de mostrar vacio
  if(d && h && d > h){ document.getElementById('r-hasta').value = d; document.getElementById('r-desde').value = h; }
  cargarReporte();
}

// Al entrar a la pantalla: si los campos estan vacios, arranca en el mes actual
function prepararReporte(){
  const iD = document.getElementById('r-desde'), iH = document.getElementById('r-hasta');
  if(!iD.value || !iH.value){
    const r = _rangoAtajo(periodoReporte || 'mes');
    iD.value = r.desde; iH.value = r.hasta;
    const btn = document.querySelector('#tabs-reporte .tab[data-p="' + (periodoReporte || 'mes') + '"]');
    if(btn){ document.querySelectorAll('#tabs-reporte .tab').forEach(t => t.classList.remove('activo')); btn.classList.add('activo'); }
  }
}

function getFechas(){
  const iD = document.getElementById('r-desde'), iH = document.getElementById('r-hasta');
  if(iD && iH && iD.value && iH.value) return {desde: iD.value, hasta: iH.value};
  return _rangoAtajo(periodoReporte || 'mes');   // por las dudas (ticket sin pasar por la pantalla)
}

// Contra que se compara el periodo elegido.
// Si arranca el 1 de un mes (o sea: es "el mes"), compara contra el MISMO tramo
// del mes anterior — del 1 al 12 de agosto contra del 1 al 12 de julio. Es lo
// que uno espera cuando mira "el mes". Para cualquier otro rango, contra la
// ventana del mismo largo que termina justo antes.
function _periodoAnterior(desde, hasta){
  const d1 = new Date(desde + 'T12:00:00'), d2 = new Date(hasta + 'T12:00:00');
  const dias = Math.max(1, Math.round((d2 - d1) / 86400000) + 1);

  if(d1.getDate() === 1){
    const ini = new Date(d1.getFullYear(), d1.getMonth() - 1, 1, 12);
    const ultimo = new Date(ini.getFullYear(), ini.getMonth() + 1, 0, 12).getDate();
    const fin = new Date(ini.getFullYear(), ini.getMonth(), Math.min(d2.getDate(), ultimo), 12);
    return {desde: _f(ini), hasta: _f(fin), dias: Math.round((fin - ini) / 86400000) + 1, mes: true};
  }
  const aHasta = new Date(d1); aHasta.setDate(aHasta.getDate() - 1);
  const aDesde = new Date(aHasta); aDesde.setDate(aDesde.getDate() - dias + 1);
  return {desde: _f(aDesde), hasta: _f(aHasta), dias};
}

function _diasEntre(desde, hasta){
  const out = [];
  const d = new Date(desde + 'T12:00:00'), fin = new Date(hasta + 'T12:00:00');
  let guarda = 0;
  while(d <= fin && guarda++ < 400){ out.push(_f(d)); d.setDate(d.getDate() + 1); }
  return out;
}

function _barra(val, max, color){
  const pct = max > 0 ? Math.round(val / max * 100) : 0;
  return `<div style="background:var(--gris-c);border-radius:6px;height:8px;margin-top:4px">
    <div style="background:${color};height:8px;border-radius:6px;width:${pct}%"></div></div>`;
}

function _costoDe(nombre){
  const p = (productos || []).find(z => _norm(z.nombre) === _norm(nombre));
  return p ? Number(p.precio_costo) || 0 : 0;
}
function _unidadProd(nombre){
  const p = (productos || []).find(z => _norm(z.nombre) === _norm(nombre));
  return p && p.unidad ? (p.unidad === 'unidad' ? 'un' : p.unidad) : '';
}
function _cantTxt(n, unidad){
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString('es-AR', {maximumFractionDigits: 2}) + (unidad ? ' ' + unidad : '');
}

// ------------------------------------------
// COMPARACION CON EL PERIODO ANTERIOR
// Sale DESPUES de pintar el reporte, en un request aparte: si tarda o falla,
// el reporte ya se ve igual. Es un extra, nunca bloquea la pantalla.
// ------------------------------------------
function _pintarCmp(id, act, ant, neutro){
  const el = document.getElementById(id);
  if(!el) return;
  act = Number(act) || 0; ant = Number(ant) || 0;
  if(Math.abs(ant) < 0.01){
    el.innerHTML = act !== 0 ? '<span style="color:var(--gris)">sin dato anterior</span>' : '';
    return;
  }
  const pct = Math.round((act - ant) / Math.abs(ant) * 100);
  if(pct === 0){ el.innerHTML = '<span style="color:var(--gris)">igual que antes</span>'; return; }
  const color = neutro ? 'var(--gris)' : (pct > 0 ? 'var(--verde-c)' : 'var(--rojo)');
  el.innerHTML = `<span style="color:${color};font-weight:700">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
}

async function _cargarComparacion(desde, hasta, actual, token){
  const p = _periodoAnterior(desde, hasta);
  const leyenda = document.getElementById('cmp-leyenda');
  try{
    const prev = await cargarReporteDatos(p.desde, p.hasta);
    if(token !== _repToken) return;             // el usuario ya cambio de periodo
    const g = actual.ganancia, gp = prev.ganancia;
    const gr  = (g.ganancia_real  !== undefined) ? g.ganancia_real  : g.ganancia;
    const grp = (gp.ganancia_real !== undefined) ? gp.ganancia_real : gp.ganancia;
    const prom  = Number(g.cantidad_ventas)  > 0 ? Number(g.total_ventas)  / Number(g.cantidad_ventas)  : 0;
    const promp = Number(gp.cantidad_ventas) > 0 ? Number(gp.total_ventas) / Number(gp.cantidad_ventas) : 0;
    _pintarCmp('cmp-ganancia', gr, grp);
    _pintarCmp('cmp-ventas',   g.total_ventas,  gp.total_ventas);
    _pintarCmp('cmp-compras',  g.total_compras, gp.total_compras, true);
    _pintarCmp('cmp-ticket',   prom, promp);
    if(leyenda) leyenda.textContent = (p.mes ? 'Comparado con el mismo tramo del mes anterior: ' : 'Comparado con ') +
      fmtFecha(p.desde) + ' al ' + fmtFecha(p.hasta);
  }catch(e){
    if(token !== _repToken) return;
    document.querySelectorAll('.cmp-slot').forEach(s => s.innerHTML = '');
    if(leyenda) leyenda.textContent = 'No se pudo traer el período anterior para comparar';
  }
}

// ------------------------------------------
// REPORTE
// ------------------------------------------
async function cargarReporte(){
  const {desde, hasta} = getFechas();
  if(!desde || !hasta) return;
  const token = ++_repToken;
  const cont = document.getElementById('cont-reporte');
  cont.innerHTML = skeleton(4);
  try{
    const r = await cargarReporteDatos(desde, hasta);
    if(token !== _repToken) return;
    cont.innerHTML = _htmlReporte(r, desde, hasta);
    _cargarComparacion(desde, hasta, r, token);
  }catch(e){
    if(token !== _repToken) return;
    cont.innerHTML = '<div class="vacio"><span class="ico">❌</span>' + e.message + '</div>';
  }
}

function _htmlReporte(r, desde, hasta){
  const g = r.ganancia, ventas = r.ventas || {pedidos: []}, compras = r.compras || {compras: []};
  const contactos = r.contactos || [];
  const pedidos = ventas.pedidos || [];

  const ticketPromedio = g.cantidad_ventas > 0 ? g.total_ventas / g.cantidad_ventas : 0;
  const pendienteCobro = contactos.filter(c => c.neto > 0).reduce((s, c) => s + c.neto, 0);
  const pendientePago  = contactos.filter(c => c.neto < 0).reduce((s, c) => s - c.neto, 0);
  const gananciaReal = (g.ganancia_real !== undefined) ? Number(g.ganancia_real) : Number(g.ganancia);
  const neg = gananciaReal < 0;
  const cogs = Number(g.costo_mercaderia || 0);
  const redondeo = Number(g.redondeo || 0);
  const hayDev = g.dev_a_proveedores > 0 || g.dev_de_clientes > 0;
  const margenPct = Number(g.ventas_netas) > 0 ? Math.round(gananciaReal / Number(g.ventas_netas) * 100) : 0;

  // --- Forma de pago ---
  const pagos = {};
  pedidos.forEach(p => { const k = p.forma_pago || 'otro'; pagos[k] = (pagos[k] || 0) + Number(p.total); });

  // --- Por producto: monto, cantidad, costo y margen ---
  const prod = {};
  pedidos.forEach(p => (p.items || []).forEach(it => {
    const k = it.producto || '—';
    if(!prod[k]) prod[k] = {monto: 0, cant: 0};
    prod[k].monto += Number(it.subtotal) || 0;
    prod[k].cant  += Number(it.cantidad) || 0;
  }));
  const prodList = Object.entries(prod).map(([nombre, v]) => {
    const costoU = _costoDe(nombre);
    const costo = costoU * v.cant;
    return {
      nombre, monto: v.monto, cant: v.cant, costo, sinCosto: costoU <= 0,
      ganancia: v.monto - costo,
      margen: v.monto > 0 ? (v.monto - costo) / v.monto * 100 : 0
    };
  });
  const porVendido = prodList.slice().sort((a, b) => b.monto - a.monto);
  const porGanancia = prodList.filter(p => !p.sinCosto).sort((a, b) => b.ganancia - a.ganancia);
  const sinCosto = prodList.filter(p => p.sinCosto).map(p => p.nombre);
  const maxVend = porVendido.length ? porVendido[0].monto : 0;

  // --- Ventas por dia (o por semana si el periodo es largo) ---
  const porFecha = {};
  pedidos.forEach(p => { const f = String(p.fecha || '').slice(0, 10); porFecha[f] = (porFecha[f] || 0) + Number(p.total); });
  const dias = _diasEntre(desde, hasta);
  let serie, agrupado = false;
  if(dias.length <= 45){
    serie = dias.map(f => ({f, label: f.slice(8, 10), total: porFecha[f] || 0}));
  }else{
    agrupado = true;
    const semanas = [];
    for(let i = 0; i < dias.length; i += 7){
      const bloque = dias.slice(i, i + 7);
      semanas.push({
        f: bloque[0],
        label: bloque[0].slice(8, 10) + '/' + bloque[0].slice(5, 7),
        total: bloque.reduce((s, d) => s + (porFecha[d] || 0), 0)
      });
    }
    serie = semanas;
  }
  const maxDia = serie.reduce((m, d) => Math.max(m, d.total), 0);
  const mejor = serie.reduce((m, d) => d.total > (m ? m.total : -1) ? d : m, null);
  const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const conVenta = serie.filter(d => d.total > 0).length;

  // --- Compras por proveedor ---
  const compProv = {};
  (compras.compras || []).forEach(c => { const k = c.proveedor || 'Sin proveedor'; compProv[k] = (compProv[k] || 0) + Number(c.total); });
  const compProvSorted = Object.entries(compProv).sort((a, b) => b[1] - a[1]);

  // --- Top clientes ---
  const topCli = {}, cantCli = {};
  pedidos.forEach(p => {
    const k = (p.cliente || '').toString().trim() || 'Consumidor final';
    topCli[k] = (topCli[k] || 0) + Number(p.total);
    cantCli[k] = (cantCli[k] || 0) + 1;
  });
  const topCliSorted = Object.entries(topCli).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return `
    <!-- RESULTADO -->
    <div class="rep-grid">
      <div class="rep-card grande">
        <div class="rt">Ganancia real del período <span style="font-size:10px">(ventas − costo de lo vendido)</span></div>
        <div class="rv ${neg ? 'rojo' : ''}">${$$(gananciaReal)}</div>
        <div class="cmp-slot" id="cmp-ganancia" style="font-size:12px;margin-top:2px"></div>
        <div style="font-size:11px;color:var(--gris);margin-top:4px">Ventas: ${$$(g.ventas_netas)} · Costo merc.: ${$$(cogs)} · Margen ${margenPct}%</div>
      </div>
      <div class="rep-card">
        <div class="rt">Ventas (${g.cantidad_ventas})</div>
        <div class="rv">${$$(g.total_ventas)}</div>
        <div class="cmp-slot" id="cmp-ventas" style="font-size:12px;margin-top:2px"></div>
      </div>
      <div class="rep-card">
        <div class="rt">Compras (${g.cantidad_compras})</div>
        <div class="rv rojo">${$$(g.total_compras)}</div>
        <div class="cmp-slot" id="cmp-compras" style="font-size:12px;margin-top:2px"></div>
      </div>
    </div>
    <div id="cmp-leyenda" style="font-size:11px;color:var(--gris);text-align:center;margin:-4px 0 12px">Buscando el período anterior…</div>

    ${(g.redondeo !== undefined) ? `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="card-titulo">Redondeo del período</div>
        <div style="font-size:11px;color:var(--gris)">Diferencia entre el precio de lista y lo que cobraste</div>
      </div>
      <div style="font-size:20px;font-weight:700;color:${redondeo < 0 ? 'var(--rojo)' : 'var(--verde-c)'}">${redondeo >= 0 ? '+' : '−'}${$$(Math.abs(redondeo))}</div>
    </div>` : ''}

    <!-- EVOLUCION DIA POR DIA -->
    ${serie.length > 1 ? `
    <div class="card">
      <div class="card-titulo">Ventas ${agrupado ? 'semana por semana' : 'día por día'}</div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:110px;margin:12px 0 6px">
        ${serie.map(d => {
          const alto = maxDia > 0 ? Math.max(2, Math.round(d.total / maxDia * 100)) : 2;
          const esMejor = mejor && d.f === mejor.f && d.total > 0;
          return `<div title="${fmtFecha(d.f)}: ${$$(d.total)}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%">
            <div style="height:${alto}%;background:${esMejor ? 'var(--amarillo)' : 'var(--azul-c)'};border-radius:3px 3px 0 0;min-height:2px;opacity:${d.total > 0 ? 1 : .25}"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:2px;font-size:9px;color:var(--gris)">
        ${serie.map((d, i) => `<div style="flex:1;text-align:center">${(serie.length <= 10 || i % Math.ceil(serie.length / 8) === 0) ? d.label : ''}</div>`).join('')}
      </div>
      <div class="sep" style="margin:10px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gris)">
        <span>${agrupado ? 'Semanas' : 'Días'} con venta: <strong style="color:var(--tinta,inherit)">${conVenta} de ${serie.length}</strong></span>
        ${mejor && mejor.total > 0 ? `<span>Mejor: <strong>${agrupado ? 'semana del ' + fmtFecha(mejor.f) : DIAS_SEM[new Date(mejor.f + 'T12:00:00').getDay()] + ' ' + mejor.label}</strong> · ${$$(mejor.total)}</span>` : ''}
      </div>
    </div>` : ''}

    <!-- PENDIENTE -->
    <div class="card">
      <div class="card-titulo">Pendiente (al día de hoy)</div>
      <div class="rep-grid" style="margin-top:10px">
        <div style="text-align:center">
          <div style="font-size:12px;color:var(--gris)">Pendiente de cobro</div>
          <div style="font-size:22px;font-weight:800;color:${pendienteCobro > 0 ? 'var(--rojo)' : 'var(--verde-c)'}">${pendienteCobro > 0 ? $$(pendienteCobro) : '✅ Al día'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:12px;color:var(--gris)">Pendiente de pago</div>
          <div style="font-size:22px;font-weight:800;color:${pendientePago > 0 ? 'var(--rojo)' : 'var(--verde-c)'}">${pendientePago > 0 ? $$(pendientePago) : '✅ Al día'}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--gris);text-align:center;margin-top:6px">Lo que te deben y lo que debés, total y actualizado</div>
    </div>

    <!-- TICKET PROMEDIO -->
    <div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="card-titulo" style="margin:0">Ticket promedio</div>
        <div class="cmp-slot" id="cmp-ticket" style="font-size:12px"></div>
      </div>
      <div style="font-size:20px;font-weight:800;color:var(--azul)">${ticketPromedio > 0 ? $$(Math.round(ticketPromedio)) : '—'}</div>
    </div>

    <!-- FORMA DE PAGO -->
    ${Object.keys(pagos).length ? `
    <div class="card">
      <div class="card-titulo">Ventas por forma de pago</div>
      ${Object.entries(pagos).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
        const pct = g.total_ventas > 0 ? Math.round(v / g.total_ventas * 100) : 0;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
          <span style="font-size:14px">${k}</span>
          <strong>${$$(v)} <span style="font-size:12px;color:var(--gris);font-weight:600">(${pct}%)</span></strong>
        </div>
        ${_barra(v, g.total_ventas, k === 'efectivo' ? 'var(--verde-c)' : k === 'transferencia' ? 'var(--azul-c)' : 'var(--amarillo)')}`;
      }).join('')}
    </div>` : ''}

    <!-- TOP PRODUCTOS (monto + cantidad) -->
    ${porVendido.length ? `
    <div class="card">
      <div class="card-titulo">Productos más vendidos</div>
      ${porVendido.slice(0, 6).map((p, i) => {
        const pct = g.total_ventas > 0 ? Math.round(p.monto / g.total_ventas * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
          <div style="font-size:16px;font-weight:700;color:var(--gris);width:20px">${i + 1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600">${p.nombre}</div>
            <div style="font-size:11px;color:var(--gris)">${_cantTxt(p.cant, _unidadProd(p.nombre))} vendidos</div>
            ${_barra(p.monto, maxVend, 'var(--verde-c)')}
          </div>
          <div style="text-align:right">
            <strong style="white-space:nowrap">${$$(p.monto)}</strong>
            <div style="font-size:11px;color:var(--gris)">${pct}% del total</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- MARGEN POR PRODUCTO -->
    ${porGanancia.length ? `
    <div class="card">
      <div class="card-titulo">Cuánto deja cada producto</div>
      <div style="font-size:11px;color:var(--gris);margin-bottom:8px">Vendido − costo, según el precio de costo cargado en Productos</div>
      ${porGanancia.slice(0, 8).map(p => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--borde)">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600">${p.nombre}</div>
            <div style="font-size:11px;color:var(--gris)">Vendió ${$$(p.monto)} · costó ${$$(Math.round(p.costo))}</div>
          </div>
          <div style="text-align:right">
            <strong style="white-space:nowrap;color:${p.ganancia >= 0 ? 'var(--verde-c)' : 'var(--rojo)'}">${$$(Math.round(p.ganancia))}</strong>
            <div style="font-size:11px;color:var(--gris)">${p.margen < -99 ? 'vendido bajo el costo' : Math.round(p.margen) + '% de margen'}</div>
          </div>
        </div>`).join('')}
      ${sinCosto.length ? `<div style="font-size:11px;color:var(--gris);margin-top:10px">
        Sin precio de costo cargado: <strong>${sinCosto.join(', ')}</strong>. Cargalo en Productos para verles el margen.
      </div>` : ''}
    </div>` : (sinCosto.length ? `
    <div class="card">
      <div class="card-titulo">Cuánto deja cada producto</div>
      <div style="font-size:13px;color:var(--gris)">Todavía no hay precios de costo cargados. Poné el costo de cada producto en la pantalla Productos y acá vas a ver cuánto deja cada uno.</div>
    </div>` : '')}

    <!-- TOP CLIENTES -->
    ${topCliSorted.length ? `
    <div class="card">
      <div class="card-titulo">Clientes que más compraron</div>
      ${topCliSorted.map(([cli, total], i) => {
        const pct = g.total_ventas > 0 ? Math.round(total / g.total_ventas * 100) : 0;
        const n = cantCli[cli] || 0;
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
          <div style="font-size:16px;font-weight:700;color:var(--gris);width:20px">${i + 1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600">${cli}</div>
            ${_barra(total, topCliSorted[0][1], 'var(--azul-c)')}
          </div>
          <div style="text-align:right">
            <strong style="white-space:nowrap">${$$(total)}</strong>
            <div style="font-size:11px;color:var(--gris)">${n} ${n === 1 ? 'compra' : 'compras'} · ${pct}%</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- COMPRAS POR PROVEEDOR -->
    ${compProvSorted.length ? `
    <div class="card">
      <div class="card-titulo">Compras por proveedor</div>
      ${compProvSorted.map(([prov, total]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
          <span style="font-size:14px">${prov}</span>
          <strong style="color:var(--rojo)">${$$(total)}</strong>
        </div>
        ${_barra(total, compProvSorted[0][1], 'var(--rojo)')}
      `).join('')}
    </div>` : ''}

    ${hayDev ? `
    <div class="card" style="background:var(--amarillo);color:#5a3d00">
      <div class="card-titulo" style="color:#5a3d00">Devoluciones del período</div>
      <div style="display:flex;justify-content:space-between;padding:4px 0">
        <span>A proveedores (resta deuda)</span><strong>${$$(g.dev_a_proveedores)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0">
        <span>De clientes (resta ingreso)</span><strong>${$$(g.dev_de_clientes)}</strong>
      </div>
    </div>` : ''}
  `;
}
