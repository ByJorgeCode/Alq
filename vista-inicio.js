// Inicio: indicadores de los últimos 12 meses frente a los 12 anteriores.
import { estado } from './store.js';
import { resumen, pendientes, proximaReserva, noches } from './calculos.js';
import { mesActual, sumarMeses, mesCorto, mesAnio, nombreMes, fechaLarga, hoy } from './fechas.js';
import { fmt, fmtNum } from './moneda.js';
import { h, aviso } from './ui.js';
import { abrirReserva } from './form-reserva.js';
import { abrirPago } from './form-gastos.js';

const pct = (v) => `${fmtNum(v * 100)} %`;

function variacion(actual, anterior, hayAnterior) {
  if (!hayAnterior || !anterior) return '<span class="muted">Sin datos del año anterior</span>';
  const d = (actual - anterior) / Math.abs(anterior);
  const sube = d >= 0;
  return `<span class="delta ${sube ? 'sube' : 'baja'}">${sube ? '▲' : '▼'} ${fmtNum(Math.abs(d) * 100)} %</span> vs. año anterior`;
}

function grafico(meses, moneda) {
  const W = 340, H = 170, izq = 4, base = H - 22, alto = base - 8;
  const max = Math.max(1, ...meses.flatMap((m) => [m.ingresos, m.fijos + m.arreglos]));
  const ancho = (W - izq) / meses.length;
  const barra = Math.max(4, (ancho - 6) / 2);
  const barras = meses.map((m, i) => {
    const x = izq + i * ancho + 2;
    const hi = (m.ingresos / max) * alto;
    const hg = ((m.fijos + m.arreglos) / max) * alto;
    return `
      <rect x="${x}" y="${base - hi}" width="${barra}" height="${hi}" rx="2" fill="var(--ingreso)"/>
      <rect x="${x + barra + 1}" y="${base - hg}" width="${barra}" height="${hg}" rx="2" fill="url(#rayas)" stroke="var(--gasto)" stroke-width="1"/>
      <text x="${x + barra}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--text-2)">${h(mesCorto(m.ym).slice(0, 3))}</text>`;
  }).join('');
  const descripcion = `Ingresos y gastos por mes. Máximo mensual ${fmt(max, moneda)}.`;
  return `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${h(descripcion)}">
      <defs>
        <pattern id="rayas" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="var(--surface)"/>
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--gasto)" stroke-width="3"/>
        </pattern>
      </defs>
      <line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="var(--border)"/>
      ${barras}
    </svg>`;
}

function tabla(meses, moneda) {
  const filas = meses.map((m) => {
    const gastos = m.fijos + m.arreglos;
    return `<tr><td>${h(mesAnio(m.ym))}</td><td>${fmt(m.ingresos, moneda)}</td><td>${fmt(gastos, moneda)}</td>
      <td>${fmt(m.ingresos - gastos, moneda)}</td><td>${pct(m.noches / m.dias)}</td></tr>`;
  }).join('');
  return `<div class="tabla-scroll"><table class="tabla">
    <thead><tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th><th scope="col">Neto</th><th scope="col">Ocup.</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`;
}

export function textoResumen(r, moneda) {
  const t = r.total;
  return [
    `*${estado.config.propiedad}* — ${nombreMes(r.desde)} a ${nombreMes(r.hasta)}`,
    `Ingresos: ${fmt(t.ingresos, moneda)}`,
    `Gastos: ${fmt(t.gastos, moneda)} (fijos ${fmt(t.fijos, moneda)}, arreglos ${fmt(t.arreglos, moneda)})`,
    `Resultado neto: ${fmt(t.neto, moneda)} (margen ${pct(t.margen)})`,
    `Ocupación: ${pct(t.ocupacion)} (${t.noches} noches)`,
    `Precio medio por noche: ${fmt(t.precioNoche, moneda)}`,
  ].join('\n');
}

function htmlProxima(prox, h0) {
  if (!prox) return '<p class="vacio">No hay reservas próximas.</p>';
  return `
    <button type="button" class="fila" data-reserva>
      <span class="txt">
        <span class="t1">${prox.entrada <= h0 ? 'En curso · ' : ''}${h(prox.huesped || 'Reserva')}</span>
        <span class="t2">${h(fechaLarga(prox.entrada))} → ${h(fechaLarga(prox.salida))} · ${noches(prox)} noches</span>
      </span>
      <span class="monto">${fmt(prox.importe, 'USD')}</span>
    </button>`;
}

