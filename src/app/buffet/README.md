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

El PIN dice **quién está en la caja** para el arqueo del cierre; no protege la
plata ni los datos. El que tiene la tablet en la mano ya puede vender, así que
desde el login se puede **agregar un cajero** o **cambiar un PIN olvidado** sin
pedir el anterior. Es a propósito: si hiciera falta el PIN viejo para
cambiarlo, olvidarlo dejaría esa caja inaccesible para siempre.

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
login te pide crear el primero (nombre + PIN). Después se agregan más desde
**Config** o desde el mismo login, con **+ Agregar cajero**.

**Si nadie se acuerda el PIN de una caja:** tocá esa caja y después
**Olvidé el PIN**. Se pone uno nuevo y se entra en el momento. No se pierde
nada: el turno abierto, las ventas y el fondo quedan como estaban.

Después cargá los productos en **Config**: sin productos no hay nada para
vender.

> Cuando se publica una versión nueva, la tablet la toma sola la próxima vez
> que abra con conexión.

---

## 2. Impresoras

El sistema maneja **dos impresoras**, y se elige cuál hay en
**Config → Impresora**:

| | XP-80 (mostrador) | GOOJPRT (portátil) |
|---|---|---|
| Papel | 80 mm | 58 mm |
| Columnas del ticket | 48 | 32 |
| Corte | guillotina | a mano (avanza 5 líneas) |
| Se conecta por | USB, COM, red, driver | Bluetooth, USB, driver |

Elegir una **reformatea todos los tickets solos**: la venta, la entrada, el
cierre y el reporte se rearman al ancho que corresponda. En 32 columnas los
nombres largos se recortan (`2 x Choripan con chimich   $ 7.000`), que es lo
que entra en 58 mm.

Al cambiar de impresora la conexión vuelve a **Automático**, porque la que
servía para una no tiene por qué servir para la otra.

Después de conectar, usá **Config → Probar impresión**: saca un ticket con una
regla numerada. Si la regla entra en un solo renglón y termina donde termina
el papel, el ancho está bien.

**Si la impresora no está**, la venta se cobra y se guarda igual — sale un
aviso de que no se pudo imprimir, pero nunca se traba el cobro.

### Formas de conectarse

| Forma | Dónde anda | Diálogo por ticket |
|---|---|---|
| **USB directo** (WebUSB) | Tablet Android | No |
| **Puerto COM** (Web Serial) | Windows con el driver instalado | No |
| **Bluetooth** (Web Bluetooth) | La portátil, en Chrome Android | No |
| **Red** (puerto 9100) | XP-80 con cable de red | No |
| **Driver del sistema** | Cualquier PC con la impresora instalada | Sí (se saca) |

**Lo normal es no elegir nada:** el botón **Conectar impresora e imprimir
prueba** busca solo y saca un ticket. Recién si eso falla hace falta abrir
"Elegir la conexión a mano".

En **Automático** el orden depende de la plataforma, porque lo que anda en una
no anda en la otra:

- **En computadora:** Puerto COM → USB → Bluetooth → **driver del sistema**.
  El driver va último y siempre: nunca falla, así que garantiza el ticket, pero
  puesto antes ganaría siempre y abriría un diálogo teniendo al lado una
  conexión que imprime sola.
- **En la tablet Android:** USB → Bluetooth → Puerto COM, **sin** el driver del
  sistema. Ahí el diálogo de Chrome arranca en "Guardar como PDF": el cajero
  tendría un diálogo confuso en cada venta y ningún ticket. Si no hay nada
  emparejado, es mejor avisar.

**Red** queda afuera del automático en las dos: hay que saber la IP y levantar
el puente, así que es una elección deliberada.

### USB directo (tablet Android)

1. Conectá la impresora con un **cable OTG** (USB-C a USB-A hembra), encendida.
2. Si Android pregunta qué hacer con el dispositivo USB, dale permiso.
   En algunos hay que habilitar **OTG** en Ajustes → Conexiones.
