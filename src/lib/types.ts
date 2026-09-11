/** Modelo de datos de Clienta Manager. Todo local-first: un unico documento JSON. */

export type ID = string;
/** Fecha en formato YYYY-MM-DD. */
export type ISODate = string;
/** Marca de tiempo completa ISO 8601. */
export type ISODateTime = string;

export type EstadoCliente = 'potencial' | 'activo' | 'pausado' | 'archivado';

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
  importe?: number;
  criterios: CriterioAceptacion[];
  notas?: string;
  orden: number;
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
}

export interface BaseDatos {
  version: number;
  clientes: Cliente[];
  proyectos: Proyecto[];
  cortes: Corte[];
  decisiones: Decision[];
  movimientos: Movimiento[];
  seguimientos: Seguimiento[];
  ajustes: Ajustes;
  actualizadoEn: ISODateTime;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  moneda: 'EUR',
  locale: 'es-ES',
  ivaPorDefecto: 21,
  irpfPorDefecto: 0,
  diasVencimiento: 30,
};

export const DB_VERSION = 1;

export function baseDatosVacia(): BaseDatos {
  return {
    version: DB_VERSION,
    clientes: [],
    proyectos: [],
    cortes: [],
    decisiones: [],
    movimientos: [],
    seguimientos: [],
    ajustes: { ...AJUSTES_POR_DEFECTO },
    actualizadoEn: new Date().toISOString(),
  };
}
