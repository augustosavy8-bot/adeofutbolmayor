# Puntos de venta — Buffet y Entrada

Dos puestos con la misma app: el **buffet** (`/buffet`) y la **boletería**
(`/entrada`). Cada uno corre en su propia tablet Android con Chrome, instalado
como PWA, con su propia tickeadora. **Funcionan sin internet**: la base vive en
la tablet (IndexedDB) y sube a Supabase recién cuando hay red.

Comparten todo el motor — base, impresora, cierre, sincronización — pero cada
puesto tiene **su lista de productos y su propio turno**, así los arqueos no se
mezclan. Cada tablet instala el acceso directo de su puesto: son dos manifests
distintos (`/manifest-buffet.webmanifest` y `/manifest-entrada.webmanifest`).

## Diferencias entre los dos

| | Buffet | Entrada |
|---|---|---|
| Cómo se cobra | carrito con varios productos, después el medio de pago | un toque = una entrada, sin carrito |
| Ticket | opcional (toggle en Config) | **siempre**, es lo que se muestra para pasar |
| Pantalla | grilla por categoría + carrito | tres botones grandes + contador de ingresados |

La boletería arranca con los precios del clásico ya cargados: **General
$12.000**, **Deportista $5.000** y **Menor de 12 sin cargo**. El menor no paga
pero se registra igual, para contarlo como ingresado y darle su ticket. Los
tres se editan desde Config como cualquier producto.

No usa la sesión del panel. Se entra con un PIN de 4 dígitos por cajero, que se
guarda hasheado en la tablet.

---

## 1. Instalar la PWA en la tablet

1. Con conexión, abrí Chrome y entrá a la URL **del puesto de esa tablet**:
   - buffet → `https://adeofutbolmayor-augusavy.vercel.app/buffet`
   - entrada → `https://adeofutbolmayor-augusavy.vercel.app/entrada`
2. Menú de Chrome (⋮) → **Agregar a pantalla principal** / *Instalar app*.
3. Abrila desde el ícono nuevo, no desde Chrome: así arranca a pantalla
   completa y sin barra de direcciones.
4. **Dejala abierta un minuto la primera vez.** El service worker descarga todo
   lo que necesita para andar offline. Después podés poner la tablet en modo
   avión y comprobar que abre igual.

La primera vez que entrás, si no hay ningún cajero cargado, la pantalla de
login te pide crear el primero (nombre + PIN). Los demás se agregan desde
**Config**.

Después cargá los productos en **Config**: sin productos no hay nada para
vender.

> Cuando se publica una versión nueva, la tablet la toma sola la próxima vez
> que abra con conexión.

---

## 2. Conectar la impresora (Xprinter XP-80)

Hay **tres formas** de llegar al papel y se eligen en **Config → Impresora**.
Ninguna anda en todos lados, por eso están las tres:

| Forma | Dónde anda | Diálogo por ticket |
|---|---|---|
| **USB directo** (WebUSB) | Tablet Android | No |
| **Puerto COM** (Web Serial) | Windows con el driver instalado, o cable serie | No |
| **Driver de Windows** | Cualquier PC con la impresora instalada | Sí (se saca, ver abajo) |

En **Automático** prueba USB y después COM. El driver de Windows hay que
elegirlo a mano, porque es el único que abre un diálogo.

Después de conectar, usá **Config → Probar impresión**: saca un ticket con una
regla numerada del 1 al 48. Si la regla entra en un solo renglón, el ancho está
bien.

**Si la impresora no está**, la venta se cobra y se guarda igual — sale un
aviso de que no se pudo imprimir, pero nunca se traba el cobro.

### En la tablet Android — USB directo

1. Conectá la impresora con un **cable OTG** (USB-C a USB-A hembra), encendida.
2. Si Android pregunta qué hacer con el dispositivo USB, dale permiso.
   En algunos hay que habilitar **OTG** en Ajustes → Conexiones.
3. **Config → Impresora → USB directo → Conectar**, elegila de la lista.

El permiso queda guardado: cada vez que abrís la app se reconecta sola.

**Si no aparece en la lista:** probá otro cable OTG (muchos son sólo de carga y
no pasan datos), actualizá Chrome, y fijate que la app esté abierta por HTTPS.

### En Windows — puerto COM

En Windows, **USB directo casi siempre da "Access denied"**. No es un problema
de la app ni de los drivers: apenas enchufás la impresora, Windows le asigna un
driver genérico (`usbprint.sys`) y el navegador no puede usar un aparato que ya
tomó el sistema. Pasa con el driver de Xprinter instalado y sin él.

El puerto COM esquiva eso: en vez de pelearle el aparato al driver, le habla al
puerto serie que el propio driver publica.

1. En **Panel de control → Dispositivos e impresoras**, botón derecho sobre la
   XP-80 → **Propiedades** → pestaña **Puertos**. Anotá el COM que tiene
   asignado (COM1, COM3, etc.).
   - Si está en `USB00x` en vez de un COM, instalá el paquete de driver de
     Xprinter eligiendo la interfaz **Serial**, o usá el driver
     **Generic / Text Only** sobre el puerto COM.
   - Con cable serie directo, el COM ya está.
2. La velocidad tiene que coincidir con la de la impresora: **9600 baudios**,
   que es la de fábrica. Se ve en el ticket de autotest (apagá la impresora,
   mantené **FEED** y encendela).
3. En la app: **Config → Impresora → Puerto COM → Conectar**, elegí el puerto.

