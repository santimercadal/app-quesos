// ==========================================
// COMPRA
// ==========================================
async function cargarDatosCompra(){
  document.getElementById('c-fecha').value=hoy();
  try{
    const [prods, provs]=await Promise.all([apiGetCached('getProductos'),apiGetCached('getProveedores')]);
    productosCompraCache = prods;
    // Llenar datalist de productos (texto libre + autocomplete)
    document.getElementById('lista-productos-compra').innerHTML=
      prods.map(p=>`<option value="${escH(p.nombre)}">`).join('');
    // Llenar select de proveedores
    const selProv=document.getElementById('c-proveedor');
    selProv.innerHTML='<option value="">Sin proveedor</option>'+
      provs.map(p=>`<option value="${escH(p.nombre)}">${p.nombre}${p.contacto?' · '+p.contacto:''}</option>`).join('');
  }catch(e){}
  if(!compraCarrito.length) compraCarrito=[{producto:'',cantidad:'',total:''}];
  renderCompraItems();
  cargarHistorialCompras();
}

async function cargarHistorialCompras(){
  const lista=document.getElementById('hist-compras-lista');
  if(!lista) return;
  lista.innerHTML=skeleton();
  try{
    const r=await apiGet('getCompras',{desde:'2000-01-01',hasta:'2099-12-31'});
    const compras=(r.compras||[]).slice().reverse().slice(0,15);
    _histCompras=compras;
    if(!compras.length){lista.innerHTML='<div class="vacio"><span class="ico">📦</span>Sin compras registradas</div>';return;}
    lista.innerHTML=compras.map((c,i)=>{
      const deuda=Number(c.total)-Number(c.monto_pagado);
      const badge=c.forma_pago==='efectivo'?'badge-efectivo':c.forma_pago==='transferencia'?'badge-trans':'badge-credito';
      const itemsTxt=(c.items||[]).map(it=>escH(it.producto_insumo)+' ('+it.cantidad+')').join(', ');
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${escH(c.proveedor)} <span class="badge ${badge}">${c.forma_pago||''}</span></div>
            <div class="item-det">${itemsTxt} · ${fmtFecha(c.fecha)}</div>
            ${deuda>0?`<div class="item-det" style="color:var(--rojo)">Pendiente: ${$$(deuda)}</div>`:''}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-s btn-sm" onclick="abrirEdicionCompra(${i})">✏️ Editar</button>
              <button class="btn btn-s btn-sm" onclick="abrirModalDevolucion('${escH(c.compra_id||c.id)}','proveedor')">↩️ Devolver</button>
            </div>
          </div>
          <div class="item-val">${$$(c.total)}</div>
        </div>
      </div>`;
    }).join('');
  }catch(e){lista.innerHTML='<div class="vacio"><span class="ico">❌</span>Error al cargar</div>';}
}

function _prodCat(nombre){
  const n=(nombre||'').toString().trim().toLowerCase();
  return (productosCompraCache||[]).find(p=>p.nombre.toLowerCase()===n)||null;
}

function _hintCompra(i){
  const item=compraCarrito[i]; if(!item) return '';
  const cant=Number(item.cantidad)||0, total=Number(item.total)||0;
  const costo= cant>0&&total>0? total/cant : 0;
  const cat=_prodCat(item.producto);
  const unid= cat? cat.unidad : 'u';
  let hint = costo>0 ? ('Costo: $'+costo.toFixed(2)+'/'+unid) : '';
  if(cat && cat.precio_costo!==undefined && cat.precio_costo!=='') hint += (hint?' · ':'') + 'catálogo $'+Number(cat.precio_costo);
  const mostrar = cat && costo>0 && Math.abs(costo-Number(cat.precio_costo||0))>=1;
  if(mostrar) hint += ` <button class="btn btn-s btn-sm" style="padding:2px 8px;font-size:11px" onclick="actualizarCostoLinea(${i})">Actualizar costo</button>`;
  return hint;
}

function renderCompraItems(){
  const el=document.getElementById('compra-items'); if(!el) return;
  el.innerHTML=compraCarrito.map((item,i)=>`
    <div class="carrito-item">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div class="campo" style="margin-bottom:8px">
            <label>Producto / Insumo</label>
            <input type="text" list="lista-productos-compra" value="${escH(item.producto)}" placeholder="Ej: Mozzarella, leche cruda..." autocomplete="off" oninput="alCambiarProdCompra(${i},this.value)"/>
          </div>
          <div class="fila" style="gap:8px">
            <div class="campo" style="margin-bottom:0">
              <label>Peso / Cantidad</label>
              <input type="number" id="cqty-${i}" value="${item.cantidad}" min="0" step="0.01" placeholder="0" oninput="alCambiarCantCompra(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
            <div class="campo" style="margin-bottom:0">
              <label>Precio total ($)</label>
              <input type="number" id="ctot-${i}" value="${item.total}" min="0" step="1" placeholder="0" oninput="alCambiarTotalCompra(${i},this.value)" style="font-size:18px;font-weight:600"/>
            </div>
          </div>
          <div class="hint gris" id="chint-${i}">${_hintCompra(i)}</div>
        </div>
        <button onclick="quitarItemCompra(${i})" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--rojo);padding:24px 0 0;line-height:1">×</button>
      </div>
    </div>`).join('');
  actualizarTotalCompra();
}

function agregarItemCompra(){ compraCarrito.push({producto:'',cantidad:'',total:''}); renderCompraItems(); }
function quitarItemCompra(i){ if(compraCarrito.length===1){toast('La compra debe tener al menos un producto','error');return;} compraCarrito.splice(i,1); renderCompraItems(); }

function alCambiarProdCompra(i,val){
  compraCarrito[i].producto=val;
  const cat=_prodCat(val);
  if(cat&&cat.proveedor){
    const selProv=document.getElementById('c-proveedor');
    for(let k=0;k<selProv.options.length;k++){ if(selProv.options[k].value===cat.proveedor){ selProv.selectedIndex=k; break; } }
    document.getElementById('c-prov-hint').textContent='Pre-llenado desde el producto';
  }
  const hi=document.getElementById('chint-'+i); if(hi) hi.innerHTML=_hintCompra(i);
}
function alCambiarCantCompra(i,val){
  compraCarrito[i].cantidad=val;
  const hi=document.getElementById('chint-'+i); if(hi) hi.innerHTML=_hintCompra(i);
}
function alCambiarTotalCompra(i,val){
  compraCarrito[i].total=val;
  const hi=document.getElementById('chint-'+i); if(hi) hi.innerHTML=_hintCompra(i);
  actualizarTotalCompra();
}
function actualizarTotalCompra(){
  const total=compraCarrito.reduce((s,i)=>s+(Number(i.total)||0),0);
  const el=document.getElementById('c-total-display'); if(el) el.textContent=$$(total);
  alCambiarPagoCompra();
}

async function actualizarCostoLinea(i){
  const item=compraCarrito[i]; const cat=_prodCat(item&&item.producto);
  if(!cat) return;
  const cant=Number(item.cantidad)||0, total=Number(item.total)||0;
  const costo=cant>0?total/cant:0;
  if(!(costo>0)) return;
  toast('Actualizando costo...','guardando');
  try{
    await apiPost('editarProducto',{nombre:cat.nombre, precio:Number(cat.precio), unidad:cat.unidad, precio_costo:Math.round(costo), proveedor:cat.proveedor||''});
    productosCompraCache=await apiGetCached('getProductos'); productos=productosCompraCache;
    renderCompraItems();
    ocultarToast(); toast('✅ Costo de '+cat.nombre+' actualizado','exito');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

function alCambiarPagoCompra(){
  const pago=document.getElementById('c-pago').value;
  const total=compraCarrito.reduce((s,i)=>s+(Number(i.total)||0),0);
  if(pago!=='crédito') document.getElementById('c-pagado').value=total>0?Math.round(total):'';
}

// Abre modal de confirmación antes de guardar
function abrirConfirmacionCompra(){
  const proveedor=document.getElementById('c-proveedor').value;
  const forma_pago=document.getElementById('c-pago').value;
  const monto_pagado=parseFloat(document.getElementById('c-pagado').value)||0;
  const fecha=document.getElementById('c-fecha').value||hoy();
  if(!proveedor){toast('Ingresá el proveedor','error');return;}
  if(compraCarrito.some(it=>!it.producto||!(Number(it.cantidad)>0)||!(Number(it.total)>0))){toast('Completá producto, cantidad y precio de cada renglón','error');return;}
  const total=compraCarrito.reduce((s,it)=>s+Number(it.total),0);
  if(monto_pagado>total){toast('Monto pagado no puede superar el total','error');return;}
  const badge=forma_pago==='efectivo'?'badge-efectivo':forma_pago==='transferencia'?'badge-trans':'badge-credito';
  const resta=total-monto_pagado;
  const lineas=compraCarrito.map(it=>{
    const costo=Number(it.cantidad)>0?Number(it.total)/Number(it.cantidad):0;
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee">
      <span>${escH(it.producto)} <span style="color:var(--gris);font-size:12px">(${Number(it.cantidad)}${costo>0?' · $'+costo.toFixed(2)+'/u':''})</span></span>
      <strong>${$$(it.total)}</strong></div>`;
  }).join('');
  document.getElementById('cc-resumen').innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Proveedor</span><strong>${escH(proveedor)}</strong>
    </div>
    ${lineas}
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Forma de pago</span><span class="badge ${badge}">${forma_pago}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Total</span><strong style="font-size:18px">${$$(total)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
      <span style="color:var(--gris)">Pagado</span><strong>${$$(monto_pagado)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0">
      <span style="color:var(--gris)">Resta pagar</span>
      <strong style="color:${resta>0?'var(--rojo)':'var(--verde-c)'}">${resta>0?$$(resta)+' pendiente':'Pagado completo ✅'}</strong>
    </div>
    <div style="font-size:12px;color:var(--gris);margin-top:4px">Fecha: ${fmtFecha(fecha)}</div>`;
  document.getElementById('modal-confirmar-compra').classList.add('visible');
}

async function guardarCompra(){
  const btn=document.getElementById('btn-confirmar-compra');
  const proveedor=document.getElementById('c-proveedor').value;
  const forma_pago=document.getElementById('c-pago').value;
  const monto_pagado=parseFloat(document.getElementById('c-pagado').value)||0;
  const fecha=document.getElementById('c-fecha').value||hoy();
  const items=compraCarrito.map(it=>{
    const cantidad=Number(it.cantidad)||0, total=Number(it.total)||0;
    return {producto:(it.producto||'').trim(), cantidad, total, costo_unitario: cantidad>0?total/cantidad:0};
  });
  const total=items.reduce((s,it)=>s+it.total,0);

  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Guardando...';
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarCompra',{fecha,proveedor,forma_pago,monto_pagado,items});
    cerrarModal('modal-confirmar-compra'); ocultarToast();
    const deuda=total-monto_pagado;
    const badge=forma_pago==='efectivo'?'badge-efectivo':forma_pago==='transferencia'?'badge-trans':'badge-credito';
    const lineasTicket=items.map(it=>`<div style="color:var(--gris)">${escH(it.producto)} · ${it.cantidad}</div>`).join('');
    document.getElementById('ticket-compra-body').innerHTML=`
      <div class="item" style="background:var(--gris-c);border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="font-size:13px;color:var(--gris);margin-bottom:6px">${fmtFecha(fecha)}</div>
        <div style="font-weight:600;font-size:16px;margin-bottom:2px">${escH(proveedor)}</div>
        <div style="margin-bottom:8px">${lineasTicket}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge ${badge}">${forma_pago}</span>
          <span style="font-size:18px;font-weight:700">${$$(total)}</span>
        </div>
        ${monto_pagado>0&&monto_pagado<total?`<div style="font-size:13px;color:var(--gris);margin-top:6px">Pagado: ${$$(monto_pagado)} · <span style="color:var(--rojo)">Pendiente: ${$$(deuda)}</span></div>`:''}
        ${monto_pagado===0?`<div style="font-size:13px;color:var(--rojo);margin-top:6px">⚠️ Pendiente total: ${$$(total)}</div>`:''}
        ${monto_pagado>=total?`<div style="font-size:13px;color:var(--verde-c);margin-top:6px">✅ Pagado en su totalidad</div>`:''}
      </div>`;
    document.getElementById('modal-ticket-compra').classList.add('visible');
    compraCarrito=[{producto:'',cantidad:'',total:''}];
    renderCompraItems();
    document.getElementById('c-pagado').value='';
    document.getElementById('c-proveedor').selectedIndex=0;
    document.getElementById('c-prov-hint').textContent='Se pre-llena según el producto elegido';
    document.getElementById('c-pago').value='efectivo';
    document.getElementById('c-fecha').value=hoy();
    cargarHistorialCompras();
    productos=await apiGetCached('getProductos'); productosCompraCache=productos;
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
  finally{btn.disabled=false;btn.innerHTML='Confirmar compra';}
}

