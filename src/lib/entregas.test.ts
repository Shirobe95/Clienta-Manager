import { describe, expect, it } from 'vitest';
import {
  ajustarFechaEntrega,
  corteDesdeModulo,
  cortesDesdePlantilla,
  cuadreProyecto,
  estaEntregado,
  importeDePlantilla,
  resumenEntregas,
} from './entregas';
import { baseDatosVacia } from './types';
import type { BaseDatos, Corte, Movimiento, Plantilla, Proyecto } from './types';

const AHORA = '2026-06-15T09:00:00.000Z';
const HOY = '2026-06-15';

function corte(parcial: Partial<Corte> & { id: string }): Corte {
  return {
    proyectoId: 'p1',
    codigo: 'C1',
    titulo: 'Corte',
    estado: 'planificado',
    criterios: [],
    orden: 1,
    creadoEn: AHORA,
    ...parcial,
  };
}

const proyecto: Proyecto = {
  id: 'p1',
  clienteId: 'c1',
  nombre: 'Proyecto',
  estado: 'activo',
  modelo: 'fijo',
  enlaces: [],
  etiquetas: [],
  creadoEn: AHORA,
};

function base(cortes: Corte[], movimientos: Movimiento[] = [], p = proyecto): BaseDatos {
  return { ...baseDatosVacia(), proyectos: [p], cortes, movimientos };
}

describe('estaEntregado', () => {
  it('cuenta revisión y aceptado, no lo anterior', () => {
    expect(estaEntregado(corte({ id: 'a', estado: 'en_revision' }))).toBe(true);
    expect(estaEntregado(corte({ id: 'b', estado: 'aceptado' }))).toBe(true);
    expect(estaEntregado(corte({ id: 'c', estado: 'en_curso' }))).toBe(false);
    expect(estaEntregado(corte({ id: 'd', estado: 'rechazado' }))).toBe(false);
  });
});

describe('ajustarFechaEntrega', () => {
  it('apunta la fecha al pasar a revisión', () => {
    const ajustado = ajustarFechaEntrega(corte({ id: 'a', estado: 'en_revision' }), HOY);
    expect(ajustado.fechaEntrega).toBe(HOY);
  });

  it('respeta una fecha escrita a mano', () => {
    const ajustado = ajustarFechaEntrega(
      corte({ id: 'a', estado: 'aceptado', fechaEntrega: '2026-05-01' }),
      HOY,
    );
    expect(ajustado.fechaEntrega).toBe('2026-05-01');
  });

  it('retira la fecha si el corte vuelve a estar en curso', () => {
    const ajustado = ajustarFechaEntrega(
      corte({ id: 'a', estado: 'en_curso', fechaEntrega: '2026-05-01' }),
      HOY,
    );
    expect(ajustado.fechaEntrega).toBeUndefined();
  });

  it('no crea un objeto nuevo si no hay nada que cambiar', () => {
    const original = corte({ id: 'a', estado: 'planificado' });
    expect(ajustarFechaEntrega(original, HOY)).toBe(original);
  });
});

describe('resumenEntregas', () => {
  const db = base([
    corte({ id: 'a', estado: 'aceptado', fechaEntrega: '2026-02-10', fechaObjetivo: '2026-02-15', importe: 1000 }),
    corte({ id: 'b', estado: 'aceptado', fechaEntrega: '2026-04-20', fechaObjetivo: '2026-04-10', importe: 2000 }),
    corte({ id: 'c', estado: 'en_revision', fechaEntrega: '2026-06-01', importe: 500 }),
    corte({ id: 'd', estado: 'aceptado', fechaEntrega: '2025-11-01', importe: 9000 }),
    corte({ id: 'e', estado: 'en_curso' }),
  ]);
  const resumen = resumenEntregas(db, HOY);

  it('cuenta entregados y aceptados del año en curso', () => {
    expect(resumen.entregadosAnio).toBe(3);
    expect(resumen.aceptadosAnio).toBe(2);
  });

  it('promedia solo los aceptados con importe', () => {
    expect(resumen.importeMedio).toBe(1500);
  });

  it('mide la puntualidad solo sobre cortes con objetivo y entrega', () => {
    expect(resumen.conFechas).toBe(2);
    expect(resumen.fueraDePlazo).toBe(1);
    expect(resumen.puntualidad).toBe(50);
  });

  it('devuelve null de puntualidad cuando no hay nada comparable', () => {
    expect(resumenEntregas(base([corte({ id: 'x' })]), HOY).puntualidad).toBeNull();
  });
});

