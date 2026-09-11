import { claveMes, diasEntre, etiquetaMes } from './format';
import type {
  BaseDatos,
  Corte,
  EstadoMovimientoCalculado,
  ID,
  ISODate,
  Movimiento,
  Seguimiento,
} from './types';

/** Importe total de un movimiento, impuestos incluidos. */
export function totalConImpuestos(m: Pick<Movimiento, 'importe' | 'ivaPct' | 'irpfPct'>): number {
  const iva = m.importe * (m.ivaPct / 100);
  const irpf = m.importe * (m.irpfPct / 100);
  return redondear(m.importe + iva - irpf);
}

export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Estado visible de un movimiento: "vencido" se deriva de la fecha de vencimiento. */
export function estadoCalculado(m: Movimiento, fechaHoy: ISODate): EstadoMovimientoCalculado {
  if (m.estado === 'pendiente' && m.fechaVencimiento && diasEntre(m.fechaVencimiento, fechaHoy) > 0) {
    return 'vencido';
  }
  return m.estado;
}

export function esCobroCerrado(m: Movimiento): boolean {
  return m.tipo === 'cobro' && m.estado === 'pagado';
}

/** Fecha que cuenta para las metricas temporales: la de pago si existe. */
export function fechaContable(m: Movimiento): ISODate {
  return m.fechaPago ?? m.fechaEmision;
}

export interface Kpis {
  cobradoMes: number;
  cobradoAnio: number;
  pendiente: number;
  vencido: number;
  numVencidos: number;
  pagadoAnio: number;
  netoAnio: number;
  facturaMediaAnio: number;
  clientesActivos: number;
  proyectosActivos: number;
  cortesEnCurso: number;
  progresoObjetivo: number | null;
}

export function calcularKpis(db: BaseDatos, fechaHoy: ISODate): Kpis {
  const mes = claveMes(fechaHoy);
  const anio = fechaHoy.slice(0, 4);

  let cobradoMes = 0;
  let cobradoAnio = 0;
  let pendiente = 0;
  let vencido = 0;
  let numVencidos = 0;
  let pagadoAnio = 0;
  let numCobrosAnio = 0;

  for (const m of db.movimientos) {
    const total = totalConImpuestos(m);
    const estado = estadoCalculado(m, fechaHoy);
    const fecha = fechaContable(m);

    if (m.tipo === 'cobro') {
      if (m.estado === 'pagado') {
        if (claveMes(fecha) === mes) cobradoMes += total;
        if (fecha.startsWith(anio)) {
          cobradoAnio += total;
          numCobrosAnio += 1;
        }
      } else if (estado === 'pendiente' || estado === 'vencido') {
        pendiente += total;
        if (estado === 'vencido') {
          vencido += total;
          numVencidos += 1;
        }
      }
    } else if (m.estado === 'pagado' && fecha.startsWith(anio)) {
      pagadoAnio += total;
    }
  }

  const objetivo = db.ajustes.objetivoAnual;

  return {
    cobradoMes: redondear(cobradoMes),
    cobradoAnio: redondear(cobradoAnio),
    pendiente: redondear(pendiente),
    vencido: redondear(vencido),
    numVencidos,
    pagadoAnio: redondear(pagadoAnio),
    netoAnio: redondear(cobradoAnio - pagadoAnio),
    facturaMediaAnio: numCobrosAnio ? redondear(cobradoAnio / numCobrosAnio) : 0,
    clientesActivos: db.clientes.filter((c) => c.estado === 'activo').length,
    proyectosActivos: db.proyectos.filter((p) => p.estado === 'activo' || p.estado === 'mantenimiento')
      .length,
    cortesEnCurso: db.cortes.filter((c) => c.estado === 'en_curso' || c.estado === 'en_revision').length,
    progresoObjetivo: objetivo && objetivo > 0 ? redondear((cobradoAnio / objetivo) * 100) : null,
  };
}

export interface PuntoMes {
  clave: string;
  etiqueta: string;
  cobrado: number;
  pendiente: number;
  gastos: number;
}

