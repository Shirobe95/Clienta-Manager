/** Genera un id corto, unico dentro del documento local. */
export function nuevoId(prefijo = 'id'): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefijo}_${Date.now().toString(36)}${aleatorio}`;
}
