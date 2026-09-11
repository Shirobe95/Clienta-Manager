import { useState } from 'react';
import { formatoMoneda } from '../lib/format';
import type { PuntoMes } from '../lib/metrics';

export interface SerieGrafico {
  clave: 'cobrado' | 'pendiente' | 'gastos';
  texto: string;
  color: string;
}

const ANCHO = 760;
const ALTO = 240;
const MARGEN = { arriba: 14, derecha: 8, abajo: 26, izquierda: 52 };

/** Barra con extremo superior redondeado (4px) anclada a la linea base. */
function trazoBarra(x: number, y: number, ancho: number, alto: number, radio = 4): string {
  if (alto <= 0.5) return '';
  const r = Math.min(radio, ancho / 2, alto);
  return `M${x} ${y + alto} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + ancho - r} ${y} Q${x + ancho} ${y} ${x + ancho} ${y + r} L${x + ancho} ${y + alto} Z`;
}

function escalaBonita(maximo: number): { tope: number; pasos: number[] } {
  if (maximo <= 0) return { tope: 100, pasos: [0, 50, 100] };
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const tope = Math.ceil(maximo / magnitud) * magnitud;
  const pasos = [0, tope / 4, tope / 2, (tope * 3) / 4, tope];
  return { tope, pasos };
}

export function GraficoBarras({
  datos,
  series,
  moneda = 'EUR',
  locale = 'es-ES',
}: {
  datos: PuntoMes[];
  series: SerieGrafico[];
  moneda?: string;
  locale?: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const [verTabla, setVerTabla] = useState(false);

  const anchoTrama = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoTrama = ALTO - MARGEN.arriba - MARGEN.abajo;
  const maximo = Math.max(...datos.flatMap((d) => series.map((s) => d[s.clave])), 0);
  const { tope, pasos } = escalaBonita(maximo);

  const anchoColumna = anchoTrama / Math.max(datos.length, 1);
  // 2px de separacion entre barras adyacentes del mismo grupo.
  const anchoGrupo = Math.min(anchoColumna * 0.62, 46);
  const anchoBarra = Math.max((anchoGrupo - 2 * (series.length - 1)) / series.length, 3);

  const y = (valor: number) => MARGEN.arriba + altoTrama - (valor / tope) * altoTrama;

  const punto = activo !== null ? datos[activo] : undefined;

  return (
    <div>
      <div className="fila fila-sep" style={{ marginBottom: 10 }}>
        <div className="leyenda">
          {series.map((s) => (
            <span key={s.clave}>
              <span className="punto" style={{ background: s.color }} />
              {s.texto}
            </span>
          ))}
        </div>
        <button type="button" className="btn discreto pequeno" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>

      {verTabla ? (
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>Mes</th>
                {series.map((s) => (
                  <th key={s.clave} className="num">
                    {s.texto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.clave}>
                  <td>{d.clave}</td>
                  {series.map((s) => (
                    <td key={s.clave} className="num">
                      {formatoMoneda(d[s.clave], moneda, locale)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }} className="grafico-envoltorio">
          <svg
            className="grafico"
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            role="img"
            aria-label={`Evolución mensual: ${series.map((s) => s.texto).join(', ')}`}
            onMouseLeave={() => setActivo(null)}
          >
            {pasos.map((paso) => (
              <g key={paso}>
                <line
                  className="rejilla"
                  x1={MARGEN.izquierda}
                  x2={ANCHO - MARGEN.derecha}
                  y1={y(paso)}
                  y2={y(paso)}
                />
                <text x={MARGEN.izquierda - 8} y={y(paso) + 4} textAnchor="end">
                  {new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
                    paso,
                  )}
                </text>
              </g>
            ))}

            {datos.map((d, i) => {
              const xColumna = MARGEN.izquierda + i * anchoColumna;
              const xGrupo = xColumna + (anchoColumna - anchoGrupo) / 2;
              return (
                <g key={d.clave} className={activo === i ? 'grupo-activo' : undefined}>
                  <rect
                    className="barra-hit"
                    x={xColumna}
                    y={MARGEN.arriba}
                    width={anchoColumna}
                    height={altoTrama}
                    onMouseEnter={() => setActivo(i)}
                  />
                  {series.map((s, j) => {
                    const valor = d[s.clave];
                    const altura = (valor / tope) * altoTrama;
                    const x = xGrupo + j * (anchoBarra + 2);
                    return (
                      <path
                        key={s.clave}
                        d={trazoBarra(x, y(valor), anchoBarra, altura)}
                        fill={s.color}
                        opacity={activo === null || activo === i ? 1 : 0.45}
                      />
                    );
                  })}
                  <text x={xColumna + anchoColumna / 2} y={ALTO - 8} textAnchor="middle">
                    {d.etiqueta}
                  </text>
                </g>
              );
            })}
          </svg>

          {punto && (
            <div
              className="tooltip"
              style={{
                left: `${Math.min(88, Math.max(12, ((MARGEN.izquierda + (activo! + 0.5) * anchoColumna) / ANCHO) * 100))}%`,
                top: 0,
                transform: 'translate(-50%, -4px)',
              }}
            >
              <div className="t-titulo">{punto.clave}</div>
              {series.map((s) => (
                <div key={s.clave} className="t-fila">
                  <span className="punto" style={{ background: s.color, width: 8, height: 8, borderRadius: 3 }} />
                  {s.texto}
                  <span className="t-valor">{formatoMoneda(punto[s.clave], moneda, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
