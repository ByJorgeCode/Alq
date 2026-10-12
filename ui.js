// Utilidades de interfaz: escape de HTML, avisos y diálogo modal.
const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const h = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);

let temporizador;
export function aviso(texto, ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent = texto;
  t.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => t.classList.remove('visible'), ms);
}

const dlg = () => document.getElementById('dlg');

// Abre el diálogo con un título y un cuerpo HTML; "montar" recibe el elemento del cuerpo.
export function abrirDialogo(titulo, cuerpo, montar) {
  const d = dlg();
  d.innerHTML = `
    <div class="dlg-cab">
      <h2 id="dlg-titulo">${h(titulo)}</h2>
      <button type="button" class="cerrar" aria-label="Cerrar">&times;</button>
    </div>
    <div class="dlg-cuerpo">${cuerpo}</div>`;
  d.querySelector('.cerrar').addEventListener('click', cerrarDialogo);
  if (!d.open) d.showModal();
  montar?.(d.querySelector('.dlg-cuerpo'));
  const primero = d.querySelector('.dlg-cuerpo input, .dlg-cuerpo select, .dlg-cuerpo button');
  primero?.focus();
}

export function cerrarDialogo() {
  const d = dlg();
  if (d.open) d.close();
}

export function confirmar(mensaje, textoSi = 'Sí, borrar') {
  return new Promise((ok) => {
    abrirDialogo('Confirmar', `
      <p>${h(mensaje)}</p>
      <div class="acciones">
        <button type="button" class="btn" data-r="no">Cancelar</button>
        <button type="button" class="btn peligro" data-r="si">${h(textoSi)}</button>
      </div>`, (c) => {
      c.addEventListener('click', (e) => {
        const r = e.target.closest('[data-r]')?.dataset.r;
        if (!r) return;
        cerrarDialogo();
        ok(r === 'si');
      });
    });
  });
}

// Lee los campos de un formulario como objeto (números convertidos donde el input es numérico).
export function leerFormulario(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') datos[el.name] = el.checked;
    else if (el.type === 'number') datos[el.name] = el.value === '' ? null : Number(el.value);
    else datos[el.name] = el.value.trim();
  }
  return datos;
}
