import { useState } from 'react';
import { Icono } from './Icono';
import { BotonBorrar, Insignia, Vacio } from './ui';
import { hoy } from '../lib/format';
import { estadosTarea, prioridades } from '../lib/labels';
import { agruparPorEstado, ajustarFechaSubida, siguienteEstado } from '../lib/tareas';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Corte, Tarea } from '../lib/types';

export function TableroTareas({
  tareas,
  cortes,
  idsSinFacturar,
  onEditar,
  onFacturar,
}: {
  tareas: Tarea[];
  cortes: Corte[];
  idsSinFacturar: Set<string>;
  onEditar: (t: Tarea) => void;
  onFacturar: (t: Tarea) => void;
}) {
  const { guardar, eliminar } = useAlmacen();
  const { dinero, fecha: fmtFecha } = useFormato();
  const [verCerradas, setVerCerradas] = useState(false);
  const fecha = hoy();

  const cerrada = (t: Tarea) => t.estado === 'subida' || t.estado === 'cancelada';
  const visibles = verCerradas ? tareas : tareas.filter((t) => !cerrada(t));
  const grupos = agruparPorEstado(visibles);
  const cerradas = tareas.filter(cerrada).length;

  /** Avanza un paso del flujo y ajusta la fecha de subida si toca. */
  const avanzar = (tarea: Tarea) => {
    const siguiente = siguienteEstado(tarea.estado);
    if (!siguiente) return;
    guardar('tareas', ajustarFechaSubida({ ...tarea, estado: siguiente }, fecha));
  };

  if (tareas.length === 0) {
    return (
      <Vacio
        icono="check"
        titulo="Sin tareas"
        descripcion="Apunta lo que hay que hacer en este proyecto, con su cobro si lo tiene, y ve marcando el avance."
      />
    );
  }

  return (
    <div>
      {cerradas > 0 && (
        <div className="fila fila-sep" style={{ padding: '10px 16px', borderBottom: '1px solid var(--borde)' }}>
          <span className="pequeno texto-3">
            {cerradas} tarea{cerradas === 1 ? '' : 's'} subida{cerradas === 1 ? '' : 's'} o cancelada
            {cerradas === 1 ? '' : 's'}
          </span>
          <button type="button" className="btn discreto pequeno" onClick={() => setVerCerradas((v) => !v)}>
            {verCerradas ? 'Ocultar cerradas' : 'Ver cerradas'}
          </button>
        </div>
      )}

      {grupos.length === 0 ? (
        <Vacio icono="check" titulo="Nada abierto" descripcion="Todo lo que hay está subido o cancelado." />
      ) : (
        grupos.map((grupo) => {
          const etiqueta = estadosTarea.de(grupo.estado);
          const total = grupo.tareas.reduce((suma, t) => suma + (t.importe ?? 0), 0);
          return (
            <section key={grupo.estado}>
              <header
                className="fila fila-sep"
                style={{ padding: '10px 16px', background: 'var(--superficie-alta)' }}
              >
                <div className="fila" style={{ gap: 8 }}>
                  <Insignia texto={etiqueta.texto} tono={etiqueta.tono} />
                  <span className="pequeno texto-3">{grupo.tareas.length}</span>
                </div>
                {total > 0 && <span className="num pequeno texto-3">{dinero(total)}</span>}
              </header>

              <div className="lista">
                {grupo.tareas.map((tarea) => {
                  const corte = cortes.find((c) => c.id === tarea.corteId);
                  const prioridad = prioridades.de(tarea.prioridad);
                  const siguiente = siguienteEstado(tarea.estado);
                  const atrasada =
                    tarea.fechaObjetivo && tarea.estado !== 'subida' && tarea.fechaObjetivo < fecha;

                  return (
                    <div className="lista-item" key={tarea.id} style={{ alignItems: 'flex-start' }}>
                      <span
                        title={`Prioridad ${prioridad.texto.toLowerCase()}`}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          marginTop: 8,
                          flex: 'none',
                          background:
                            tarea.prioridad === 'alta'
                              ? 'var(--critico)'
                              : tarea.prioridad === 'baja'
                                ? 'var(--texto-3)'
                                : 'var(--acento)',
                        }}
                      />

                      <div className="crecer">
                        <div className="fila" style={{ gap: 8 }}>
                          <span className="titulo">{tarea.titulo}</span>
                          {corte && <span className="etiqueta mono">{corte.codigo}</span>}
                          {tarea.importe ? <span className="etiqueta">{dinero(tarea.importe)}</span> : null}
                          {idsSinFacturar.has(tarea.id) && <Insignia texto="Sin facturar" tono="aviso" />}
                        </div>
                        {tarea.detalle && (
                          <div className="meta pre-linea" style={{ marginTop: 4 }}>
                            {tarea.detalle}
                          </div>
                        )}
                        <div className="meta" style={{ marginTop: 4 }}>
                          {tarea.fechaObjetivo ? (
                            <span style={atrasada ? { color: 'var(--critico)' } : undefined}>
                              objetivo {fmtFecha(tarea.fechaObjetivo)}
                            </span>
                          ) : (
                            'sin fecha objetivo'
                          )}
                          {tarea.fechaSubida && (
                            <span style={{ color: 'var(--ok)' }}> · subida {fmtFecha(tarea.fechaSubida)}</span>
                          )}
                        </div>
                      </div>

                      <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        {siguiente && (
                          <button
                            type="button"
                            className="btn pequeno"
                            title={`Pasar a ${estadosTarea.de(siguiente).texto.toLowerCase()}`}
                            onClick={() => avanzar(tarea)}
                          >
                            → {estadosTarea.de(siguiente).texto}
                          </button>
                        )}
                        {idsSinFacturar.has(tarea.id) && (
                          <button
                            type="button"
                            className="btn pequeno"
                            title="Crear el cobro de esta tarea"
                            onClick={() => onFacturar(tarea)}
                          >
                            <Icono nombre="cobros" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn discreto pequeno"
                          title="Editar"
                          onClick={() => onEditar(tarea)}
                        >
                          <Icono nombre="editar" />
                        </button>
                        <BotonBorrar etiqueta="" onBorrar={() => eliminar('tareas', tarea.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
