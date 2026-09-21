// ==========================================
// INICIO (feed: ventas + compras + pagos del día)
// ==========================================
// Pinta al instante con el movimiento del día que quedó guardado y lo corrige
// cuando llega lo fresco. Después de guardar una venta el caché queda marcado
// como vencido, así que ahí sí espera: nunca se muestra un total desactualizado
// como si fuera bueno.
async function cargarInicio(){
  const cont=document.getElementById('ventas-hoy-lista');
  const previo=cacheInicio();
  if(previo) _pintarInicio(previo.ventas, previo.compras);
  else if(cont) cont.innerHTML=skeleton(2);
  try{
    const dat=await cargarInicioDatos();
    _pintarInicio(dat.ventas, dat.compras);
  }catch(e){
    const l=document.getElementById('ventas-hoy-lista');
    if(!previo){
      if(l) l.innerHTML='<div class="vacio"><span class="ico">❌</span>Sin conexión · '+e.message+'</div>';
    }else{
      // Hay algo en pantalla, pero es de la última vez: hay que decirlo.
      toast('Sin conexión · mostrando lo último guardado','error');
    }
  }
}

function _pintarInicio(d, rc){
  try{
    const lista=document.getElementById('ventas-hoy-lista');
    if(!lista) return;
    d=d||{}; rc=rc||{compras:[]};
    _pedidosHoy=d.pedidos||[];
    _comprasHoy=(rc.compras||[]).slice().reverse();
    const hayVentas=d.pedidos&&d.pedidos.length>0;
    const hayAbonos=d.pagos_clientes&&d.pagos_clientes.length>0;
    const hayCompras=_comprasHoy.length>0;
    // Contador operativo de ventas del día (sin montos, por decisión de diseño)
    const mc=document.getElementById('mov-count');
    if(mc) mc.textContent = hayVentas ? (d.pedidos.length+(d.pedidos.length===1?' venta hoy':' ventas hoy')) : '';
    if(!hayVentas&&!hayAbonos&&!hayCompras){
      lista.innerHTML='<div class="vacio"><span class="ico">🧀</span>Sin movimientos hoy todavía</div>';return;
    }

    const htmlVentas=hayVentas
      ? d.pedidos.map((p,idx)=>{
          const badge=p.forma_pago==='efectivo'?'badge-efectivo':p.forma_pago==='transferencia'?'badge-trans':'badge-credito';
          const deudaOriginal=Number(p.total)-Number(p.monto_pagado);
          return `<div class="venta-row">
            <div class="avatar">${esc(iniciales(p.cliente))}</div>
            <div class="venta-main">
              <div class="item-nombre">${esc(p.cliente||'(sin nombre)')}</div>
              <div style="margin:3px 0"><span class="badge ${badge}">${esc(p.forma_pago)}</span> <span class="item-det">${esc(p.descripcion||'')}</span></div>
              ${deudaOriginal>0?`<div class="item-det" style="color:var(--rojo);font-size:12px">Pendiente: ${$$(deudaOriginal)}</div>`:`<div class="item-det" style="color:var(--verde-c);font-size:12px">Pagado</div>`}
              <div class="item-det" style="font-size:12px;color:var(--gris);display:flex;align-items:center;gap:4px">${svgIcon('user',13)} ${esc(p.operador||'—')}</div>
            </div>
            <div class="venta-right">
              <div class="item-val">${$$(p.total)}</div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-s btn-sm btn-ico" aria-label="Ticket de venta" onclick="ticketVenta(_pedidosHoy[${idx}])">${svgIcon('ticket',16)}</button>
                <button class="btn btn-s btn-sm" onclick="abrirEdicionPedido(_pedidosHoy[${idx}])">${svgIcon('edit',15)} Editar</button>
              </div>
            </div>
          </div>`;
        }).join('')
      : '';

    const htmlCompras=hayCompras
      ? `<div style="font-size:12px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;display:inline-flex;align-items:center;gap:6px">${svgIcon('package',14)} Compras</div>`+
        _comprasHoy.map((c,idx)=>{
          const badge=c.forma_pago==='efectivo'?'badge-efectivo':c.forma_pago==='transferencia'?'badge-trans':'badge-credito';
          const deuda=Number(c.total)-Number(c.monto_pagado);
          const itemsTxt=(c.items||[]).map(it=>esc(it.producto_insumo)+' ('+esc(it.cantidad)+')').join(', ');
          return `<div class="item">
            <div class="item-head">
              <div class="item-info" style="flex:1">
                <div class="item-nombre">${esc(c.proveedor||'(sin proveedor)')} <span class="badge ${badge}">${esc(c.forma_pago||'')}</span></div>
                <div class="item-det">${itemsTxt}</div>
                ${deuda>0?`<div class="item-det" style="color:var(--rojo);font-size:12px">Pendiente: ${$$(deuda)}</div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">Pagado</div>'}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                <div class="item-val" style="color:var(--rojo)">−${$$(c.total)}</div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-s btn-sm btn-ico" aria-label="Ticket de compra" onclick="ticketCompra(_comprasHoy[${idx}])">${svgIcon('ticket',16)}</button>
                  <button class="btn btn-s btn-sm" onclick="abrirEdicionCompraObj(_comprasHoy[${idx}])">${svgIcon('edit',15)} Editar</button>
                </div>
              </div>
            </div>
          </div>`;
        }).join('')
      : '';

    const htmlAbonos=hayAbonos
      ? `<div style="font-size:12px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;display:inline-flex;align-items:center;gap:6px">${svgIcon('dollar',14)} Pagos recibidos</div>`+
        d.pagos_clientes.map(pago=>`
          <div class="item">
            <div class="item-head">
              <div class="item-info" style="flex:1">
                <div class="item-nombre">${esc(pago.cliente)}</div>
                <div class="item-det">${esc(pago.nota||'Abono de deuda')}</div>
              </div>
              <div class="item-val" style="color:var(--verde-c)">+${$$(pago.monto)}</div>
            </div>
          </div>`).join('')
      : '';

    lista.innerHTML=htmlVentas+htmlCompras+htmlAbonos;
  }catch(e){ console.error('pintarInicio:', e); }
}

// ==========================================
// CARRITO DE VENTA
// ==========================================
// El formulario se dibuja ya con los productos que tenemos y recién después se
// pregunta al servidor. Productos y clientes van en paralelo, no en fila: eran
// 5,1 s uno atrás del otro contra 1,9 s juntos.
async function cargarDatosVenta(){
  document.getElementById('v-fecha').value=hoy();
  if(carrito.length===0){carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];}
  renderCarrito();
  const firma = p => JSON.stringify((p||[]).map(x=>[x.nombre,x.precio,x.unidad]));
  const antes = firma(productos);
  try{
    const [prods, clis] = await Promise.all([
      apiGetCached('getProductos'),
      apiGetCached('getClientes')
    ]);
    productos=prods; clientesCache=clis;
    _pintarDatalistClientes();
    renderClientesRapidos();
    renderPreciosInicio();
    // Redibujar el carrito solo si la lista de productos cambió de verdad:
    // si no, le robaríamos el foco a quien esté tipeando el peso.
    if(firma(prods)!==antes) renderCarrito();
  }catch(e){
    if(!productos.length) toast('Error cargando datos: '+e.message,'error');
  }
}

function renderPreciosInicio() {
  const cont = document.getElementById('lista-precios-inicio');
  if (!cont || !productos.length) return;
  // La lista de pantalla y la que se comparte tienen que decir lo mismo: antes la
  // leyenda prometia "solo con stock" y abajo se listaba todo, Pollero incluido.
  // Ahora se ocultan las anotaciones internas y se marca cual no va a salir.
  const visibles = productos.filter(p => !_ocultoEnPrecios(p.nombre));
  const conStock = visibles.filter(p => Number(p.stock) > 0).length;
  cont.innerHTML = `
    <button class="btn btn-s" onclick="ticketListaPrecios()" style="margin-bottom:6px">${svgIcon('share',15)} Compartir lista de precios</button>
    <div style="font-size:11px;color:var(--gris);text-align:center;margin-bottom:10px">Se comparten los ${conStock} productos con stock cargado. Los que están sin stock se ven acá pero no salen en la lista.</div>
  ` + visibles.map(p => {
    const sinStock = !(Number(p.stock) > 0);
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--blanco);border-radius:var(--radio);margin-bottom:6px;box-shadow:var(--sombra);opacity:${sinStock ? .55 : 1}">
      <div>
        <div style="font-weight:600;font-size:14px">${esc(p.nombre)}</div>
        <div style="font-size:12px;color:var(--gris)">${esc(p.unidad)}${sinStock ? ' · sin stock, no se comparte' : ''}</div>
      </div>
      <div style="font-size:18px;font-weight:700;color:var(--azul)">${$$(p.precio)}</div>
    </div>`;
  }).join('');
}

function togglePrecios() {
  const cont = document.getElementById('lista-precios-inicio');
  const arrow = document.getElementById('arrow-precios');
  const abierto = cont.style.display !== 'none';
  cont.style.display = abierto ? 'none' : 'block';
  arrow.style.transform = abierto ? '' : 'rotate(180deg)';
}

function agregarItemCarrito(){
  carrito.push({producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''});
  renderCarrito();
}

function quitarDelCarrito(i){
  if(carrito.length===1){toast('El pedido debe tener al menos un producto','error');return;}
  carrito.splice(i,1);
  renderCarrito();
}

function _hintVenta(item){
  const precio=Number(item.precio_unitario)||0, kg=Number(item.kg)||0, monto=Number(item.monto)||0;
  if(!(precio>0&&kg>0)) return '';
  const lista=Math.round(kg*precio);
  const red=monto-lista;
  let txt='Precio lista: '+$$(lista);
  if(monto>0&&red!==0) txt+=' · Redondeo: '+(red>0?'+':'−')+$$(Math.abs(red));
  return txt;
}

function renderCarrito(){
  const el=document.getElementById('carrito-items');
  el.innerHTML=carrito.map((item,i)=>{
    const unidLabel=item.unidad==='unidad'?'Cantidad (unid)':'Peso (kg)';
    return `
    <div class="carrito-item">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div class="campo" style="margin-bottom:8px">
            <label>Producto</label>
            <select onchange="alElegirProdCarrito(${i},this)">
              <option value="">Elegí un producto</option>
              ${productos.map(p=>`<option value="${esc(p.nombre)}" data-precio="${esc(p.precio)}" data-unidad="${esc(p.unidad)}" ${item.producto===p.nombre?'selected':''}>${esc(p.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="fila" style="gap:8px">
            <div class="campo" style="margin-bottom:0">
              <label>${unidLabel}</label>
              <input type="number" id="kg-${i}" value="${item.kg}" placeholder="0" min="0" step="0.01"
                oninput="alCambiarKgCarrito(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
            <div class="campo" style="margin-bottom:0">
              <label>Monto a cobrar ($)</label>
              <input type="number" id="monto-${i}" value="${item.monto}" placeholder="0" min="0" step="1"
                oninput="alCambiarMontoVenta(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
          </div>
          <div class="hint" id="hint-${i}">${_hintVenta(item)}</div>
        </div>
        <button onclick="quitarDelCarrito(${i})" aria-label="Quitar producto" style="background:none;border:none;cursor:pointer;color:var(--gris);padding:6px 0 0;line-height:1">${svgIcon('trash',18)}</button>
      </div>
    </div>`;
  }).join('');
  actualizarTotalCarrito();
}

function alElegirProdCarrito(i,sel){
  const opt=sel.options[sel.selectedIndex];
  carrito[i].producto=sel.value;
  carrito[i].precio_unitario=Number(opt.dataset.precio)||0;
  carrito[i].unidad=opt.dataset.unidad||'kg';
  if(carrito[i].precio_unitario>0&&Number(carrito[i].kg)>0) carrito[i].monto=Math.round(Number(carrito[i].kg)*carrito[i].precio_unitario);
  renderCarrito();
}

function alCambiarKgCarrito(i,val){
  carrito[i].kg=val;
  if(carrito[i].precio_unitario>0&&Number(val)>0){
    carrito[i].monto=Math.round(Number(val)*carrito[i].precio_unitario);
    const mi=document.getElementById('monto-'+i); if(mi) mi.value=carrito[i].monto;
  }
  const hi=document.getElementById('hint-'+i); if(hi) hi.textContent=_hintVenta(carrito[i]);
  actualizarTotalCarrito();
}

function alCambiarMontoVenta(i,val){
  carrito[i].monto=val;
  const hi=document.getElementById('hint-'+i); if(hi) hi.textContent=_hintVenta(carrito[i]);
  actualizarTotalCarrito();
}

function actualizarTotalCarrito(){
  const total=carrito.reduce((s,i)=>s+(Number(i.monto)||0),0);
  document.getElementById('v-total-display').textContent=$$(total);
  alCambiarPagoVenta();
}

// `desdeSelect` es true solo cuando el usuario toca el desplegable de forma de
// pago. Antes esta funcion tambien corria desde actualizarTotalCarrito(), o sea
// en cada tecla del importe: si la venta era a credito y ya habias anotado una
// seña, corregir el importe del producto te borraba la seña.
function alCambiarPagoVenta(desdeSelect){
  const pago=document.getElementById('v-pago').value;
  const total=carrito.reduce((s,i)=>s+(Number(i.monto)||0),0);
  const campo=document.getElementById('v-pagado');
  if(pago!=='crédito') campo.value=total>0?Math.round(total):'';
  else if(desdeSelect) campo.value='';
}

// Forma de pago como tarjetas (el valor vive en el input oculto #v-pago)
function setPagoVenta(v){
  const inp=document.getElementById('v-pago'); if(!inp) return;
  inp.value=v;
  document.querySelectorAll('#pantalla-venta .pay-opt').forEach(b=>b.classList.toggle('activo', b.dataset.v===v));
  alCambiarPagoVenta(true);
}

// Banda deslizante de clientes frecuentes (acceso directo)
function renderClientesRapidos(){
  const cont=document.getElementById('v-clientes-rapidos');
  if(!cont) return;
  const lista=(clientesCache||[]).slice(0,15);
  cont.innerHTML=lista.map(c=>{
    const n=nombreCompleto(c);
    return `<button type="button" class="chip-cli" onclick="elegirClienteRapido('${escJS(n)}')">${esc(n)}</button>`;
  }).join('');
}

function elegirClienteRapido(nombre){
  const inp=document.getElementById('v-cliente');
  if(inp) inp.value=nombre;
  document.querySelectorAll('#v-clientes-rapidos .chip-cli').forEach(b=>b.classList.toggle('activo', b.textContent===nombre));
}

function abrirConfirmacion(){
  if(carrito.length===0){toast('Agregá al menos un producto','error');return;}
  if(carrito.some(i=>!i.producto||!(Number(i.kg)>0)||!(Number(i.monto)>0))){toast('Completá producto, kg y monto de cada renglón','error');return;}
  const total=carrito.reduce((s,i)=>s+Number(i.monto),0);
  const pagado=parseFloat(document.getElementById('v-pagado').value)||0;
  const pago=document.getElementById('v-pago').value;
  const cliente=document.getElementById('v-cliente').value.trim();
  if(pagado>total){toast('El monto pagado no puede superar el total','error');return;}
  if(pago==='crédito'&&!cliente){toast('Para ventas a crédito el cliente es obligatorio','error');return;}
  document.getElementById('conf-items').innerHTML=carrito.map(i=>
    `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--borde)">
      <span>${esc(i.producto)} <span style="color:var(--gris);font-size:12px">(${Number(i.kg)} ${esc(i.unidad)})</span></span>
      <strong>${$$(i.monto)}</strong>
    </div>`
  ).join('');
  document.getElementById('conf-total').textContent=$$(total);
  document.getElementById('conf-pagado').textContent=$$(pagado);
  const resta=total-pagado;
  document.getElementById('conf-resta').textContent=resta>0?$$(resta)+' queda debiendo':'Pagado completo';
  document.getElementById('conf-resta').style.color=resta>0?'var(--rojo)':'var(--verde-c)';
  document.getElementById('conf-cliente').textContent=cliente||'(sin nombre)';
  document.getElementById('conf-pago').textContent=pago;
  abrirModal('modal-confirmar');
}

async function guardarVenta(){
  const btn=document.getElementById('btn-confirmar-venta');
  const total=carrito.reduce((s,i)=>s+Number(i.monto),0);
  const monto_pagado=parseFloat(document.getElementById('v-pagado').value)||0;
  const forma_pago=document.getElementById('v-pago').value;
  const cliente=document.getElementById('v-cliente').value.trim();
  const fecha=document.getElementById('v-fecha').value||hoy();
  const items=carrito.map(i=>({
    producto:i.producto,
    cantidad:Number(i.kg)||0,
    precio_unitario:i.precio_unitario,
    subtotal:Number(i.monto),
    unidad:i.unidad
  }));
  const descripcion=carrito.map(i=>i.producto+' ('+(Number(i.kg)||0)+' '+i.unidad+')').join(', ');

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  try{
    await apiPost('registrarPedido',{fecha,cliente,forma_pago,monto_pagado,total,descripcion,items,operador:operadorActual});
    cerrarModal('modal-confirmar');
    toast('✅ Pedido guardado','exito');
    carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];
    document.getElementById('v-cliente').value='';
    document.getElementById('v-pago').value='efectivo';
    document.getElementById('v-pagado').value='';
    document.getElementById('v-fecha').value=hoy();
    irA('inicio');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Confirmar y guardar';}
}

// ==========================================
// EDITAR PEDIDO
// ==========================================
async function abrirEdicionPedido(p){
  pedidoEnEdicion=p;
  document.getElementById('edit-pedido-id').value=p.pedido_id;
  document.getElementById('edit-cliente').value=p.cliente||'';
  document.getElementById('edit-pago').value=p.forma_pago||'efectivo';
  document.getElementById('edit-pagado').value=p.monto_pagado;
  document.getElementById('edit-fecha').value=p.fecha;
  // Asegurar lista de productos para los selects
  if(!productos.length){ try{ productos=await apiGetCached('getProductos'); }catch(e){} }
  carritoEdit=(p.items||[]).map(it=>{
    const prod=productos.find(x=>x.nombre===it.producto);
    return {
      producto:it.producto,
      precio_unitario:Number(it.precio_unitario)||(prod?Number(prod.precio):0)||0,
      unidad:(prod&&prod.unidad)||it.unidad||'kg',
      kg:Number(it.cantidad)||'',
      monto:Number(it.subtotal)||''
    };
  });
  if(!carritoEdit.length) carritoEdit=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];
  renderCarritoEdit();
  abrirModal('modal-editar-pedido');
}

function renderCarritoEdit(){
  const el=document.getElementById('edit-items-lista');
  el.innerHTML=carritoEdit.map((item,i)=>{
    const unidLabel=item.unidad==='unidad'?'Cantidad (unid)':'Peso (kg)';
    return `
    <div class="carrito-item">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div class="campo" style="margin-bottom:8px">
            <label>Producto</label>
            <select onchange="alElegirProdEdit(${i},this)">
              <option value="">Elegí un producto</option>
              ${productos.map(p=>`<option value="${esc(p.nombre)}" data-precio="${esc(p.precio)}" data-unidad="${esc(p.unidad)}" ${item.producto===p.nombre?'selected':''}>${esc(p.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="fila" style="gap:8px">
            <div class="campo" style="margin-bottom:0">
              <label>${unidLabel}</label>
              <input type="number" id="ekg-${i}" value="${item.kg}" placeholder="0" min="0" step="0.01" oninput="alCambiarKgEdit(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
            <div class="campo" style="margin-bottom:0">
              <label>Monto ($)</label>
              <input type="number" id="emonto-${i}" value="${item.monto}" placeholder="0" min="0" step="1" oninput="alCambiarMontoEdit(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
          </div>
          <div class="hint" id="ehint-${i}">${_hintVenta(item)}</div>
        </div>
        <button onclick="quitarItemEdit(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>`;
  }).join('')
    + `<button class="btn btn-s" onclick="agregarItemEdit()" style="margin-bottom:6px">+ Agregar producto</button>`;
}

function alElegirProdEdit(i,sel){
  const opt=sel.options[sel.selectedIndex];
  carritoEdit[i].producto=sel.value;
  carritoEdit[i].precio_unitario=Number(opt.dataset.precio)||0;
  carritoEdit[i].unidad=opt.dataset.unidad||'kg';
  if(carritoEdit[i].precio_unitario>0&&Number(carritoEdit[i].kg)>0) carritoEdit[i].monto=Math.round(Number(carritoEdit[i].kg)*carritoEdit[i].precio_unitario);
  renderCarritoEdit();
}

function alCambiarKgEdit(i,val){
  carritoEdit[i].kg=val;
  if(carritoEdit[i].precio_unitario>0&&Number(val)>0){
    carritoEdit[i].monto=Math.round(Number(val)*carritoEdit[i].precio_unitario);
    const mi=document.getElementById('emonto-'+i); if(mi) mi.value=carritoEdit[i].monto;
  }
  const hi=document.getElementById('ehint-'+i); if(hi) hi.textContent=_hintVenta(carritoEdit[i]);
}

function alCambiarMontoEdit(i,val){
  carritoEdit[i].monto=val;
  const hi=document.getElementById('ehint-'+i); if(hi) hi.textContent=_hintVenta(carritoEdit[i]);
}

function agregarItemEdit(){
  carritoEdit.push({producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''});
  renderCarritoEdit();
}

function quitarItemEdit(i){
  if(carritoEdit.length===1){toast('El pedido debe tener al menos un producto','error');return;}
  carritoEdit.splice(i,1);
  renderCarritoEdit();
}

async function confirmarEdicion(){
  const btn=document.getElementById('btn-guardar-edicion');
  const pedido_id=document.getElementById('edit-pedido-id').value;
  const cliente=document.getElementById('edit-cliente').value.trim();
  const forma_pago=document.getElementById('edit-pago').value;
  const monto_pagado=parseFloat(document.getElementById('edit-pagado').value)||0;
  const fecha=document.getElementById('edit-fecha').value;
  if(carritoEdit.some(it=>!it.producto||!(Number(it.kg)>0)||!(Number(it.monto)>0))){toast('Completá producto, kg y monto de cada renglón','error');return;}
  const total=carritoEdit.reduce((s,it)=>s+Number(it.monto),0);
  if(monto_pagado>total){toast('El monto pagado no puede superar el total','error');return;}
  if(forma_pago==='crédito'&&!cliente){toast('Para ventas a crédito el cliente es obligatorio','error');return;}
  const items=carritoEdit.map(it=>({
    producto:it.producto,
    cantidad:Number(it.kg)||0,
    precio_unitario:it.precio_unitario,
    subtotal:Number(it.monto),
    unidad:it.unidad
  }));

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  toast('Guardando...','guardando');
  try{
    await apiPost('editarPedido',{pedido_id,cliente,forma_pago,monto_pagado,fecha,items});
    cerrarModal('modal-editar-pedido');
    ocultarToast();
    toast('✅ Pedido actualizado','exito');
    _refrescarPantallaActiva();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Guardar cambios';}
}