/** Serie de los ultimos `meses` meses terminando en el mes de `fechaHoy`. */
export function serieMensual(
  db: BaseDatos,
  fechaHoy: ISODate,
  meses = 12,
  locale = 'es-ES',
): PuntoMes[] {
  const [anio, mes] = fechaHoy.split('-').map(Number) as [number, number];
  const puntos: PuntoMes[] = [];
  const indice = new Map<string, PuntoMes>();

  for (let i = meses - 1; i >= 0; i -= 1) {
    const d = new Date(anio, mes - 1 - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const punto: PuntoMes = {
      clave,
      etiqueta: etiquetaMes(clave, locale),
      cobrado: 0,
      pendiente: 0,
      gastos: 0,
    };
    puntos.push(punto);
    indice.set(clave, punto);
  }

  for (const m of db.movimientos) {
    if (m.estado === 'borrador') continue;
    const punto = indice.get(claveMes(fechaContable(m)));
    if (!punto) continue;
    const total = totalConImpuestos(m);
    if (m.tipo === 'pago') {
      if (m.estado === 'pagado') punto.gastos += total;
    } else if (m.estado === 'pagado') {
      punto.cobrado += total;
    } else {
      punto.pendiente += total;
    }
  }

  return puntos.map((p) => ({
    ...p,
    cobrado: redondear(p.cobrado),
    pendiente: redondear(p.pendiente),
    gastos: redondear(p.gastos),
  }));
}

export interface FilaCliente {
  clienteId: ID;
  nombre: string;
  cobrado: number;
  pendiente: number;
}

export function rankingClientes(db: BaseDatos, fechaHoy: ISODate, limite = 5): FilaCliente[] {
  const anio = fechaHoy.slice(0, 4);
  const acumulado = new Map<ID, FilaCliente>();

  for (const m of db.movimientos) {
    if (m.tipo !== 'cobro' || !m.clienteId || m.estado === 'borrador') continue;
    const cliente = db.clientes.find((c) => c.id === m.clienteId);
    if (!cliente) continue;
    const fila =
      acumulado.get(cliente.id) ??
      ({ clienteId: cliente.id, nombre: cliente.nombre, cobrado: 0, pendiente: 0 } as FilaCliente);
    const total = totalConImpuestos(m);
    if (m.estado === 'pagado') {
      if (fechaContable(m).startsWith(anio)) fila.cobrado += total;
    } else {
      fila.pendiente += total;
    }
    acumulado.set(cliente.id, fila);
  }

  return [...acumulado.values()]
    .map((f) => ({ ...f, cobrado: redondear(f.cobrado), pendiente: redondear(f.pendiente) }))
    .filter((f) => f.cobrado > 0 || f.pendiente > 0)
    .sort((a, b) => b.cobrado + b.pendiente - (a.cobrado + a.pendiente))
    .slice(0, limite);
}

/** Cobros pendientes que vencen dentro de `dias` dias, o ya vencidos. Mas urgente primero. */
export function cobrosPorVencer(db: BaseDatos, fechaHoy: ISODate, dias = 30): Movimiento[] {
  return db.movimientos
    .filter((m) => {
      if (m.tipo !== 'cobro' || m.estado !== 'pendiente') return false;
      if (!m.fechaVencimiento) return false;
      return diasEntre(fechaHoy, m.fechaVencimiento) <= dias;
    })
    .sort((a, b) => (a.fechaVencimiento ?? '').localeCompare(b.fechaVencimiento ?? ''));
}

export function seguimientosProximos(db: BaseDatos, fechaHoy: ISODate, dias = 45): Seguimiento[] {
  return db.seguimientos
    .filter((s) => s.estado === 'pendiente' && diasEntre(fechaHoy, s.fechaPrevista) <= dias)
    .sort((a, b) => a.fechaPrevista.localeCompare(b.fechaPrevista));
}

/** Porcentaje de cortes aceptados sobre el total del proyecto. */
export function progresoProyecto(cortes: Corte[]): number {
  if (cortes.length === 0) return 0;
  const aceptados = cortes.filter((c) => c.estado === 'aceptado').length;
  return Math.round((aceptados / cortes.length) * 100);
}

export interface ResumenCliente {
  cobrado: number;
  pendiente: number;
  vencido: number;
  proyectosActivos: number;
  ultimoCobro?: ISODate;
}

export function resumenCliente(db: BaseDatos, clienteId: ID, fechaHoy: ISODate): ResumenCliente {
  let cobrado = 0;
  let pendiente = 0;
  let vencido = 0;
  let ultimoCobro: ISODate | undefined;

  for (const m of db.movimientos) {
    if (m.clienteId !== clienteId || m.tipo !== 'cobro') continue;
    const total = totalConImpuestos(m);
    const estado = estadoCalculado(m, fechaHoy);
    if (m.estado === 'pagado') {
      cobrado += total;
      const fecha = fechaContable(m);
      if (!ultimoCobro || fecha > ultimoCobro) ultimoCobro = fecha;
    } else if (estado === 'pendiente' || estado === 'vencido') {
      pendiente += total;
      if (estado === 'vencido') vencido += total;
    }
  }

  return {
    cobrado: redondear(cobrado),
    pendiente: redondear(pendiente),
    vencido: redondear(vencido),
    proyectosActivos: db.proyectos.filter(
      (p) => p.clienteId === clienteId && (p.estado === 'activo' || p.estado === 'mantenimiento'),
    ).length,
    ultimoCobro,
  };
}
