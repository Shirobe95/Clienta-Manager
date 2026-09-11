import { baseDatosVacia, DB_VERSION, AJUSTES_POR_DEFECTO } from './types';
import type { BaseDatos } from './types';

export const CLAVE_ALMACEN = 'clienta-manager:db:v1';

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
      const crudo = localStorage.getItem(CLAVE_ALMACEN);
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

/** Normaliza un documento leido o importado para que cumpla el esquema actual. */
export function migrar(entrada: Partial<BaseDatos>): BaseDatos {
  const vacia = baseDatosVacia();
  return {
    version: DB_VERSION,
    clientes: entrada.clientes ?? vacia.clientes,
    proyectos: entrada.proyectos ?? vacia.proyectos,
    cortes: entrada.cortes ?? vacia.cortes,
    decisiones: entrada.decisiones ?? vacia.decisiones,
    movimientos: entrada.movimientos ?? vacia.movimientos,
    seguimientos: entrada.seguimientos ?? vacia.seguimientos,
    ajustes: { ...AJUSTES_POR_DEFECTO, ...(entrada.ajustes ?? {}) },
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
    throw new Error('El archivo no tiene el formato de Clienta Manager.');
  }
  return migrar(datos);
}
