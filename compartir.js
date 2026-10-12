// Compartir con el menú de Android (WhatsApp, etc.). Chrome solo permite compartir algunos tipos
// de archivo (PDF, CSV, imágenes, texto…); .ics y .xlsx no están en la lista, así que en esos
// casos se descarga el archivo y se indica cómo adjuntarlo.
import { aviso } from './ui.js';

export const TIPOS = {
  ics: 'text/calendar',
  json: 'application/json',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function descargar(archivo) {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function compartirArchivo(nombre, contenido, tipo, titulo) {
  const archivo = new File([contenido], nombre, { type: tipo });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: titulo });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  descargar(archivo);
  aviso(`Se descargó "${nombre}". Para mandarlo por WhatsApp: clip › Documento › Descargas.`, 7000);
}

// En Android, al abrir la descarga de un .ics se ofrece agregarlo a Samsung Calendar o Google Calendar.
export function descargarCalendario(nombre, contenido) {
  descargar(new File([contenido], nombre, { type: TIPOS.ics }));
  aviso(`Se descargó "${nombre}". Abrilo desde la notificación para agregarlo al calendario.`, 7000);
}
