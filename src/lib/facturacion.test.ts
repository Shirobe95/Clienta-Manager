import { describe, expect, it } from 'vitest';
import {
  conceptoDeCorte,
  cortesSinFacturar,
  formatearNumero,
  movimientosACSV,
  numeroDeSerie,
  revisarNumeracion,
  siguienteNumeroFactura,
  textoRecordatorio,
} from './facturacion';
import { ajustesPorDefecto, baseDatosVacia } from './types';
import type { Ajustes, BaseDatos, Corte, Movimiento, Proyecto } from './types';

const AHORA = '2026-06-15T09:00:00.000Z';
const HOY = '2026-06-15';

const ajustes: Ajustes = { ...ajustesPorDefecto(), serieFactura: '2026', digitosFactura: 3 };

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

function corte(parcial: Partial<Corte> & { id: string }): Corte {
  return {
    proyectoId: 'p1',
    codigo: 'C1',
    titulo: 'Corte',
    estado: 'aceptado',
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

describe('formatearNumero', () => {
  it('rellena con ceros hasta los dígitos pedidos', () => {
    expect(formatearNumero('2026', 7, 3)).toBe('2026-007');
  });

  it('no recorta un número más largo que los dígitos', () => {
    expect(formatearNumero('2026', 1234, 3)).toBe('2026-1234');
  });

  it('omite el guion cuando no hay serie', () => {
    expect(formatearNumero('', 7, 3)).toBe('007');
  });
});

describe('numeroDeSerie', () => {
  it('extrae el correlativo de la serie', () => {
    expect(numeroDeSerie('2026-007', '2026')).toBe(7);
  });

  it('ignora referencias de otra serie', () => {
    expect(numeroDeSerie('2025-007', '2026')).toBeNull();
    expect(numeroDeSerie('ABONO-3', '2026')).toBeNull();
  });

  it('no confunde una serie con caracteres especiales', () => {
    expect(numeroDeSerie('F.2026-004', 'F.2026')).toBe(4);
    expect(numeroDeSerie('FX2026-004', 'F.2026')).toBeNull();
  });
});

describe('siguienteNumeroFactura', () => {
  it('empieza en 1 cuando no hay nada emitido', () => {
    expect(siguienteNumeroFactura([], ajustes)).toBe('2026-001');
  });

  it('continúa desde el mayor de la serie, no desde el último creado', () => {
    const movimientos = [
      movimiento({ id: 'a', numeroFactura: '2026-003' }),
      movimiento({ id: 'b', numeroFactura: '2026-011' }),
      movimiento({ id: 'c', numeroFactura: '2026-007' }),
    ];
    expect(siguienteNumeroFactura(movimientos, ajustes)).toBe('2026-012');
  });

  it('no cuenta las referencias de otras series', () => {
    const movimientos = [movimiento({ id: 'a', numeroFactura: '2025-099' })];
    expect(siguienteNumeroFactura(movimientos, ajustes)).toBe('2026-001');
  });
});

describe('revisarNumeracion', () => {
  it('no avisa de nada con una serie correlativa', () => {
    const movimientos = [
      movimiento({ id: 'a', numeroFactura: '2026-001' }),
      movimiento({ id: 'b', numeroFactura: '2026-002' }),
    ];
    expect(revisarNumeracion(movimientos, ajustes)).toEqual([]);
  });

  it('detecta duplicados aunque sean de otra serie', () => {
    const movimientos = [
      movimiento({ id: 'a', numeroFactura: '2025-004' }),
      movimiento({ id: 'b', numeroFactura: '2025-004' }),
    ];
    const avisos = revisarNumeracion(movimientos, ajustes);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tipo: 'duplicado', numero: '2025-004' });
  });

  it('detecta los huecos intermedios de la serie', () => {
    const movimientos = [
      movimiento({ id: 'a', numeroFactura: '2026-001' }),
      movimiento({ id: 'b', numeroFactura: '2026-004' }),
    ];
    const huecos = revisarNumeracion(movimientos, ajustes).filter((a) => a.tipo === 'hueco');
    expect(huecos.map((h) => h.numero)).toEqual(['2026-002', '2026-003']);
  });

  it('no inventa huecos por delante del primer número emitido', () => {
    const movimientos = [
      movimiento({ id: 'a', numeroFactura: '2026-010' }),
      movimiento({ id: 'b', numeroFactura: '2026-011' }),
    ];
    expect(revisarNumeracion(movimientos, ajustes)).toEqual([]);
  });
});

