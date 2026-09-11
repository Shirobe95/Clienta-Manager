import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { almacenLocal } from '../lib/storage';
import { baseDatosVacia } from '../lib/types';
import type {
  Ajustes,
  BaseDatos,
  Cliente,
  Corte,
  Decision,
  ID,
  Movimiento,
  Proyecto,
  Seguimiento,
} from '../lib/types';

/** Colecciones editables del documento. */
type Coleccion = 'clientes' | 'proyectos' | 'cortes' | 'decisiones' | 'movimientos' | 'seguimientos';

type ElementoDe<K extends Coleccion> = K extends 'clientes'
  ? Cliente
  : K extends 'proyectos'
    ? Proyecto
    : K extends 'cortes'
      ? Corte
      : K extends 'decisiones'
        ? Decision
        : K extends 'movimientos'
          ? Movimiento
          : Seguimiento;

interface ContextoAlmacen {
  db: BaseDatos;
  /** Inserta o reemplaza por id. */
  guardar<K extends Coleccion>(coleccion: K, elemento: ElementoDe<K>): void;
  /** Elimina por id y limpia lo que dependa del elemento borrado. */
  eliminar(coleccion: Coleccion, id: ID): void;
  guardarAjustes(ajustes: Ajustes): void;
  reemplazarTodo(db: BaseDatos): void;
  reiniciar(): void;
}

const Contexto = createContext<ContextoAlmacen | null>(null);

export function ProveedorAlmacen({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<BaseDatos>(() => almacenLocal.leer() ?? baseDatosVacia());
  const primeraCarga = useRef(true);

  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    almacenLocal.escribir(db);
  }, [db]);

  const guardar = useCallback(<K extends Coleccion>(coleccion: K, elemento: ElementoDe<K>) => {
    setDb((actual) => {
      const lista = actual[coleccion] as ElementoDe<K>[];
      const indice = lista.findIndex((x) => x.id === elemento.id);
      const siguiente = indice >= 0 ? lista.with(indice, elemento) : [...lista, elemento];
      return { ...actual, [coleccion]: siguiente, actualizadoEn: new Date().toISOString() };
    });
  }, []);

  const eliminar = useCallback((coleccion: Coleccion, id: ID) => {
    setDb((actual) => aplicarBorrado(actual, coleccion, id));
  }, []);

  const guardarAjustes = useCallback((ajustes: Ajustes) => {
    setDb((actual) => ({ ...actual, ajustes, actualizadoEn: new Date().toISOString() }));
  }, []);

  const reemplazarTodo = useCallback((nueva: BaseDatos) => {
    setDb({ ...nueva, actualizadoEn: new Date().toISOString() });
  }, []);

  const reiniciar = useCallback(() => {
    almacenLocal.borrar();
    setDb(baseDatosVacia());
  }, []);

  const valor = useMemo<ContextoAlmacen>(
    () => ({ db, guardar, eliminar, guardarAjustes, reemplazarTodo, reiniciar }),
    [db, guardar, eliminar, guardarAjustes, reemplazarTodo, reiniciar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Borrado en cascada: nada queda apuntando a un elemento inexistente. */
export function aplicarBorrado(db: BaseDatos, coleccion: Coleccion, id: ID): BaseDatos {
  const marca = new Date().toISOString();

  if (coleccion === 'clientes') {
    const proyectos = db.proyectos.filter((p) => p.clienteId !== id);
    const idsProyecto = new Set(proyectos.map((p) => p.id));
    return {
      ...db,
      clientes: db.clientes.filter((c) => c.id !== id),
      proyectos,
      cortes: db.cortes.filter((c) => idsProyecto.has(c.proyectoId)),
      decisiones: db.decisiones.filter((d) => idsProyecto.has(d.proyectoId)),
      movimientos: db.movimientos.filter((m) => m.clienteId !== id),
      seguimientos: db.seguimientos.filter((s) => s.clienteId !== id),
      actualizadoEn: marca,
    };
  }

  if (coleccion === 'proyectos') {
    return {
      ...db,
      proyectos: db.proyectos.filter((p) => p.id !== id),
      cortes: db.cortes.filter((c) => c.proyectoId !== id),
      decisiones: db.decisiones.filter((d) => d.proyectoId !== id),
      movimientos: db.movimientos.map((m) =>
        m.proyectoId === id ? { ...m, proyectoId: undefined, corteId: undefined } : m,
      ),
      seguimientos: db.seguimientos.map((s) =>
        s.proyectoId === id ? { ...s, proyectoId: undefined } : s,
      ),
      actualizadoEn: marca,
    };
  }

  if (coleccion === 'cortes') {
    return {
      ...db,
      cortes: db.cortes.filter((c) => c.id !== id),
      movimientos: db.movimientos.map((m) => (m.corteId === id ? { ...m, corteId: undefined } : m)),
      actualizadoEn: marca,
    };
  }

  return {
    ...db,
    [coleccion]: (db[coleccion] as { id: ID }[]).filter((x) => x.id !== id),
    actualizadoEn: marca,
  };
}

export function useAlmacen(): ContextoAlmacen {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAlmacen debe usarse dentro de <ProveedorAlmacen>');
  return contexto;
}
