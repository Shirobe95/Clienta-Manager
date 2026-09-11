import { describe, expect, it } from 'vitest';
import {
  fechaDeCobro,
  mensualidadesPendientes,
  movimientoDeMensualidad,
  periodosPendientes,
  recurrenteMensual,
  suscripcionVigente,
} from './suscripciones';
import { ajustesPorDefecto, baseDatosVacia } from './types';
import type { BaseDatos, Cliente, Movimiento, Suscripcion } from './types';

const AHORA = '2026-06-15T09:00:00.000Z';
const HOY = '2026-06-15';

const ajustes = { ...ajustesPorDefecto(), serieFactura: '2026', digitosFactura: 3, diasVencimiento: 30 };

function suscripcion(parcial: Partial<Suscripcion> = {}): Suscripcion {
  return {
    activa: true,
    concepto: 'Mantenimiento mensual',
    importe: 100,
    ivaPct: 21,
    irpfPct: 0,
    diaCobro: 1,
    inicio: '2026-04-01',
    ...parcial,
  };
}

function cliente(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    nombre: 'Cliente Uno',
    estado: 'activo',
    etiquetas: [],
    creadoEn: AHORA,
    ...parcial,
  };
}

function movimiento(parcial: Partial<Movimiento> & { id: string }): Movimiento {
  return {
    tipo: 'cobro',
    concepto: 'x',
    importe: 100,
    ivaPct: 21,
    irpfPct: 0,
    estado: 'pendiente',
    fechaEmision: '2026-04-01',
    creadoEn: AHORA,
    ...parcial,
  };
}

describe('fechaDeCobro', () => {
  it('usa el día pactado del mes', () => {
    expect(fechaDeCobro('2026-04', 5)).toBe('2026-04-05');
  });

  it('recorta a 28 para que exista en febrero', () => {
    expect(fechaDeCobro('2026-02', 31)).toBe('2026-02-28');
  });

  it('nunca baja del día 1', () => {
    expect(fechaDeCobro('2026-02', 0)).toBe('2026-02-01');
  });
});

describe('suscripcionVigente', () => {
  it('exige que esté activa', () => {
    expect(suscripcionVigente(suscripcion({ activa: false }), HOY)).toBe(false);
  });

  it('no cuenta antes del inicio ni después de la baja', () => {
    expect(suscripcionVigente(suscripcion({ inicio: '2026-07-01' }), HOY)).toBe(false);
    expect(suscripcionVigente(suscripcion({ fin: '2026-05-31' }), HOY)).toBe(false);
    expect(suscripcionVigente(suscripcion({ fin: '2026-12-31' }), HOY)).toBe(true);
  });

  it('sin suscripción no hay nada vigente', () => {
    expect(suscripcionVigente(undefined, HOY)).toBe(false);
  });
});

describe('periodosPendientes', () => {
  it('lista los meses desde el inicio hasta hoy', () => {
    expect(periodosPendientes(cliente({ suscripcion: suscripcion() }), [], HOY)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
  });

  it('deja fuera el mes en curso si aún no ha llegado el día de cobro', () => {
    const periodos = periodosPendientes(cliente({ suscripcion: suscripcion({ diaCobro: 20 }) }), [], HOY);
    expect(periodos).toEqual(['2026-04', '2026-05']);
  });

  it('no repite un periodo ya emitido', () => {
    const emitido = movimiento({ id: 'm1', clienteId: 'c1', periodo: '2026-04' });
    const periodos = periodosPendientes(cliente({ suscripcion: suscripcion() }), [emitido], HOY);
    expect(periodos).toEqual(['2026-05', '2026-06']);
  });

  it('el periodo de otro cliente no cuenta como emitido', () => {
    const ajeno = movimiento({ id: 'm1', clienteId: 'otro', periodo: '2026-04' });
    expect(periodosPendientes(cliente({ suscripcion: suscripcion() }), [ajeno], HOY)).toHaveLength(3);
  });

  it('se detiene en la fecha de baja', () => {
    const periodos = periodosPendientes(
      cliente({ suscripcion: suscripcion({ fin: '2026-05-15' }) }),
      [],
      HOY,
    );
    expect(periodos).toEqual(['2026-04', '2026-05']);
  });

  it('no genera nada si la suscripción está parada', () => {
    expect(periodosPendientes(cliente({ suscripcion: suscripcion({ activa: false }) }), [], HOY)).toEqual([]);
  });

  it('no genera nada sin suscripción', () => {
    expect(periodosPendientes(cliente(), [], HOY)).toEqual([]);
  });

  it('no genera nada si el acuerdo empieza en el futuro', () => {
    expect(periodosPendientes(cliente({ suscripcion: suscripcion({ inicio: '2026-09-01' }) }), [], HOY)).toEqual(
      [],
    );
  });
});

describe('mensualidadesPendientes', () => {
  it('junta las de todos los clientes, la más antigua primero', () => {
    const db: BaseDatos = {
      ...baseDatosVacia(),
      clientes: [
        cliente({ id: 'c1', suscripcion: suscripcion({ inicio: '2026-05-01', diaCobro: 10 }) }),
        cliente({ id: 'c2', nombre: 'Dos', suscripcion: suscripcion({ inicio: '2026-04-01', diaCobro: 3 }) }),
        cliente({ id: 'c3', nombre: 'Tres' }),
      ],
    };
    const pendientes = mensualidadesPendientes(db, HOY);
    expect(pendientes.map((p) => `${p.cliente.id}:${p.periodo}`)).toEqual([
      'c2:2026-04',
      'c2:2026-05',
      'c1:2026-05',
      'c2:2026-06',
      'c1:2026-06',
    ]);
    expect(pendientes[0]!.total).toBe(121);
  });
});

describe('movimientoDeMensualidad', () => {
  const c = cliente({ suscripcion: suscripcion({ diaCobro: 5, proyectoId: 'p1' }) });

  it('crea un cobro pendiente con el periodo y el número de serie', () => {
    const previos = [movimiento({ id: 'm1', numeroFactura: '2026-004' })];
    const m = movimientoDeMensualidad(c, '2026-05', previos, ajustes);
    expect(m).toMatchObject({
      tipo: 'cobro',
      estado: 'pendiente',
      clienteId: 'c1',
      proyectoId: 'p1',
      periodo: '2026-05',
      importe: 100,
      fechaEmision: '2026-05-05',
      fechaVencimiento: '2026-06-04',
      numeroFactura: '2026-005',
    });
  });

  it('nombra el concepto con el mes facturado', () => {
    expect(movimientoDeMensualidad(c, '2026-05', [], ajustes).concepto).toBe('Mantenimiento mensual · 2026-05');
  });
});

describe('recurrenteMensual', () => {
  it('suma las cuotas vigentes con impuestos', () => {
    const db: BaseDatos = {
      ...baseDatosVacia(),
      clientes: [
        cliente({ id: 'c1', suscripcion: suscripcion({ importe: 100 }) }),
        cliente({ id: 'c2', suscripcion: suscripcion({ importe: 200 }) }),
        cliente({ id: 'c3', suscripcion: suscripcion({ importe: 900, activa: false }) }),
        cliente({ id: 'c4', suscripcion: suscripcion({ importe: 900, fin: '2026-01-01' }) }),
        cliente({ id: 'c5' }),
      ],
    };
    expect(recurrenteMensual(db, HOY)).toEqual({ totalMensual: 363, clientes: 2 });
  });

  it('devuelve cero sin suscripciones', () => {
    expect(recurrenteMensual(baseDatosVacia(), HOY)).toEqual({ totalMensual: 0, clientes: 0 });
  });
});
