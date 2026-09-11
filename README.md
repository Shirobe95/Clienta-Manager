# Gremio

*Panel de encargos.* Control de clientes, proyectos, cortes, decisiones, cobros y métricas para
trabajo freelance. Todo vive en el navegador (local-first), sin servidor ni cuentas.

## Qué resuelve

- **Clientes**: ficha con contacto, estado, tarifa, etiquetas, notas y su historial económico.
- **Proyectos**: visión general, modelo de facturación, presupuesto, enlaces y avance real.
- **Cortes**: bloques de trabajo acotados, con objetivo, *fuera de alcance*, criterios de aceptación,
  precio y fecha de entrega real. Son la unidad de venta: se cobra por módulo entregado.
- **Plantillas**: catálogo de módulos reutilizables con precio y criterios, para montar un proyecto
  entero o añadir cortes sueltos sin reescribirlos.
- **Decisiones**: registro tipo ADR ligero (contexto, decisión, alternativas, consecuencias).
- **Cobros y pagos**: base imponible, IVA/IRPF, vencimientos, estado y vínculo con proyecto y corte.
- **Facturación**: serie correlativa configurable, aviso de huecos y duplicados, exportación a CSV
  y recordatorio de impago listo para pegar en un correo.
- **Agenda**: mantenimientos, renovaciones y futuras actualizaciones, con recurrencia.
- **Métricas**: cobrado del mes y del año, pendiente, vencido, objetivo anual, evolución a 12 meses,
  ranking de clientes y entregas (módulos aceptados, importe medio por módulo y % dentro de plazo).

## Arrancar

```bash
npm install
npm run dev      # http://localhost:5173
```

Otros comandos:

```bash
npm run build    # typecheck + bundle de produccion en dist/
npm run preview  # sirve el bundle ya construido
npm test         # tests de la capa de metricas (vitest)
```

Para ver el panel con contenido: **Ajustes → Cargar datos de ejemplo**.

## Arquitectura

```
src/
  lib/        modelo de datos, formato, metricas, facturacion, entregas, persistencia, ejemplo
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

Los datos no salen del navegador. No hay sincronización entre dispositivos ni backup automático:
**exporta el JSON desde Ajustes** con cierta regularidad. La importación reemplaza todo el contenido.

Borrar los datos del sitio en el navegador borra también el contenido de la aplicación.

## Estado de las pruebas

`npm test` cubre la lógica de negocio: métricas (impuestos, estados derivados, KPIs, serie mensual,
ranking, vencimientos, avance), facturación (numeración, huecos y duplicados, cortes sin facturar, CSV y
recordatorios) y entregas (fecha automática, puntualidad, cuadre de presupuesto y plantillas). La UI no
tiene tests automatizados todavía; se verifica a mano en el navegador.
