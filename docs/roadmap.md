# Roadmap

Estado: **C1 entregado**. Lo demás son propuestas, no compromisos.

## C1 — Panel base (hecho)

Modelo de datos, persistencia local con export/import, sistema visual, seis vistas
(panel, clientes, proyectos, cobros, agenda, ajustes), cortes, decisiones, métricas y datos de ejemplo.

## C2 — Cierre del ciclo de cobro

- Generar un cobro automáticamente al marcar un corte como aceptado.
- Numeración de factura con serie configurable y detección de huecos.
- Exportación de movimientos a CSV para la gestoría.
- Recordatorio de impago: aviso en el panel a los X días del vencimiento.

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
