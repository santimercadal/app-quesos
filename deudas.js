// ==========================================
// DEUDAS UNIFICADAS (tabs clientes / proveedores)
// ==========================================
function invalidarCacheDeudas(){ /* sin cache, siempre carga fresco */ }

async function cargarDeudas(tab){
  cambiarTabDeuda(tab);
  document.getElementById('cont-clientes-deuda').innerHTML=skeleton();
  document.getElementById('cont-proveedores').innerHTML=skeleton();
  const contactos=await apiGet('getDeudaContactos').catch(()=>[]);
  renderTeDeben(contactos.filter(c=>c.neto>0.01));
  renderLeDebes(contactos.filter(c=>c.neto<-0.01));
}

function cambiarTabDeuda(tab){
  const esCli=tab==='clientes';
  document.getElementById('cont-clientes-deuda').style.display=esCli?'block':'none';
  document.getElementById('cont-proveedores').style.display=esCli?'none':'block';
  document.getElementById('tab-clientes').className='btn '+(esCli?'btn-p':'btn-s');
  document.getElementById('tab-proveedores').className='btn '+(esCli?'btn-s':'btn-p');
}

function renderTeDeben(lista){
  _contTeDeben=lista;
  const cont=document.getElementById('cont-clientes-deuda');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>Nadie te debe nada</div>';return;}
  const total=lista.reduce((s,d)=>s+d.neto,0);
  cont.innerHTML=
    `<div class="card" style="background:var(--azul-s);border-left:4px solid var(--azul-c);margin-bottom:16px">
       <div class="card-titulo">Total por cobrar</div>
       <div class="card-valor" style="color:var(--azul)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirCuentaContacto(_contTeDeben[${i}].contacto)">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${d.contacto}</div>
          <div class="item-det">${d.total_compras>0?'🔁 También le comprás · ':''}Ventas: ${$$(d.total_ventas)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(d.neto)}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

function renderLeDebes(lista){
  _contLeDebes=lista;
  const cont=document.getElementById('cont-proveedores');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>No le debés nada a nadie</div>';return;}
  const total=lista.reduce((s,d)=>s+Math.abs(d.neto),0);
  cont.innerHTML=
    `<div class="card" style="background:var(--rojo-s);margin-bottom:16px">
       <div class="card-titulo">Total por pagar</div>
       <div class="card-valor" style="color:var(--rojo)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirCuentaContacto(_contLeDebes[${i}].contacto)">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${d.contacto}</div>
          <div class="item-det">${d.total_ventas>0?'🔁 También te compra · ':''}Compras: ${$$(d.total_compras)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(Math.abs(d.neto))}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

async function abrirCuentaContacto(nombre){
  document.getElementById('cuenta-titulo').textContent='Cuenta: '+nombre;
  document.getElementById('cuenta-nombre').value=nombre;
  _cuentaNombre=nombre;
  document.getElementById('cuenta-tabla').innerHTML=skeleton(2);
  document.getElementById('modal-contacto').classList.add('visible');
  try{
    const h=await apiGet('getHistorialContacto',{contacto:nombre});
    _cuentaSaldo=h.saldo_total;
    renderCuentaContacto(h);
  }catch(e){document.getElementById('cuenta-tabla').innerHTML='<div class="vacio">Error: '+e.message+'</div>';}
}

function renderCuentaContacto(h){
  _cuentaMovs=h.movimientos; _cuentaNombre=h.contacto;
  const rows=h.movimientos.map((m,i)=>{
    const pos=m.delta>=0;
    const colorMonto=pos?'var(--rojo)':'var(--verde-c)';
    const colorSaldo=m.saldo>0.01?'var(--rojo)':(m.saldo<-0.01?'var(--azul)':'var(--gris)');
    return `<div class="ledger-row">
      <div style="flex:1">
        <div style="font-weight:500">${fmtFecha(m.fecha)}</div>
        <div style="font-size:12px;color:var(--gris)">${m.descripcion}</div>
        ${(m.tipo==='pago_cli'||m.tipo==='pago_prov')?`<div style="margin-top:4px;display:flex;gap:6px"><button class="btn btn-s btn-sm" onclick="editarPagoMov(${i})">✏️</button><button class="btn btn-s btn-sm" onclick="borrarPagoMov(${i})">🗑️</button></div>`:''}
      </div>
      <div style="text-align:right;color:${colorMonto};font-weight:600;white-space:nowrap">${pos?'+':'−'}${$$(Math.abs(m.delta))}</div>
      <div class="ledger-saldo" style="width:84px;text-align:right;color:${colorSaldo}">${$$(Math.abs(m.saldo))}</div>
    </div>`;
  }).join('');
  const header=`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris);font-weight:600;padding:0 0 8px;text-transform:uppercase;letter-spacing:.4px"><span>Movimiento</span><span style="width:84px;text-align:right">Saldo</span></div>`;
  document.getElementById('cuenta-tabla').innerHTML=h.movimientos.length?header+rows:'<div class="vacio"><span class="ico">📋</span>Sin movimientos</div>';

  const saldo=h.saldo_total;
  const box=document.getElementById('cuenta-saldo-box');
  const lbl=document.getElementById('cuenta-saldo-label');
  const val=document.getElementById('cuenta-saldo');
  const btnT=document.getElementById('btn-cuenta-total');
  const btnP=document.getElementById('btn-cuenta-parcial');
  if(saldo>0.01){
    box.style.background='var(--rojo-s)'; lbl.textContent='Te debe'; lbl.style.color='var(--rojo)';
    val.textContent=$$(saldo); val.style.color='var(--rojo)';
    btnT.style.display='block'; btnT.textContent='Registrar cobro total ('+$$(saldo)+')';
    btnP.style.display='block'; btnP.textContent='Registrar cobro parcial';
  }else if(saldo<-0.01){
    box.style.background='var(--azul-s)'; lbl.textContent='Le debés'; lbl.style.color='var(--azul)';
    val.textContent=$$(-saldo); val.style.color='var(--azul)';
    btnT.style.display='block'; btnT.textContent='Registrar pago total ('+$$(-saldo)+')';
    btnP.style.display='block'; btnP.textContent='Registrar pago parcial';
  }else{
    box.style.background='var(--verde-s)'; lbl.textContent='Al día'; lbl.style.color='var(--verde-c)';
    val.textContent=$$(0); val.style.color='var(--verde-c)';
    btnT.style.display='none'; btnP.style.display='none';
  }
}

function cuentaSaldarTotal(){
  const nombre=document.getElementById('cuenta-nombre').value;
  cerrarModal('modal-contacto');
  if(_cuentaSaldo>0){
    document.getElementById('ab-cliente').value=nombre;
    document.getElementById('ab-monto').value=Math.round(_cuentaSaldo);
    document.getElementById('ab-fecha').value=hoy();
    document.getElementById('ab-nota').value='Liquidación total';
    document.getElementById('modal-abono').classList.add('visible');
  }else{
    document.getElementById('ab-prov').value=nombre;
    document.getElementById('ab-monto-prov').value=Math.round(-_cuentaSaldo);
    document.getElementById('ab-fecha-prov').value=hoy();
    document.getElementById('modal-abono-prov').classList.add('visible');
  }
}

function cuentaSaldarParcial(){
  const nombre=document.getElementById('cuenta-nombre').value;
  cerrarModal('modal-contacto');
  if(_cuentaSaldo>0){
    document.getElementById('ab-cliente').value=nombre;
    document.getElementById('ab-monto').value='';
    document.getElementById('ab-fecha').value=hoy();
    document.getElementById('ab-nota').value='';
    document.getElementById('modal-abono').classList.add('visible');
  }else{
    document.getElementById('ab-prov').value=nombre;
    document.getElementById('ab-monto-prov').value='';
    document.getElementById('ab-fecha-prov').value=hoy();
    document.getElementById('modal-abono-prov').classList.add('visible');
  }
}


function renderDeudaClientes(lista){
  _deudaCli=lista;
  const cont=document.getElementById('cont-clientes-deuda');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>¡Ningún cliente debe nada!</div>';return;}
  const total=lista.reduce((s,d)=>s+d.deuda,0);
  cont.innerHTML=
    `<div class="card" style="background:var(--azul-s);border-left:4px solid var(--azul-c);margin-bottom:16px">
       <div class="card-titulo">Total por cobrar</div>
       <div class="card-valor" style="color:var(--azul)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirLedger(_deudaCli[${i}].cliente,${d.deuda})">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${d.cliente}</div>
          <div class="item-det">Total histórico: ${$$(d.total_ventas)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(d.deuda)}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

async function cargarDeudaClientes(){ await cargarDeudas('clientes'); }

async function abrirLedger(cliente, deudaActual){
  document.getElementById('ledger-titulo').textContent='Cuenta: '+cliente;
  document.getElementById('ledger-cliente-nombre').value=cliente;
  document.getElementById('ledger-saldo').textContent=$$(deudaActual);
  document.getElementById('btn-liquidar-todo').textContent='Liquidar todo ('+$$(deudaActual)+')';
  document.getElementById('ledger-tabla').innerHTML=skeleton(2);
  document.getElementById('modal-ledger').classList.add('visible');
  try{
    const h=await apiGet('getHistorialCliente',{cliente});
    const rows=h.movimientos.map((m,idx)=>{
      const itemsHtml=m.tipo==='compra'&&m.items&&m.items.length?
        `<div id="ledger-items-${idx}" style="display:none;background:var(--gris-c);border-radius:8px;padding:8px;margin:4px 0 8px;font-size:12px">
          ${m.items.map(it=>`
            <div style="display:flex;justify-content:space-between;padding:3px 0">
              <span>${it.producto} · ${Number(it.cantidad).toFixed(2)} ${it.unidad||''}</span>
              <strong>${$$(it.subtotal)}</strong>
            </div>`).join('')}
          <div style="font-size:11px;color:var(--gris);margin-top:4px">${m.forma_pago||''} · Pagó al momento: ${$$(m.haber)}</div>
        </div>`:''
      ;
      return `<div>
        <div class="ledger-row" ${m.tipo==='compra'&&m.items?.length?`style="cursor:pointer" onclick="toggleLedgerItems(${idx})"`:''}">
          <div style="flex:1">
            <div style="font-weight:500">${fmtFecha(m.fecha)} ${m.tipo==='compra'&&m.items?.length?'<span style="font-size:11px;color:var(--gris)">▶ ver detalle</span>':''}</div>
            <div style="font-size:12px;color:var(--gris)">${m.descripcion}${m.tipo==='compra'&&m.id?` · ${m.id}`:''}</div>
          </div>
          ${m.tipo==='compra'?`
            <div style="text-align:right">
              <div class="ledger-debe">+${$$(m.debe)}</div>
              ${m.haber>0?`<div class="ledger-haber" style="font-size:12px">pagó ${$$(m.haber)}</div>`:''}
            </div>`:`<div class="ledger-haber">-${$$(m.haber)}</div>`}
          <div class="ledger-saldo" style="width:80px;text-align:right;${m.saldo>0?'color:var(--rojo)':'color:var(--verde-c)'}">${$$(m.saldo)}</div>
        </div>
        ${itemsHtml}
      </div>`;
    }).join('');
    const header=`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris);font-weight:600;padding:0 0 8px;text-transform:uppercase;letter-spacing:.4px"><span>Movimiento</span><span style="width:80px;text-align:right">Saldo</span></div>`;
    document.getElementById('ledger-tabla').innerHTML=rows?header+rows:'<div class="vacio"><span class="ico">📋</span>Sin movimientos</div>';
    document.getElementById('ledger-saldo').textContent=$$(h.saldo_total);
    document.getElementById('btn-liquidar-todo').textContent='Liquidar todo ('+$$(h.saldo_total)+')';
  }catch(e){document.getElementById('ledger-tabla').innerHTML='<div class="vacio">Error: '+e.message+'</div>';}
}

