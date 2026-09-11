import { siguienteNumeroFactura } from './facturacion';
import { sumarDias } from './format';
import { nuevoId } from './id';
import { totalConImpuestos } from './metrics';
import type { Ajustes, BaseDatos, Cliente, ISODate, Movimiento, Suscripcion } from './types';

/** Clave de mes YYYY-MM a partir de año y mes (mes 1-12). */
function clave(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

/** Fecha de emision de la cuota de un periodo, respetando el dia pactado. */
export function fechaDeCobro(periodo: string, diaCobro: number): ISODate {
  const dia = Math.min(Math.max(Math.round(diaCobro), 1), 28);
  return `${periodo}-${String(dia).padStart(2, '0')}`;
}

/** Una suscripcion cuenta como viva si esta activa y la fecha cae dentro del acuerdo. */
export function suscripcionVigente(s: Suscripcion | undefined, fechaHoy: ISODate): s is Suscripcion {
  if (!s || !s.activa) return false;
  if (s.inicio > fechaHoy) return false;
  return !s.fin || s.fin >= fechaHoy;
}

/**
 * Meses que tocaria haber emitido y todavia no se han emitido.
 * El periodo entra cuando su dia de cobro ya ha llegado, y se descarta si ya
 * existe un movimiento de ese cliente con ese periodo: los cobros ya emitidos
 * son la fuente de verdad, no un contador guardado en el cliente.
 */
export function periodosPendientes(
  cliente: Cliente,
  movimientos: Movimiento[],
  fechaHoy: ISODate,
): string[] {
  const s = cliente.suscripcion;
  if (!s || !s.activa) return [];

  const emitidos = new Set(
    movimientos.filter((m) => m.clienteId === cliente.id && m.periodo).map((m) => m.periodo!),
  );

  const [anioInicio, mesInicio] = s.inicio.split('-').map(Number) as [number, number];
  const [anioHoy, mesHoy] = fechaHoy.split('-').map(Number) as [number, number];
  const pendientes: string[] = [];

  const totalMeses = (anioHoy - anioInicio) * 12 + (mesHoy - mesInicio);
  for (let i = 0; i <= totalMeses; i += 1) {
    const fecha = new Date(anioInicio, mesInicio - 1 + i, 1);
    const periodo = clave(fecha.getFullYear(), fecha.getMonth() + 1);
    const emision = fechaDeCobro(periodo, s.diaCobro);
    if (emision > fechaHoy) continue;
    if (s.fin && emision > s.fin) break;
    if (!emitidos.has(periodo)) pendientes.push(periodo);
  }

  return pendientes;
}

export interface MensualidadPendiente {
  cliente: Cliente;
  periodo: string;
  emision: ISODate;
  total: number;
}

/** Todas las cuotas por emitir, la mas antigua primero. */
export function mensualidadesPendientes(db: BaseDatos, fechaHoy: ISODate): MensualidadPendiente[] {
  return db.clientes
    .flatMap((cliente) =>
      periodosPendientes(cliente, db.movimientos, fechaHoy).map((periodo) => ({
        cliente,
        periodo,
        emision: fechaDeCobro(periodo, cliente.suscripcion!.diaCobro),
        total: totalConImpuestos(cliente.suscripcion!),
      })),
    )
    .sort((a, b) => a.emision.localeCompare(b.emision));
}

/** Convierte una cuota pendiente en un cobro pendiente de pago, ya numerado. */
export function movimientoDeMensualidad(
  cliente: Cliente,
  periodo: string,
  movimientos: Movimiento[],
  ajustes: Ajustes,
): Movimiento {
  const s = cliente.suscripcion!;
  const emision = fechaDeCobro(periodo, s.diaCobro);
  return {
    id: nuevoId('mov'),
    tipo: 'cobro',
    clienteId: cliente.id,
    proyectoId: s.proyectoId,
    concepto: `${s.concepto} · ${periodo}`,
    importe: s.importe,
    ivaPct: s.ivaPct,
    irpfPct: s.irpfPct,
    estado: 'pendiente',
    fechaEmision: emision,
    fechaVencimiento: sumarDias(emision, ajustes.diasVencimiento),
    numeroFactura: siguienteNumeroFactura(movimientos, ajustes),
    periodo,
    creadoEn: new Date().toISOString(),
  };
}

export interface Recurrente {
  totalMensual: number;
  clientes: number;
}

/** Lo que entra cada mes por cuotas vigentes, impuestos incluidos. */
export function recurrenteMensual(db: BaseDatos, fechaHoy: ISODate): Recurrente {
  const vigentes = db.clientes.filter((c) => suscripcionVigente(c.suscripcion, fechaHoy));
  const totalMensual = vigentes.reduce((suma, c) => suma + totalConImpuestos(c.suscripcion!), 0);
  return { totalMensual: Math.round(totalMensual * 100) / 100, clientes: vigentes.length };
}
