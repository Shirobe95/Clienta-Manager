import { nuevoId } from './id';
import { migrar } from './storage';
import type { BaseDatos, ISODateTime } from './types';

export const CLAVE_INSTANTANEAS = 'gremio:instantaneas:v1';
/** Cuantas instantaneas se conservan antes de tirar la mas antigua. */
export const MAXIMO_INSTANTANEAS = 8;

export type MotivoInstantanea =
  | 'manual'
  | 'automatica'
  | 'antes_de_importar'
  | 'antes_de_reiniciar'
  | 'antes_de_ejemplo'
  | 'antes_de_restaurar';

export interface Instantanea {
  id: string;
  creadoEn: ISODateTime;
  motivo: MotivoInstantanea;
  registros: number;
  datos: BaseDatos;
}

/* ---------- Recuento y estado de la copia ---------- */

export interface Recuento {
  clientes: number;
  proyectos: number;
  cortes: number;
  plantillas: number;
  decisiones: number;
  movimientos: number;
  seguimientos: number;
  total: number;
}

export function contar(db: BaseDatos): Recuento {
  const parcial = {
    clientes: db.clientes.length,
    proyectos: db.proyectos.length,
    cortes: db.cortes.length,
    plantillas: db.plantillas.length,
    decisiones: db.decisiones.length,
    movimientos: db.movimientos.length,
    seguimientos: db.seguimientos.length,
  };
  return { ...parcial, total: Object.values(parcial).reduce((suma, n) => suma + n, 0) };
}

export interface EstadoCopia {
  /** Dias enteros desde la ultima exportacion, o null si nunca se ha hecho. */
  dias: number | null;
  /** Hay cambios posteriores a la ultima copia. */
  hayCambios: boolean;
  /** Toca hacer copia: nunca se hizo, o hay cambios y ha pasado el plazo. */
  avisar: boolean;
}

export function estadoCopia(db: BaseDatos, ahora = new Date()): EstadoCopia {
  const { ultimaCopia, diasAvisoCopia } = db.ajustes;
  if (!ultimaCopia) {
    return { dias: null, hayCambios: contar(db).total > 0, avisar: contar(db).total > 0 };
  }

  const transcurridos = ahora.getTime() - new Date(ultimaCopia).getTime();
  const dias = Math.max(0, Math.floor(transcurridos / 86_400_000));
  const hayCambios = db.actualizadoEn > ultimaCopia;

  return { dias, hayCambios, avisar: hayCambios && dias >= diasAvisoCopia };
}

/* ---------- Fusion de un documento importado ---------- */

type ColeccionFusionable = 'clientes' | 'proyectos' | 'cortes' | 'plantillas' | 'decisiones' | 'movimientos' | 'seguimientos';

const COLECCIONES: ColeccionFusionable[] = [
  'clientes',
  'proyectos',
  'cortes',
  'plantillas',
  'decisiones',
  'movimientos',
  'seguimientos',
];

export interface ResumenFusion {
  nuevos: number;
  actualizados: number;
  iguales: number;
}

/** Que pasaria al fusionar, sin tocar nada. */
export function previsualizarFusion(actual: BaseDatos, entrante: BaseDatos): ResumenFusion {
  let nuevos = 0;
  let actualizados = 0;
  let iguales = 0;

  for (const coleccion of COLECCIONES) {
    const propios = new Map((actual[coleccion] as { id: string }[]).map((x) => [x.id, x]));
    for (const elemento of entrante[coleccion] as { id: string }[]) {
      const propio = propios.get(elemento.id);
      if (!propio) nuevos += 1;
      else if (JSON.stringify(propio) === JSON.stringify(elemento)) iguales += 1;
      else actualizados += 1;
    }
  }

  return { nuevos, actualizados, iguales };
}

/**
 * Une el documento importado con el actual: lo que no existe se anade y lo que
 * coincide por id se sustituye por la version del archivo. Nada se borra, asi
 * que fusionar nunca hace desaparecer trabajo que solo esta en este navegador.
 * Los ajustes se quedan como estan: son de este dispositivo.
 */
export function fusionar(actual: BaseDatos, entrante: BaseDatos): BaseDatos {
  const resultado: BaseDatos = { ...actual, actualizadoEn: new Date().toISOString() };

  for (const coleccion of COLECCIONES) {
    const indice = new Map((actual[coleccion] as { id: string }[]).map((x) => [x.id, x]));
    for (const elemento of entrante[coleccion] as { id: string }[]) indice.set(elemento.id, elemento);
    // El tipo concreto de cada coleccion se conserva; el indice solo usa el id.
    (resultado[coleccion] as unknown[]) = [...indice.values()];
  }

  return resultado;
}

/* ---------- Instantaneas locales ---------- */

/**
 * Las instantaneas viven en el mismo navegador que los datos: sirven para
 * deshacer un borrado o una importacion, no como copia de seguridad. Para eso
 * esta el archivo exportado.
 */
export function listarInstantaneas(): Instantanea[] {
  try {
    const crudo = localStorage.getItem(CLAVE_INSTANTANEAS);
    if (!crudo) return [];
    const lista = JSON.parse(crudo) as Instantanea[];
    return Array.isArray(lista) ? lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)) : [];
  } catch (error) {
    console.error('No se pudieron leer las instantáneas', error);
    return [];
  }
}

function escribirInstantaneas(lista: Instantanea[]): boolean {
  try {
    localStorage.setItem(CLAVE_INSTANTANEAS, JSON.stringify(lista));
    return true;
  } catch (error) {
    console.error('No se pudieron guardar las instantáneas', error);
    return false;
  }
}

/**
 * Guarda una instantanea y tira las mas antiguas si se pasa del maximo.
 * Un documento vacio no se guarda: no hay nada que deshacer y solo seria ruido.
 */
export function crearInstantanea(db: BaseDatos, motivo: MotivoInstantanea): Instantanea[] {
  if (contar(db).total === 0) return listarInstantaneas();

  const instantanea: Instantanea = {
    id: nuevoId('snap'),
    creadoEn: new Date().toISOString(),
    motivo,
    registros: contar(db).total,
    datos: db,
  };

  let lista = [instantanea, ...listarInstantaneas()].slice(0, MAXIMO_INSTANTANEAS);

  // Si no cabe, se recorta hasta que entre antes que fallar en silencio.
  while (!escribirInstantaneas(lista) && lista.length > 1) {
    lista = lista.slice(0, lista.length - 1);
  }

  return lista;
}

export function borrarInstantanea(id: string): Instantanea[] {
  const lista = listarInstantaneas().filter((x) => x.id !== id);
  escribirInstantaneas(lista);
  return lista;
}

export function restaurarInstantanea(id: string): BaseDatos | null {
  const instantanea = listarInstantaneas().find((x) => x.id === id);
  return instantanea ? migrar(instantanea.datos) : null;
}

export const MOTIVOS: Record<MotivoInstantanea, string> = {
  manual: 'Creada a mano',
  automatica: 'Automática al abrir',
  antes_de_importar: 'Antes de importar',
  antes_de_reiniciar: 'Antes de borrar todo',
  antes_de_ejemplo: 'Antes de cargar el ejemplo',
  antes_de_restaurar: 'Antes de restaurar otra',
};
