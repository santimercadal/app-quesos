// ==========================================
// REPORTES
// ==========================================
function cambiarTab(periodo,btn){
  periodoReporte=periodo;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('activo'));
  btn.classList.add('activo');
  const custom=document.getElementById('fechas-custom');
  if(periodo==='custom') custom.style.display='';
  else{custom.style.display='none'; cargarReporte();}
}

function getFechas(){
  const h=hoy();
  if(periodoReporte==='hoy') return{desde:h,hasta:h};
  if(periodoReporte==='semana'){const d=new Date();const dia=d.getDay()||7;d.setDate(d.getDate()-dia+1);return{desde:d.toISOString().split('T')[0],hasta:h};}
  if(periodoReporte==='mes'){const d=new Date();return{desde:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,hasta:h};}
  return{desde:document.getElementById('r-desde').value,hasta:document.getElementById('r-hasta').value};
}

async function cargarReporte(){
  const{desde,hasta}=getFechas();
  if(!desde||!hasta) return;
  const cont=document.getElementById('cont-reporte');
  cont.innerHTML=skeleton(4);
  try{
    const [g, ventas, compras, contactos] = await Promise.all([
      apiGet('getGanancia',{desde,hasta}),
      apiGet('getVentas',{desde,hasta}),
      apiGet('getCompras',{desde,hasta}),
      apiGet('getDeudaContactos').catch(()=>[])
    ]);

    const ticketPromedio = g.cantidad_ventas > 0 ? g.total_ventas / g.cantidad_ventas : 0;
    // Pendiente actual (total y al día, igual que en Deudas)
    const pendienteCobro = (contactos||[]).filter(c=>c.neto>0).reduce((s,c)=>s+c.neto,0);
    const pendientePago  = (contactos||[]).filter(c=>c.neto<0).reduce((s,c)=>s-c.neto,0);

    // Desglose por forma de pago
    const pagos = {};
    ventas.pedidos.forEach(p=>{
      const k=p.forma_pago||'otro';
      pagos[k]=(pagos[k]||0)+Number(p.total);
    });

    // Top productos
    const topProd = {};
    ventas.pedidos.forEach(p=>{
      (p.items||[]).forEach(it=>{
        topProd[it.producto]=(topProd[it.producto]||0)+Number(it.subtotal);
      });
    });
    const topProdSorted = Object.entries(topProd).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Compras por proveedor
    const compProv = {};
    (compras.compras||[]).forEach(c=>{
      const k=c.proveedor||'Sin proveedor';
      compProv[k]=(compProv[k]||0)+Number(c.total);
    });
    const compProvSorted = Object.entries(compProv).sort((a,b)=>b[1]-a[1]);

    function barra(val,max,color){
      const pct=max>0?Math.round(val/max*100):0;
      return `<div style="background:var(--gris-c);border-radius:6px;height:8px;margin-top:4px">
        <div style="background:${color};height:8px;border-radius:6px;width:${pct}%"></div>
      </div>`;
    }

    const gananciaReal=(g.ganancia_real!==undefined)?Number(g.ganancia_real):Number(g.ganancia);
    const neg=gananciaReal<0;
    const cogs=Number(g.costo_mercaderia||0);
    const redondeo=Number(g.redondeo||0);
    const hayDev = g.dev_a_proveedores > 0 || g.dev_de_clientes > 0;

    cont.innerHTML=`
      <!-- GANANCIA PRINCIPAL -->
      <div class="rep-grid">
        <div class="rep-card grande">
          <div class="rt">Ganancia real del período <span style="font-size:10px">(ventas − costo de lo vendido)</span></div>
          <div class="rv ${neg?'rojo':''}">${$$(gananciaReal)}</div>
          <div style="font-size:11px;color:var(--gris);margin-top:4px">Ventas: ${$$(g.ventas_netas)} · Costo merc.: ${$$(cogs)}</div>
        </div>
        <div class="rep-card">
          <div class="rt">Ventas (${g.cantidad_ventas})</div>
          <div class="rv">${$$(g.total_ventas)}</div>
        </div>
        <div class="rep-card">
          <div class="rt">Compras (${g.cantidad_compras})</div>
          <div class="rv rojo">${$$(g.total_compras)}</div>
        </div>
      </div>

      ${(g.redondeo!==undefined)?`
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="card-titulo">Redondeo del período</div>
          <div style="font-size:11px;color:var(--gris)">Diferencia entre el precio de lista y lo que cobraste</div>
        </div>
        <div style="font-size:20px;font-weight:700;color:${redondeo<0?'var(--rojo)':'var(--verde-c)'}">${redondeo>=0?'+':'−'}${$$(Math.abs(redondeo))}</div>
      </div>`:''}

      <!-- PENDIENTE DE COBRO / PAGO (total y al día, igual que Deudas) -->
      <div class="card">
        <div class="card-titulo">Pendiente (al día de hoy)</div>
        <div class="rep-grid" style="margin-top:10px">
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gris)">Pendiente de cobro</div>
            <div style="font-size:22px;font-weight:800;color:${pendienteCobro>0?'var(--rojo)':'var(--verde-c)'}">${pendienteCobro>0?$$(pendienteCobro):'✅ Al día'}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gris)">Pendiente de pago</div>
            <div style="font-size:22px;font-weight:800;color:${pendientePago>0?'var(--rojo)':'var(--verde-c)'}">${pendientePago>0?$$(pendientePago):'✅ Al día'}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--gris);text-align:center;margin-top:6px">Lo que te deben y lo que debés, total y actualizado</div>
      </div>

      <!-- TICKET PROMEDIO -->
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-titulo" style="margin:0">Ticket promedio</div>
        <div style="font-size:20px;font-weight:800;color:var(--azul)">${ticketPromedio>0?$$(Math.round(ticketPromedio)):'—'}</div>
      </div>

      <!-- FORMA DE PAGO -->
      ${Object.keys(pagos).length?`
      <div class="card">
        <div class="card-titulo">Ventas por forma de pago</div>
        ${Object.entries(pagos).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
          const pct=g.total_ventas>0?Math.round(v/g.total_ventas*100):0;
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
            <span style="font-size:14px">${k}</span>
            <strong>${$$(v)} <span style="font-size:12px;color:var(--gris);font-weight:600">(${pct}%)</span></strong>
          </div>
          ${barra(v,g.total_ventas,k==='efectivo'?'var(--verde-c)':k==='transferencia'?'var(--azul-c)':'var(--amarillo)')}`;
        }).join('')}
      </div>`:''}

      <!-- TOP PRODUCTOS -->
      ${topProdSorted.length?`
      <div class="card">
        <div class="card-titulo">Top productos del período</div>
        ${topProdSorted.map(([prod,total],i)=>{
          const pct=topProdSorted[0][1]>0?Math.round(total/g.total_ventas*100):0;
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
            <div style="font-size:16px;font-weight:700;color:var(--gris);width:20px">${i+1}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600">${prod}</div>
              ${barra(total,topProdSorted[0][1],'var(--verde-c)')}
            </div>
            <div style="text-align:right">
              <strong style="white-space:nowrap">${$$(total)}</strong>
              <div style="font-size:11px;color:var(--gris)">${pct}% del total</div>
            </div>
          </div>`;
        }).join('')}
      </div>`:''}

      <!-- COMPRAS POR PROVEEDOR -->
      ${compProvSorted.length?`
      <div class="card">
        <div class="card-titulo">Compras por proveedor</div>
        ${compProvSorted.map(([prov,total])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
            <span style="font-size:14px">${prov}</span>
            <strong style="color:var(--rojo)">${$$(total)}</strong>
          </div>
          ${barra(total,compProvSorted[0][1],'var(--rojo)')}
        `).join('')}
      </div>`:''}

      ${hayDev?`
      <div class="card" style="background:var(--amarillo);color:#5a3d00">
        <div class="card-titulo" style="color:#5a3d00">Devoluciones del período</div>
        <div style="display:flex;justify-content:space-between;padding:4px 0">
          <span>A proveedores (resta deuda)</span><strong>${$$(g.dev_a_proveedores)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0">
          <span>De clientes (resta ingreso)</span><strong>${$$(g.dev_de_clientes)}</strong>
        </div>
      </div>`:''}
    `;
  }catch(e){cont.innerHTML='<div class="vacio"><span class="ico">❌</span>'+e.message+'</div>';}
}

