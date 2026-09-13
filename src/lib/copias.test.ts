import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLAVE_INSTANTANEAS,
  MAXIMO_INSTANTANEAS,
  borrarInstantanea,
  contar,
  crearInstantanea,
  estadoCopia,
  fusionar,
  listarInstantaneas,
  previsualizarFusion,
  restaurarInstantanea,
} from './copias';
import { baseDatosVacia } from './types';
import type { BaseDatos, Cliente } from './types';

const AHORA = '2026-06-15T09:00:00.000Z';

function cliente(id: string, nombre = 'Cliente'): Cliente {
  return { id, nombre, estado: 'activo', etiquetas: [], creadoEn: AHORA };
}

function base(parcial: Partial<BaseDatos> = {}): BaseDatos {
  return { ...baseDatosVacia(), ...parcial };
}

/** localStorage mínimo para las pruebas de instantáneas. */
function montarAlmacenFalso() {
  const datos = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
    removeItem: (clave: string) => void datos.delete(clave),
    clear: () => datos.clear(),
    key: (i: number) => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size;
    },
  } as Storage;
  return datos;
}

describe('contar', () => {
  it('suma todas las colecciones', () => {
    const db = base({ clientes: [cliente('c1'), cliente('c2')], movimientos: [] });
    expect(contar(db)).toMatchObject({ clientes: 2, total: 2 });
  });

  it('un documento vacío cuenta cero', () => {
    expect(contar(baseDatosVacia()).total).toBe(0);
  });
});

describe('estadoCopia', () => {
  const ahora = new Date('2026-06-15T09:00:00.000Z');

  it('avisa si nunca se ha hecho copia y hay datos', () => {
    const db = base({ clientes: [cliente('c1')] });
    expect(estadoCopia(db, ahora)).toEqual({ dias: null, hayCambios: true, avisar: true });
  });

  it('no avisa si nunca se ha hecho copia pero no hay nada que guardar', () => {
    expect(estadoCopia(baseDatosVacia(), ahora).avisar).toBe(false);
  });

  it('no avisa si la copia es posterior al último cambio', () => {
    const db = base({
      actualizadoEn: '2026-06-01T10:00:00.000Z',
      ajustes: { ...baseDatosVacia().ajustes, ultimaCopia: '2026-06-02T10:00:00.000Z' },
    });
    expect(estadoCopia(db, ahora)).toMatchObject({ dias: 12, hayCambios: false, avisar: false });
  });

  it('no avisa mientras no se pase del plazo, aunque haya cambios', () => {
    const db = base({
      actualizadoEn: '2026-06-14T10:00:00.000Z',
      ajustes: { ...baseDatosVacia().ajustes, ultimaCopia: '2026-06-13T09:00:00.000Z', diasAvisoCopia: 7 },
    });
    expect(estadoCopia(db, ahora)).toMatchObject({ dias: 2, hayCambios: true, avisar: false });
  });

  it('avisa al pasar el plazo con cambios pendientes', () => {
    const db = base({
      actualizadoEn: '2026-06-14T10:00:00.000Z',
      ajustes: { ...baseDatosVacia().ajustes, ultimaCopia: '2026-06-01T09:00:00.000Z', diasAvisoCopia: 7 },
    });
    expect(estadoCopia(db, ahora).avisar).toBe(true);
  });
});

describe('previsualizarFusion', () => {
  it('separa nuevos, actualizados e iguales', () => {
    const actual = base({ clientes: [cliente('c1', 'Uno'), cliente('c2', 'Dos')] });
    const entrante = base({
      clientes: [cliente('c1', 'Uno'), cliente('c2', 'Dos cambiado'), cliente('c3', 'Tres')],
    });
    expect(previsualizarFusion(actual, entrante)).toEqual({ nuevos: 1, actualizados: 1, iguales: 1 });
  });

  it('un documento vacío no propone nada', () => {
    expect(previsualizarFusion(base({ clientes: [cliente('c1')] }), baseDatosVacia())).toEqual({
      nuevos: 0,
      actualizados: 0,
      iguales: 0,
    });
  });
});