3. **Config → USB directo → Conectar**, elegila de la lista.

El permiso queda guardado: cada vez que abrís la app se reconecta sola.

**Si no aparece:** probá otro cable OTG (muchos son sólo de carga y no pasan
datos), actualizá Chrome, y fijate que la app esté abierta por HTTPS.

### Puerto COM (Windows)

En Windows, **USB directo casi siempre da "Access denied"**. No es un problema
de la app ni de los drivers: apenas enchufás la impresora, Windows le asigna un
driver genérico (`usbprint.sys`) y el navegador no puede usar un aparato que ya
tomó el sistema. Pasa con el driver de Xprinter instalado y sin él.

El puerto COM esquiva eso: en vez de pelearle el aparato al driver, le habla al
puerto serie que el propio driver publica.

1. **Panel de control → Dispositivos e impresoras**, botón derecho sobre la
   XP-80 → **Propiedades** → pestaña **Puertos**. Anotá el COM asignado.
   - Si está en `USB00x` en vez de un COM, instalá el paquete de driver de
     Xprinter eligiendo la interfaz **Serial**, o usá el driver
     **Generic / Text Only** sobre un puerto COM.
2. La velocidad tiene que coincidir con la de la impresora: **9600 baudios**,
   que es la de fábrica. Se ve en el autotest (apagá la impresora, mantené
   **FEED** y encendela).
3. **Config → Puerto COM → Conectar**, elegí el puerto.

### Bluetooth (la portátil de 58 mm)

1. Prendé la impresora y el Bluetooth del teléfono o la tablet.
2. **Config → GOOJPRT portátil → Bluetooth → Conectar** y elegila de la lista.
   Se anuncian con nombres muy distintos según el lote (`PT-210`, `MTP-2`,
   `BlueTooth Printer`), por eso la lista no está filtrada.

### Si no conecta

Que la impresora **ande en la app del fabricante y no acá** no quiere decir que
esté rota: no usan la misma vía. La app del fabricante es nativa y habla
**Bluetooth clásico (SPP)**; una página web sólo puede hablar **Bluetooth LE**.
Son dos protocolos distintos sobre la misma antena, y ningún navegador —Chrome,
Edge, el que sea— llega al primero. Muchas térmicas soportan los dos; algunas,
sólo SPP, y esas hay que conectarlas por USB.

En vez de adivinar cuál es el caso, usá **Config → Diagnóstico Bluetooth**
(o **Diagnóstico USB**). Se conecta, lista todo lo que la impresora expone y lo
deja para copiar. Lo que dice y qué significa:

| Dice | Qué pasa | Salida |
|---|---|---|
| `Bluetooth (BLE): NO disponible` | El navegador no tiene la API | El reporte dice cuál es el motivo de ese navegador |
| `Contexto seguro: NO` | La app está abierta por `http://` | Abrirla por HTTPS |
| `Adaptador Bluetooth: APAGADO` | El Bluetooth del aparato está apagado | Prenderlo |
| `es Bluetooth clasico (SPP), no BLE` | La impresora no habla BLE | Conectarla por USB |
| `Servicios visibles: 0` | Es BLE, pero su UUID no está en la lista | Pasame el reporte: con el UUID se agrega |
| `ninguno acepta escritura` | Expone servicios pero no hay dónde escribir | Pasame el reporte |

**Web Bluetooth no es sólo de Android.** Chrome y Edge lo tienen en Windows,
Mac, Linux, Android y ChromeOS. Donde no existe es en **iPhone y iPad** —en
ningún navegador, ni el Chrome de iPhone—, en Firefox, en Safari y en Samsung
Internet. Brave lo trae apagado de fábrica. Si la app está abierta sin HTTPS, el
navegador lo esconde aunque lo soporte. El diagnóstico distingue cada uno de
esos casos y dice cuál te tocó.

