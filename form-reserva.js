// Alta y edición de reservas.
import { estado, guardar, borrar, recordarTC } from './store.js';
import { abrirDialogo, cerrarDialogo, confirmar, leerFormulario, aviso, h } from './ui.js';
import { noches, superpuesta, CANALES } from './calculos.js';
import { sumarDias, fechaLarga, diasEntre } from './fechas.js';
import { fmt, fmtExacto } from './moneda.js';
import { eventoReserva, calendario } from './ics.js';
import { descargarCalendario } from './compartir.js';

export function abrirReserva(reserva, entradaSugerida) {
  const cfg = estado.config;
  const r = reserva || {
    entrada: entradaSugerida, salida: sumarDias(entradaSugerida, 2),
    importe: null, moneda: 'USD', tc: cfg.ultimoTC, huesped: '', canal: 'Directo', nota: '',
  };
  const opciones = CANALES.map((c) => `<option ${c === r.canal ? 'selected' : ''}>${h(c)}</option>`).join('');

  abrirDialogo(reserva ? 'Editar reserva' : 'Nueva reserva', `
    <form novalidate>
      <div class="dos">
        <div class="campo">
          <label for="f-entrada">Entrada <span class="muted small">(${h(cfg.horaEntrada)})</span></label>
          <input id="f-entrada" name="entrada" type="date" required value="${h(r.entrada)}">
        </div>
        <div class="campo">
          <label for="f-salida">Salida <span class="muted small">(${h(cfg.horaSalida)})</span></label>
          <input id="f-salida" name="salida" type="date" required value="${h(r.salida)}">
        </div>
      </div>
      <div class="campo">
        <label for="f-importe">Importe total (USD)</label>
        <input id="f-importe" name="importe" type="number" inputmode="decimal" min="0" step="0.01" required value="${r.importe ?? ''}">
      </div>
      <div class="campo">
        <label for="f-tc">Tipo de cambio (pesos por dólar)</label>
        <input id="f-tc" name="tc" type="number" inputmode="decimal" min="0" step="0.01" required value="${r.tc ?? ''}">
        <span class="ayuda">El del día de cobro. Se usa para ver los montos en pesos.</span>
      </div>
      <div class="resumen-form" id="f-resumen" aria-live="polite"></div>
      <div class="campo">
        <label for="f-huesped">Huésped <span class="muted small">(opcional)</span></label>
        <input id="f-huesped" name="huesped" autocomplete="off" value="${h(r.huesped)}">
      </div>
      <div class="campo">
        <label for="f-canal">Canal</label>
        <select id="f-canal" name="canal">${opciones}</select>
      </div>
      <div class="campo">
        <label for="f-nota">Nota <span class="muted small">(opcional)</span></label>
        <textarea id="f-nota" name="nota" rows="2">${h(r.nota)}</textarea>
      </div>
      <p class="error" id="f-error" role="alert"></p>
      <button class="btn primario bloque" type="submit">Guardar</button>
      ${reserva ? `
      <div class="acciones">
        <button type="button" class="btn" data-acc="ics">Agregar al calendario</button>
        <button type="button" class="btn peligro" data-acc="borrar">Borrar</button>
      </div>` : ''}
    </form>`, (cuerpo) => {
    const form = cuerpo.querySelector('form');
    const resumenEl = cuerpo.querySelector('#f-resumen');
    const errorEl = cuerpo.querySelector('#f-error');

    const actualizar = () => {
      const d = leerFormulario(form);
      if (!d.entrada || !d.salida || d.salida <= d.entrada) {
        resumenEl.textContent = 'Elegí una salida posterior a la entrada.';
        return;
      }
      const n = diasEntre(d.entrada, d.salida);
      let txt = `${n} ${n === 1 ? 'noche' : 'noches'} · ${fechaLarga(d.entrada)} → ${fechaLarga(d.salida)}`;
      if (d.importe > 0) {
        txt += ` · ${fmtExacto(d.importe / n, 'USD')} por noche`;
        if (d.tc > 0) txt += ` · ≈ ${fmt(d.importe * d.tc, 'UYU')}`;
      }
      resumenEl.textContent = txt;
    };
    // Al mover la entrada se conserva la cantidad de noches.
    let entradaPrevia = form.entrada.value;
    form.addEventListener('input', (e) => {
      if (e.target.name === 'entrada' && form.entrada.value) {
        const n = entradaPrevia && form.salida.value ? diasEntre(entradaPrevia, form.salida.value) : 0;
        if (n > 0) form.salida.value = sumarDias(form.entrada.value, n);
        entradaPrevia = form.entrada.value;
      }
      actualizar();
    });
    actualizar();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = leerFormulario(form);
      const error = !d.entrada || !d.salida ? 'Completá las fechas.'
        : d.salida <= d.entrada ? 'La salida tiene que ser posterior a la entrada.'
        : !(d.importe > 0) ? 'Ingresá el importe.'
        : !(d.tc > 0) ? 'Ingresá el tipo de cambio.'
        : null;
      if (error) { errorEl.textContent = error; return; }
      const choca = superpuesta(estado.reservas, d.entrada, d.salida, reserva?.id);
      if (choca) {
        errorEl.textContent = `Se superpone con otra reserva (${fechaLarga(choca.entrada)} → ${fechaLarga(choca.salida)}).`;
        return;
      }
      await guardar('reservas', { ...reserva, ...d, moneda: 'USD', creada: reserva?.creada || new Date().toISOString() });
      await recordarTC(d.tc);
      cerrarDialogo();
      aviso(reserva ? 'Reserva actualizada' : 'Reserva guardada');
    });

    cuerpo.querySelector('[data-acc="ics"]')?.addEventListener('click', () => {
      const nombre = `reserva-${reserva.entrada}.ics`;
      descargarCalendario(nombre, calendario(cfg.propiedad, [eventoReserva(reserva, cfg)]));
    });
    cuerpo.querySelector('[data-acc="borrar"]')?.addEventListener('click', async () => {
      if (await confirmar(`¿Borrar la reserva del ${fechaLarga(reserva.entrada)} (${noches(reserva)} noches)?`)) {
        await borrar('reservas', reserva.id);
        aviso('Reserva borrada');
      }
    });
  });
}
