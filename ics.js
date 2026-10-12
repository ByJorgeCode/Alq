// Archivos de calendario (iCalendar, RFC 5545). Uruguay usa UTC-3 todo el año,
// así que las horas se escriben en UTC y cualquier calendario las muestra bien.
import { sumarDias, aDate } from './fechas.js';
import { noches, PERIODICIDADES } from './calculos.js';
import { fmt } from './moneda.js';

const OFFSET_UY = 3;
const BARRA = String.fromCharCode(92);
const escapar = (t) => String(t ?? '').replace(/[\;,]/g, (c) => BARRA + c).replace(/\r?\n/g, BARRA + 'n');
const plegar = (linea) => {
  const partes = [];
  while (linea.length > 73) { partes.push(linea.slice(0, 73)); linea = ' ' + linea.slice(73); }
  partes.push(linea);
  return partes.join('\r\n');
};
const sinSeparadores = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const enUTC = (fecha, hora) => {
  const [h, m] = hora.split(':').map(Number);
  const d = aDate(fecha);
  d.setUTCHours(h + OFFSET_UY, m);
  return sinSeparadores(d.toISOString());
};
const soloFecha = (s) => s.replace(/-/g, '');
const sello = () => sinSeparadores(new Date().toISOString());

const evento = (campos) => ['BEGIN:VEVENT', ...campos.filter(Boolean), 'END:VEVENT'];

export function eventoReserva(r, config) {
  const n = noches(r);
  const titulo = `Reserva${r.huesped ? ': ' + r.huesped : ''} (${n} ${n === 1 ? 'noche' : 'noches'})`;
  const detalle = [
    `Entrada ${config.horaEntrada} - Salida ${config.horaSalida}`,
    `Importe: ${fmt(r.importe, r.moneda)}`,
    r.canal && `Canal: ${r.canal}`,
    r.nota,
  ].filter(Boolean).join('\n');
  return evento([
    `UID:reserva-${r.id}@alquileres`,
    `DTSTAMP:${sello()}`,
    `DTSTART:${enUTC(r.entrada, config.horaEntrada)}`,
    `DTEND:${enUTC(r.salida, config.horaSalida)}`,
    `SUMMARY:${escapar(titulo)}`,
    `DESCRIPTION:${escapar(detalle)}`,
    config.propiedad && `LOCATION:${escapar(config.propiedad)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(titulo)}`, 'TRIGGER:-P1D', 'END:VALARM',
  ]);
}

export function eventoVencimiento(v) {
  const f = v.fijo;
  const titulo = `Vence: ${f.concepto}`;
  const detalle = `${PERIODICIDADES[f.periodicidad]}${f.importe ? ` - estimado ${fmt(f.importe, f.moneda)}` : ''}`;
  return evento([
    `UID:vto-${f.id}-${v.periodo}@alquileres`,
    `DTSTAMP:${sello()}`,
    `DTSTART;VALUE=DATE:${soloFecha(v.fecha)}`,
    `DTEND;VALUE=DATE:${soloFecha(sumarDias(v.fecha, 1))}`,
    `SUMMARY:${escapar(titulo)}`,
    `DESCRIPTION:${escapar(detalle)}`,
    'TRANSP:TRANSPARENT',
    // Aviso a las 9:00 del día anterior
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(titulo)}`, 'TRIGGER:-PT15H', 'END:VALARM',
  ]);
}

export function calendario(nombre, eventos) {
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Alquileres//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapar(nombre)}`,
    ...eventos.flat(),
    'END:VCALENDAR',
  ];
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
