// ==========================================
// PRODUCTOS
// ==========================================
async function cargarProductos(){
  const cont=document.getElementById('cont-productos');
  cont.innerHTML=skeleton();
  try{
    productos=await apiGetCached('getProductos');
    if(!productos.length){cont.innerHTML='<div class="vacio"><span class="ico">🧀</span>No hay productos todavía.<br>Agregá el primero.</div>';return;}
    cont.innerHTML=productos.map((p,i)=>{
      const margen=p.precio>0&&p.precio_costo>0?Math.round((p.precio-p.precio_costo)/p.precio*100)+'%':null;
      return `<div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${p.nombre}</div>
            <div class="item-det">Costo: ${$$(p.precio_costo)} · ${p.unidad}${margen?' · Margen: '+margen:''}${(p.stock!==undefined&&p.stock!=='')?' · Stock: '+Number(p.stock).toLocaleString('es-AR')+' '+p.unidad:''}</div>
            ${p.proveedor?`<div class="item-det" style="color:var(--verde-c)">🏭 ${p.proveedor}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="item-val">${$$(p.precio)}</div>
            <button class="btn btn-s btn-sm" onclick="abrirModalProducto(productos[${i}])">Editar</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}

async function abrirModalProducto(p){
  const editar=p!==null;
  document.getElementById('titulo-modal-prod').textContent=editar?'Editar producto':'Agregar producto';
  document.getElementById('p-modo').value=editar?'editar':'agregar';
  document.getElementById('p-nombre').value=editar?p.nombre:'';
  document.getElementById('p-nombre').readOnly=false;
  document.getElementById('p-nombre').style.background='';
  _origNombre=editar?p.nombre:'';
  document.getElementById('p-unidad').value=editar?p.unidad:'kg';
  document.getElementById('p-precio').value=editar?p.precio:'';
  document.getElementById('p-costo').value=editar?p.precio_costo:'';
  document.getElementById('p-margen').textContent='';
  try{
    const provs=await apiGetCached('getProveedores');
    document.getElementById('p-proveedor').innerHTML=
      '<option value="">Sin proveedor asignado</option>'+
      provs.map(pv=>`<option value="${pv.nombre}" ${editar&&p.proveedor===pv.nombre?'selected':''}>${pv.nombre}</option>`).join('');
  }catch(e){}
  if(editar) mostrarMargen();
  document.getElementById('p-aviso-precio').style.display=editar?'block':'none';
  document.getElementById('modal-producto').classList.add('visible');
}

function mostrarMargen(){
  const precio=parseFloat(document.getElementById('p-precio').value)||0;
  const costo=parseFloat(document.getElementById('p-costo').value)||0;
  const el=document.getElementById('p-margen');
  if(precio>0&&costo>0){
    const m=((precio-costo)/precio*100).toFixed(1);
    el.textContent=`Margen: ${m}% · Ganás ${$$(precio-costo)} por ${document.getElementById('p-unidad').value}`;
    el.style.color=precio>costo?'var(--verde-c)':'var(--rojo)';
  }else el.textContent='';
}

async function guardarProducto(){
  const modo=document.getElementById('p-modo').value;
  const nombre=document.getElementById('p-nombre').value.trim();
  const unidad=document.getElementById('p-unidad').value;
  const precio=parseFloat(document.getElementById('p-precio').value);
  const costo=parseFloat(document.getElementById('p-costo').value)||0;
  const proveedor=document.getElementById('p-proveedor').value;
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  if(!(precio>0)){toast('El precio de venta debe ser mayor a 0','error');return;}
  toast('Guardando...','guardando');
  try{
    if(modo==='agregar'){
      await apiPost('agregarProducto',{nombre,unidad,precio,precio_costo:costo,proveedor});
    }else{
      if(_origNombre && _norm(nombre)!==_norm(_origNombre)){
        await apiPost('renombrarProducto',{nombre:_origNombre, nombre_nuevo:nombre});
      }
      await apiPost('editarProducto',{nombre,unidad,precio,precio_costo:costo,proveedor});
    }
    cerrarModal('modal-producto'); ocultarToast(); toast('✅ Producto guardado','exito');
    cargarProductos();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

// ==========================================
// CLIENTES
// ==========================================
async function cargarClientes(){
  const cont=document.getElementById('cont-clientes');
  cont.innerHTML=skeleton();
  const bq=document.getElementById('buscar-clientes'); if(bq) bq.value='';
  try{
    clientesCache=await apiGetCached('getClientes');
    renderClientesLista('');
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}
function filtrarClientes(q){ renderClientesLista(q); }
function renderClientesLista(q){
  const cont=document.getElementById('cont-clientes');
  if(!clientesCache.length){cont.innerHTML='<div class="vacio"><span class="ico">👤</span>No hay clientes todavía.</div>';return;}
  const term=(q||'').trim().toLowerCase();
  _clientesRender = term ? clientesCache.filter(c=>nombreCompleto(c).toLowerCase().includes(term)||String(c.celular||'').toLowerCase().includes(term)) : clientesCache;
  if(!_clientesRender.length){cont.innerHTML='<div class="vacio"><span class="ico">🔎</span>Sin resultados</div>';return;}
  cont.innerHTML=_clientesRender.map((c,i)=>`
      <div class="item">
        <div class="item-head">
          <div class="item-info" style="flex:1">
            <div class="item-nombre">${nombreCompleto(c)}</div>
            <div class="item-det">${c.celular||'Sin celular'}</div>
          </div>
          <button class="btn btn-s btn-sm" onclick="abrirModalCliente(_clientesRender[${i}])">Editar</button>
        </div>
      </div>`).join('');
}

function abrirModalCliente(c){
  const editar=c!==null;
  document.getElementById('titulo-modal-cli').textContent=editar?'Editar cliente':'Agregar cliente';
  document.getElementById('cli-modo').value=editar?'editar':'agregar';
  document.getElementById('cli-nombre').value=editar?c.nombre:'';
  document.getElementById('cli-nombre').readOnly=false;
  document.getElementById('cli-nombre').style.background='';
  document.getElementById('cli-apellido').value=editar?c.apellido:'';
  _origNombre=editar?(c.nombre||''):'';
  _origApellido=editar?(c.apellido||''):'';
  document.getElementById('cli-celular').value=editar?c.celular:'';
  document.getElementById('cli-eliminar-zona').style.display=editar?'block':'none';
  document.getElementById('modal-cliente').classList.add('visible');
}

async function confirmarEliminarCliente(){
  const nombre=_origNombre||document.getElementById('cli-nombre').value;
  if(!confirm(`¿Eliminar a ${nombre} del listado de clientes?\n\nSus ventas anteriores no se borran.`)) return;
  toast('Eliminando...','guardando');
  try{
    await apiPost('eliminarCliente',{nombre});
    cerrarModal('modal-cliente'); ocultarToast();
    toast('✅ Cliente eliminado','exito');
    cargarClientes();
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

async function guardarCliente(){
  const modo=document.getElementById('cli-modo').value;
  const nombre=document.getElementById('cli-nombre').value.trim();
  const apellido=document.getElementById('cli-apellido').value.trim();
  const celular=document.getElementById('cli-celular').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  toast('Guardando...','guardando');
  try{
    if(modo==='agregar'){
      await apiPost('agregarCliente',{nombre,apellido,celular});
    }else{
      const fv=_norm([_origNombre,_origApellido].filter(Boolean).join(' '));
      const fn=_norm([nombre,apellido].filter(Boolean).join(' '));
      if(fv && fv!==fn){
        await apiPost('renombrarCliente',{nombre:_origNombre, apellido:_origApellido, nombre_nuevo:nombre, apellido_nuevo:apellido});
      }
      await apiPost('editarCliente',{nombre,apellido,celular});
    }
    cerrarModal('modal-cliente'); ocultarToast(); toast('✅ Cliente guardado','exito');
    cargarClientes();
    clientesCache=await apiGetCached('getClientes');
    // Autocomplete con nombre completo
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

function abrirQuickCliente(){
  document.getElementById('qcli-nombre').value='';
  document.getElementById('qcli-apellido').value='';
  document.getElementById('qcli-celular').value='';
  document.getElementById('modal-quick-cli').classList.add('visible');
}

async function guardarQuickCliente(){
  const nombre=document.getElementById('qcli-nombre').value.trim();
  const apellido=document.getElementById('qcli-apellido').value.trim();
  const celular=document.getElementById('qcli-celular').value.trim();
  if(!nombre){toast('El nombre es obligatorio','error');return;}
  const completo=[nombre,apellido].filter(Boolean).join(' ');
  const yaExiste=(clientesCache||[]).some(c=>nombreCompleto(c).toLowerCase()===completo.toLowerCase());
  toast('Guardando...','guardando');
  try{
    if(!yaExiste){
      try{ await apiPost('agregarCliente',{nombre,apellido,celular}); }
      catch(err){ if(!/existe/i.test(err.message||'')) throw err; } // si ya existía en el backend, lo usamos igual
    }
    cerrarModal('modal-quick-cli'); ocultarToast(); toast('✅ '+completo+' listo','exito');
    document.getElementById('v-cliente').value=completo;
    clientesCache=await apiGetCached('getClientes');
    document.getElementById('lista-clientes').innerHTML=clientesCache.map(c=>`<option value="${escH(nombreCompleto(c))}">`).join('');
  }catch(e){ocultarToast();toast('❌ '+e.message,'error');}
}

