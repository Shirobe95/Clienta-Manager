import { nuevoId } from './id';
import { totalConImpuestos } from './metrics';
import type {
  BaseDatos,
  Corte,
  ID,
  ISODate,
  ModuloPlantilla,
  Plantilla,
  Proyecto,
} from './types';

/* ---------- Entregas ---------- */

/** Un corte cuenta como entregado cuando ya esta en manos del cliente. */
export function estaEntregado(corte: Corte): boolean {
  return corte.estado === 'en_revision' || corte.estado === 'aceptado';
}

/**
 * Fecha de entrega que se apunta sola al pasar un corte a revision o aceptado.
 * No pisa una fecha ya escrita a mano, y la retira si el corte vuelve atras.
 */
export function ajustarFechaEntrega(corte: Corte, fechaHoy: ISODate): Corte {
  if (estaEntregado(corte)) {
    return corte.fechaEntrega ? corte : { ...corte, fechaEntrega: fechaHoy };
  }
  return corte.fechaEntrega ? { ...corte, fechaEntrega: undefined } : corte;
}

export interface Entregas {
  aceptadosAnio: number;
  entregadosAnio: number;
  importeMedio: number;
  /** Porcentaje de entregas dentro de plazo, o null si no hay con que compararlas. */
  puntualidad: number | null;
  conFechas: number;
  fueraDePlazo: number;
}

/** Rendimiento medido en modulos entregados, sin contar horas. */
export function resumenEntregas(db: BaseDatos, fechaHoy: ISODate): Entregas {
  const anio = fechaHoy.slice(0, 4);
  const entregados = db.cortes.filter((c) => estaEntregado(c) && c.fechaEntrega?.startsWith(anio));
  const aceptados = db.cortes.filter((c) => c.estado === 'aceptado' && c.fechaEntrega?.startsWith(anio));

  const conImporte = aceptados.filter((c) => (c.importe ?? 0) > 0);
  const importeMedio = conImporte.length
    ? Math.round((conImporte.reduce((suma, c) => suma + (c.importe ?? 0), 0) / conImporte.length) * 100) / 100
    : 0;

  const comparables = db.cortes.filter((c) => c.fechaEntrega && c.fechaObjetivo);
  const fueraDePlazo = comparables.filter((c) => c.fechaEntrega! > c.fechaObjetivo!).length;

  return {
    aceptadosAnio: aceptados.length,
    entregadosAnio: entregados.length,
    importeMedio,
    puntualidad: comparables.length
      ? Math.round(((comparables.length - fueraDePlazo) / comparables.length) * 100)
      : null,
    conFechas: comparables.length,
    fueraDePlazo,
  };
}

/* ---------- Presupuesto por modulos ---------- */

export interface CuadreProyecto {
  /** Presupuesto pactado con el cliente, si se escribio. */
  pactado?: number;
  /** Suma de los importes de los cortes del proyecto. */
  modulos: number;
  /** Total emitido en cobros, borradores aparte. */
  facturado: number;
  cortesSinImporte: number;
  /** Diferencia entre modulos y pactado. Positiva: los modulos suman de mas. */
  desviacion: number;
  cuadra: boolean;
}

/** Compara lo pactado, lo que suman los modulos y lo ya facturado. */
export function cuadreProyecto(db: BaseDatos, proyecto: Proyecto): CuadreProyecto {
  const cortes = db.cortes.filter((c) => c.proyectoId === proyecto.id);
  const modulos = Math.round(cortes.reduce((suma, c) => suma + (c.importe ?? 0), 0) * 100) / 100;
  const facturado =
    Math.round(
      db.movimientos
        .filter((m) => m.proyectoId === proyecto.id && m.tipo === 'cobro' && m.estado !== 'borrador')
        .reduce((suma, m) => suma + totalConImpuestos(m), 0) * 100,
    ) / 100;

  const pactado = proyecto.presupuesto;
  const desviacion = pactado === undefined ? 0 : Math.round((modulos - pactado) * 100) / 100;

  return {
    pactado,
    modulos,
    facturado,
    cortesSinImporte: cortes.filter((c) => !c.importe).length,
    desviacion,
    // Un euro de margen: las diferencias de redondeo no son una desviacion.
    cuadra: pactado === undefined || Math.abs(desviacion) <= 1,
  };
}

/* ---------- Plantillas ---------- */

export function importeDePlantilla(plantilla: Plantilla): number {
  return Math.round(plantilla.modulos.reduce((suma, m) => suma + (m.importe ?? 0), 0) * 100) / 100;
}

/** Convierte un modulo de plantilla en un corte real del proyecto. */
export function corteDesdeModulo(
  modulo: ModuloPlantilla,
  proyectoId: ID,
  orden: number,
  creadoEn = new Date().toISOString(),
): Corte {
  return {
    id: nuevoId('cor'),
    proyectoId,
    codigo: modulo.codigo,
    titulo: modulo.titulo,
    objetivo: modulo.objetivo,
    fueraDeAlcance: modulo.fueraDeAlcance,
    estado: 'planificado',
    importe: modulo.importe,
    criterios: modulo.criterios.map((texto) => ({ id: nuevoId('cri'), texto, hecho: false })),
    orden,
    creadoEn,
  };
}

/** Todos los cortes de una plantilla, numerados a partir del orden indicado. */
export function cortesDesdePlantilla(plantilla: Plantilla, proyectoId: ID, ordenInicial = 1): Corte[] {
  const creadoEn = new Date().toISOString();
  return plantilla.modulos.map((modulo, i) => corteDesdeModulo(modulo, proyectoId, ordenInicial + i, creadoEn));
}
