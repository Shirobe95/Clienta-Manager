# Gremio

*Panel de encargos.* Control de clientes, proyectos, cortes, decisiones, cobros y métricas para
trabajo freelance. Todo vive en el navegador (local-first), sin servidor ni cuentas.

## Qué resuelve

- **Clientes**: ficha con contacto, estado, tarifa, etiquetas, notas y su historial económico.
- **Mensualidades**: opcionales, cliente a cliente. Cada mes vencido aparece como cuota por emitir y se
  convierte en un cobro numerado con un clic.
- **Proyectos**: visión general, modelo de facturación, presupuesto, enlaces y avance real.
- **Cortes**: bloques de trabajo acotados, con objetivo, *fuera de alcance*, criterios de aceptación,
  precio y fecha de entrega real. Son la unidad de venta: se cobra por módulo entregado.
- **Plantillas**: catálogo de módulos reutilizables con precio y criterios, para montar un proyecto
  entero o añadir cortes sueltos sin reescribirlos.
- **Ampliaciones de alcance**: lo que quedó fuera del alcance de un corte se convierte en un corte
  nuevo presupuestado, con su origen registrado, en vez de regalarse.
- **Decisiones**: registro tipo ADR ligero (contexto, decisión, alternativas, consecuencias).
- **Cobros y pagos**: base imponible, IVA/IRPF, vencimientos, estado y vínculo con proyecto y corte.
- **Facturación**: serie correlativa configurable, aviso de huecos y duplicados, exportación a CSV
  y recordatorio de impago listo para pegar en un correo.
- **Agenda**: mantenimientos, renovaciones y futuras actualizaciones, con recurrencia.
- **Métricas**: cobrado del mes y del año, pendiente, vencido, objetivo anual, evolución a 12 meses,
  ranking de clientes y entregas (módulos aceptados, importe medio por módulo y % dentro de plazo).

## Cómo usarlo

La forma más cómoda para el día a día es **un único archivo HTML** que se abre con doble clic, sin
servidor, sin instalar nada y sin conexión:

```bash
npm install
npm run empaquetar   # genera dist/gremio.html
```

Guarda ese `gremio.html` donde quieras y ábrelo en el navegador. Para tenerlo a mano, márcalo como
favorito o créale un acceso directo.

Dos avisos importantes sobre dónde viven los datos:

- **Los datos están en el navegador, no en el archivo.** Mover o renombrar el `gremio.html` no los
  pierde, pero abrirlo en otro navegador, en otro perfil o en otro equipo muestra una app vacía. Para
  llevarte el trabajo de un sitio a otro: exporta el JSON en uno e impórtalo en el otro.
- **Dos copias del archivo no son dos bases de datos.** Comparten el mismo almacenamiento local.

Para desarrollar:

```bash
npm run dev        # http://localhost:5173, con recarga en caliente
npm run build      # typecheck + bundle en dist/
npm run preview    # sirve el bundle ya construido
npm test           # pruebas de la lógica de negocio (vitest)
```

Para ver el panel con contenido: **Ajustes → Cargar datos de ejemplo**.

## Arquitectura

```
src/
  lib/        modelo, formato, metricas, facturacion, entregas, suscripciones, copias, ejemplo
  state/      contexto de React sobre el documento local (CRUD + borrado en cascada)
  components/ sistema de UI (paneles, KPIs, tablas, formularios, grafico)
  pages/      una vista por seccion del panel
  styles/     tokens de diseno y hoja global
```

Decisiones que conviene conocer antes de tocar el código:

- **Un solo documento JSON.** Todo el estado (`BaseDatos`) se guarda en `localStorage` bajo una única
  clave y se reescribe entero en cada cambio. Es suficiente para el volumen de un freelance y hace
  triviales la exportación, la importación y el diff.
- **La persistencia está detrás de un contrato.** `AlmacenDatos` en `src/lib/storage.ts` define
  `leer / escribir / borrar`. Hoy hay una implementación con `localStorage`; un adaptador remoto
  (Supabase, API propia) solo tiene que cumplir esa interfaz, sin tocar las vistas.
- **Los estados derivados no se guardan.** `vencido` se calcula comparando la fecha de vencimiento con
  hoy, nunca se persiste: así no hay estados que se queden obsoletos al pasar el tiempo.
