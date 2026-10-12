// Más: configuración, exportar calendario, copia de seguridad.
import { estado, configurar, exportarRespaldo, importarRespaldo } from './store.js';
import { vencimientos } from './calculos.js';
import { hoy, sumarDias, sumarMeses, mesActual } from './fechas.js';
import { calendario, eventoReserva, eventoVencimiento } from './ics.js';
import { descargarCalendario, compartirArchivo, TIPOS } from './compartir.js';
import { h, aviso, confirmar, leerFormulario } from './ui.js';

export function render(main) {
  const cfg = estado.config;
  main.innerHTML = `
    <h2>Propiedad</h2>
    <form class="card" id="f-config" novalidate>
      <div class="campo">
        <label for="c-prop">Nombre</label>
        <input id="c-prop" name="propiedad" value="${h(cfg.propiedad)}">
      </div>
      <div class="campo">
        <label for="c-tc">Tipo de cambio actual (pesos por dólar)</label>
        <input id="c-tc" name="ultimoTC" type="number" inputmode="decimal" min="0" step="0.01" value="${cfg.ultimoTC}">
        <span class="ayuda">Se propone al cargar movimientos y se usa para los gastos todavía sin pagar.</span>
      </div>
      <div class="dos">
        <div class="campo">
          <label for="c-ent">Hora de entrada</label>
          <input id="c-ent" name="horaEntrada" type="time" value="${h(cfg.horaEntrada)}">
        </div>
        <div class="campo">
          <label for="c-sal">Hora de salida</label>
          <input id="c-sal" name="horaSalida" type="time" value="${h(cfg.horaSalida)}">
        </div>
      </div>
      <button class="btn primario bloque" type="submit">Guardar</button>
    </form>

    <h2>Calendario del teléfono</h2>
    <div class="card">
      <p class="small muted">Genera un archivo .ics. En Android, abrilo desde la notificación de descarga y elegí Samsung Calendar o Google Calendar para importarlo.</p>
      <div class="acciones">
        <button type="button" class="btn" data-acc="ics-reservas">Reservas</button>
        <button type="button" class="btn" data-acc="ics-vtos">Vencimientos (12 meses)</button>
      </div>
    </div>

    <h2>Excel y PDF</h2>
    <div class="card">
      <p class="small muted">Resumen en Excel del último año y PDF con gráficos para WhatsApp: próxima entrega.</p>
    </div>

    <h2>Copia de seguridad</h2>
    <div class="card">
      <p class="small muted">Los datos se guardan solo en este teléfono. Hacé una copia de vez en cuando y guardala en Drive o mandala por WhatsApp.</p>
      <div class="acciones">
        <button type="button" class="btn" data-acc="respaldo">Guardar copia</button>
        <label class="btn" for="c-restaurar">Restaurar copia</label>
        <input id="c-restaurar" type="file" accept=".json,application/json" class="sr-only">
      </div>
    </div>
    <p class="small muted" style="text-align:center;margin-top:24px">Alquileres · versión 1</p>`;

  const form = main.querySelector('#f-config');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = leerFormulario(form);
    if (!(d.ultimoTC > 0)) return aviso('El tipo de cambio tiene que ser mayor que cero.');
    await configurar({ ...d, propiedad: d.propiedad || 'Mi propiedad' });
    aviso('Configuración guardada');
  });

  main.querySelector('[data-acc="ics-reservas"]').addEventListener('click', () => {
    // Las del último año y las futuras.
    const desde = sumarDias(hoy(), -365);
    const lista = estado.reservas.filter((r) => r.salida >= desde);
    if (!lista.length) return aviso('No hay reservas para exportar.');
    descargarCalendario('reservas.ics', calendario(`${cfg.propiedad} - Reservas`, lista.map((r) => eventoReserva(r, cfg))));
  });

  main.querySelector('[data-acc="ics-vtos"]').addEventListener('click', () => {
    const h0 = hoy();
    const lista = vencimientos(estado.gastosFijos, estado.pagos, sumarMeses(mesActual(), 12))
      .filter((v) => !v.pago && v.fecha >= h0);
    if (!lista.length) return aviso('No hay vencimientos futuros.');
    descargarCalendario('vencimientos.ics', calendario(`${cfg.propiedad} - Vencimientos`, lista.map(eventoVencimiento)));
  });

  main.querySelector('[data-acc="respaldo"]').addEventListener('click', () =>
    compartirArchivo(`alquileres-copia-${hoy()}.json`, exportarRespaldo(), TIPOS.json, 'Copia de Alquileres'));

  main.querySelector('#c-restaurar').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    if (!(await confirmar('Restaurar reemplaza todos los datos actuales por los de la copia. ¿Seguir?', 'Sí, restaurar'))) return;
    try {
      await importarRespaldo(await archivo.text());
      aviso('Copia restaurada');
    } catch (err) {
      aviso(`No se pudo restaurar: ${err.message}`, 6000);
    }
  });
}