describe('fusionar', () => {
  it('añade lo que falta y sustituye lo que coincide por id', () => {
    const actual = base({ clientes: [cliente('c1', 'Uno'), cliente('c2', 'Dos')] });
    const entrante = base({ clientes: [cliente('c2', 'Dos nuevo'), cliente('c3', 'Tres')] });
    const fusionado = fusionar(actual, entrante);
    expect(fusionado.clientes).toHaveLength(3);
    expect(fusionado.clientes.find((c) => c.id === 'c2')!.nombre).toBe('Dos nuevo');
  });

  it('nunca borra lo que solo existe en este navegador', () => {
    const actual = base({ clientes: [cliente('local')] });
    const fusionado = fusionar(actual, baseDatosVacia());
    expect(fusionado.clientes.map((c) => c.id)).toEqual(['local']);
  });

  it('conserva los ajustes del dispositivo', () => {
    const actual = base({ ajustes: { ...baseDatosVacia().ajustes, moneda: 'USD' } });
    const entrante = base({ ajustes: { ...baseDatosVacia().ajustes, moneda: 'GBP' } });
    expect(fusionar(actual, entrante).ajustes.moneda).toBe('USD');
  });

  it('fusiona todas las colecciones, no solo clientes', () => {
    const entrante = base({
      plantillas: [{ id: 'pl1', nombre: 'Plantilla', modelo: 'fijo', modulos: [], creadoEn: AHORA }],
    });
    expect(fusionar(baseDatosVacia(), entrante).plantillas).toHaveLength(1);
  });
});

describe('instantáneas', () => {
  beforeEach(() => {
    montarAlmacenFalso();
  });

  it('guarda y recupera una instantánea con su recuento', () => {
    const db = base({ clientes: [cliente('c1')] });
    crearInstantanea(db, 'manual');
    const lista = listarInstantaneas();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ motivo: 'manual', registros: 1 });
  });

  it('devuelve las más recientes primero', () => {
    crearInstantanea(base({ clientes: [cliente('a')] }), 'manual');
    crearInstantanea(base({ clientes: [cliente('a'), cliente('b')] }), 'automatica');
    expect(listarInstantaneas()[0]!.registros).toBe(2);
  });

  it('no guarda más del máximo', () => {
    for (let i = 0; i < MAXIMO_INSTANTANEAS + 3; i += 1) crearInstantanea(base({ clientes: [cliente(`c${i}`)] }), 'manual');
    expect(listarInstantaneas()).toHaveLength(MAXIMO_INSTANTANEAS);
  });

  it('restaura el documento guardado', () => {
    crearInstantanea(base({ clientes: [cliente('c1', 'Recuperado')] }), 'manual');
    const id = listarInstantaneas()[0]!.id;
    expect(restaurarInstantanea(id)!.clientes[0]!.nombre).toBe('Recuperado');
  });

  it('restaurar un id inexistente devuelve null', () => {
    expect(restaurarInstantanea('no_existe')).toBeNull();
  });

  it('borra solo la instantánea indicada', () => {
    crearInstantanea(base({ clientes: [cliente('a')] }), 'manual');
    crearInstantanea(base({ clientes: [cliente('a'), cliente('b')] }), 'manual');
    const [primera] = listarInstantaneas();
    expect(borrarInstantanea(primera!.id)).toHaveLength(1);
  });

  it('no guarda instantáneas de un documento vacío', () => {
    crearInstantanea(baseDatosVacia(), 'manual');
    expect(listarInstantaneas()).toEqual([]);
  });

  it('sobrevive a un almacén con contenido corrupto', () => {
    localStorage.setItem(CLAVE_INSTANTANEAS, '{no es json');
    expect(listarInstantaneas()).toEqual([]);
  });
});
