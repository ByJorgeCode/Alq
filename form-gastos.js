// Formularios de gastos: pago de un vencimiento, arreglo/gasto puntual y gasto fijo.
import { estado, guardar, borrar, recordarTC } from './store.js';
import { abrirDialogo, cerrarDialogo, confirmar, leerFormulario, aviso, h } from './ui.js';
import { PASO, PERIODICIDADES, RUBROS } from './calculos.js';
import { hoy, mesActual, nombreMes, fechaLarga } from './fechas.js';
import { fmt, convertir, MONEDAS } from './moneda.js';

const opciones = (lista, actual) =>
  lista.map((v) => {
    const [valor, texto] = Array.isArray(v) ? v : [v, v];
    return `<option value="${h(valor)}" ${valor === actual ? 'selected' : ''}>${h(texto)}</option>`;
  }).join('');

// Importe + moneda + tipo de cambio, con la equivalencia en la otra moneda.
function bloqueImporte(m, etiqueta = 'Importe') {
  return `
    <div class="dos">
      <div class="campo">
        <label for="g-importe">${h(etiqueta)}</label>
        <input id="g-importe" name="importe" type="number" inputmode="decimal" min="0" step="0.01" value="${m.importe || ''}">
      </div>
      <div class="campo">
        <label for="g-moneda">Moneda</label>
        <select id="g-moneda" name="moneda">${opciones(MONEDAS, m.moneda)}</select>
      </div>
    </div>
    <div class="campo">
      <label for="g-tc">Tipo de cambio (pesos por dólar)</label>
      <input id="g-tc" name="tc" type="number" inputmode="decimal" min="0" step="0.01" value="${m.tc || estado.config.ultimoTC}">
      <span class="ayuda" id="g-equiv" aria-live="polite"></span>
    </div>`;
}

function vigilarEquivalencia(form) {
  const el = form.querySelector('#g-equiv');
  const act = () => {
    const d = leerFormulario(form);
    const otra = d.moneda === 'USD' ? 'UYU' : 'USD';
    el.textContent = d.importe > 0 && d.tc > 0
      ? `Equivale a ${fmt(convertir(d.importe, d.moneda, otra, d.tc), otra)}`
      : 'El del día del pago.';
  };
  form.addEventListener('input', act);
  act();
}

const validarImporte = (d) => !(d.importe > 0) ? 'Ingresá el importe.' : !(d.tc > 0) ? 'Ingresá el tipo de cambio.' : null;

const botonesPie = (existe) => `
  <p class="error" id="g-error" role="alert"></p>
  <button class="btn primario bloque" type="submit">Guardar</button>
  ${existe ? '<div class="acciones"><button type="button" class="btn peligro" data-acc="borrar">Borrar</button></div>' : ''}`;

function alBorrar(cuerpo, mensaje, almacen, id, texto) {
  cuerpo.querySelector('[data-acc="borrar"]')?.addEventListener('click', async () => {
    if (await confirmar(mensaje)) { await borrar(almacen, id); aviso(texto); }
  });
}

// ---- Pago de un gasto fijo (desde un vencimiento o editando un pago existente) ----
export function abrirPago({ fijo, periodo, pago }) {
  const base = pago || { fecha: hoy(), importe: fijo.importe, moneda: fijo.moneda, tc: estado.config.ultimoTC };
  const etiquetaPeriodo = fijo.periodicidad === 'anual' ? `Año desde ${nombreMes(periodo)}` : nombreMes(periodo);
  abrirDialogo(pago ? 'Editar pago' : 'Registrar pago', `
    <form novalidate>
      <div class="resumen-form"><strong>${h(fijo.concepto)}</strong> · ${h(etiquetaPeriodo)}</div>
      <div class="campo">
        <label for="g-fecha">Fecha de pago</label>
        <input id="g-fecha" name="fecha" type="date" value="${h(base.fecha)}">
      </div>
      ${bloqueImporte(base, fijo.variable ? 'Importe real' : 'Importe')}
      ${botonesPie(!!pago)}
    </form>`, (cuerpo) => {
    const form = cuerpo.querySelector('form');
    vigilarEquivalencia(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = leerFormulario(form);
      const error = !d.fecha ? 'Indicá la fecha.' : validarImporte(d);
      if (error) { cuerpo.querySelector('#g-error').textContent = error; return; }
      await guardar('pagos', {
        ...pago, ...d, tipo: 'fijo', fijoId: fijo.id, periodo, paso: PASO[fijo.periodicidad] || 1, concepto: fijo.concepto,
      });
      // Si el gasto fijo no tenía importe estimado, se toma el de este pago.
      if (!fijo.importe) await guardar('gastosFijos', { ...fijo, importe: d.importe, moneda: d.moneda });
      await recordarTC(d.tc);
      cerrarDialogo();
      aviso('Pago registrado');
    });
    if (pago) alBorrar(cuerpo, `¿Borrar el pago de ${fijo.concepto} (${etiquetaPeriodo})?`, 'pagos', pago.id, 'Pago borrado');
  });
}

