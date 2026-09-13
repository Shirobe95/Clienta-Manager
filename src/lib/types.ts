/** Modelo de datos de Gremio. Todo local-first: un unico documento JSON. */

export type ID = string;
/** Fecha en formato YYYY-MM-DD. */
export type ISODate = string;
/** Marca de tiempo completa ISO 8601. */
export type ISODateTime = string;

export type EstadoCliente = 'potencial' | 'activo' | 'pausado' | 'archivado';

/**
 * Cuota mensual de un cliente. Es opcional: solo la tienen los clientes con
 * un acuerdo recurrente. Cada mes genera un cobro, no un cargo automatico.
 */
export interface Suscripcion {
  activa: boolean;
  concepto: string;
  /** Base imponible de la cuota. */
  importe: number;
  ivaPct: number;
  irpfPct: number;
  /** Dia del mes en el que toca emitir, de 1 a 28. */
  diaCobro: number;
  inicio: ISODate;
  /** Fecha de baja, si el acuerdo tiene fin. */
  fin?: ISODate;
  proyectoId?: ID;
}

export interface Cliente {
  id: ID;
  nombre: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
  estado: EstadoCliente;
  tarifaHora?: number;
  etiquetas: string[];
  notas?: string;
  suscripcion?: Suscripcion;
  creadoEn: ISODateTime;
}

export type EstadoProyecto =
  | 'propuesta'
  | 'activo'
  | 'pausado'
  | 'entregado'
  | 'mantenimiento'
  | 'cancelado';

export type ModeloFacturacion = 'fijo' | 'hora' | 'retainer';

export interface Enlace {
  label: string;
  url: string;
}

export interface Proyecto {
  id: ID;
  clienteId: ID;
  nombre: string;
  descripcion?: string;
  /** Vision general: contexto, objetivo y limites del proyecto. */
  visionGeneral?: string;
  estado: EstadoProyecto;
  modelo: ModeloFacturacion;
  presupuesto?: number;
  fechaInicio?: ISODate;
  fechaEntrega?: ISODate;
  enlaces: Enlace[];
  etiquetas: string[];
  creadoEn: ISODateTime;
}

export type EstadoCorte = 'planificado' | 'en_curso' | 'en_revision' | 'aceptado' | 'rechazado';

export interface CriterioAceptacion {
  id: ID;
  texto: string;
  hecho: boolean;
}

/** Un corte es un bloque de trabajo acotado dentro de un proyecto. */
export interface Corte {
  id: ID;
  proyectoId: ID;
  codigo: string;
  titulo: string;
  objetivo?: string;
  fueraDeAlcance?: string;
  estado: EstadoCorte;
  fechaObjetivo?: ISODate;
  /** Fecha en la que se entrego de verdad. Se rellena sola al pasar a revision. */
  fechaEntrega?: ISODate;
  /** Corte del que nace esta ampliacion de alcance, si lo hay. */
  origenCorteId?: ID;
  importe?: number;
  criterios: CriterioAceptacion[];
  notas?: string;
  orden: number;
  creadoEn: ISODateTime;
}

/** Modulo de una plantilla: el molde del que sale un corte. */
export interface ModuloPlantilla {
  id: ID;
  codigo: string;
  titulo: string;
  objetivo?: string;
  fueraDeAlcance?: string;
  importe?: number;
  criterios: string[];
}

/** Conjunto reutilizable de modulos: sirve para montar un proyecto o un corte suelto. */
export interface Plantilla {
  id: ID;
  nombre: string;
  descripcion?: string;
  modelo: ModeloFacturacion;
  modulos: ModuloPlantilla[];
  creadoEn: ISODateTime;
}

export type EstadoDecision = 'propuesta' | 'aceptada' | 'descartada' | 'revisar';

/** Registro de decision al estilo ADR ligero. */
export interface Decision {
  id: ID;
  proyectoId: ID;
  titulo: string;
  contexto?: string;
  decision?: string;
  alternativas?: string;
  consecuencias?: string;
  estado: EstadoDecision;
  fecha: ISODate;
  creadoEn: ISODateTime;
}

export type TipoMovimiento = 'cobro' | 'pago';
/** Estado almacenado. "vencido" es derivado, nunca se guarda. */
export type EstadoMovimiento = 'borrador' | 'pendiente' | 'pagado';
export type EstadoMovimientoCalculado = EstadoMovimiento | 'vencido';

export interface Movimiento {
  id: ID;
  tipo: TipoMovimiento;
  clienteId?: ID;
  proyectoId?: ID;
  corteId?: ID;
  concepto: string;
  /** Base imponible, sin impuestos. */
  importe: number;
  ivaPct: number;
  irpfPct: number;
  estado: EstadoMovimiento;
  fechaEmision: ISODate;
  fechaVencimiento?: ISODate;
  fechaPago?: ISODate;
  metodo?: string;
  numeroFactura?: string;
  /** Mes facturado (YYYY-MM) cuando el cobro sale de una cuota mensual. */
  periodo?: string;
  notas?: string;
  creadoEn: ISODateTime;
}

export type TipoSeguimiento =
  | 'mantenimiento'
  | 'actualizacion'
  | 'renovacion'
  | 'seguimiento'
  | 'reunion';

export type Recurrencia = 'ninguna' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

export type EstadoSeguimiento = 'pendiente' | 'hecho' | 'cancelado';

/** Compromiso futuro con un cliente: mantenimiento, actualizacion, renovacion. */
export interface Seguimiento {
  id: ID;
  clienteId: ID;
  proyectoId?: ID;
  titulo: string;
  tipo: TipoSeguimiento;
  fechaPrevista: ISODate;
  recurrencia: Recurrencia;
  estado: EstadoSeguimiento;
  notas?: string;
  creadoEn: ISODateTime;
}

export interface Ajustes {
  moneda: string;
  locale: string;
  ivaPorDefecto: number;
  irpfPorDefecto: number;
  diasVencimiento: number;
  objetivoAnual?: number;
  /** Prefijo de la serie de facturacion, por ejemplo "2026" en 2026-007. */
  serieFactura: string;
  /** Digitos a los que se rellena el numero: 3 -> 007. */
  digitosFactura: number;
  /** Cuando se exporto por ultima vez una copia a un archivo. */
  ultimaCopia?: ISODateTime;
  /** Dias sin copia a partir de los cuales el panel avisa. */
  diasAvisoCopia: number;
}

export interface BaseDatos {
  version: number;
  clientes: Cliente[];
  proyectos: Proyecto[];
  cortes: Corte[];
  plantillas: Plantilla[];
  decisiones: Decision[];
  movimientos: Movimiento[];
  seguimientos: Seguimiento[];
  ajustes: Ajustes;
  actualizadoEn: ISODateTime;
}

export function ajustesPorDefecto(): Ajustes {
  return {
    moneda: 'EUR',
    locale: 'es-ES',
    ivaPorDefecto: 21,
    irpfPorDefecto: 0,
    diasVencimiento: 30,
    serieFactura: String(new Date().getFullYear()),
    digitosFactura: 3,
    diasAvisoCopia: 7,
  };
}

export const DB_VERSION = 1;

export function baseDatosVacia(): BaseDatos {
  return {
    version: DB_VERSION,
    clientes: [],
    proyectos: [],
    cortes: [],
    plantillas: [],
    decisiones: [],
    movimientos: [],
    seguimientos: [],
    ajustes: ajustesPorDefecto(),
    actualizadoEn: new Date().toISOString(),
  };
}
