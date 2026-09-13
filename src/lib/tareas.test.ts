import { describe, expect, it } from 'vitest';
import {
  agruparPorEstado,
  ajustarFechaSubida,
  conceptoDeTarea,
  estaPendiente,
  nuevaTarea,
  resumenTareas,
  siguienteEstado,
  tareasEnCurso,
  tareasSinFacturar,
} from './tareas';
import { baseDatosVacia } from './types';
import type { BaseDatos, Corte, Movimiento, Proyecto, Tarea } from './types';

const AHORA = '2026-06-15T09:00:00.000Z';
const HOY = '2026-06-15';

function tarea(parcial: Partial<Tarea> & { id: string }): Tarea {
  return {
    proyectoId: 'p1',
    titulo: 'Tarea',
    estado: 'pendiente',
    prioridad: 'normal',
    orden: 1,
    creadoEn: AHORA,
    ...parcial,
  };
}

const proyecto: Proyecto = {
  id: 'p1',
  clienteId: 'c1',
  nombre: 'FutonERP',
  estado: 'activo',
  modelo: 'fijo',
  enlaces: [],
  etiquetas: [],
  creadoEn: AHORA,
};

function base(tareas: Tarea[], movimientos: Movimiento[] = []): BaseDatos {
  return {
    ...baseDatosVacia(),
    clientes: [{ id: 'c1', nombre: 'Futones Espai', estado: 'activo', etiquetas: [], creadoEn: AHORA }],
    proyectos: [proyecto],
    tareas,
    movimientos,
  };
}

describe('siguienteEstado', () => {
  it('avanza por el flujo de trabajo', () => {
    expect(siguienteEstado('pendiente')).toBe('desarrollando');
    expect(siguienteEstado('desarrollando')).toBe('completada');
    expect(siguienteEstado('completada')).toBe('subida');
  });

  it('no avanza más allá de subida', () => {
    expect(siguienteEstado('subida')).toBeNull();
  });

  it('una tarea cancelada no tiene siguiente paso', () => {
    expect(siguienteEstado('cancelada')).toBeNull();
  });
});

describe('estaPendiente', () => {
  it('cuenta lo que queda por hacer o está en marcha', () => {
    expect(estaPendiente(tarea({ id: 'a', estado: 'pendiente' }))).toBe(true);
    expect(estaPendiente(tarea({ id: 'b', estado: 'desarrollando' }))).toBe(true);
    expect(estaPendiente(tarea({ id: 'c', estado: 'completada' }))).toBe(true);
  });

  it('lo subido y lo cancelado ya no cuenta', () => {
    expect(estaPendiente(tarea({ id: 'd', estado: 'subida' }))).toBe(false);
    expect(estaPendiente(tarea({ id: 'e', estado: 'cancelada' }))).toBe(false);
  });
});

describe('ajustarFechaSubida', () => {
  it('apunta la fecha al subir', () => {
    expect(ajustarFechaSubida(tarea({ id: 'a', estado: 'subida' }), HOY).fechaSubida).toBe(HOY);
  });

  it('respeta una fecha puesta a mano', () => {
    const t = tarea({ id: 'a', estado: 'subida', fechaSubida: '2026-05-01' });
    expect(ajustarFechaSubida(t, HOY).fechaSubida).toBe('2026-05-01');
  });

  it('retira la fecha si la tarea vuelve atrás', () => {
    const t = tarea({ id: 'a', estado: 'completada', fechaSubida: '2026-05-01' });
    expect(ajustarFechaSubida(t, HOY).fechaSubida).toBeUndefined();
  });

  it('no crea un objeto nuevo si no hay nada que cambiar', () => {
    const t = tarea({ id: 'a', estado: 'pendiente' });
    expect(ajustarFechaSubida(t, HOY)).toBe(t);
  });
});

describe('agruparPorEstado', () => {
  it('pone lo que se está desarrollando primero y omite los grupos vacíos', () => {
    const grupos = agruparPorEstado([
      tarea({ id: 'a', estado: 'subida' }),
      tarea({ id: 'b', estado: 'desarrollando' }),
      tarea({ id: 'c', estado: 'pendiente' }),
    ]);
    expect(grupos.map((g) => g.estado)).toEqual(['desarrollando', 'pendiente', 'subida']);
  });

  it('dentro de cada grupo manda la prioridad y luego el orden', () => {
    const grupos = agruparPorEstado([
      tarea({ id: 'baja', prioridad: 'baja', orden: 1 }),
      tarea({ id: 'alta', prioridad: 'alta', orden: 9 }),
      tarea({ id: 'normal', prioridad: 'normal', orden: 5 }),
    ]);
    expect(grupos[0]!.tareas.map((t) => t.id)).toEqual(['alta', 'normal', 'baja']);
  });

  it('sin tareas no hay grupos', () => {
    expect(agruparPorEstado([])).toEqual([]);
  });
});