function htmlVencimientos(vtos, h0) {
  if (!vtos.length) return '<p class="vacio card">Nada por pagar en los próximos 30 días.</p>';
  return `<ul class="lista">${vtos.map((v, i) => `
    <li><button type="button" class="fila" data-vto="${i}">
      <span class="txt">
        <span class="t1">${h(v.fijo.concepto)}</span>
        <span class="t2">Vence ${h(fechaLarga(v.fecha))} ${v.fecha < h0 ? '<span class="badge vencido">Vencido</span>' : ''}</span>
      </span>
      <span class="monto">${v.fijo.importe ? fmt(v.fijo.importe, v.fijo.moneda) : '<span class="badge">Sin importe</span>'}</span>
    </button></li>`).join('')}</ul>`;
}

const kpi = (etq, val, sub, clase = '') =>
  `<div class="kpi ${clase}"><div class="etq">${etq}</div><div class="val">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;

export function render(main) {
  const moneda = estado.config.moneda;
  const desde = sumarMeses(mesActual(), -11);
  const r = resumen(estado, desde, 12, moneda);
  const ant = resumen(estado, sumarMeses(desde, -12), 12, moneda);
  const t = r.total, a = ant.total;
  const prox = proximaReserva(estado.reservas);
  const vtos = pendientes(estado, 30).slice(0, 4);
  const h0 = hoy();
  const nota = moneda === 'UYU' ? 'Los montos en dólares' : 'Los montos en pesos';

  main.innerHTML = `
    <p class="periodo">Últimos 12 meses: ${h(nombreMes(r.desde))} – ${h(nombreMes(r.hasta))}</p>
    <div class="kpis">
      ${kpi('Resultado neto', fmt(t.neto, moneda), `Margen ${pct(t.margen)} · ${variacion(t.neto, a.neto, a.conDatos)}`, 'destacado')}
      ${kpi('Ingresos', fmt(t.ingresos, moneda), variacion(t.ingresos, a.ingresos, a.conDatos))}
      ${kpi('Gastos', fmt(t.gastos, moneda), `Fijos ${fmt(t.fijos, moneda)} · Arreglos ${fmt(t.arreglos, moneda)}`)}
      ${kpi('Ocupación', pct(t.ocupacion), `${t.noches} de ${t.dias} noches`)}
      ${kpi('Precio medio por noche', fmt(t.precioNoche, moneda), `Estadía media ${fmtNum(t.estadiaMedia, 1)} noches`)}
    </div>
    <div class="mini">
      ${kpi('Reservas', String(t.reservas))}
      ${kpi('Punto de equilibrio', t.equilibrio == null ? '—' : `${fmtNum(Math.ceil(t.equilibrio))} noches/mes`, 'para cubrir los gastos fijos')}
    </div>

    <h2>Ingresos y gastos por mes</h2>
    <div class="card grafico">
      ${grafico(r.meses, moneda)}
      <div class="leyenda">
        <span><i style="background:var(--ingreso)"></i>Ingresos</span>
        <span><i style="background:repeating-linear-gradient(45deg,var(--gasto) 0 3px,transparent 3px 5px);border:1px solid var(--gasto)"></i>Gastos</span>
      </div>
      <details><summary>Ver tabla</summary>${tabla(r.meses, moneda)}</details>
    </div>
    <p class="small muted">Los gastos anuales se reparten en 12 meses. ${nota} se convierten con el tipo de cambio de cada movimiento.</p>

    <h2>Próxima reserva</h2>
    <div class="lista">${htmlProxima(prox, h0)}</div>

    <h2>Por pagar</h2>
    ${htmlVencimientos(vtos, h0)}

    <div class="acciones">
      <button type="button" class="btn" data-acc="compartir">Compartir resumen por WhatsApp</button>
    </div>`;

  main.querySelector('[data-reserva]')?.addEventListener('click', () => abrirReserva(prox));
  main.querySelectorAll('[data-vto]').forEach((b) =>
    b.addEventListener('click', () => abrirPago(vtos[Number(b.dataset.vto)])));
  main.querySelector('[data-acc="compartir"]').addEventListener('click', async () => {
    const texto = textoResumen(r, moneda);
    if (navigator.share) {
      try { await navigator.share({ text: texto }); } catch { /* cancelado */ }
    } else {
      await navigator.clipboard?.writeText(texto);
      aviso('Resumen copiado: pegalo en WhatsApp.');
    }
  });
}