### En Windows — driver de Windows (siempre funciona)

Le manda el ticket al driver como documento, igual que cualquier programa de
escritorio. No hay nada que emparejar: elegilo en **Config → Impresora** y
listo.

El costo es que Chrome muestra el diálogo de impresión en cada ticket. Para
sacarlo, abrí Chrome con **`--kiosk-printing`**: imprime directo en la
impresora predeterminada, sin preguntar.

Creá un acceso directo con este destino (ajustá la ruta y la URL):

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://TU-DOMINIO/buffet
```

Y dejá la XP-80 como **impresora predeterminada** de Windows, con el tamaño de
papel en **80 mm** y el **corte automático** activado en las propiedades del
driver (el corte lo hace el driver, no la app).

---

## 3. Cierre de caja

Al abrir turno se carga el **fondo inicial**: la plata con la que arranca la
caja. Se usa para el arqueo.

Durante el turno:
- **Venta** cobra.
- **Ventas** lista lo cobrado y permite **anular**. Anular no borra: la venta
  queda marcada y aparece en el cierre, aparte y sin sumar a los totales.

Al terminar, **Cierre** → *Imprimir cierre y cerrar turno*. El ticket sale en
texto e incluye:

- club, fecha, cajero, hora de apertura y de cierre
- cantidad y total por producto, de mayor a menor
- subtotal por medio de pago
- ventas anuladas y su monto
- fondo inicial, **efectivo esperado en caja** (fondo + cobrado en efectivo) y
  total general

Primero imprime y después cierra: si la impresora falla, el turno **queda
abierto** y podés reintentar sin perder el arqueo. Si querés cerrar igual sin
ticket, aparece un botón para hacerlo.

Al cerrar, la app vuelve al login e intenta sincronizar.

---

## 4. Sincronización

Sube `buffet_turnos` y `buffet_ventas`, y baja el catálogo desde
`buffet_productos`. Los id se generan en la tablet, así que subir dos veces lo
mismo no duplica nada. Una fila se marca como sincronizada **solo** si el
servidor confirmó.

Se dispara sola cuando la tablet recupera conexión, y a mano desde
**Config → Sincronizar ahora**.

Al bajar productos, un cambio hecho en la tablet y todavía sin subir **gana**
sobre el del servidor: no se pisa lo que el buffet acaba de corregir.

### Requisito: sesión de Supabase en esa tablet

Las tablas del buffet tienen RLS y solo aceptan escrituras de un usuario
logueado. **Una vez por tablet**, entrá a `/login` con un usuario del panel y
listo: la sesión queda guardada en ese navegador y se renueva sola.

Esto no afecta la operación diaria — vender, anular y cerrar andan sin red y
sin esa sesión. Solo hace falta para que el sync escriba.

> Si prefieren que la tablet suba sin ninguna sesión, hay que agregar políticas
> para el rol `anon` en `supabase/migrations/0007_buffet.sql`. Tener en cuenta
> que la anon key es pública: cualquiera que la tenga podría escribir en esas
> tablas.

### Si nunca hay red

El sistema no la necesita. Todo el circuito —abrir turno, vender, anular,
cerrar e imprimir— corre contra la base de la tablet.

- **Config → Reporte de turnos** imprime en papel el consolidado de los turnos
  cerrados del puesto: fecha, cajero, ventas, efectivo y total de cada uno, más
  el total general. Los que todavía no subieron salen marcados con `*`.
- **Config → Ver ticket de venta / Ver cierre de este turno** muestran en
  pantalla, a 48 columnas, exactamente lo que saldría por el papel. Sirve para
  revisar el formato sin impresora, y el panel tiene su propio botón de
  imprimir.
- **Config → Exportar turnos (JSON)** baja o comparte (mail, WhatsApp) todo lo
  que hay en la tablet: turnos, ventas y productos.

Lo único que necesita conexión es la **sincronización con Supabase**, que es
opcional: sirve para tener los datos en el servidor, no para operar.

---

## Cómo está armado

| Qué | Dónde |
|---|---|
| Base local (Dexie/IndexedDB) | `src/db/buffet.ts` |
| Estado de sesión y carrito | `src/lib/buffet/estado.tsx` |
| Cálculo del arqueo | `src/lib/buffet/cierre.ts` |
| Armado de tickets (texto) | `src/lib/buffet/ticket.ts` |
| Impresora (USB, COM y driver) | `src/lib/printer/` |
| Sincronización | `src/lib/buffet-sync.ts` |
| Pantallas | `src/components/buffet/` |
| Rutas | `src/app/buffet/` y `src/app/entrada/` |
| Service worker | `src/app/sw.ts` + `next.config.mjs` |
| SQL | `supabase/migrations/0007_buffet.sql` y `0008_buffet_puesto.sql` |

Todo `/buffet` y `/entrada` es client-side: las páginas importan la pantalla con
`ssr: false` porque hablan con IndexedDB y la impresora, que no existen en el
servidor. Además los dos quedan fuera del matcher del middleware, así que no
pasan por la sesión de Supabase ni pagan esa latencia. Los `layout.tsx` sí son
server components, pero solo para declarar el manifest: no hacen ningún fetch.

El driver de impresión está detrás de la interfaz `Printer`
(`connect`, `printText`, `printRaster`, `cut`). Para sumar Bluetooth alcanza
con otra clase que la cumpla, sin tocar las pantallas.
