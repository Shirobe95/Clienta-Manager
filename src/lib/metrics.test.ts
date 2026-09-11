import { describe, expect, it } from 'vitest';
import {
  calcularKpis,
  cobrosPorVencer,
  estadoCalculado,
  progresoProyecto,
  rankingClientes,
  resumenCliente,
  serieMensual,
  totalConImpuestos,
} from './metrics';
import { baseDatosVacia } from './types';
import type { BaseDatos, Corte, Movimiento } from './types';

const HOY = '2026-06-15';
const AHORA = '2026-06-15T09:00:00.000Z';

function movimiento(parcial: Partial<Movimiento> & { id: string }): Movimiento {
  return {
    tipo: 'cobro',
    concepto: 'Concepto',
    importe: 1000,
    ivaPct: 21,
    irpfPct: 0,
    estado: 'pendiente',
    fechaEmision: '2026-06-01',
    creadoEn: AHORA,
    ...parcial,
  };
}

function base(movimientos: Movimiento[]): BaseDatos {
  return { ...baseDatosVacia(), movimientos };
}

describe('totalConImpuestos', () => {
  it('suma el IVA y resta el IRPF', () => {
    expect(totalConImpuestos({ importe: 1000, ivaPct: 21, irpfPct: 15 })).toBe(1060);
  });

  it('devuelve la base cuando no hay impuestos', () => {
    expect(totalConImpuestos({ importe: 250.5, ivaPct: 0, irpfPct: 0 })).toBe(250.5);
  });
});

describe('estadoCalculado', () => {
  it('marca vencido un pendiente con vencimiento pasado', () => {
    const m = movimiento({ id: '1', fechaVencimiento: '2026-06-14' });
    expect(estadoCalculado(m, HOY)).toBe('vencido');
  });

  it('no marca vencido el que vence hoy', () => {
    const m = movimiento({ id: '1', fechaVencimiento: HOY });
    expect(estadoCalculado(m, HOY)).toBe('pendiente');
  });

  it('nunca marca vencido un cobro ya pagado', () => {
    const m = movimiento({ id: '1', estado: 'pagado', fechaVencimiento: '2026-01-01' });
    expect(estadoCalculado(m, HOY)).toBe('pagado');
  });
});

describe('calcularKpis', () => {
  const db = base([
    movimiento({ id: 'a', estado: 'pagado', fechaPago: '2026-06-02' }),
    movimiento({ id: 'b', estado: 'pagado', fechaEmision: '2026-02-10', fechaPago: '2026-02-20' }),
    movimiento({ id: 'c', fechaVencimiento: '2026-05-01' }),
    movimiento({ id: 'd', fechaVencimiento: '2026-07-30' }),
    movimiento({ id: 'e', estado: 'borrador' }),
    movimiento({ id: 'f', tipo: 'pago', importe: 100, estado: 'pagado', fechaPago: '2026-03-01' }),
  ]);
  const kpis = calcularKpis(db, HOY);

  it('cuenta el cobro pagado del mes en curso', () => {
    expect(kpis.cobradoMes).toBe(1210);
  });

  it('acumula el año por fecha de pago', () => {
    expect(kpis.cobradoAnio).toBe(2420);
  });

  it('suma pendientes y vencidos sin contar borradores', () => {
    expect(kpis.pendiente).toBe(2420);
    expect(kpis.vencido).toBe(1210);
    expect(kpis.numVencidos).toBe(1);
  });

  it('descuenta los gastos pagados del neto', () => {
    expect(kpis.pagadoAnio).toBe(121);
    expect(kpis.netoAnio).toBe(2299);
  });

  it('calcula el progreso solo si hay objetivo anual', () => {
    expect(kpis.progresoObjetivo).toBeNull();
    const conObjetivo = { ...db, ajustes: { ...db.ajustes, objetivoAnual: 10000 } };
    expect(calcularKpis(conObjetivo, HOY).progresoObjetivo).toBe(24.2);
  });
});

