// Cada movimiento guarda { importe, moneda: 'USD'|'UYU', tc } donde tc = pesos por dólar del día.
export const MONEDAS = ['USD', 'UYU'];

export function convertir(importe, desde, hacia, tc) {
  if (desde === hacia) return importe;
  if (!tc) return 0;
  return desde === 'USD' ? importe * tc : importe / tc;
}
export const valor = (mov, hacia) => convertir(Number(mov.importe) || 0, mov.moneda, hacia, Number(mov.tc));

const formatos = {
  USD: new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  UYU: new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }),
};
const formatosExactos = {
  USD: new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  UYU: new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 0, maximumFractionDigits: 2 }),
};
export const fmt = (v, moneda) => formatos[moneda].format(Math.round(v) || 0);
export const fmtExacto = (v, moneda) => formatosExactos[moneda].format(v || 0);
export const fmtNum = (v, dec = 0) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: dec }).format(v || 0);
