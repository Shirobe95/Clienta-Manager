import { diasEntre, formatoFecha, formatoMoneda } from './format';
import { totalConImpuestos } from './metrics';
import type { Ajustes, BaseDatos, Cliente, Corte, ISODate, Movimiento, Proyecto } from './types';

/* ---------- Numeracion de facturas ---------- */

/** Compone el numero completo: serie "2026", n 7, digitos 3 -> "2026-007". */
export function formatearNumero(serie: string, n: number, digitos: number): string {
  const cuerpo = String(n).padStart(Math.max(1, digitos), '0');
  return serie ? `${serie}-${cuerpo}` : cuerpo;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Devuelve el correlativo si la referencia pertenece a la serie, o null si no. */
export function numeroDeSerie(referencia: string, serie: string): number | null {
  const patron = serie ? new RegExp(`^${escaparRegex(serie)}-(\\d+)$`) : /^(\d+)$/;
  const encontrado = patron.exec(referencia.trim());
  return encontrado ? Number(encontrado[1]) : null;
}

function numerosDeLaSerie(movimientos: Movimiento[], serie: string): number[] {
  return movimientos
    .map((m) => (m.numeroFactura ? numeroDeSerie(m.numeroFactura, serie) : null))
    .filter((n): n is number => n !== null);
}

/**
 * Siguiente numero libre de la serie. Se deduce de lo que ya existe en lugar de
 * guardar un contador, asi no se desincroniza al importar o borrar movimientos.
 */
export function siguienteNumeroFactura(movimientos: Movimiento[], ajustes: Ajustes): string {
  const usados = numerosDeLaSerie(movimientos, ajustes.serieFactura);
  const siguiente = usados.length ? Math.max(...usados) + 1 : 1;
  return formatearNumero(ajustes.serieFactura, siguiente, ajustes.digitosFactura);
}

export type TipoAviso = 'duplicado' | 'hueco';

export interface AvisoNumeracion {
  tipo: TipoAviso;
  numero: string;
  detalle: string;
}

/** Busca numeros repetidos y saltos dentro de la serie configurada. */
export function revisarNumeracion(movimientos: Movimiento[], ajustes: Ajustes): AvisoNumeracion[] {
  const avisos: AvisoNumeracion[] = [];

  const vecesPorReferencia = new Map<string, number>();
  for (const m of movimientos) {
    if (!m.numeroFactura) continue;
    const clave = m.numeroFactura.trim();
    vecesPorReferencia.set(clave, (vecesPorReferencia.get(clave) ?? 0) + 1);
  }
  for (const [numero, veces] of vecesPorReferencia) {
    if (veces > 1) {
      avisos.push({ tipo: 'duplicado', numero, detalle: `Aparece en ${veces} movimientos.` });
    }
  }

  const usados = [...new Set(numerosDeLaSerie(movimientos, ajustes.serieFactura))].sort((a, b) => a - b);
  if (usados.length > 1) {
    const primero = usados[0]!;
    const ultimo = usados.at(-1)!;
    const presentes = new Set(usados);
    for (let n = primero; n < ultimo; n += 1) {
      if (!presentes.has(n)) {
        avisos.push({
          tipo: 'hueco',
          numero: formatearNumero(ajustes.serieFactura, n, ajustes.digitosFactura),
          detalle: 'No hay ningún movimiento con este número.',
        });
      }
    }
  }

  return avisos;
}

/* ---------- Cortes pendientes de facturar ---------- */

export interface CorteSinFacturar {
  corte: Corte;
  proyecto: Proyecto;
  cliente?: Cliente;
}

/** Cortes aceptados con importe pactado para los que todavia no existe un cobro. */
export function cortesSinFacturar(db: BaseDatos): CorteSinFacturar[] {
  const facturados = new Set(
    db.movimientos.filter((m) => m.tipo === 'cobro' && m.corteId).map((m) => m.corteId!),
  );

  return db.cortes
    .filter((c) => c.estado === 'aceptado' && (c.importe ?? 0) > 0 && !facturados.has(c.id))
    .map((corte): CorteSinFacturar | null => {
      const proyecto = db.proyectos.find((p) => p.id === corte.proyectoId);
      return proyecto
        ? { corte, proyecto, cliente: db.clientes.find((c) => c.id === proyecto.clienteId) }
        : null;
    })
    .filter((x): x is CorteSinFacturar => x !== null)
    .sort((a, b) => (a.corte.fechaObjetivo ?? '9999').localeCompare(b.corte.fechaObjetivo ?? '9999'));
}

/** Concepto sugerido al facturar un corte. */
export function conceptoDeCorte(proyecto: Proyecto, corte: Corte): string {
  return `${proyecto.nombre} · ${corte.codigo} ${corte.titulo}`;
}

/* ---------- Exportacion a CSV ---------- */

const COLUMNAS = [
  'Tipo',
  'Estado',
  'Nº factura',
  'Concepto',
  'Cliente',
  'Proyecto',
  'Corte',
  'Emisión',
  'Vencimiento',
  'Pago',
  'Base',
  'IVA %',
  'IRPF %',
  'Total',
  'Método',
  'Notas',
];

function celda(valor: string | number | undefined, locale: string): string {
  if (valor === undefined || valor === null) return '';
  const texto = typeof valor === 'number' ? valor.toLocaleString(locale, { useGrouping: false }) : valor;
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * CSV con punto y coma y decimales en formato local: es lo que abre limpio
 * una hoja de cálculo en español sin pasar por el asistente de importación.
 */
export function movimientosACSV(movimientos: Movimiento[], db: BaseDatos): string {
  const { locale } = db.ajustes;
  const filas = movimientos.map((m) => {
    const cliente = db.clientes.find((c) => c.id === m.clienteId);
    const proyecto = db.proyectos.find((p) => p.id === m.proyectoId);
    const corte = db.cortes.find((c) => c.id === m.corteId);
    return [
      m.tipo === 'cobro' ? 'Cobro' : 'Pago',
      m.estado,
      m.numeroFactura,
      m.concepto,
      cliente?.nombre,
      proyecto?.nombre,
      corte?.codigo,
      m.fechaEmision,
      m.fechaVencimiento,
      m.fechaPago,
      m.importe,
      m.ivaPct,
      m.irpfPct,
      totalConImpuestos(m),
      m.metodo,
      m.notas,
    ]
      .map((valor) => celda(valor as string | number | undefined, locale))
      .join(';');
  });

  return [COLUMNAS.join(';'), ...filas].join('\r\n');
}

/* ---------- Recordatorio de impago ---------- */

/** Texto listo para pegar en un correo cuando una factura se pasa de plazo. */
export function textoRecordatorio(m: Movimiento, db: BaseDatos, fechaHoy: ISODate): string {
  const { moneda, locale } = db.ajustes;
  const cliente = db.clientes.find((c) => c.id === m.clienteId);
  const importe = formatoMoneda(totalConImpuestos(m), moneda, locale);
  const retraso = m.fechaVencimiento ? -diasEntre(fechaHoy, m.fechaVencimiento) : 0;

  const referencia = m.numeroFactura ? `la factura ${m.numeroFactura}` : 'el cobro';
  const detalle = m.fechaVencimiento
    ? `con vencimiento el ${formatoFecha(m.fechaVencimiento, locale)}${
        retraso > 0 ? ` (${retraso} días de retraso)` : ''
      }`
    : 'todavía pendiente';

  return [
    `Hola${cliente ? ` ${cliente.nombre}` : ''},`,
    '',
    `Te escribo por ${referencia}, "${m.concepto}", de ${importe}, ${detalle}.`,
    '',
    '¿Puedes confirmarme si está prevista o si hace falta que os reenvíe algún dato?',
    '',
    'Gracias,',
  ].join('\n');
}
