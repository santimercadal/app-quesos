// ==========================================
// INICIO
// ==========================================
async function cargarInicio(){
  try{
    const d = await apiGet('getVentasHoy');
    const lista=document.getElementById('ventas-hoy-lista');
    _pedidosHoy=d.pedidos||[];
    const hayVentas=d.pedidos&&d.pedidos.length>0;
    const hayAbonos=d.pagos_clientes&&d.pagos_clientes.length>0;
    if(!hayVentas&&!hayAbonos){
      lista.innerHTML='<div class="vacio"><span class="ico">🧀</span>Sin movimientos hoy todavía</div>';return;
    }

    const htmlVentas=hayVentas
      ? `<div style="font-size:12px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">🛒 Ventas</div>`+
        d.pedidos.map((p,idx)=>{
          const badge=p.forma_pago==='efectivo'?'badge-efectivo':p.forma_pago==='transferencia'?'badge-trans':'badge-credito';
          const deudaOriginal=Number(p.total)-Number(p.monto_pagado);
          return `<div class="item">
            <div class="item-head">
              <div class="item-info" style="flex:1">
                <div class="item-nombre">${p.cliente||'(sin nombre)'} <span class="badge ${badge}">${p.forma_pago}</span></div>
                <div class="item-det">${p.descripcion||''}</div>
                <div class="item-det" style="font-size:12px;color:var(--gris)">👤 ${p.operador||'—'}</div>
                ${deudaOriginal>0?`<div class="item-det" style="color:var(--rojo);font-size:12px">Pendiente: ${$$(deudaOriginal)}</div>`:'<div class="item-det" style="color:var(--verde-c);font-size:12px">✅ Pagado</div>'}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                <div class="item-val">${$$(p.total)}</div>
                <button class="btn btn-s btn-sm" onclick="abrirEdicionPedido(_pedidosHoy[${idx}])">Editar</button>
              </div>
            </div>
          </div>`;
        }).join('')
      : '';

    const htmlAbonos=hayAbonos
      ? `<div style="font-size:12px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">💰 Pagos recibidos</div>`+
        d.pagos_clientes.map(pago=>`
          <div class="item">
            <div class="item-head">
              <div class="item-info" style="flex:1">
                <div class="item-nombre">${escH(pago.cliente)}</div>
                <div class="item-det">${pago.nota||'Abono de deuda'}</div>
              </div>
              <div class="item-val" style="color:var(--verde-c)">+${$$(pago.monto)}</div>
            </div>
          </div>`).join('')
      : '';

    lista.innerHTML=htmlVentas+htmlAbonos;
  }catch(e){
    const l=document.getElementById('ventas-hoy-lista');
    if(l) l.innerHTML='<div class="vacio"><span class="ico">❌</span>Sin conexión · '+e.message+'</div>';
  }
}

// ==========================================
// CARRITO DE VENTA
// ==========================================
async function cargarDatosVenta(){
  document.getElementById('v-fecha').value=hoy();
  try{
    productos=await apiGetCached('getProductos');
    clientesCache=await apiGetCached('getClientes');
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
    renderPreciosInicio();
  }catch(e){toast('Error cargando datos: '+e.message,'error');}
  if(carrito.length===0){carrito=[{producto:'',precio_unitario:0,unidad:'kg',kg:'',monto:''}];}
  renderCarrito();
}

function renderPreciosInicio() {
  const cont = document.getElementById('lista-precios-inicio');
  if (!cont || !productos.length) return;
  cont.innerHTML = productos.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--blanco);border-radius:var(--radio);margin-bottom:6px;box-shadow:var(--sombra)">
      <div>
        <div style="font-weight:600;font-size:14px">${escH(p.nombre)}</div>
        <div style="font-size:12px;color:var(--gris)">${p.unidad}</div>
      </div>
      <div style="font-size:18px;font-weight:700;color:var(--azul)">${$$(p.precio)}</div>
    </div>`).join('');
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
              ${productos.map(p=>`<option value="${p.nombre}" data-precio="${p.precio}" data-unidad="${p.unidad}" ${item.producto===p.nombre?'selected':''}>${p.nombre}</option>`).join('')}
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
        <button onclick="quitarDelCarrito(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
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

function alCambiarPagoVenta(){
  const pago=document.getElementById('v-pago').value;
  const total=carrito.reduce((s,i)=>s+(Number(i.monto)||0),0);
  if(pago!=='crédito') document.getElementById('v-pagado').value=total>0?Math.round(total):'';
  else document.getElementById('v-pagado').value='';
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
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee">
      <span>${i.producto} <span style="color:var(--gris);font-size:12px">(${Number(i.kg)} ${i.unidad})</span></span>
      <strong>${$$(i.monto)}</strong>
    </div>`
  ).join('');
  document.getElementById('conf-total').textContent=$$(total);
  document.getElementById('conf-pagado').textContent=$$(pagado);
  const resta=total-pagado;
  document.getElementById('conf-resta').textContent=resta>0?$$(resta)+' queda debiendo':'Pagado completo ✅';
  document.getElementById('conf-resta').style.color=resta>0?'var(--rojo)':'var(--verde-c)';
  document.getElementById('conf-cliente').textContent=cliente||'(sin nombre)';
  document.getElementById('conf-pago').textContent=pago;
  document.getElementById('modal-confirmar').classList.add('visible');
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
    subtotal:Number(i.monto)
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
  document.getElementById('modal-editar-pedido').classList.add('visible');
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
              ${productos.map(p=>`<option value="${p.nombre}" data-precio="${p.precio}" data-unidad="${p.unidad}" ${item.producto===p.nombre?'selected':''}>${p.nombre}</option>`).join('')}
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
    cargarInicio();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Guardar cambios';}
}

