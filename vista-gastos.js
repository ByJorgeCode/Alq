// Gastos: vencimientos por pagar, pagos registrados y gastos fijos.
import { estado } from './store.js';
import { pendientes, PERIODICIDADES } from './calculos.js';
import { fechaLarga, nombreMes, mesDe, hoy } from './fechas.js';
import { fmt, valor } from './moneda.js';
import { h } from './ui.js';
import { abrirPago, abrirArreglo, abrirFijo } from './form-gastos.js';

let solapa = 'pagar';
const SOLAPAS = [['pagar', 'Por pagar'], ['pagados', 'Pagados'], ['fijos', 'Fijos']];

function porPagar(main) {
  const lista = pendientes(estado, 60);
  const h0 = hoy();
  if (!lista.length) return '<p class="vacio card">Nada por pagar en los próximos 60 días.</p>';
  return `<ul class="lista">${lista.map((v, i) => `
    <li><button type="button" class="fila" data-vto="${i}">
      <span class="txt">
        <span class="t1">${h(v.fijo.concepto)}</span>
        <span class="t2">Vence ${h(fechaLarga(v.fecha))} ${v.fecha < h0 ? '<span class="badge vencido">Vencido</span>' : ''}</span>
      </span>
      <span class="monto">${v.fijo.importe ? fmt(v.fijo.importe, v.fijo.moneda) : '<span class="badge">Sin importe</span>'}</span>
    </button></li>`).join('')}</ul>
    <p class="small muted">Tocá un vencimiento para registrar el pago.</p>`;
}

function pagados() {
  const moneda = estado.config.moneda;
  const pagos = [...estado.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!pagos.length) return '<p class="vacio card">Todavía no hay pagos registrados.</p>';
  let html = '';
  let mes = '';
  for (const p of pagos) {
    if (mesDe(p.fecha) !== mes) {
      if (mes) html += '</ul>';
      mes = mesDe(p.fecha);
      html += `<h2>${h(nombreMes(mes))}</h2><ul class="lista">`;
    }
    const titulo = p.tipo === 'fijo' ? p.concepto : p.descripcion;
    const detalle = p.tipo === 'fijo'
      ? `Gasto fijo · ${nombreMes(p.periodo)}`
      : `${p.rubro} · ${p.clase === 'inversion' ? 'Inversión' : 'Mantenimiento'}${p.proveedor ? ' · ' + p.proveedor : ''}`;
    const otra = p.moneda !== moneda ? `<span class="t2">${fmt(valor(p, moneda), moneda)}</span>` : '';
    html += `
      <li><button type="button" class="fila" data-pago="${h(p.id)}">
        <span class="txt">
          <span class="t1">${h(titulo)}</span>
          <span class="t2">${h(fechaLarga(p.fecha))} · ${h(detalle)}</span>
        </span>
        <span class="monto">${fmt(p.importe, p.moneda)}<br>${otra}</span>
      </button></li>`;
  }
  return html + '</ul>';
}

function fijos() {
  const lista = [...estado.gastosFijos].sort((a, b) => a.concepto.localeCompare(b.concepto));
  const sinImporte = lista.some((f) => f.activo !== false && !f.importe);
  return `
    ${sinImporte ? '<p class="card aviso small">Completá el importe estimado y el mes de vencimiento de cada gasto para que los indicadores sean correctos.</p>' : ''}
    <ul class="lista">${lista.map((f) => `
      <li><button type="button" class="fila" data-fijo="${h(f.id)}">
        <span class="txt">
          <span class="t1">${h(f.concepto)} ${f.activo === false ? '<span class="badge">Inactivo</span>' : ''}</span>
          <span class="t2">${h(PERIODICIDADES[f.periodicidad])} · vence el día ${f.diaVenc} · desde ${h(nombreMes(f.desde))}${f.variable ? ' · variable' : ''}</span>
        </span>
        <span class="monto">${f.importe ? fmt(f.importe, f.moneda) : '<span class="badge">Sin importe</span>'}</span>
      </button></li>`).join('')}</ul>
    <div class="acciones"><button type="button" class="btn" data-nuevo-fijo>+ Gasto fijo</button></div>`;
}

export function render(main) {
  const contenido = solapa === 'pagar' ? porPagar(main) : solapa === 'pagados' ? pagados() : fijos();
  main.innerHTML = `
    <div class="seg full" role="group" aria-label="Ver">
      ${SOLAPAS.map(([id, txt]) => `<button type="button" data-solapa="${id}" aria-pressed="${solapa === id}">${txt}</button>`).join('')}
    </div>
    <div style="margin-top:12px">${contenido}</div>
    <div class="espacio-fab"></div>
    <button type="button" class="fab" data-arreglo>+ Arreglo</button>`;

  main.querySelectorAll('[data-solapa]').forEach((b) => b.addEventListener('click', () => {
    solapa = b.dataset.solapa;
    render(main);
  }));
  const vtos = solapa === 'pagar' ? pendientes(estado, 60) : [];
  main.querySelectorAll('[data-vto]').forEach((b) => b.addEventListener('click', () => abrirPago(vtos[Number(b.dataset.vto)])));
  main.querySelectorAll('[data-pago]').forEach((b) => b.addEventListener('click', () => {
    const p = estado.pagos.find((x) => x.id === b.dataset.pago);
    if (p.tipo === 'puntual') return abrirArreglo(p);
    const fijo = estado.gastosFijos.find((f) => f.id === p.fijoId)
      || { id: p.fijoId, concepto: p.concepto, periodicidad: 'mensual', moneda: p.moneda, importe: p.importe };
    abrirPago({ fijo, periodo: p.periodo, pago: p });
  }));
  main.querySelectorAll('[data-fijo]').forEach((b) => b.addEventListener('click', () =>
    abrirFijo(estado.gastosFijos.find((f) => f.id === b.dataset.fijo))));
  main.querySelector('[data-nuevo-fijo]')?.addEventListener('click', () => abrirFijo(null));
  main.querySelector('[data-arreglo]').addEventListener('click', () => abrirArreglo(null));
}