describe('resumenTareas', () => {
  const lista = [
    tarea({ id: 'a', estado: 'pendiente', importe: 100 }),
    tarea({ id: 'b', estado: 'desarrollando', importe: 200 }),
    tarea({ id: 'c', estado: 'completada', importe: 50 }),
    tarea({ id: 'd', estado: 'subida', importe: 300 }),
    tarea({ id: 'e', estado: 'cancelada', importe: 900 }),
    tarea({ id: 'f', estado: 'pendiente' }),
  ];

  it('cuenta cada estado por separado', () => {
    expect(resumenTareas(lista)).toMatchObject({
      pendientes: 2,
      desarrollando: 1,
      completadas: 1,
      subidas: 1,
    });
  });

  it('el importe pendiente ignora lo subido y lo cancelado', () => {
    expect(resumenTareas(lista).importePendiente).toBe(350);
    expect(resumenTareas(lista).importeSubido).toBe(300);
  });
});

describe('tareasEnCurso', () => {
  it('solo devuelve lo que se está desarrollando, con su proyecto y cliente', () => {
    const db = base([
      tarea({ id: 'a', estado: 'desarrollando' }),
      tarea({ id: 'b', estado: 'pendiente' }),
    ]);
    const curso = tareasEnCurso(db);
    expect(curso).toHaveLength(1);
    expect(curso[0]!.proyecto.nombre).toBe('FutonERP');
    expect(curso[0]!.cliente!.nombre).toBe('Futones Espai');
  });

  it('ordena por prioridad y luego por fecha objetivo', () => {
    const db = base([
      tarea({ id: 'tarde', estado: 'desarrollando', fechaObjetivo: '2026-12-01' }),
      tarea({ id: 'urgente', estado: 'desarrollando', prioridad: 'alta', fechaObjetivo: '2027-01-01' }),
      tarea({ id: 'pronto', estado: 'desarrollando', fechaObjetivo: '2026-07-01' }),
    ]);
    expect(tareasEnCurso(db).map((x) => x.tarea.id)).toEqual(['urgente', 'pronto', 'tarde']);
  });

  it('descarta tareas de un proyecto que ya no existe', () => {
    const db = base([tarea({ id: 'a', estado: 'desarrollando', proyectoId: 'fantasma' })]);
    expect(tareasEnCurso(db)).toEqual([]);
  });
});

describe('tareasSinFacturar', () => {
  const movimiento = (parcial: Partial<Movimiento> & { id: string }): Movimiento => ({
    tipo: 'cobro',
    concepto: 'x',
    importe: 100,
    ivaPct: 0,
    irpfPct: 0,
    estado: 'pendiente',
    fechaEmision: HOY,
    creadoEn: AHORA,
    ...parcial,
  });

  it('solo cuenta las subidas con precio', () => {
    const db = base([
      tarea({ id: 'a', estado: 'subida', importe: 100 }),
      tarea({ id: 'b', estado: 'completada', importe: 100 }),
      tarea({ id: 'c', estado: 'subida' }),
    ]);
    expect(tareasSinFacturar(db).map((x) => x.tarea.id)).toEqual(['a']);
  });

  it('excluye la que ya tiene cobro vinculado', () => {
    const db = base(
      [tarea({ id: 'a', estado: 'subida', importe: 100 })],
      [movimiento({ id: 'm', tareaId: 'a' })],
    );
    expect(tareasSinFacturar(db)).toEqual([]);
  });

  it('un pago vinculado no cuenta como facturada', () => {
    const db = base(
      [tarea({ id: 'a', estado: 'subida', importe: 100 })],
      [movimiento({ id: 'm', tareaId: 'a', tipo: 'pago' })],
    );
    expect(tareasSinFacturar(db)).toHaveLength(1);
  });
});

describe('conceptoDeTarea', () => {
  const t = tarea({ id: 'a', titulo: 'Importador de proveedores' });

  it('usa proyecto y título cuando no hay corte', () => {
    expect(conceptoDeTarea(proyecto, t)).toBe('FutonERP · Importador de proveedores');
  });

  it('intercala el código del corte cuando lo hay', () => {
    const corte = { codigo: 'C2' } as Corte;
    expect(conceptoDeTarea(proyecto, t, corte)).toBe('FutonERP · C2 · Importador de proveedores');
  });
});

describe('nuevaTarea', () => {
  it('nace pendiente, con prioridad normal y el orden indicado', () => {
    const t = nuevaTarea('p9', 4);
    expect(t).toMatchObject({ proyectoId: 'p9', estado: 'pendiente', prioridad: 'normal', orden: 4 });
    expect(t.importe).toBeUndefined();
  });

  it('puede nacer dentro de un corte', () => {
    expect(nuevaTarea('p9', 1, 'cor1').corteId).toBe('cor1');
  });
});
