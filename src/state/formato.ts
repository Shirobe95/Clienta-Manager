import { useCallback } from 'react';
import { formatoFecha, formatoMoneda } from '../lib/format';
import { useAlmacen } from './store';

/** Formateadores ligados a los ajustes actuales (moneda y locale). */
export function useFormato() {
  const { db } = useAlmacen();
  const { moneda, locale } = db.ajustes;

  const dinero = useCallback((valor: number) => formatoMoneda(valor, moneda, locale), [moneda, locale]);
  const fecha = useCallback((valor?: string) => formatoFecha(valor, locale), [locale]);

  return { dinero, fecha, moneda, locale };
}