// ---- Arreglo o gasto puntual ----
export function abrirArreglo(pago) {
  const base = pago || { fecha: hoy(), descripcion: '', rubro: 'Pintura', clase: 'mantenimiento', proveedor: '', moneda: 'UYU', nota: '' };
  const clases = [['mantenimiento', 'Mantenimiento'], ['inversion', 'Inversión / mejora']];
  abrirDialogo(pago ? 'Editar arreglo' : 'Nuevo arreglo o gasto', `
    <form novalidate>
      <div class="campo">
        <label for="g-desc">Descripción</label>
        <input id="g-desc" name="descripcion" placeholder="Ej.: pintura del living" value="${h(base.descripcion)}">
      </div>
      <div class="dos">
        <div class="campo">
          <label for="g-rubro">Rubro</label>
          <select id="g-rubro" name="rubro">${opciones(RUBROS, base.rubro)}</select>
        </div>
        <div class="campo">
          <label for="g-clase">Tipo</label>
          <select id="g-clase" name="clase">${opciones(clases, base.clase)}</select>
        </div>
      </div>
      <div class="campo">
        <label for="g-fecha">Fecha</label>
        <input id="g-fecha" name="fecha" type="date" value="${h(base.fecha)}">
      </div>
      ${bloqueImporte(base)}
      <div class="campo">
        <label for="g-prov">Proveedor <span class="muted small">(opcional)</span></label>
        <input id="g-prov" name="proveedor" autocomplete="off" value="${h(base.proveedor)}">
      </div>
      <div class="campo">
        <label for="g-nota">Nota <span class="muted small">(opcional)</span></label>
        <textarea id="g-nota" name="nota" rows="2">${h(base.nota)}</textarea>
      </div>
      ${botonesPie(!!pago)}
    </form>`, (cuerpo) => {
    const form = cuerpo.querySelector('form');
    vigilarEquivalencia(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = leerFormulario(form);
      const error = !d.descripcion ? 'Escribí una descripción.' : !d.fecha ? 'Indicá la fecha.' : validarImporte(d);
      if (error) { cuerpo.querySelector('#g-error').textContent = error; return; }
      await guardar('pagos', { ...pago, ...d, tipo: 'puntual' });
      await recordarTC(d.tc);
      cerrarDialogo();
      aviso('Gasto guardado');
    });
    if (pago) alBorrar(cuerpo, `¿Borrar "${pago.descripcion}" del ${fechaLarga(pago.fecha)}?`, 'pagos', pago.id, 'Gasto borrado');
  });
}

// ---- Gasto fijo (plantilla que genera vencimientos) ----
export function abrirFijo(fijo) {
  const base = fijo || {
    concepto: '', periodicidad: 'mensual', moneda: 'UYU', importe: 0, variable: false,
    desde: mesActual(), diaVenc: 10, activo: true,
  };
  const tienePagos = !!fijo && estado.pagos.some((p) => p.fijoId === fijo.id);
  const marcado = (v) => (v ? 'checked' : '');
  abrirDialogo(fijo ? 'Editar gasto fijo' : 'Nuevo gasto fijo', `
    <form novalidate>
      <div class="campo">
        <label for="g-concepto">Concepto</label>
        <input id="g-concepto" name="concepto" value="${h(base.concepto)}">
      </div>
      <div class="dos">
        <div class="campo">
          <label for="g-per">Se paga</label>
          <select id="g-per" name="periodicidad">${opciones(Object.entries(PERIODICIDADES), base.periodicidad)}</select>
        </div>
        <div class="campo">
          <label for="g-dia">Día de vencimiento</label>
          <input id="g-dia" name="diaVenc" type="number" inputmode="numeric" min="1" max="31" value="${base.diaVenc}">
        </div>
      </div>
      <div class="campo">
        <label for="g-desde">Primer vencimiento (mes)</label>
        <input id="g-desde" name="desde" type="month" value="${h(base.desde)}">
        <span class="ayuda">En los anuales, el mes en que se paga cada año.</span>
      </div>
      <div class="dos">
        <div class="campo">
          <label for="g-importe">Importe estimado</label>
          <input id="g-importe" name="importe" type="number" inputmode="decimal" min="0" step="0.01" value="${base.importe || ''}">
        </div>
        <div class="campo">
          <label for="g-moneda">Moneda</label>
          <select id="g-moneda" name="moneda">${opciones(MONEDAS, base.moneda)}</select>
        </div>
      </div>
      <div class="campo">
        <label><input type="checkbox" name="variable" ${marcado(base.variable)}> El importe cambia cada vez (ej.: UTE)</label>
        <label><input type="checkbox" name="activo" ${marcado(base.activo !== false)}> Activo (genera vencimientos)</label>
      </div>
      ${botonesPie(!!fijo)}
    </form>`, (cuerpo) => {
    const form = cuerpo.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = leerFormulario(form);
      const error = !d.concepto ? 'Escribí el concepto.'
        : !d.desde ? 'Indicá el mes del primer vencimiento.'
        : !(d.diaVenc >= 1 && d.diaVenc <= 31) ? 'El día de vencimiento va de 1 a 31.'
        : null;
      if (error) { cuerpo.querySelector('#g-error').textContent = error; return; }
      await guardar('gastosFijos', { ...fijo, ...d, importe: d.importe || 0 });
      cerrarDialogo();
      aviso('Gasto fijo guardado');
    });
    cuerpo.querySelector('[data-acc="borrar"]')?.addEventListener('click', async () => {
      if (tienePagos) {
        aviso('Tiene pagos registrados. Para que no genere más vencimientos, desmarcá Activo.', 6000);
        return;
      }
      if (await confirmar(`¿Borrar el gasto fijo ${fijo.concepto}?`)) {
        await borrar('gastosFijos', fijo.id);
        aviso('Gasto fijo borrado');
      }
    });
  });
}