function toggleLedgerItems(idx){
  const el=document.getElementById('ledger-items-'+idx);
  if(!el) return;
  const abierto=el.style.display!=='none';
  el.style.display=abierto?'none':'block';
  const rows=document.querySelectorAll('#ledger-tabla .ledger-row');
  const span=rows[idx]?.querySelector('span[style*="font-size:11px"]');
  if(span) span.textContent=abierto?'▶ ver detalle':'▼ ocultar';
}

function liquidarTodo(){
  const cliente=document.getElementById('ledger-cliente-nombre').value;
  const saldoTxt=document.getElementById('ledger-saldo').textContent;
  const monto=Number(saldoTxt.replace(/[$.,\s]/g,'').replace(/\./g,'').replace(',','.'));
  cerrarModal('modal-ledger');
  document.getElementById('ab-cliente').value=cliente;
  document.getElementById('ab-monto').value=Math.round(monto);
  document.getElementById('ab-fecha').value=hoy();
  document.getElementById('ab-nota').value='Liquidación total';
  document.getElementById('modal-abono').classList.add('visible');
}

function abrirAbono(){
  const cliente=document.getElementById('ledger-cliente-nombre').value;
  cerrarModal('modal-ledger');
  document.getElementById('ab-cliente').value=cliente;
  document.getElementById('ab-monto').value='';
  document.getElementById('ab-fecha').value=hoy();
  document.getElementById('ab-nota').value='';
  document.getElementById('modal-abono').classList.add('visible');
}

