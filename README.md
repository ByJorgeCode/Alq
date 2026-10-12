# Alquileres

App web instalable (PWA) para registrar las reservas y los gastos de una propiedad, con indicadores en USD o en pesos.
Los datos se guardan solo en el teléfono (IndexedDB), sin servidor.

## Probar en la PC

```
python servir.py
```
Abrir http://localhost:8765

## Instalar en el teléfono

Para instalarla hay que publicarla con HTTPS. La opción gratis es GitHub Pages: subir esta carpeta a un repositorio,
activar Pages y abrir la dirección en Chrome del teléfono › menú › **Agregar a pantalla principal**.

## Estructura

| Archivo | Qué hace |
|---|---|
| `js/store.js` | Estado en memoria y guardado en IndexedDB, copia de seguridad |
| `js/calculos.js` | Indicadores, vencimientos de gastos fijos, superposición de reservas |
| `js/moneda.js` | Conversión USD/UYU con el tipo de cambio de cada movimiento |
| `js/ics.js` | Archivos de calendario (.ics) para reservas y vencimientos |
| `js/compartir.js` | Compartir con el menú de Android o descargar |
| `js/vista-*.js` | Pantallas: Inicio, Calendario, Gastos, Más |
| `js/form-*.js` | Formularios de reserva, pagos, arreglos y gastos fijos |
| `sw.js` | Funcionamiento sin conexión |

## Criterios

- Entrada 16:00, salida 10:00 (configurable). Salir y entrar el mismo día no es superposición.
- Ingresos repartidos por noche; gastos fijos repartidos en los meses que cubren (anual = 1/12 por mes);
  arreglos en el mes de pago; vencimientos sin pagar cuentan por su importe estimado.
- Cada movimiento guarda su tipo de cambio: la conversión usa el de su fecha, no el de hoy.
- Chrome en Android no deja compartir .ics ni .xlsx directo a WhatsApp: se descargan y se adjuntan desde el clip.