**Impresora Bluetooth en Windows:** aunque el navegador no llegue por BLE, al
emparejarla desde Configuración de Windows → Bluetooth el sistema le crea un
**puerto COM de salida**. Con ese COM, elegí **Puerto COM** en la app y
funciona igual. Es la vuelta para las de Bluetooth clásico.

El caso de los **cero servicios** es el más traicionero, porque la impresora
anda perfecto: `getPrimaryServices()` sólo devuelve los servicios que la app
pidió de antemano en `optionalServices`, así que uno que no esté en la lista de
`SERVICIOS` (en `src/lib/printer/bluetooth.ts`) es invisible aunque exista.
Agregar el UUID que reporte el diagnóstico alcanza.

Si el ticket sale cortado o con basura, bajá `bleChunk` de 180 a 100 en
`src/lib/printer/perfiles.ts`: el buffer de estas impresoras es chico y hay
lotes que aguantan menos.

### Red, puerto 9100 (XP-80 con cable de red)

El navegador no abre sockets TCP, así que el ticket pasa por un **puente**: el
endpoint `POST /api/print`, que abre la conexión del lado del servidor.

**Ojo con dónde corre ese servidor.** Si la app está publicada en Vercel, el
servidor está en internet y **no llega a la red del club**: la impresora en
`192.168.0.100` es inalcanzable desde ahí. Hay dos formas de que funcione:

- Correr el POS en una máquina de la red del club (`npm run build && npm start`)
  y usar el puente por defecto, `/api/print`.
- Dejar la app en Vercel y levantar el puente en una máquina de esa red,
  poniendo su dirección en **Config → Red → Puente de impresión**. Tiene que
  ser `localhost` o HTTPS: el navegador bloquea los pedidos a `http://` desde
  una página `https://`, salvo a la propia máquina.

La dirección y el puerto de la impresora se configuran en `PERFILES.xp80`
(`host` y `puerto`) en `src/lib/printer/perfiles.ts`.

Por seguridad el puente **sólo acepta direcciones de red local** (10.x, 127.x,
172.16–31.x, 192.168.x) y los puertos 9100 a 9103. Sin eso sería un proxy TCP
abierto: cualquiera que llegue a la app podría hacerle abrir conexiones a donde
quiera.

### Driver del sistema (siempre funciona)

Le manda el ticket al driver como documento, igual que cualquier programa de
escritorio. No hay nada que emparejar: elegilo en **Config** y listo.

El costo es que Chrome pregunta en cada ticket. Para que salga solo:

1. **Config → Acceso directo sin diálogo** baja un `.bat` ya armado con la
   dirección de esta instalación. Abrí el buffet desde ese archivo.
2. Dejá la impresora como **predeterminada** de Windows: `--kiosk-printing`
   manda el ticket ahí sin preguntar.

El `.bat` abre Chrome con un **perfil propio** (`--user-data-dir`), y eso no es
un adorno: si Chrome ya está abierto, una ventana nueva se engancha al proceso
que ya corre y **las banderas se ignoran en silencio** — seguiría preguntando.
Con perfil propio arranca un proceso aparte y la bandera vale siempre. La
contra es que ese perfil tiene su propia base local, así que los cajeros y
turnos hay que crearlos ahí.

> Si no querés diálogo **ni** perfil aparte, la salida es el **Puerto COM**:
> imprime en silencio sin banderas ni accesos directos.

Dejá también el tamaño de papel correcto (80 o 58 mm) y el **corte automático**
activado en las propiedades del driver: por esta vía el corte lo hace el
driver, no la app.

### El alto de la hoja

Antes el ticket salía **acostado y con mucho papel de sobra**. La causa: con
`size: 80mm auto` el navegador no sabe qué alto darle, termina usando el papel
por defecto del driver, y si la caja queda más ancha que alta —un ticket corto
en papel de 80 mm— la saca apaisada.

Ahora la app **mide el ticket ya maquetado** y le fija a la hoja ese alto
exacto más 4 mm de cola. Un cierre de 94 mm sale en una hoja de 98.