async function guardarAbono(){
  const cliente=document.getElementById('ab-cliente').value;
  const monto=parseFloat(document.getElementById('ab-monto').value);
  const fecha=document.getElementById('ab-fecha').value||hoy();
  const nota=document.getElementById('ab-nota').value.trim();
  if(!(monto>0)){toast('Ingresá un monto válido','error');return;}
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarPagoCliente',{cliente,monto,fecha,nota,operador:operadorActual});
    cerrarModal('modal-abono');
    ocultarToast(); toast('✅ Abono registrado','exito');
    invalidarCacheDeudas(); cargarDeudaClientes();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// DEUDA PROVEEDORES
// ==========================================
function renderDeudaProveedores(lista){
  _deudaProv=lista;
  const cont=document.getElementById('cont-proveedores');
  if(!lista.length){cont.innerHTML='<div class="vacio"><span class="ico">🎉</span>¡No debemos nada a proveedores!</div>';return;}
  const total=lista.reduce((s,d)=>s+d.deuda,0);
  cont.innerHTML=
    `<div class="card" style="background:var(--rojo-s);margin-bottom:16px">
       <div class="card-titulo">Total por pagar</div>
       <div class="card-valor" style="color:var(--rojo)">${$$(total)}</div>
     </div>`+
    lista.map((d,i)=>`
      <div class="item" style="cursor:pointer" onclick="abrirLedgerProv(_deudaProv[${i}].proveedor,${d.deuda})">
        <div class="item-info" style="flex:1">
          <div class="item-nombre">${d.proveedor}</div>
          <div class="item-det">Total compras: ${$$(d.total_compras)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="item-val rojo">${$$(d.deuda)}</div>
          <div style="font-size:12px;color:var(--gris)">Ver cuenta →</div>
        </div>
      </div>`).join('');
}

async function cargarDeudaProveedores(){ await cargarDeudas('proveedores'); }

// Ledger de proveedor
async function abrirLedgerProv(proveedor, deudaActual){
  document.getElementById('ledger-prov-titulo').textContent='Cuenta: '+proveedor;
  document.getElementById('ledger-prov-nombre').value=proveedor;
  document.getElementById('ledger-prov-saldo').textContent=$$(deudaActual);
  document.getElementById('btn-pago-total-prov').textContent='Pagar todo ('+$$(deudaActual)+')';
  document.getElementById('ledger-prov-tabla').innerHTML=skeleton(2);
  document.getElementById('modal-ledger-prov').classList.add('visible');
  try{
    const h=await apiGet('getHistorialProveedor',{proveedor});
    const rows=h.movimientos.map(m=>{
      const colorSaldo=m.saldo>0?'color:var(--rojo)':'color:var(--verde-c)';
      let labelTipo='';
      if(m.tipo==='compra') labelTipo=`<div class="ledger-debe">+${$$(m.debe)}</div>${m.haber>0?`<div style="font-size:12px;color:var(--verde-c)">pagó ${$$(m.haber)}</div>`:''}`;
      else if(m.tipo==='pago') labelTipo=`<div class="ledger-haber">-${$$(m.haber)}</div>`;
      else labelTipo=`<div style="color:var(--amarillo);font-weight:600">↩️ -${$$(m.haber)}</div>`;
      return `<div class="ledger-row">
        <div style="flex:1">
          <div style="font-weight:500">${fmtFecha(m.fecha)}</div>
          <div style="font-size:12px;color:var(--gris)">${m.descripcion}</div>
        </div>
        <div style="text-align:right">${labelTipo}</div>
        <div class="ledger-saldo" style="width:80px;text-align:right;${colorSaldo}">${$$(m.saldo)}</div>
      </div>`;
    }).join('');
    const header=`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris);font-weight:600;padding:0 0 8px;text-transform:uppercase;letter-spacing:.4px"><span>Movimiento</span><span style="width:80px;text-align:right">Saldo</span></div>`;
    document.getElementById('ledger-prov-tabla').innerHTML=rows?header+rows:'<div class="vacio"><span class="ico">📋</span>Sin movimientos</div>';
    document.getElementById('ledger-prov-saldo').textContent=$$(h.saldo_total);
    document.getElementById('btn-pago-total-prov').textContent='Pagar todo ('+$$(h.saldo_total)+')';
  }catch(e){document.getElementById('ledger-prov-tabla').innerHTML='<div class="vacio">Error: '+e.message+'</div>';}
}

function abrirPagoTotalProv(){
  const prov=document.getElementById('ledger-prov-nombre').value;
  const saldoTxt=document.getElementById('ledger-prov-saldo').textContent;
  const monto=Number(saldoTxt.replace(/[$\s.]/g,''));
  cerrarModal('modal-ledger-prov');
  document.getElementById('ab-prov').value=prov;
  document.getElementById('ab-monto-prov').value=Math.round(monto);
  document.getElementById('ab-fecha-prov').value=hoy();
  document.getElementById('modal-abono-prov').classList.add('visible');
}

function abrirPagoParcialProv(){
  const prov=document.getElementById('ledger-prov-nombre').value;
  cerrarModal('modal-ledger-prov');
  document.getElementById('ab-prov').value=prov;
  document.getElementById('ab-monto-prov').value='';
  document.getElementById('ab-fecha-prov').value=hoy();
  document.getElementById('modal-abono-prov').classList.add('visible');
}

function abrirAbonoProv(prov, deuda){
  document.getElementById('ab-prov').value=prov;
  document.getElementById('ab-monto-prov').value=Math.round(deuda);
  document.getElementById('ab-fecha-prov').value=hoy();
  document.getElementById('modal-abono-prov').classList.add('visible');
}

async function guardarAbonoProv(){
  const proveedor=document.getElementById('ab-prov').value;
  const monto=parseFloat(document.getElementById('ab-monto-prov').value);
  const fecha=document.getElementById('ab-fecha-prov').value||hoy();
  if(!(monto>0)){toast('Ingresá un monto válido','error');return;}
  toast('Guardando...','guardando');
  try{
    await apiPost('registrarPagoProveedor',{proveedor,monto,fecha,operador:operadorActual});
    cerrarModal('modal-abono-prov');
    ocultarToast(); toast('✅ Pago registrado','exito');
    invalidarCacheDeudas(); cargarDeudaProveedores();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

