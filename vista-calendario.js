// Calendario mensual. Cada día se divide en mañana (noche anterior) y tarde (desde las 16 h),
// así un día de recambio se ve mitad y mitad.
import { estado } from './store.js';
import { noches } from './calculos.js';
import { mesActual, sumarMeses, nombreMes, diasDelMes, diaSemana, sumarDias, fechaLarga, hoy } from './fechas.js';
import { fmt, fmtNum, valor } from './moneda.js';
import { h } from './ui.js';
import { abrirReserva } from './form-reserva.js';

let mesVisto = mesActual();
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Reserva que ocupa la noche que empieza en la fecha dada.
const reservaDeNoche = (fecha) => estado.reservas.find((r) => r.entrada <= fecha && fecha < r.salida);

function etiquetaDia(fecha, am, pm) {
  const base = fechaLarga(fecha);
  if (am && pm && am !== pm) return `${base}: sale una reserva y entra otra`;
  if (am && pm) return `${base}: ocupado`;
  if (pm) return `${base}: entrada de reserva`;
  if (am) return `${base}: salida de reserva, libre desde la tarde`;
  return `${base}: libre`;
}

export function render(main) {
  const ym = mesVisto;
  const total = diasDelMes(ym);
  const primero = `${ym}-01`;
  const ultimo = `${ym}-${String(total).padStart(2, '0')}`;
  const h0 = hoy();
  const moneda = estado.config.moneda;

  let celdas = DIAS.map((d) => `<div class="dow" aria-hidden="true">${d}</div>`).join('');
  celdas += '<div class="dia fuera" aria-hidden="true"></div>'.repeat(diaSemana(primero));

  let ocupadas = 0;
  for (let i = 0; i < total; i++) {
    const f = sumarDias(primero, i);
    const am = reservaDeNoche(sumarDias(f, -1));
    const pm = reservaDeNoche(f);
    if (pm) ocupadas++;
    const clases = ['dia', am && pm ? 'lleno' : '', am && pm && am !== pm ? 'recambio' : '', f === h0 ? 'hoy' : ''].join(' ');
    celdas += `
      <button type="button" class="${clases}" data-fecha="${f}" aria-label="${h(etiquetaDia(f, am, pm))}">
        <span class="am ${am ? 'on' : ''}"></span><span class="pm ${pm ? 'on' : ''}"></span>
        <span class="num">${i + 1}</span>
      </button>`;
  }

  const delMes = estado.reservas
    .filter((r) => r.entrada <= ultimo && r.salida > primero)
    .sort((a, b) => a.entrada.localeCompare(b.entrada));
  const ingresosMes = delMes.reduce((s, r) => {
    // Solo la parte de la reserva que cae en este mes.
    const desde = r.entrada > primero ? r.entrada : primero;
    const hasta = r.salida < sumarDias(ultimo, 1) ? r.salida : sumarDias(ultimo, 1);
    const n = noches({ entrada: desde, salida: hasta });
    return s + (valor(r, moneda) / noches(r)) * n;
  }, 0);

  const lista = delMes.length ? `<ul class="lista">${delMes.map((r) => `
    <li><button type="button" class="fila" data-id="${h(r.id)}">
      <span class="txt">
        <span class="t1">${h(fechaLarga(r.entrada))} → ${h(fechaLarga(r.salida))}</span>
        <span class="t2">${noches(r)} noches${r.huesped ? ' · ' + h(r.huesped) : ''}${r.canal ? ' · ' + h(r.canal) : ''}</span>
      </span>
      <span class="monto">${fmt(valor(r, moneda), moneda)}</span>
    </button></li>`).join('')}</ul>` : '<p class="vacio card">Sin reservas este mes. Tocá un día libre para cargar una.</p>';

  main.innerHTML = `
    <div class="cal-nav">
      <button type="button" class="btn" data-mover="-1" aria-label="Mes anterior">‹</button>
      <h2 aria-live="polite">${h(nombreMes(ym).replace(/^./, (c) => c.toUpperCase()))}</h2>
      <button type="button" class="btn" data-mover="1" aria-label="Mes siguiente">›</button>
    </div>
    <div class="cal" role="group" aria-label="Días de ${h(nombreMes(ym))}">${celdas}</div>
    <div class="cal-leyenda" aria-hidden="true">
      <span><i class="m lleno"></i>Ocupado</span>
      <span><i class="m entra"></i>Entrada 16 h</span>
      <span><i class="m sale"></i>Salida 10 h</span>
    </div>
    <p class="card small"><strong>${ocupadas}</strong> de ${total} noches ocupadas (${fmtNum((ocupadas / total) * 100)} %) · Ingresos del mes: <strong>${fmt(ingresosMes, moneda)}</strong></p>
    ${mesVisto !== mesActual() ? '<button type="button" class="btn bloque" data-hoy>Ir al mes actual</button>' : ''}
    <h2>Reservas del mes</h2>
    ${lista}
    <div class="espacio-fab"></div>
    <button type="button" class="fab" data-nueva>+ Reserva</button>`;

  main.querySelectorAll('[data-mover]').forEach((b) => b.addEventListener('click', () => {
    mesVisto = sumarMeses(mesVisto, Number(b.dataset.mover));
    render(main);
  }));
  main.querySelector('[data-hoy]')?.addEventListener('click', () => { mesVisto = mesActual(); render(main); });
  main.querySelector('.cal').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fecha]')?.dataset.fecha;
    if (!f) return;
    const r = reservaDeNoche(f);
    abrirReserva(r, f);
  });
  main.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () =>
    abrirReserva(estado.reservas.find((r) => r.id === b.dataset.id))));
  main.querySelector('[data-nueva]').addEventListener('click', () => {
    const inicio = mesVisto === mesActual() ? h0 : `${mesVisto}-01`;
    abrirReserva(null, inicio);
  });
}
