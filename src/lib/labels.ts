import type {
  EstadoCliente,
  EstadoCorte,
  EstadoDecision,
  EstadoMovimientoCalculado,
  EstadoProyecto,
  EstadoSeguimiento,
  ModeloFacturacion,
  Recurrencia,
  TipoSeguimiento,
} from './types';

export type Tono = 'neutro' | 'acento' | 'ok' | 'aviso' | 'critico' | 'info';

export interface Etiqueta<T extends string> {
  valor: T;
  texto: string;
  tono: Tono;
}

function mapa<T extends string>(entradas: Etiqueta<T>[]) {
  const indice = new Map(entradas.map((e) => [e.valor, e]));
  return {
    lista: entradas,
    de(valor: T): Etiqueta<T> {
      return indice.get(valor) ?? { valor, texto: valor, tono: 'neutro' };
    },
  };
}

export const estadosCliente = mapa<EstadoCliente>([
  { valor: 'potencial', texto: 'Potencial', tono: 'info' },
  { valor: 'activo', texto: 'Activo', tono: 'ok' },
  { valor: 'pausado', texto: 'Pausado', tono: 'aviso' },
  { valor: 'archivado', texto: 'Archivado', tono: 'neutro' },
]);

export const estadosProyecto = mapa<EstadoProyecto>([
  { valor: 'propuesta', texto: 'Propuesta', tono: 'info' },
  { valor: 'activo', texto: 'Activo', tono: 'ok' },
  { valor: 'pausado', texto: 'Pausado', tono: 'aviso' },
  { valor: 'entregado', texto: 'Entregado', tono: 'acento' },
  { valor: 'mantenimiento', texto: 'Mantenimiento', tono: 'acento' },
  { valor: 'cancelado', texto: 'Cancelado', tono: 'critico' },
]);

export const estadosCorte = mapa<EstadoCorte>([
  { valor: 'planificado', texto: 'Planificado', tono: 'neutro' },
  { valor: 'en_curso', texto: 'En curso', tono: 'acento' },
  { valor: 'en_revision', texto: 'En revisión', tono: 'aviso' },
  { valor: 'aceptado', texto: 'Aceptado', tono: 'ok' },
  { valor: 'rechazado', texto: 'Rechazado', tono: 'critico' },
]);

export const estadosDecision = mapa<EstadoDecision>([
  { valor: 'propuesta', texto: 'Propuesta', tono: 'info' },
  { valor: 'aceptada', texto: 'Aceptada', tono: 'ok' },
  { valor: 'descartada', texto: 'Descartada', tono: 'neutro' },
  { valor: 'revisar', texto: 'Revisar', tono: 'aviso' },
]);

export const estadosMovimiento = mapa<EstadoMovimientoCalculado>([
  { valor: 'borrador', texto: 'Borrador', tono: 'neutro' },
  { valor: 'pendiente', texto: 'Pendiente', tono: 'aviso' },
  { valor: 'pagado', texto: 'Pagado', tono: 'ok' },
  { valor: 'vencido', texto: 'Vencido', tono: 'critico' },
]);

export const estadosSeguimiento = mapa<EstadoSeguimiento>([
  { valor: 'pendiente', texto: 'Pendiente', tono: 'aviso' },
  { valor: 'hecho', texto: 'Hecho', tono: 'ok' },
  { valor: 'cancelado', texto: 'Cancelado', tono: 'neutro' },
]);

export const tiposSeguimiento = mapa<TipoSeguimiento>([
  { valor: 'mantenimiento', texto: 'Mantenimiento', tono: 'acento' },
  { valor: 'actualizacion', texto: 'Actualización', tono: 'info' },
  { valor: 'renovacion', texto: 'Renovación', tono: 'ok' },
  { valor: 'seguimiento', texto: 'Seguimiento', tono: 'neutro' },
  { valor: 'reunion', texto: 'Reunión', tono: 'neutro' },
]);

export const modelosFacturacion = mapa<ModeloFacturacion>([
  { valor: 'fijo', texto: 'Precio cerrado', tono: 'neutro' },
  { valor: 'hora', texto: 'Por horas', tono: 'neutro' },
  { valor: 'retainer', texto: 'Cuota mensual', tono: 'neutro' },
]);

export const recurrencias = mapa<Recurrencia>([
  { valor: 'ninguna', texto: 'Sin repetición', tono: 'neutro' },
  { valor: 'mensual', texto: 'Mensual', tono: 'neutro' },
  { valor: 'trimestral', texto: 'Trimestral', tono: 'neutro' },
  { valor: 'semestral', texto: 'Semestral', tono: 'neutro' },
  { valor: 'anual', texto: 'Anual', tono: 'neutro' },
]);

export const MESES_RECURRENCIA: Record<Recurrencia, number> = {
  ninguna: 0,
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};
