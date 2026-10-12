// Estado en memoria (los datos de una propiedad son pocos) con escritura directa a IndexedDB.
import * as db from './db.js';
import { mesActual } from './fechas.js';

export const estado = { reservas: [], gastosFijos: [], pagos: [], config: null };

const CONFIG_INICIAL = {
  id: 'config',
  moneda: 'USD',        // moneda de visualización
  ultimoTC: 40,         // pesos por dólar, se actualiza con cada movimiento
  propiedad: 'Mi propiedad',
  horaEntrada: '16:00',
  horaSalida: '10:00',
};

const oyentes = new Set();
export const suscribir = (fn) => oyentes.add(fn);
const avisar = () => oyentes.forEach((fn) => fn());

export const nuevoId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export async function cargar() {
  for (const a of ['reservas', 'gastosFijos', 'pagos']) estado[a] = await db.todos(a);
  const [cfg] = await db.todos('config');
  estado.config = { ...CONFIG_INICIAL, ...cfg };
  if (!cfg) {
    await db.guardar('config', estado.config);
    await sembrarGastosFijos();
  }
}

// Gastos fijos habituales, sin importe: el usuario los completa en Gastos › Fijos.
async function sembrarGastosFijos() {
  const desde = mesActual();
  const base = [
    { concepto: 'Gastos comunes', periodicidad: 'mensual', variable: false, diaVenc: 10 },
    { concepto: 'UTE', periodicidad: 'mensual', variable: true, diaVenc: 20 },
    { concepto: 'Contribución Inmobiliaria', periodicidad: 'anual', variable: false, diaVenc: 28 },
    { concepto: 'Impuesto de Primaria', periodicidad: 'anual', variable: false, diaVenc: 28 },
  ];
  for (const g of base) {
    await guardar('gastosFijos', { ...g, moneda: 'UYU', importe: 0, desde, activo: true });
  }
}

export async function guardar(almacen, obj) {
  if (!obj.id) obj.id = nuevoId();
  await db.guardar(almacen, obj);
  const lista = estado[almacen];
  const i = lista.findIndex((x) => x.id === obj.id);
  if (i >= 0) lista[i] = obj; else lista.push(obj);
  avisar();
  return obj;
}

export async function borrar(almacen, id) {
  await db.borrar(almacen, id);
  estado[almacen] = estado[almacen].filter((x) => x.id !== id);
  avisar();
}

export async function configurar(cambios) {
  estado.config = { ...estado.config, ...cambios };
  await db.guardar('config', estado.config);
  avisar();
}

// Recordar el último tipo de cambio usado para proponerlo en el próximo movimiento.
export async function recordarTC(tc) {
  if (tc > 0 && tc !== estado.config.ultimoTC) await configurar({ ultimoTC: tc });
}

// ---- Copia de seguridad ----
export function exportarRespaldo() {
  return JSON.stringify({
    app: 'alquileres', version: 1, fecha: new Date().toISOString(),
    reservas: estado.reservas, gastosFijos: estado.gastosFijos, pagos: estado.pagos, config: estado.config,
  }, null, 2);
}

export async function importarRespaldo(texto) {
  const datos = JSON.parse(texto);
  if (datos.app !== 'alquileres') throw new Error('El archivo no es una copia de esta app.');
  for (const a of ['reservas', 'gastosFijos', 'pagos']) {
    await db.vaciar(a);
    for (const obj of datos[a] || []) await db.guardar(a, obj);
  }
  await db.vaciar('config');
  await db.guardar('config', { ...CONFIG_INICIAL, ...datos.config, id: 'config' });
  await cargar();
  avisar();
}