describe('cortesSinFacturar', () => {
  const db = (cortes: Corte[], movimientos: Movimiento[] = []): BaseDatos => ({
    ...baseDatosVacia(),
    proyectos: [proyecto],
    cortes,
    movimientos,
  });

  it('solo incluye cortes aceptados con importe', () => {
    const lista = cortesSinFacturar(
      db([
        corte({ id: 'x', importe: 1000 }),
        corte({ id: 'y', importe: 1000, estado: 'en_curso' }),
        corte({ id: 'z' }),
      ]),
    );
    expect(lista.map((c) => c.corte.id)).toEqual(['x']);
  });

  it('excluye el corte que ya tiene un cobro vinculado', () => {
    const lista = cortesSinFacturar(
      db([corte({ id: 'x', importe: 1000 })], [movimiento({ id: 'm', corteId: 'x' })]),
    );
    expect(lista).toEqual([]);
  });

  it('un pago vinculado no cuenta como facturado', () => {
    const lista = cortesSinFacturar(
      db([corte({ id: 'x', importe: 1000 })], [movimiento({ id: 'm', corteId: 'x', tipo: 'pago' })]),
    );
    expect(lista).toHaveLength(1);
  });

  it('descarta cortes cuyo proyecto ya no existe', () => {
    const base = db([corte({ id: 'x', importe: 1000, proyectoId: 'fantasma' })]);
    expect(cortesSinFacturar(base)).toEqual([]);
  });
});

describe('conceptoDeCorte', () => {
  it('junta proyecto, código y título', () => {
    expect(conceptoDeCorte(proyecto, corte({ id: 'x', codigo: 'C2', titulo: 'Panel' }))).toBe(
      'Proyecto · C2 Panel',
    );
  });
});

describe('movimientosACSV', () => {
  const base: BaseDatos = {
    ...baseDatosVacia(),
    clientes: [{ id: 'c1', nombre: 'Cliente Uno', estado: 'activo', etiquetas: [], creadoEn: AHORA }],
    proyectos: [proyecto],
    ajustes,
  };

  it('escribe la cabecera y una fila por movimiento', () => {
    const csv = movimientosACSV([movimiento({ id: 'a', clienteId: 'c1', proyectoId: 'p1' })], base);
    const lineas = csv.split('\r\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[0]!.startsWith('Tipo;Estado;Nº factura')).toBe(true);
    expect(lineas[1]).toContain('Cliente Uno');
    expect(lineas[1]).toContain('1210');
  });

  it('entrecomilla los campos con punto y coma o comillas', () => {
    const csv = movimientosACSV([movimiento({ id: 'a', concepto: 'Diseño; maqueta "final"' })], base);
    expect(csv).toContain('"Diseño; maqueta ""final"""');
  });

  it('deja vacías las columnas sin valor', () => {
    const csv = movimientosACSV([movimiento({ id: 'a' })], base);
    expect(csv.split('\r\n')[1]!.startsWith('Cobro;pendiente;;Concepto;;;;')).toBe(true);
  });
});

describe('textoRecordatorio', () => {
  const base: BaseDatos = {
    ...baseDatosVacia(),
    clientes: [{ id: 'c1', nombre: 'Cliente Uno', estado: 'activo', etiquetas: [], creadoEn: AHORA }],
    ajustes,
  };

  it('nombra al cliente, la factura y los días de retraso', () => {
    const texto = textoRecordatorio(
      movimiento({ id: 'a', clienteId: 'c1', numeroFactura: '2026-004', fechaVencimiento: '2026-06-05' }),
      base,
      HOY,
    );
    expect(texto).toContain('Hola Cliente Uno');
    expect(texto).toContain('la factura 2026-004');
    expect(texto).toContain('10 días de retraso');
  });

  it('funciona sin número de factura ni vencimiento', () => {
    const texto = textoRecordatorio(movimiento({ id: 'a' }), base, HOY);
    expect(texto).toContain('el cobro');
    expect(texto).toContain('todavía pendiente');
    expect(texto).not.toContain('undefined');
  });
});
