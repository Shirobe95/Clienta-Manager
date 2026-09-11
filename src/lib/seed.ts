import { hoy, sumarDias, sumarMeses } from './format';
import { ajustesPorDefecto, DB_VERSION } from './types';
import type { BaseDatos, Corte, Movimiento, Proyecto } from './types';

/**
 * Juego de datos de ejemplo, con fechas relativas a hoy para que el panel
 * y las metricas se vean poblados nada mas cargarlo.
 */
export function datosEjemplo(): BaseDatos {
  const h = hoy();
  const ahora = new Date().toISOString();
  const mesPasado = (n: number) => sumarMeses(h, -n);
  const serie = h.slice(0, 4);

  const clientes: BaseDatos['clientes'] = [
    {
      id: 'cli_demo_1',
      nombre: 'Futones Espai',
      empresa: 'Futones Espai SL',
      email: 'hola@futonesespai.example',
      telefono: '+34 600 000 001',
      ciudad: 'Barcelona',
      estado: 'activo',
      tarifaHora: 45,
      etiquetas: ['woocommerce', 'retainer'],
      notas: 'Tienda WooCommerce con inventario en Excel. Objetivo: centralizar catálogo y costes.',
      creadoEn: ahora,
    },
    {
      id: 'cli_demo_2',
      nombre: 'Estudio Nómada',
      empresa: 'Nómada Creativo',
      email: 'info@estudionomada.example',
      ciudad: 'Girona',
      estado: 'activo',
      tarifaHora: 50,
      etiquetas: ['landing', 'diseño'],
      creadoEn: ahora,
    },
    {
      id: 'cli_demo_3',
      nombre: 'Clínica Vall',
      empresa: 'Centre Mèdic Vall',
      email: 'gestio@clinicavall.example',
      ciudad: 'Sabadell',
      estado: 'pausado',
      etiquetas: ['mantenimiento'],
      notas: 'Mantenimiento anual del sitio. Pendiente decidir migración de hosting.',
      creadoEn: ahora,
    },
    {
      id: 'cli_demo_4',
      nombre: 'Barra Lab',
      estado: 'potencial',
      email: 'joan@barralab.example',
      etiquetas: ['app', 'propuesta'],
      creadoEn: ahora,
    },
  ];

  const proyectos: Proyecto[] = [
    {
      id: 'pro_demo_1',
      clienteId: 'cli_demo_1',
      nombre: 'FutonHUB — Inventario y catálogo',
      descripcion: 'Panel interno para centralizar inventario, costes y sincronización con WooCommerce.',
      visionGeneral:
        'Objetivo: sustituir el Excel de inventario por un panel propio con datos fiables.\n\nDentro de alcance: catálogo, stock, costes, precios y sincronización de lectura con WooCommerce.\n\nFuera de alcance (por ahora): facturación, TPV y gestión de proveedores.',
      estado: 'activo',
      modelo: 'fijo',
      presupuesto: 7200,
      fechaInicio: mesPasado(4),
      fechaEntrega: sumarDias(h, 45),
      enlaces: [
        { label: 'Repo', url: 'https://github.com/ejemplo/futonhub' },
        { label: 'Mockups', url: 'https://www.figma.com/file/ejemplo' },
      ],
      etiquetas: ['django', 'woocommerce'],
      creadoEn: ahora,
    },
    {
      id: 'pro_demo_2',
      clienteId: 'cli_demo_2',
      nombre: 'Web corporativa y landing de campaña',
      descripcion: 'Rediseño del sitio y landing para la campaña de otoño.',
      visionGeneral:
        'Rediseño completo del sitio con enfoque en captación. Se prioriza velocidad de carga y edición autónoma del contenido.',
      estado: 'entregado',
      modelo: 'fijo',
      presupuesto: 3400,
      fechaInicio: mesPasado(7),
      fechaEntrega: mesPasado(3),
      enlaces: [],
      etiquetas: ['react'],
      creadoEn: ahora,
    },
    {
      id: 'pro_demo_3',
      clienteId: 'cli_demo_3',
      nombre: 'Mantenimiento web anual',
      descripcion: 'Actualizaciones, copias de seguridad y soporte.',
      estado: 'mantenimiento',
      modelo: 'retainer',
      presupuesto: 1800,
      fechaInicio: mesPasado(10),
      enlaces: [],
      etiquetas: ['soporte'],
      creadoEn: ahora,
    },
  ];

  const cortes: Corte[] = [
    {
      id: 'cor_demo_1',
      proyectoId: 'pro_demo_1',
      codigo: 'C1',
      titulo: 'Modelo de datos e importación del Excel',
      objetivo: 'Definir el esquema de catálogo y stock, e importar el histórico del Excel actual sin pérdida de datos.',
      fueraDeAlcance: 'Sincronización de escritura hacia WooCommerce.',
      estado: 'aceptado',
      fechaObjetivo: mesPasado(3),
      importe: 2400,
      criterios: [
        { id: 'cri_1', texto: 'Esquema validado con datos reales', hecho: true },
        { id: 'cri_2', texto: 'Importación con informe de errores', hecho: true },
        { id: 'cri_3', texto: 'Rollback de la importación', hecho: true },
      ],
      orden: 1,
      creadoEn: ahora,
    },
    {
      id: 'cor_demo_2',
      proyectoId: 'pro_demo_1',
      codigo: 'C2',
      titulo: 'Panel de catálogo y edición de precios',
      objetivo: 'Listado filtrable, ficha de producto y edición de precios con previsualización antes de aplicar.',
      fueraDeAlcance: 'Edición masiva por CSV.',
      estado: 'en_revision',
      fechaObjetivo: sumarDias(h, 10),
      importe: 2400,
      criterios: [
        { id: 'cri_4', texto: 'Listado con filtros y búsqueda', hecho: true },
        { id: 'cri_5', texto: 'Preview de cambios de precio', hecho: true },
        { id: 'cri_6', texto: 'Registro de auditoría de cambios', hecho: false },
      ],
      orden: 2,
      creadoEn: ahora,
    },
    {
      id: 'cor_demo_3',
      proyectoId: 'pro_demo_1',
      codigo: 'C3',
      titulo: 'Sincronización de lectura con WooCommerce',
      objetivo: 'Traer stock y pedidos de Woo para contrastarlos con el inventario interno.',
      estado: 'planificado',
      fechaObjetivo: sumarDias(h, 45),
      importe: 2400,
      criterios: [
        { id: 'cri_7', texto: 'Job de sincronización programado', hecho: false },
        { id: 'cri_8', texto: 'Informe de diferencias', hecho: false },
      ],
      orden: 3,
      creadoEn: ahora,
    },
    {
      id: 'cor_demo_4',
      proyectoId: 'pro_demo_2',
      codigo: 'C1',
      titulo: 'Diseño y maquetación',
      estado: 'aceptado',
      fechaObjetivo: mesPasado(5),
      importe: 1700,
      criterios: [{ id: 'cri_9', texto: 'Mockups aprobados', hecho: true }],
      orden: 1,
      creadoEn: ahora,
    },
    {
      id: 'cor_demo_5',
      proyectoId: 'pro_demo_2',
      codigo: 'C2',
      titulo: 'Implementación y publicación',
      estado: 'aceptado',
      fechaObjetivo: mesPasado(3),
      importe: 1700,
      criterios: [
        { id: 'cri_10', texto: 'Lighthouse > 90 en móvil', hecho: true },
        { id: 'cri_11', texto: 'Contenido editable por el cliente', hecho: true },
      ],
      orden: 2,
      creadoEn: ahora,
    },
    {
      id: 'cor_demo_6',
      proyectoId: 'pro_demo_3',
      codigo: 'EXTRA',
      titulo: 'Migración de hosting',
      objetivo: 'Mover el sitio a un alojamiento con copias diarias y certificado gestionado.',
      estado: 'aceptado',
      fechaObjetivo: sumarDias(h, -8),
      importe: 480,
      criterios: [
        { id: 'cri_12', texto: 'Migración sin cortes de servicio', hecho: true },
        { id: 'cri_13', texto: 'Copias diarias verificadas', hecho: true },
      ],
      orden: 1,
      creadoEn: ahora,
    },
  ];

  const decisiones: BaseDatos['decisiones'] = [
    {
      id: 'dec_demo_1',
      proyectoId: 'pro_demo_1',
      titulo: 'La fuente de verdad del stock es el panel, no WooCommerce',
      contexto: 'Los dos sistemas tenían stock distinto y nadie sabía cuál mirar.',
      decision: 'El panel es la fuente de verdad. WooCommerce recibe el stock, nunca lo define.',
      alternativas: 'Sincronización bidireccional: descartada por riesgo de bucles y conflictos.',
      consecuencias: 'Cualquier ajuste manual en Woo se pierde en la siguiente sincronización. Hay que formar al equipo.',
      estado: 'aceptada',
      fecha: mesPasado(3),
      creadoEn: ahora,
    },
    {
      id: 'dec_demo_2',
      proyectoId: 'pro_demo_1',
      titulo: 'Los cambios de precio pasan siempre por una previsualización',
      contexto: 'Un error de importación puede afectar a cientos de productos publicados.',
      decision: 'Toda operación masiva genera un preview con diferencias y requiere confirmación explícita.',
      consecuencias: 'Un paso más en el flujo, a cambio de poder revertir y auditar.',
      estado: 'aceptada',
      fecha: mesPasado(2),
      creadoEn: ahora,
    },
    {
      id: 'dec_demo_3',
      proyectoId: 'pro_demo_1',
      titulo: 'Migrar el panel a multiusuario',
      contexto: 'De momento solo lo usa una persona, pero el equipo de tienda quiere acceso.',
      estado: 'revisar',
      fecha: sumarDias(h, -5),
      creadoEn: ahora,
    },
  ];

  const cobro = (
    id: string,
    clienteId: string,
    proyectoId: string | undefined,
    concepto: string,
    importe: number,
    emision: string,
    estado: Movimiento['estado'],
    extra: Partial<Movimiento> = {},
  ): Movimiento => ({
    id,
    tipo: 'cobro',
    clienteId,
    proyectoId,
    concepto,
    importe,
    ivaPct: 21,
    irpfPct: 0,
    estado,
    fechaEmision: emision,
    fechaVencimiento: sumarDias(emision, 30),
    fechaPago: estado === 'pagado' ? sumarDias(emision, 12) : undefined,
    creadoEn: ahora,
    ...extra,
  });

  const movimientos: Movimiento[] = [
    cobro('mov_demo_1', 'cli_demo_1', 'pro_demo_1', 'FutonHUB C1 — Modelo de datos', 2400, mesPasado(3), 'pagado', {
      corteId: 'cor_demo_1',
      numeroFactura: `${serie}-003`,
    }),
    cobro('mov_demo_2', 'cli_demo_1', 'pro_demo_1', 'FutonHUB C2 — Panel de catálogo', 2400, sumarDias(h, -12), 'pendiente', {
      corteId: 'cor_demo_2',
      numeroFactura: `${serie}-007`,
    }),
    cobro('mov_demo_3', 'cli_demo_2', 'pro_demo_2', 'Web corporativa C1', 1700, mesPasado(6), 'pagado', {
      corteId: 'cor_demo_4',
      numeroFactura: `${serie}-001`,
    }),
    cobro('mov_demo_4', 'cli_demo_2', 'pro_demo_2', 'Web corporativa C2', 1700, mesPasado(3), 'pagado', {
      corteId: 'cor_demo_5',
      numeroFactura: `${serie}-004`,
    }),
    cobro('mov_demo_5', 'cli_demo_3', 'pro_demo_3', 'Mantenimiento — trimestre', 450, mesPasado(4), 'pagado', {
      numeroFactura: `${serie}-002`,
    }),
    cobro('mov_demo_6', 'cli_demo_3', 'pro_demo_3', 'Mantenimiento — trimestre', 450, mesPasado(1), 'pagado', {
      numeroFactura: `${serie}-006`,
    }),
    cobro('mov_demo_7', 'cli_demo_3', 'pro_demo_3', 'Horas extra de soporte', 320, sumarDias(h, -52), 'pendiente', {
      fechaVencimiento: sumarDias(h, -22),
      numeroFactura: `${serie}-005`,
    }),
    cobro('mov_demo_8', 'cli_demo_4', undefined, 'Propuesta app de reservas', 1500, h, 'borrador'),
    {
      id: 'mov_demo_9',
      tipo: 'pago',
      concepto: 'Hosting y dominios',
      importe: 180,
      ivaPct: 21,
      irpfPct: 0,
      estado: 'pagado',
      fechaEmision: mesPasado(2),
      fechaPago: mesPasado(2),
      creadoEn: ahora,
    },
    {
      id: 'mov_demo_10',
      tipo: 'pago',
      concepto: 'Licencias y herramientas',
      importe: 95,
      ivaPct: 21,
      irpfPct: 0,
      estado: 'pagado',
      fechaEmision: sumarDias(h, -20),
      fechaPago: sumarDias(h, -20),
      creadoEn: ahora,
    },
  ];

  const seguimientos: BaseDatos['seguimientos'] = [
    {
      id: 'seg_demo_1',
      clienteId: 'cli_demo_1',
      proyectoId: 'pro_demo_1',
      titulo: 'Revisión de C2 con el cliente',
      tipo: 'reunion',
      fechaPrevista: sumarDias(h, 4),
      recurrencia: 'ninguna',
      estado: 'pendiente',
      creadoEn: ahora,
    },
    {
      id: 'seg_demo_2',
      clienteId: 'cli_demo_3',
      proyectoId: 'pro_demo_3',
      titulo: 'Actualizaciones de plugins y copia de seguridad',
      tipo: 'mantenimiento',
      fechaPrevista: sumarDias(h, 12),
      recurrencia: 'mensual',
      estado: 'pendiente',
      creadoEn: ahora,
    },
    {
      id: 'seg_demo_3',
      clienteId: 'cli_demo_3',
      titulo: 'Renovación del contrato anual',
      tipo: 'renovacion',
      fechaPrevista: sumarDias(h, 38),
      recurrencia: 'anual',
      estado: 'pendiente',
      notas: 'Revisar precio: lleva dos años igual.',
      creadoEn: ahora,
    },
    {
      id: 'seg_demo_4',
      clienteId: 'cli_demo_2',
      proyectoId: 'pro_demo_2',
      titulo: 'Propuesta de mejoras post-campaña',
      tipo: 'actualizacion',
      fechaPrevista: sumarDias(h, -3),
      recurrencia: 'ninguna',
      estado: 'pendiente',
      creadoEn: ahora,
    },
  ];

  return {
    version: DB_VERSION,
    clientes,
    proyectos,
    cortes,
    decisiones,
    movimientos,
    seguimientos,
    ajustes: { ...ajustesPorDefecto(), serieFactura: serie, objetivoAnual: 24000 },
    actualizadoEn: ahora,
  };
}