- **Los importes se guardan como base imponible.** IVA e IRPF son porcentajes por movimiento y el total
  se calcula en `totalConImpuestos`. Las métricas anuales usan la fecha de pago cuando existe, y la de
  emisión si no.
- **Borrado en cascada explícito.** Eliminar un cliente arrastra sus proyectos, cortes y decisiones;
  eliminar un proyecto desvincula (no borra) sus movimientos. Está centralizado en `aplicarBorrado`.
- **El número de factura se deduce, no se guarda en un contador.** `siguienteNumeroFactura` mira los
  números ya emitidos de la serie y toma el mayor más uno: así no se desincroniza al importar una copia
  ni al borrar un movimiento. Un corte se factura desde el panel o desde su proyecto, y solo entonces se
  reserva el número: nunca se crea un cobro sin que tú lo confirmes.
- **El aviso de copia mira los cambios, no solo el calendario.** `estadoCopia` compara `actualizadoEn`
  con la fecha de la última exportación: sin cambios no molesta aunque lleves un mes sin exportar. Al
  exportar se escribe la misma marca de tiempo en los dos campos, para que el aviso no salte de nuevo
  justo después de hacer la copia.
- **Fusionar nunca borra.** La unión es por id y solo añade o sustituye, así que importar una copia
  antigua no puede hacer desaparecer trabajo reciente que solo esté en este navegador.
- **Las mensualidades no se cobran solas.** `periodosPendientes` deduce los meses vencidos comparando el
  inicio del acuerdo con los cobros que ya llevan ese `periodo`, así que los movimientos emitidos son la
  fuente de verdad y no hay contador que se desincronice. La app te enseña lo que toca emitir; emites tú.
  Emitir una tanda numera en cadena, de modo que salga correlativa.
- **La fecha de entrega se apunta sola, pero no manda.** Pasar un corte a revisión o aceptado escribe la
  fecha de entrega si está vacía, y la retira si el corte vuelve atrás; una fecha puesta a mano nunca se
  pisa. La puntualidad solo cuenta los cortes que tienen fecha objetivo *y* fecha de entrega.
- **El presupuesto no se recalcula solo.** `cuadreProyecto` compara lo pactado con la suma de los módulos
  y con lo facturado, y avisa si difieren en más de un euro (por debajo es redondeo). Decides tú si el que
  cambia es el presupuesto o el precio de un módulo.
- **El CSV usa punto y coma y decimales locales.** Es lo que abre limpio una hoja de cálculo en español
  sin pasar por el asistente de importación. Exporta lo que estás viendo, con los filtros aplicados.
- **Sin dependencias de UI.** El sistema visual, los iconos y el gráfico son propios: solo React y
  React Router.

## Datos y copias de seguridad

Los datos no salen del navegador y no hay sincronización entre dispositivos: **el archivo JSON que
exportas desde Ajustes es lo único que sobrevive** a borrar los datos del sitio o cambiar de equipo.
La app lleva la cuenta de cuándo hiciste la última copia y avisa en el panel cuando hay cambios sin
guardar y ha pasado el plazo que configures.

Al importar un archivo se ve primero un resumen —cuántos registros son nuevos, cuántos cambian y
cuántos están igual— y se elige entre dos modos:

- **Fusionar**: añade lo que falta y actualiza lo que coincide por id. No borra nada de lo que solo
  existe en este navegador, y respeta las preferencias del dispositivo.
- **Reemplazar todo**: deja el documento exactamente como el archivo, preferencias incluidas.

Además se guardan **instantáneas** dentro del propio navegador (una al abrir cada día, y una antes de
cada operación destructiva: importar, cargar el ejemplo, restaurar o borrar). Sirven para deshacer un
destrozo, pero viven en el mismo sitio que los datos: no son una copia de seguridad.

## Estado de las pruebas

`npm test` cubre la lógica de negocio: métricas (impuestos, estados derivados, KPIs, serie mensual,
ranking, vencimientos, avance), facturación (numeración, huecos y duplicados, cortes sin facturar, CSV y
recordatorios), entregas (fecha automática, puntualidad, cuadre de presupuesto, plantillas y
ampliaciones) y suscripciones (vigencia, periodos pendientes, generación de cuotas y recurrente
mensual) y copias (estado del aviso, fusión, instantáneas). La UI no tiene tests automatizados
todavía; se verifica a mano en el navegador.
