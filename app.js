// Arranque: carga de datos, navegación por pestañas y selector de moneda.
import { estado, cargar, suscribir, configurar } from './store.js';
import * as inicio from './vista-inicio.js';
import * as calendario from './vista-calendario.js';
import * as gastos from './vista-gastos.js';
import * as mas from './vista-mas.js';

const VISTAS = {
  inicio: { titulo: 'Inicio', vista: inicio },
  calendario: { titulo: 'Calendario', vista: calendario },
  gastos: { titulo: 'Gastos', vista: gastos },
  mas: { titulo: 'Más', vista: mas },
};

const main = document.getElementById('vista');
let actual = null;

function pestañaActual() {
  const id = location.hash.slice(1);
  return VISTAS[id] ? id : 'inicio';
}

function dibujar() {
  const id = pestañaActual();
  const { titulo, vista } = VISTAS[id];
  document.getElementById('titulo').textContent = titulo;
  document.title = `${titulo} · Alquileres`;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('#moneda-toggle button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.moneda === estado.config.moneda)));
  const y = id === actual ? window.scrollY : 0;
  vista.render(main);
  window.scrollTo(0, y);
  if (id !== actual) main.focus({ preventScroll: true });
  actual = id;
}

document.getElementById('moneda-toggle').addEventListener('click', (e) => {
  const m = e.target.closest('[data-moneda]')?.dataset.moneda;
  if (m && m !== estado.config.moneda) configurar({ moneda: m });
});

window.addEventListener('hashchange', dibujar);

(async () => {
  try {
    await cargar();
  } catch (err) {
    main.innerHTML = `<p class="card aviso">No se pudieron abrir los datos del teléfono (${err.message}).</p>`;
    return;
  }
  suscribir(dibujar);
  dibujar();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Pedir almacenamiento persistente para que el navegador no borre los datos.
  navigator.storage?.persist?.();
})();
