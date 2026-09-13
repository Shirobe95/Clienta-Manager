# Roadmap

Estado: **C1 a C5 entregados**. Lo demás son propuestas, no compromisos.

## C1 — Panel base (hecho)

Modelo de datos, persistencia local con export/import, sistema visual, seis vistas
(panel, clientes, proyectos, cobros, agenda, ajustes), cortes, decisiones, métricas y datos de ejemplo.

## C2 — Cierre del ciclo de cobro (hecho)

- Panel de cortes aceptados pendientes de facturar, con botón para facturarlos en un clic.
- Numeración de factura con serie y dígitos configurables, deducida de lo ya emitido.
- Revisión de la numeración: huecos dentro de la serie y números duplicados.
- Exportación a CSV de la vista filtrada, lista para la gestoría.
- Recordatorio de impago copiable al portapapeles desde cualquier cobro vencido.

Desviación respecto a lo planteado: el cobro **no** se crea solo al aceptar un corte. El corte queda
marcado como *sin facturar* y se factura con un clic, con el formulario ya relleno. Crear movimientos
económicos sin confirmación es justo el tipo de escritura silenciosa que no quiero en esta app.

## C3 — El módulo como unidad de venta (hecho)

Descartado el control de horas: se cobra por módulo terminado o trabajo entregado, así que la métrica
es la entrega, no el tiempo.

- Plantillas: catálogo de módulos reutilizables con precio y criterios. Un proyecto entero se monta
  desde una plantilla, y a un proyecto existente se le añaden módulos sueltos eligiendo cuáles.
- Cuadre del presupuesto: pactado frente a la suma de los módulos frente a lo facturado, con aviso
  cuando no cuadran o cuando hay cortes sin precio.
- Fecha de entrega real por corte, automática al pasar a revisión y reversible.
- Métricas de entrega en el panel: módulos aceptados en el año, importe medio por módulo y porcentaje
  de entregas dentro de plazo.

## C4 — Ampliaciones y mensualidades (hecho)

- Ampliaciones de alcance: lo que un corte deja *fuera de alcance* se convierte en un corte nuevo con
  un clic, heredando ese texto como objetivo y guardando de qué corte nace. El proyecto muestra cuánto
  trabajo extra se ha presupuestado así. Varias ampliaciones del mismo corte se numeran: C2+, C2+2.
- Mensualidades opcionales por cliente: concepto, importe, impuestos, día de cobro, inicio y baja.
  No todos los clientes la tienen, y se puede pausar sin borrarla.
- Cuotas por emitir en el panel y en la ficha del cliente, con emisión individual o en tanda. La
  numeración de una tanda sale correlativa.
- KPI de recurrente mensual, visible solo si hay clientes con cuota.

## C5 — Copias, restauración e importación (hecho)

Supabase queda descartado por ahora: la app sigue siendo local, con la exportación y la importación
como forma de moverse entre equipos.

- Estado de la copia: cuándo fue la última, si hay cambios posteriores y aviso en el panel cuando pasa
  el plazo configurado. Exportar anota la fecha.
- Importación con vista previa (nuevos, actualizados, sin cambios) y dos modos: fusionar por id, que
  nunca borra lo local, o reemplazar todo.
- Instantáneas dentro del navegador: una al abrir cada día y una antes de cada operación destructiva,
  con restauración y borrado. No sustituyen a la copia en archivo, y el texto de la app lo dice.

## Remate antes de las pruebas (hecho)

- `npm run empaquetar` genera un `dist/gremio.html` con el CSS y el JavaScript dentro, que se abre con
  doble clic: sin servidor, sin instalación y sin conexión. Los módulos ES cargados desde `file://` los
  bloquea el navegador por CORS, pero un módulo escrito en línea sí se ejecuta.
- Los efectos secundarios salen de los actualizadores de estado: React los invoca dos veces en
  desarrollo y las instantáneas salían duplicadas.
- Barra de navegación en móvil: una sola fila de 67 px en vez de tres, y sin desbordes en ninguna vista.
- Estado vacío en el gráfico del panel cuando todavía no hay movimientos.

## C6 — Portal y automatización

- Vista pública por proyecto para el cliente: estado de cortes y criterios aceptados.
- Recordatorios por correo de vencimientos y renovaciones.
- Plantillas de proyecto: crear un proyecto con sus cortes y criterios ya definidos.

## Ideas sin corte asignado

- Comando rápido (`Ctrl+K`) para saltar a cualquier cliente, proyecto o factura.
- Línea de tiempo por cliente, mezclando cobros, cortes y decisiones.
- Campo de moneda por cliente, para clientes fuera de la zona euro.
- Etiquetas de riesgo: cliente que paga tarde de forma recurrente.
- Control de horas y rentabilidad por tiempo: **descartado por ahora**, no encaja con cobrar por módulo.
- Sincronización con Supabase o servidor propio: **descartado por ahora**, la app se queda local.