describe('cuadreProyecto', () => {
  const movimiento = (parcial: Partial<Movimiento> & { id: string }): Movimiento => ({
    tipo: 'cobro',
    proyectoId: 'p1',
    concepto: 'x',
    importe: 1000,
    ivaPct: 0,
    irpfPct: 0,
    estado: 'pendiente',
    fechaEmision: '2026-01-01',
    creadoEn: AHORA,
    ...parcial,
  });

  it('suma los módulos y los compara con lo pactado', () => {
    const db = base([corte({ id: 'a', importe: 2000 }), corte({ id: 'b', importe: 1000 })], [], {
      ...proyecto,
      presupuesto: 3000,
    });
    const cuadre = cuadreProyecto(db, db.proyectos[0]!);
    expect(cuadre.modulos).toBe(3000);
    expect(cuadre.desviacion).toBe(0);
    expect(cuadre.cuadra).toBe(true);
  });

  it('marca la desviación cuando los módulos no llegan a lo pactado', () => {
    const db = base([corte({ id: 'a', importe: 2000 })], [], { ...proyecto, presupuesto: 3000 });
    const cuadre = cuadreProyecto(db, db.proyectos[0]!);
    expect(cuadre.desviacion).toBe(-1000);
    expect(cuadre.cuadra).toBe(false);
  });

  it('tolera un euro de diferencia por redondeos', () => {
    const db = base([corte({ id: 'a', importe: 2999.5 })], [], { ...proyecto, presupuesto: 3000 });
    expect(cuadreProyecto(db, db.proyectos[0]!).cuadra).toBe(true);
  });

  it('sin presupuesto pactado nunca hay desviación', () => {
    const db = base([corte({ id: 'a', importe: 2000 })]);
    const cuadre = cuadreProyecto(db, db.proyectos[0]!);
    expect(cuadre.pactado).toBeUndefined();
    expect(cuadre.cuadra).toBe(true);
  });

  it('cuenta los módulos sin precio y excluye los borradores del facturado', () => {
    const db = base(
      [corte({ id: 'a', importe: 1000 }), corte({ id: 'b' })],
      [movimiento({ id: 'm1' }), movimiento({ id: 'm2', estado: 'borrador' })],
    );
    const cuadre = cuadreProyecto(db, db.proyectos[0]!);
    expect(cuadre.cortesSinImporte).toBe(1);
    expect(cuadre.facturado).toBe(1000);
  });
});

describe('plantillas', () => {
  const plantilla: Plantilla = {
    id: 'pl1',
    nombre: 'Web a medida',
    modelo: 'fijo',
    modulos: [
      { id: 'm1', codigo: 'C1', titulo: 'Diseño', importe: 1200, criterios: ['Mockups aprobados'] },
      { id: 'm2', codigo: 'C2', titulo: 'Implementación', importe: 1800, criterios: [] },
    ],
    creadoEn: AHORA,
  };

  it('suma el precio de los módulos', () => {
    expect(importeDePlantilla(plantilla)).toBe(3000);
  });

  it('convierte un módulo en un corte planificado con sus criterios', () => {
    const generado = corteDesdeModulo(plantilla.modulos[0]!, 'p9', 3);
    expect(generado).toMatchObject({ proyectoId: 'p9', codigo: 'C1', estado: 'planificado', orden: 3, importe: 1200 });
    expect(generado.criterios).toHaveLength(1);
    expect(generado.criterios[0]).toMatchObject({ texto: 'Mockups aprobados', hecho: false });
  });

  it('genera cortes con ids distintos y orden correlativo', () => {
    const cortes = cortesDesdePlantilla(plantilla, 'p9', 5);
    expect(cortes.map((c) => c.orden)).toEqual([5, 6]);
    expect(new Set(cortes.map((c) => c.id)).size).toBe(2);
  });
});
