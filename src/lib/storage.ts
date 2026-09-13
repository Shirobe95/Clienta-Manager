import { ajustesPorDefecto, baseDatosVacia, DB_VERSION } from './types';
import type { BaseDatos } from './types';

export const CLAVE_ALMACEN = 'gremio:db:v1';
/** Clave anterior al renombrado del proyecto. Se migra sola al primer arranque. */
export const CLAVE_LEGADO = 'clienta-manager:db:v1';

/**
 * Contrato de persistencia. Hoy se implementa contra localStorage;
 * un adaptador remoto (Supabase, API propia) solo tiene que cumplir esta interfaz.
 */
export interface AlmacenDatos {
  leer(): BaseDatos | null;
  escribir(db: BaseDatos): void;
  borrar(): void;
}

export const almacenLocal: AlmacenDatos = {
  leer() {
    try {
      const crudo = localStorage.getItem(CLAVE_ALMACEN) ?? rescatarLegado();
      if (!crudo) return null;
      return migrar(JSON.parse(crudo) as Partial<BaseDatos>);
    } catch (error) {
      console.error('No se pudo leer el almacen local', error);
      return null;
    }
  },
  escribir(db) {
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(db));
    } catch (error) {
      console.error('No se pudo guardar en el almacen local', error);
    }
  },
  borrar() {
    try {
      localStorage.removeItem(CLAVE_ALMACEN);
    } catch (error) {
      console.error('No se pudo borrar el almacen local', error);
    }
  },
};

/** Recupera los datos guardados con el nombre antiguo y los mueve a la clave actual. */
function rescatarLegado(): string | null {
  const crudo = localStorage.getItem(CLAVE_LEGADO);
  if (!crudo) return null;
  localStorage.setItem(CLAVE_ALMACEN, crudo);
  localStorage.removeItem(CLAVE_LEGADO);
  return crudo;
}

/** Normaliza un documento leido o importado para que cumpla el esquema actual. */
export function migrar(entrada: Partial<BaseDatos>): BaseDatos {
  const vacia = baseDatosVacia();
  return {
    version: DB_VERSION,
    clientes: entrada.clientes ?? vacia.clientes,
    proyectos: entrada.proyectos ?? vacia.proyectos,
    cortes: entrada.cortes ?? vacia.cortes,
    tareas: entrada.tareas ?? vacia.tareas,
    plantillas: entrada.plantillas ?? vacia.plantillas,
    decisiones: entrada.decisiones ?? vacia.decisiones,
    movimientos: entrada.movimientos ?? vacia.movimientos,
    seguimientos: entrada.seguimientos ?? vacia.seguimientos,
    ajustes: { ...ajustesPorDefecto(), ...(entrada.ajustes ?? {}) },
    actualizadoEn: entrada.actualizadoEn ?? vacia.actualizadoEn,
  };
}

export function exportarJSON(db: BaseDatos): string {
  return JSON.stringify(db, null, 2);
}

/** Importa un JSON exportado. Lanza si el contenido no es un documento valido. */
export function importarJSON(texto: string): BaseDatos {
  const datos = JSON.parse(texto) as Partial<BaseDatos>;
  if (typeof datos !== 'object' || datos === null || !Array.isArray(datos.clientes)) {
    throw new Error('El archivo no tiene el formato de Gremio.');
  }
  return migrar(datos);
}
