import { nuevoId } from './id';
import type { BaseDatos, Cliente, Corte, EstadoTarea, ID, ISODate, Proyecto, Tarea } from './types';

/** Orden en el que se avanza con el boton de un solo clic. */
export const FLUJO: EstadoTarea[] = ['pendiente', 'desarrollando', 'completada', 'subida'];

/** Estados que se muestran como columnas, en el orden en que se leen. */
export const ORDEN_TABLERO: EstadoTarea[] = [
  'desarrollando',
  'pendiente',
  'completada',
  'subida',
  'cancelada',
];

/** Siguiente estado del flujo, o null si la tarea ya esta al final o cancelada. */
export function siguienteEstado(estado: EstadoTarea): EstadoTarea | null {
  const posicion = FLUJO.indexOf(estado);
  if (posicion === -1 || posicion === FLUJO.length - 1) return null;
  return FLUJO[posicion + 1]!;
}

/** Una tarea esta viva mientras no este subida ni cancelada. */
export function estaPendiente(tarea: Tarea): boolean {
  return tarea.estado === 'pendiente' || tarea.estado === 'desarrollando' || tarea.estado === 'completada';
}

/**
 * Apunta o retira la fecha de subida segun el estado, sin pisar una escrita a
 * mano. Misma regla que la fecha de entrega de un corte.
 */
export function ajustarFechaSubida(tarea: Tarea, fechaHoy: ISODate): Tarea {
  if (tarea.estado === 'subida') {
    return tarea.fechaSubida ? tarea : { ...tarea, fechaSubida: fechaHoy };
  }
  return tarea.fechaSubida ? { ...tarea, fechaSubida: undefined } : tarea;
}

export function nuevaTarea(proyectoId: ID, orden: number, corteId?: ID): Tarea {
  return {
    id: nuevoId('tar'),
    proyectoId,
    corteId,
    titulo: '',
    estado: 'pendiente',
    prioridad: 'normal',
    orden,
    creadoEn: new Date().toISOString(),
  };
}

const PESO_PRIORIDAD: Record<Tarea['prioridad'], number> = { alta: 0, normal: 1, baja: 2 };

/** Tareas de un proyecto agrupadas por estado, listas para pintar el tablero. */
export function agruparPorEstado(tareas: Tarea[]): { estado: EstadoTarea; tareas: Tarea[] }[] {
  const ordenadas = [...tareas].sort(
    (a, b) => PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] || a.orden - b.orden,
  );
  return ORDEN_TABLERO.map((estado) => ({
    estado,
    tareas: ordenadas.filter((t) => t.estado === estado),
  })).filter((grupo) => grupo.tareas.length > 0);
}

export interface ResumenTareas {
  pendientes: number;
  desarrollando: number;
  completadas: number;
  subidas: number;
  /** Importe de las tareas vivas: lo que queda por hacer y cobrar. */
  importePendiente: number;
  /** Importe de las tareas ya subidas. */
  importeSubido: number;
}

export function resumenTareas(tareas: Tarea[]): ResumenTareas {
  const suma = (lista: Tarea[]) =>
    Math.round(lista.reduce((total, t) => total + (t.importe ?? 0), 0) * 100) / 100;

  return {
    pendientes: tareas.filter((t) => t.estado === 'pendiente').length,
    desarrollando: tareas.filter((t) => t.estado === 'desarrollando').length,
    completadas: tareas.filter((t) => t.estado === 'completada').length,
    subidas: tareas.filter((t) => t.estado === 'subida').length,
    importePendiente: suma(tareas.filter(estaPendiente)),
    importeSubido: suma(tareas.filter((t) => t.estado === 'subida')),
  };
}

export interface TareaEnCurso {
  tarea: Tarea;
  proyecto: Proyecto;
  cliente?: Cliente;
}

/** En que se esta trabajando ahora mismo, en todos los proyectos a la vez. */
export function tareasEnCurso(db: BaseDatos): TareaEnCurso[] {
  return db.tareas
    .filter((t) => t.estado === 'desarrollando')
    .map((tarea): TareaEnCurso | null => {
      const proyecto = db.proyectos.find((p) => p.id === tarea.proyectoId);
      return proyecto
        ? { tarea, proyecto, cliente: db.clientes.find((c) => c.id === proyecto.clienteId) }
        : null;
    })
    .filter((x): x is TareaEnCurso => x !== null)
    .sort(
      (a, b) =>
        PESO_PRIORIDAD[a.tarea.prioridad] - PESO_PRIORIDAD[b.tarea.prioridad] ||
        (a.tarea.fechaObjetivo ?? '9999').localeCompare(b.tarea.fechaObjetivo ?? '9999'),
    );
}

export interface TareaSinFacturar {
  tarea: Tarea;
  proyecto: Proyecto;
  cliente?: Cliente;
}

/** Tareas ya subidas, con precio y sin ningun cobro vinculado. */
export function tareasSinFacturar(db: BaseDatos): TareaSinFacturar[] {
  const facturadas = new Set(
    db.movimientos.filter((m) => m.tipo === 'cobro' && m.tareaId).map((m) => m.tareaId!),
  );

  return db.tareas
    .filter((t) => t.estado === 'subida' && (t.importe ?? 0) > 0 && !facturadas.has(t.id))
    .map((tarea): TareaSinFacturar | null => {
      const proyecto = db.proyectos.find((p) => p.id === tarea.proyectoId);
      return proyecto
        ? { tarea, proyecto, cliente: db.clientes.find((c) => c.id === proyecto.clienteId) }
        : null;
    })
    .filter((x): x is TareaSinFacturar => x !== null)
    .sort((a, b) => (a.tarea.fechaSubida ?? '').localeCompare(b.tarea.fechaSubida ?? ''));
}

/** Concepto sugerido al facturar una tarea. */
export function conceptoDeTarea(proyecto: Proyecto, tarea: Tarea, corte?: Corte): string {
  const prefijo = corte ? `${proyecto.nombre} · ${corte.codigo}` : proyecto.nombre;
  return `${prefijo} · ${tarea.titulo}`;
}
