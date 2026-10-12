// Acceso mínimo a IndexedDB: un almacén por entidad, clave "id".
const NOMBRE = 'alquileres';
const VERSION = 1;
export const ALMACENES = ['reservas', 'gastosFijos', 'pagos', 'config'];

let conexion;
function abrir() {
  if (!conexion) {
    conexion = new Promise((ok, mal) => {
      const req = indexedDB.open(NOMBRE, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const a of ALMACENES) {
          if (!db.objectStoreNames.contains(a)) db.createObjectStore(a, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => mal(req.error);
    });
  }
  return conexion;
}

async function transaccion(almacen, modo, fn) {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const tx = db.transaction(almacen, modo);
    const req = fn(tx.objectStore(almacen));
    tx.oncomplete = () => ok(req ? req.result : undefined);
    tx.onerror = () => mal(tx.error);
    tx.onabort = () => mal(tx.error);
  });
}

export const todos = (almacen) => transaccion(almacen, 'readonly', (s) => s.getAll());
export const guardar = (almacen, obj) => transaccion(almacen, 'readwrite', (s) => { s.put(obj); });
export const borrar = (almacen, id) => transaccion(almacen, 'readwrite', (s) => { s.delete(id); });
export const vaciar = (almacen) => transaccion(almacen, 'readwrite', (s) => { s.clear(); });
