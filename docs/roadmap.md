# Roadmap

Estado: **C1 y C2 entregados**. Lo demás son propuestas, no compromisos.

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

## C3 — Tiempo y rentabilidad

- Registro de horas por proyecto y corte.
- Rentabilidad real: importe cobrado entre horas dedicadas, frente a la tarifa del cliente.
- Aviso cuando un proyecto de precio cerrado supera el presupuesto en horas.

## C4 — Continuidad y multi-dispositivo

- Adaptador de `AlmacenDatos` contra Supabase, con el local como caché.
- Autenticación y sincronización con resolución de conflictos por marca de tiempo.
- Copia automática a Google Drive.

## C5 — Portal y automatización

- Vista pública por proyecto para el cliente: estado de cortes y criterios aceptados.
- Recordatorios por correo de vencimientos y renovaciones.
- Plantillas de proyecto: crear un proyecto con sus cortes y criterios ya definidos.

## Ideas sin corte asignado

- Comando rápido (`Ctrl+K`) para saltar a cualquier cliente, proyecto o factura.
- Línea de tiempo por cliente, mezclando cobros, cortes y decisiones.
- Campo de moneda por cliente, para clientes fuera de la zona euro.
- Etiquetas de riesgo: cliente que paga tarde de forma recurrente.