describe('serieMensual', () => {
  const db = base([
    movimiento({ id: 'a', estado: 'pagado', fechaPago: '2026-06-02' }),
    movimiento({ id: 'b', fechaEmision: '2026-05-05' }),
    movimiento({ id: 'c', estado: 'borrador', fechaEmision: '2026-04-05' }),
    movimiento({ id: 'd', estado: 'pagado', fechaEmision: '2024-01-05', fechaPago: '2024-01-05' }),
  ]);
  const serie = serieMensual(db, HOY, 12);

  it('devuelve una ventana de 12 meses que termina en el mes actual', () => {
    expect(serie).toHaveLength(12);
    expect(serie.at(-1)!.clave).toBe('2026-06');
    expect(serie[0]!.clave).toBe('2025-07');
  });

  it('reparte cobrado y pendiente por mes', () => {
    expect(serie.at(-1)!.cobrado).toBe(1210);
    expect(serie.at(-2)!.pendiente).toBe(1210);
  });

  it('ignora borradores y meses fuera de la ventana', () => {
    expect(serie.find((p) => p.clave === '2026-04')!.pendiente).toBe(0);
    expect(serie.reduce((s, p) => s + p.cobrado, 0)).toBe(1210);
  });
});

describe('rankingClientes', () => {
  it('ordena por volumen total y descarta movimientos sin cliente', () => {
    const db: BaseDatos = {
      ...baseDatosVacia(),
      clientes: [
        { id: 'c1', nombre: 'Uno', estado: 'activo', etiquetas: [], creadoEn: AHORA },
        { id: 'c2', nombre: 'Dos', estado: 'activo', etiquetas: [], creadoEn: AHORA },
      ],
      movimientos: [
        movimiento({ id: 'a', clienteId: 'c1', estado: 'pagado', fechaPago: '2026-03-01', importe: 100, ivaPct: 0 }),
        movimiento({ id: 'b', clienteId: 'c2', estado: 'pagado', fechaPago: '2026-03-01', importe: 500, ivaPct: 0 }),
        movimiento({ id: 'c', importe: 900, ivaPct: 0 }),
      ],
    };
    const ranking = rankingClientes(db, HOY);
    expect(ranking.map((f) => f.nombre)).toEqual(['Dos', 'Uno']);
    expect(ranking[0]!.cobrado).toBe(500);
  });
});

describe('cobrosPorVencer', () => {
  it('incluye los ya vencidos y ordena por urgencia', () => {
    const db = base([
      movimiento({ id: 'a', fechaVencimiento: '2026-07-01' }),
      movimiento({ id: 'b', fechaVencimiento: '2026-05-01' }),
      movimiento({ id: 'c', fechaVencimiento: '2026-12-01' }),
      movimiento({ id: 'd', estado: 'pagado', fechaVencimiento: '2026-06-16' }),
    ]);
    expect(cobrosPorVencer(db, HOY, 30).map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('resumenCliente', () => {
  it('separa cobrado, pendiente y vencido y guarda el último cobro', () => {
    const db = base([
      movimiento({ id: 'a', clienteId: 'c1', estado: 'pagado', fechaPago: '2026-01-10', ivaPct: 0 }),
      movimiento({ id: 'b', clienteId: 'c1', estado: 'pagado', fechaPago: '2026-04-10', ivaPct: 0 }),
      movimiento({ id: 'c', clienteId: 'c1', fechaVencimiento: '2026-01-01', ivaPct: 0 }),
      movimiento({ id: 'd', clienteId: 'otro', estado: 'pagado', fechaPago: '2026-05-10', ivaPct: 0 }),
    ]);
    const r = resumenCliente(db, 'c1', HOY);
    expect(r.cobrado).toBe(2000);
    expect(r.pendiente).toBe(1000);
    expect(r.vencido).toBe(1000);
    expect(r.ultimoCobro).toBe('2026-04-10');
  });
});

describe('progresoProyecto', () => {
  const corte = (id: string, estado: Corte['estado']): Corte => ({
    id,
    proyectoId: 'p1',
    codigo: id,
    titulo: id,
    estado,
    criterios: [],
    orden: 1,
    creadoEn: AHORA,
  });

  it('es 0 sin cortes', () => {
    expect(progresoProyecto([])).toBe(0);
  });

  it('cuenta solo los aceptados', () => {
    expect(progresoProyecto([corte('a', 'aceptado'), corte('b', 'en_curso'), corte('c', 'rechazado')])).toBe(33);
  });
});
