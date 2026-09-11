import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { TablaMovimientos } from '../components/TablaMovimientos';
import { FormCorte, FormDecision, FormMovimiento, FormProyecto } from '../components/formularios';
import { BotonBorrar, Insignia, Kpi, Panel, Pestanas, Vacio } from '../components/ui';
import { estadosCorte, estadosDecision, estadosProyecto, modelosFacturacion } from '../lib/labels';
import { progresoProyecto, totalConImpuestos } from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Corte, Decision, Movimiento, Proyecto } from '../lib/types';

type Pestana = 'vision' | 'cortes' | 'decisiones' | 'cobros';

export function ProyectoDetalle() {
  const { id = '' } = useParams();
  const { db, guardar, eliminar } = useAlmacen();
  const { dinero, fecha: fmtFecha } = useFormato();
  const [pestana, setPestana] = useState<Pestana>('vision');
  const [formProyecto, setFormProyecto] = useState<Proyecto | null>(null);
  const [formCorte, setFormCorte] = useState<Corte | 'nuevo' | null>(null);
  const [formDecision, setFormDecision] = useState<Decision | 'nuevo' | null>(null);
  const [formMovimiento, setFormMovimiento] = useState<Movimiento | 'nuevo' | null>(null);
  const [contextoMovimiento, setContextoMovimiento] = useState<{ corteId?: string; concepto?: string; importe?: number }>({});

  const proyecto = db.proyectos.find((p) => p.id === id);
  if (!proyecto) return <Navigate to="/proyectos" replace />;

  const cliente = db.clientes.find((c) => c.id === proyecto.clienteId);
  const cortes = db.cortes
    .filter((c) => c.proyectoId === proyecto.id)
    .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
  const decisiones = db.decisiones
    .filter((d) => d.proyectoId === proyecto.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const movimientos = db.movimientos
    .filter((m) => m.proyectoId === proyecto.id)
    .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));

  const facturado = movimientos
    .filter((m) => m.tipo === 'cobro' && m.estado !== 'borrador')
    .reduce((suma, m) => suma + totalConImpuestos(m), 0);
  const cobrado = movimientos
    .filter((m) => m.tipo === 'cobro' && m.estado === 'pagado')
    .reduce((suma, m) => suma + totalConImpuestos(m), 0);
  const progreso = progresoProyecto(cortes);
  const ep = estadosProyecto.de(proyecto.estado);

  const abrirCobroDeCorte = (c: Corte) => {
    setContextoMovimiento({ corteId: c.id, concepto: `${proyecto.nombre} · ${c.codigo} ${c.titulo}`, importe: c.importe });
    setFormMovimiento('nuevo');
  };

  return (
    <>
      <Cabecera
        titulo={proyecto.nombre}
        subtitulo={
          cliente ? `${cliente.nombre} · ${modelosFacturacion.de(proyecto.modelo).texto}` : 'Proyecto sin cliente'
        }
        volverA="/proyectos"
        acciones={
          <>
            <button type="button" className="btn" onClick={() => setFormProyecto(proyecto)}>
              <Icono nombre="editar" />
              Editar
            </button>
            <button type="button" className="btn primario" onClick={() => setFormCorte('nuevo')}>
              <Icono nombre="mas" />
              Nuevo corte
            </button>
          </>
        }
      />

      <div className="pagina">
        <div className="fila">
          <Insignia texto={ep.texto} tono={ep.tono} />
          {cliente && (
            <Link className="etiqueta" to={`/clientes/${cliente.id}`}>
              {cliente.nombre}
            </Link>
          )}
          {proyecto.etiquetas.map((e) => (
            <span className="etiqueta" key={e}>
              {e}
            </span>
          ))}
          <div className="crecer" />
          <BotonBorrar etiqueta="Eliminar proyecto" onBorrar={() => eliminar('proyectos', proyecto.id)} />
        </div>

        <div className="grid grid-kpi">
          <Kpi
            etiqueta="Presupuesto"
            valor={proyecto.presupuesto ? dinero(proyecto.presupuesto) : '—'}
            pie={proyecto.presupuesto ? `${Math.round((facturado / proyecto.presupuesto) * 100)}% facturado` : 'Sin definir'}
            progreso={proyecto.presupuesto ? (facturado / proyecto.presupuesto) * 100 : undefined}
          />
          <Kpi etiqueta="Facturado" valor={dinero(facturado)} tono="acento" />
          <Kpi etiqueta="Cobrado" valor={dinero(cobrado)} tono="ok" pie={`Pendiente ${dinero(facturado - cobrado)}`} />
          <Kpi
            etiqueta="Avance por cortes"
            valor={`${progreso}%`}
            progreso={progreso}
            pie={`${cortes.filter((c) => c.estado === 'aceptado').length} de ${cortes.length} aceptados`}
          />
        </div>

        <Pestanas<Pestana>
          activa={pestana}
          onChange={setPestana}
          opciones={[
            { valor: 'vision', texto: 'Visión general' },
            { valor: 'cortes', texto: 'Cortes', cuenta: cortes.length },
            { valor: 'decisiones', texto: 'Decisiones', cuenta: decisiones.length },
            { valor: 'cobros', texto: 'Cobros', cuenta: movimientos.length },
          ]}
        />

        {pestana === 'vision' && (
          <div className="grid grid-2">
            <Panel titulo="Visión general" icono="brujula">
              {proyecto.visionGeneral || proyecto.descripcion ? (
                <p className="pre-linea texto-2">{proyecto.visionGeneral || proyecto.descripcion}</p>
              ) : (
                <Vacio
                  titulo="Sin visión general"
                  descripcion="Describe contexto, objetivo y límites del proyecto desde Editar."
                  icono="brujula"
                />
              )}
            </Panel>
            <div className="grid" style={{ gap: 14 }}>
              <Panel titulo="Ficha" icono="proyectos">
                <div className="grid" style={{ gap: 10 }}>
                  <Dato etiqueta="Cliente" valor={cliente?.nombre} />
                  <Dato etiqueta="Modelo" valor={modelosFacturacion.de(proyecto.modelo).texto} />
                  <Dato etiqueta="Inicio" valor={proyecto.fechaInicio ? fmtFecha(proyecto.fechaInicio) : undefined} />
                  <Dato etiqueta="Entrega" valor={proyecto.fechaEntrega ? fmtFecha(proyecto.fechaEntrega) : undefined} />
                </div>
              </Panel>
              <Panel titulo="Enlaces" icono="enlace" sinRelleno>
                {proyecto.enlaces.length === 0 ? (
                  <Vacio titulo="Sin enlaces" descripcion="Repos, diseños, entornos o documentación." icono="enlace" />
                ) : (
                  <div className="lista">
                    {proyecto.enlaces.map((e) => (
                      <a className="lista-item" href={e.url} target="_blank" rel="noreferrer" key={e.url + e.label}>
                        <Icono nombre="enlace" />
                        <div className="crecer">
                          <div className="titulo">{e.label || e.url}</div>
                          <div className="meta recorte">{e.url}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {pestana === 'cortes' && (
          <Panel
            titulo="Cortes del proyecto"
            icono="brujula"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => setFormCorte('nuevo')}>
                <Icono nombre="mas" />
                Nuevo corte
              </button>
            }
          >
            {cortes.length === 0 ? (
              <Vacio
                titulo="Sin cortes"
                descripcion="Divide el proyecto en bloques acotados con criterios de aceptación."
                icono="brujula"
              />
            ) : (
              <div className="lista">
                {cortes.map((c) => {
                  const ec = estadosCorte.de(c.estado);
                  const hechos = c.criterios.filter((x) => x.hecho).length;
                  return (
                    <div className="lista-item" key={c.id} style={{ alignItems: 'flex-start' }}>
                      <span className="etiqueta mono" style={{ marginTop: 2 }}>
                        {c.codigo}
                      </span>
                      <div className="crecer">
                        <div className="fila" style={{ gap: 8 }}>
                          <span className="titulo">{c.titulo}</span>
                          <Insignia texto={ec.texto} tono={ec.tono} />
                          {c.importe ? <span className="etiqueta">{dinero(c.importe)}</span> : null}
                        </div>
                        {c.objetivo && <div className="meta pre-linea" style={{ marginTop: 4 }}>{c.objetivo}</div>}
                        {c.fueraDeAlcance && (
                          <div className="meta pre-linea" style={{ marginTop: 4 }}>
                            <strong className="texto-3">Fuera de alcance: </strong>
                            {c.fueraDeAlcance}
                          </div>
                        )}
                        {c.criterios.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {c.criterios.map((cr) => (
                              <label key={cr.id} className="fila pequeno" style={{ gap: 8, flexWrap: 'nowrap' }}>
                                <input
                                  type="checkbox"
                                  checked={cr.hecho}
                                  onChange={(e) =>
                                    guardar('cortes', {
                                      ...c,
                                      criterios: c.criterios.map((x) =>
                                        x.id === cr.id ? { ...x, hecho: e.target.checked } : x,
                                      ),
                                    })
                                  }
                                />
                                <span className={cr.hecho ? 'texto-3' : 'texto-2'}>{cr.texto}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        <div className="meta" style={{ marginTop: 6 }}>
                          {c.criterios.length > 0 && `${hechos}/${c.criterios.length} criterios · `}
                          {c.fechaObjetivo ? `objetivo ${fmtFecha(c.fechaObjetivo)}` : 'sin fecha objetivo'}
                        </div>
                      </div>
                      <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn pequeno"
                          title="Crear cobro de este corte"
                          onClick={() => abrirCobroDeCorte(c)}
                        >
                          <Icono nombre="cobros" />
                        </button>
                        <button type="button" className="btn discreto pequeno" title="Editar" onClick={() => setFormCorte(c)}>
                          <Icono nombre="editar" />
                        </button>
                        <BotonBorrar etiqueta="" onBorrar={() => eliminar('cortes', c.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {pestana === 'decisiones' && (
          <Panel
            titulo="Registro de decisiones"
            icono="nota"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => setFormDecision('nuevo')}>
                <Icono nombre="mas" />
                Nueva decisión
              </button>
            }
          >
            {decisiones.length === 0 ? (
              <Vacio
                titulo="Sin decisiones registradas"
                descripcion="Anota qué se decidió, por qué y qué alternativas se descartaron."
                icono="nota"
              />
            ) : (
              <div className="lista">
                {decisiones.map((d) => {
                  const ed = estadosDecision.de(d.estado);
                  return (
                    <div className="lista-item" key={d.id} style={{ alignItems: 'flex-start' }}>
                      <div className="crecer">
                        <div className="fila" style={{ gap: 8 }}>
                          <span className="titulo">{d.titulo}</span>
                          <Insignia texto={ed.texto} tono={ed.tono} />
                          <span className="meta">{fmtFecha(d.fecha)}</span>
                        </div>
                        {d.contexto && <CampoTexto etiqueta="Contexto" valor={d.contexto} />}
                        {d.decision && <CampoTexto etiqueta="Decisión" valor={d.decision} />}
                        {d.alternativas && <CampoTexto etiqueta="Alternativas" valor={d.alternativas} />}
                        {d.consecuencias && <CampoTexto etiqueta="Consecuencias" valor={d.consecuencias} />}
                      </div>
                      <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn discreto pequeno"
                          title="Editar"
                          onClick={() => setFormDecision(d)}
                        >
                          <Icono nombre="editar" />
                        </button>
                        <BotonBorrar etiqueta="" onBorrar={() => eliminar('decisiones', d.id)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {pestana === 'cobros' && (
          <Panel
            titulo="Movimientos del proyecto"
            icono="cobros"
            sinRelleno
            acciones={
              <button
                type="button"
                className="btn pequeno"
                onClick={() => {
                  setContextoMovimiento({});
                  setFormMovimiento('nuevo');
                }}
              >
                <Icono nombre="mas" />
                Nuevo
              </button>
            }
          >
            <TablaMovimientos movimientos={movimientos} mostrarProyecto={false} onEditar={(m) => setFormMovimiento(m)} />
          </Panel>
        )}
      </div>

      {formProyecto && (
        <FormProyecto
          inicial={formProyecto}
          clientes={db.clientes}
          onCerrar={() => setFormProyecto(null)}
          onGuardar={(p) => {
            guardar('proyectos', p);
            setFormProyecto(null);
          }}
        />
      )}

      {formCorte && (
        <FormCorte
          inicial={formCorte === 'nuevo' ? undefined : formCorte}
          proyectoId={proyecto.id}
          siguienteOrden={cortes.length + 1}
          onCerrar={() => setFormCorte(null)}
          onGuardar={(c) => {
            guardar('cortes', c);
            setFormCorte(null);
          }}
        />
      )}

      {formDecision && (
        <FormDecision
          inicial={formDecision === 'nuevo' ? undefined : formDecision}
          proyectoId={proyecto.id}
          onCerrar={() => setFormDecision(null)}
          onGuardar={(d) => {
            guardar('decisiones', d);
            setFormDecision(null);
          }}
        />
      )}

      {formMovimiento && (
        <FormMovimiento
          inicial={formMovimiento === 'nuevo' ? undefined : formMovimiento}
          clientes={db.clientes}
          proyectos={db.proyectos}
          cortes={db.cortes}
          ajustes={db.ajustes}
          contexto={{ clienteId: proyecto.clienteId, proyectoId: proyecto.id, ...contextoMovimiento }}
          onCerrar={() => {
            setFormMovimiento(null);
            setContextoMovimiento({});
          }}
          onGuardar={(m) => {
            guardar('movimientos', m);
            setFormMovimiento(null);
            setContextoMovimiento({});
          }}
        />
      )}
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  return (
    <div className="fila fila-sep">
      <span className="texto-3 pequeno">{etiqueta}</span>
      <span className={valor ? '' : 'texto-3'}>{valor || '—'}</span>
    </div>
  );
}

function CampoTexto({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="meta pre-linea" style={{ marginTop: 4 }}>
      <strong className="texto-3">{etiqueta}: </strong>
      {valor}
    </div>
  );
}
