// Fechas como texto "AAAA-MM-DD" y meses como "AAAA-MM"; los cálculos se hacen en UTC
// para que los cambios de huso del teléfono no corran los días.
const dos = (n) => String(n).padStart(2, '0');

export const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};
export const mesActual = () => hoy().slice(0, 7);
export const aDate = (s) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d || 1));
};
export const aTexto = (dt) => `${dt.getUTCFullYear()}-${dos(dt.getUTCMonth() + 1)}-${dos(dt.getUTCDate())}`;
export const sumarDias = (s, n) => {
  const d = aDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return aTexto(d);
};
export const diasEntre = (desde, hasta) => Math.round((aDate(hasta) - aDate(desde)) / 864e5);
export const mesDe = (s) => s.slice(0, 7);
export const sumarMeses = (ym, n) => {
  let [a, m] = ym.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${dos((total % 12) + 1)}`;
};
export const diasDelMes = (ym) => {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};
export const fechaEnMes = (ym, dia) => `${ym}-${dos(Math.min(Math.max(1, dia || 1), diasDelMes(ym)))}`;
export const listaMeses = (desde, n) => Array.from({ length: n }, (_, i) => sumarMeses(desde, i));
// Día de la semana con lunes = 0
export const diaSemana = (s) => (aDate(s).getUTCDay() + 6) % 7;

const f = (opts) => new Intl.DateTimeFormat('es-UY', { timeZone: 'UTC', ...opts });
const fCorta = f({ day: 'numeric', month: 'short' });
const fLarga = f({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fMes = f({ month: 'long', year: 'numeric' });
const fMesCorto = f({ month: 'short' });
const fMesAnio = f({ month: 'short', year: '2-digit' });

export const fechaCorta = (s) => fCorta.format(aDate(s));
export const fechaLarga = (s) => fLarga.format(aDate(s));
export const nombreMes = (ym) => fMes.format(aDate(ym));
export const mesCorto = (ym) => fMesCorto.format(aDate(ym)).replace('.', '');
export const mesAnio = (ym) => fMesAnio.format(aDate(ym)).replace('.', '');