En los tickets cortos el alto no baja del ancho del papel, que es lo que
garantiza que salga vertical: una prueba de 38 mm sale en una hoja de 82. Si en
tu impresora comprobás que sale derecha igual, **Config → Recortar el papel al
alto del ticket** saca ese piso y la hoja se pega al contenido (38 → 42 mm).

---

## 3. Tickets de diseño

La pestaña **Tickets** imprime las fichas que se le dan al que compra para que
las canjee. Se elige la cantidad y se toca el tipo.

Son seis, tres por puesto:

| Boletería | Buffet |
|---|---|
| ENTRADA GENERAL | CHORIPÁN |
| ENTRADA SOCIO | HAMBURGUESA |
| MENOR Y JUBILADO | BEBIDA |

**No llevan precio, fecha, numeración ni QR**: sólo el club, el subtítulo del
encabezado y el tipo, centrados, con la regla entre medio. Todo en negro puro
sobre blanco, sin grises ni fondos llenos, porque la térmica los mancha. Al
final quedan 8 mm libres antes del corte.

### Agregar o cambiar un tipo

Todo vive en `src/lib/tickets/diseno.ts`. Entre un ticket y otro no cambia nada
más que el texto del tipo y el subtítulo, así que sumar uno es sumar una
entrada a `TIPOS`:

```ts
{
  id: 'pancho',
  label: 'Pancho',
  subtitulo: 'BUFFET',
  lineas: ['Pancho'],   // un renglón por línea impresa
  estilo: 'buffet',     // 'entrada' usa letra más grande para el club
  puesto: 'buffet',
}
```

`lineas` es un arreglo y no una cadena a propósito: las entradas se parten en
dos renglones por diseño (`Entrada` / `general`), y dejarlo al ajuste
automático cambiaría dónde corta.

Las medidas (cuerpos, interletrado, la regla, los márgenes) están en el mismo
archivo, en los px del diseño original sobre un área de 272 px = 72 mm, para
que comparar contra el handoff sea directo.

### Cómo se imprime cada una

El mismo diseño sale por las dos vías, y cada una lo resuelve como puede:

- **Driver del sistema:** va como HTML, que es la única vía con tipografías de
  verdad. Sale con Archivo Narrow y Courier Prime.
- **USB, COM, Bluetooth y red:** esas impresoras sólo tienen su fuente interna,
  así que el ticket se dibuja en un canvas y se manda como imagen. Sale igual.

Las tipografías están **en el proyecto** (`public/fonts/`), no en Google Fonts:
el puesto tiene que imprimir sin wifi, y un pedido a fonts.googleapis.com
dejaría el ticket con otra letra justo cuando no hay conexión. Si aun así no
cargan, el ticket sale con la condensada y la monoespaciada del sistema en vez
de no salir.

> En 58 mm el diseño se achica al ancho real de esa impresora (48 mm de los
> 72), que da ~67 % y no el 72 % que sugiere el handoff: con 72 % no entraría
> en el papel.

> Estas fichas **no reemplazan** el ticket de la venta ni el de la entrada, que
> siguen llevando precio, fecha y número porque son los que respaldan el
> arqueo.

---

## 4. Cierre de caja

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

## 5. Sincronización

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
| Impresoras (perfiles y transportes) | `src/lib/printer/` |
| Tickets de diseño (los seis tipos) | `src/lib/tickets/` |
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

Los cinco transportes están detrás de la interfaz `Printer` (`connect`,
`reconnect`, `imprimir`). Los cuatro que hablan ESC/POS por un caño de bytes
—USB, COM, Bluetooth y red— comparten `ImpresoraEscPos`, que arma el ticket una
sola vez; el driver del sistema implementa `Printer` aparte porque manda un
documento, no bytes. Para sumar un transporte alcanza con otra clase que cumpla
la interfaz, sin tocar las pantallas.

Sumar una impresora es agregar una entrada en `PERFILES`: el ancho de los
tickets, el avance, el corte y qué conexiones se ofrecen salen todos de ahí.
