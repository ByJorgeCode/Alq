// Indicadores y vencimientos. Todo se calcula en la moneda pedida usando el tipo de cambio
// guardado en cada movimiento (el de su fecha), nunca el de hoy.
import { diasEntre, sumarDias, mesDe, sumarMeses, listaMeses, fechaEnMes, diasDelMes, hoy } from './fechas.js';
import { valor, convertir } from './moneda.js';

export const PASO = { mensual: 1, trimestral: 3, anual: 12 };
export const PERIODICIDADES = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };
export const RUBROS = ['Pintura', 'Mobiliario', 'Electrodomésticos', 'Sanitaria', 'Electricidad', 'Jardín', 'Otros'];
export const CANALES = ['Directo', 'Airbnb', 'Booking', 'Inmobiliaria', 'Otro'];

export const noches = (r) => diasEntre(r.entrada, r.salida);

// Las reservas no se superponen si una sale (10 h) el mismo día que entra la otra (16 h).
export const superpuesta = (reservas, entrada, salida, excluirId) =>
  reservas.find((r) => r.id !== excluirId && entrada < r.salida && r.entrada < salida);

// Vencimientos de los gastos fijos activos desde su mes de inicio hasta "hastaYM" (inclusive).
export function vencimientos(fijos, pagos, hastaYM) {
  const lista = [];
  for (const f of fijos) {
    if (f.activo === false || !f.desde) continue;
    const paso = PASO[f.periodicidad] || 1;
    for (let ym = f.desde; ym <= hastaYM; ym = sumarMeses(ym, paso)) {
      lista.push({
        fijo: f, periodo: ym, fecha: fechaEnMes(ym, f.diaVenc),
        pago: pagos.find((p) => p.fijoId === f.id && p.periodo === ym),
      });
    }
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function pendientes(estado, diasAdelante = 45) {
  const limite = sumarDias(hoy(), diasAdelante);
  return vencimientos(estado.gastosFijos, estado.pagos, mesDe(limite))
    .filter((v) => !v.pago && v.fecha <= limite);
}

// Resumen de "n" meses empezando en "desde" (AAAA-MM).
// Gastos fijos: repartidos en los meses que cubren (un anual = 1/12 por mes).
// Arreglos: en el mes en que se pagaron.
export function resumen(estado, desde, n, moneda) {
  const { reservas, gastosFijos, pagos, config } = estado;
  const meses = listaMeses(desde, n);
  const hasta = meses[n - 1];
  const filas = Object.fromEntries(meses.map((ym) => [ym, {
    ym, ingresos: 0, noches: 0, dias: diasDelMes(ym), fijos: 0, arreglos: 0,
  }]));
  const sumar = (ym, campo, v) => { if (filas[ym]) filas[ym][campo] += v; };
  const repartir = (periodo, paso, total) => {
    for (let i = 0; i < paso; i++) sumar(sumarMeses(periodo, i), 'fijos', total / paso);
  };

  // Ingresos: el importe de la reserva se reparte por noche.
  for (const r of reservas) {
    const cant = noches(r);
    if (cant <= 0) continue;
    const porNoche = valor(r, moneda) / cant;
    for (let i = 0; i < cant; i++) {
      const ym = mesDe(sumarDias(r.entrada, i));
      sumar(ym, 'ingresos', porNoche);
      sumar(ym, 'noches', 1);
    }
  }

  let mantenimiento = 0, inversion = 0;
  for (const p of pagos) {
    if (p.tipo === 'fijo') {
      repartir(p.periodo, p.paso || 1, valor(p, moneda));
    } else {
      const ym = mesDe(p.fecha);
      if (!filas[ym]) continue;
      const v = valor(p, moneda);
      sumar(ym, 'arreglos', v);
      if (p.clase === 'inversion') inversion += v; else mantenimiento += v;
    }
  }

  // Vencimientos aún sin pagar: cuentan por su importe estimado (tipo de cambio más reciente).
  for (const v of vencimientos(gastosFijos, pagos, hasta)) {
    if (v.pago) continue;
    const f = v.fijo;
    repartir(v.periodo, PASO[f.periodicidad] || 1, convertir(Number(f.importe) || 0, f.moneda, moneda, config.ultimoTC));
  }

  const lista = meses.map((ym) => filas[ym]);
  const tot = lista.reduce((a, f) => {
    a.ingresos += f.ingresos; a.noches += f.noches; a.dias += f.dias; a.fijos += f.fijos; a.arreglos += f.arreglos;
    return a;
  }, { ingresos: 0, noches: 0, dias: 0, fijos: 0, arreglos: 0 });

  const inicio = `${desde}-01`;
  const fin = `${hasta}-${diasDelMes(hasta)}`;
  const estadias = reservas.filter((r) => r.entrada >= inicio && r.entrada <= fin);

  tot.gastos = tot.fijos + tot.arreglos;
  tot.neto = tot.ingresos - tot.gastos;
  tot.margen = tot.ingresos ? tot.neto / tot.ingresos : 0;
  tot.ocupacion = tot.dias ? tot.noches / tot.dias : 0;
  tot.precioNoche = tot.noches ? tot.ingresos / tot.noches : 0;
  tot.reservas = estadias.length;
  tot.estadiaMedia = estadias.length ? estadias.reduce((s, r) => s + noches(r), 0) / estadias.length : 0;
  tot.fijosMes = tot.fijos / n;
  tot.equilibrio = tot.precioNoche ? tot.fijosMes / tot.precioNoche : null; // noches por mes
  tot.mantenimiento = mantenimiento;
  tot.inversion = inversion;
  tot.conDatos = tot.ingresos > 0 || tot.gastos > 0;

  return { meses: lista, total: tot, desde, hasta };
}

export function proximaReserva(reservas) {
  const h = hoy();
  return reservas.filter((r) => r.salida > h).sort((a, b) => a.entrada.localeCompare(b.entrada))[0];
}
