import type { ISODate } from './types';

export function formatoMoneda(valor: number, moneda = 'EUR', locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatoMonedaCorta(valor: number, moneda = 'EUR', locale = 'es-ES'): string {
  const abs = Math.abs(valor);
  if (abs >= 1000) {
    const compacto = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(valor);
    return `${compacto} ${moneda === 'EUR' ? '€' : moneda}`;
  }
  return formatoMoneda(valor, moneda, locale);
}

export function formatoFecha(fecha?: ISODate, locale = 'es-ES'): string {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** Fecha de hoy en formato YYYY-MM-DD, en hora local. */
export function hoy(): ISODate {
  const d = new Date();
  return aISODate(d);
}

export function aISODate(d: Date): ISODate {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function sumarDias(fecha: ISODate, dias: number): ISODate {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return aISODate(d);
}

export function sumarMeses(fecha: ISODate, meses: number): ISODate {
  const d = new Date(`${fecha}T00:00:00`);
  const diaOriginal = d.getDate();
  d.setMonth(d.getMonth() + meses);
  // Evita el salto de mes cuando el dia no existe (31 -> 3 de marzo).
  if (d.getDate() < diaOriginal) d.setDate(0);
  return aISODate(d);
}

/** Diferencia en dias entre dos fechas (b - a). */
export function diasEntre(a: ISODate, b: ISODate): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Clave de mes YYYY-MM. */
export function claveMes(fecha: ISODate): string {
  return fecha.slice(0, 7);
}

export function etiquetaMes(clave: string, locale = 'es-ES'): string {
  const [anio, mes] = clave.split('-');
  const d = new Date(Number(anio), Number(mes) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', '');
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
