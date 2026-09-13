import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Cabecera } from '../components/Cabecera';
import { hoy } from '../lib/format';
import { Icono } from '../components/Icono';
import { TablaMovimientos } from '../components/TablaMovimientos';
import { TableroTareas } from '../components/TableroTareas';
import {
  FormCorte,
  FormDecision,
  FormMovimiento,
  FormProyecto,
  FormTarea,
  ModalPlantilla,
} from '../components/formularios';
import { BotonBorrar, Insignia, Kpi, Panel, Pestanas, Vacio } from '../components/ui';
import { estadosCorte, estadosDecision, estadosProyecto, modelosFacturacion } from '../lib/labels';
import {
  ajustarFechaEntrega,
  ampliacionDesdeCorte,
  corteDesdeModulo,
  cuadreProyecto,
  resumenAmpliaciones,
} from '../lib/entregas';
import { conceptoDeCorte, cortesSinFacturar } from '../lib/facturacion';
import { ajustarFechaSubida, conceptoDeTarea, resumenTareas, tareasSinFacturar } from '../lib/tareas';
import { progresoProyecto, totalConImpuestos } from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Corte, Decision, Movimiento, Proyecto, Tarea } from '../lib/types';

type Pestana = 'tareas' | 'vision' | 'cortes' | 'decisiones' | 'cobros';

export function ProyectoDetalle() {
  const { id = '' } = useParams();
  const { db, guardar, eliminar } = useAlmacen();
  const { dinero, fecha: fmtFecha } = useFormato();
  const [pestana, setPestana] = useState<Pestana>('tareas');
  const [formProyecto, setFormProyecto] = useState<Proyecto | null>(null);
  const [formCorte, setFormCorte] = useState<Corte | 'nuevo' | null>(null);
  const [formTarea, setFormTarea] = useState<Tarea | 'nueva' | null>(null);
  const [ampliando, setAmpliando] = useState<Corte | null>(null);
  const [formDecision, setFormDecision] = useState<Decision | 'nuevo' | null>(null);
  const [formMovimiento, setFormMovimiento] = useState<Movimiento | 'nuevo' | null>(null);
  const [contextoMovimiento, setContextoMovimiento] = useState<{
    corteId?: string;
    tareaId?: string;
    concepto?: string;
    importe?: number;
  }>({});
  const [anadirDesdePlantilla, setAnadirDesdePlantilla] = useState(false);

  const proyecto = db.proyectos.find((p) => p.id === id);
  if (!proyecto) return <Navigate to="/proyectos" replace />;

  const cliente = db.clientes.find((c) => c.id === proyecto.clienteId);
  const cortes = db.cortes
    .filter((c) => c.proyectoId === proyecto.id)
    .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
  const tareas = db.tareas
    .filter((t) => t.proyectoId === proyecto.id)
    .sort((a, b) => a.orden - b.orden);
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
  const cuadre = cuadreProyecto(db, proyecto);
  const ampliaciones = resumenAmpliaciones(cortes);
  const trabajo = resumenTareas(tareas);
  const tareasPorFacturar = new Set(
    tareasSinFacturar(db)
      .filter((x) => x.proyecto.id === proyecto.id)
      .map((x) => x.tarea.id),
  );

  /** Guardar una tarea apunta o retira su fecha de subida segun el estado. */
  const guardarTarea = (t: Tarea) => guardar('tareas', ajustarFechaSubida(t, fecha));

  const abrirCobroDeTarea = (t: Tarea) => {
    setContextoMovimiento({
      tareaId: t.id,
      corteId: t.corteId,
      concepto: conceptoDeTarea(proyecto, t, cortes.find((c) => c.id === t.corteId)),
      importe: t.importe,
    });
    setFormMovimiento('nuevo');
  };
  const fecha = hoy();

  /** Guardar un corte apunta o retira su fecha de entrega segun el estado. */
  const guardarCorte = (c: Corte) => guardar('cortes', ajustarFechaEntrega(c, fecha));
  const idsSinFacturar = new Set(
    cortesSinFacturar(db)
      .filter((x) => x.proyecto.id === proyecto.id)
      .map((x) => x.corte.id),
  );
  const ep = estadosProyecto.de(proyecto.estado);

  const abrirCobroDeCorte = (c: Corte) => {
    setContextoMovimiento({ corteId: c.id, concepto: conceptoDeCorte(proyecto, c), importe: c.importe });
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
            {pestana === 'tareas' ? (
              <button type="button" className="btn primario" onClick={() => setFormTarea('nueva')}>
                <Icono nombre="mas" />
                Nueva tarea
              </button>
            ) : (
              <button type="button" className="btn primario" onClick={() => setFormCorte('nuevo')}>
                <Icono nombre="mas" />
                Nuevo corte
              </button>
            )}
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
            etiqueta="Presupuesto pactado"
            valor={cuadre.pactado ? dinero(cuadre.pactado) : '—'}
            tono={cuadre.cuadra ? 'neutro' : 'aviso'}
            pie={
              cuadre.pactado
                ? cuadre.cuadra
                  ? `Los módulos suman ${dinero(cuadre.modulos)}`
                  : `Los módulos suman ${dinero(cuadre.modulos)} · ${cuadre.desviacion > 0 ? '+' : ''}${dinero(cuadre.desviacion)}`
                : `Los módulos suman ${dinero(cuadre.modulos)}`
            }
            progreso={cuadre.pactado ? (facturado / cuadre.pactado) * 100 : undefined}
          />
          <Kpi etiqueta="Facturado" valor={dinero(facturado)} tono="acento" />
          <Kpi etiqueta="Cobrado" valor={dinero(cobrado)} tono="ok" pie={`Pendiente ${dinero(facturado - cobrado)}`} />
          <Kpi
            etiqueta="Trabajo pendiente"
            valor={trabajo.importePendiente > 0 ? dinero(trabajo.importePendiente) : String(trabajo.pendientes + trabajo.desarrollando)}
            tono={trabajo.desarrollando > 0 ? 'acento' : 'neutro'}
            pie={
              tareas.length === 0
                ? 'Sin tareas apuntadas'
                : `${trabajo.desarrollando} en curso · ${trabajo.pendientes} por empezar · ${trabajo.subidas} subida${
                    trabajo.subidas === 1 ? '' : 's'
                  }`
            }
          />
          <Kpi
            etiqueta="Avance por cortes"
            valor={`${progreso}%`}
            progreso={progreso}
            pie={`${cortes.filter((c) => c.estado === 'aceptado').length} de ${cortes.length} aceptados`}
          />
        </div>

        {(!cuadre.cuadra || cuadre.cortesSinImporte > 0) && (
          <div className="panel panel-cuerpo pequeno fila" style={{ borderColor: 'var(--aviso)', gap: 10 }}>
            <span style={{ color: 'var(--aviso)', display: 'flex' }}>
              <Icono nombre="aviso" />
            </span>
            <span className="texto-2 crecer">
              {!cuadre.cuadra &&
                `Los módulos suman ${dinero(cuadre.modulos)} frente a los ${dinero(cuadre.pactado ?? 0)} pactados (${
                  cuadre.desviacion > 0 ? '+' : ''
                }${dinero(cuadre.desviacion)}).`}
              {!cuadre.cuadra && cuadre.cortesSinImporte > 0 && ' '}
              {cuadre.cortesSinImporte > 0 &&
                `${cuadre.cortesSinImporte} corte${cuadre.cortesSinImporte === 1 ? '' : 's'} sin precio asignado.`}
            </span>
          </div>
        )}

        <Pestanas<Pestana>
          activa={pestana}
          onChange={setPestana}
          opciones={[
            { valor: 'tareas', texto: 'Tareas', cuenta: trabajo.pendientes + trabajo.desarrollando },
            { valor: 'vision', texto: 'Visión general' },
            { valor: 'cortes', texto: 'Cortes', cuenta: cortes.length },
            { valor: 'decisiones', texto: 'Decisiones', cuenta: decisiones.length },
            { valor: 'cobros', texto: 'Cobros', cuenta: movimientos.length },
          ]}
        />

        {pestana === 'tareas' && (
          <Panel
            titulo="Trabajo del proyecto"
            icono="check"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => setFormTarea('nueva')}>
                <Icono nombre="mas" />
                Nueva tarea
              </button>
            }
          >
            <TableroTareas
              tareas={tareas}
              cortes={cortes}
              idsSinFacturar={tareasPorFacturar}
              onEditar={(t) => setFormTarea(t)}
              onFacturar={abrirCobroDeTarea}
            />
          </Panel>
        )}

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
            pie={
              ampliaciones.cantidad > 0 ? (
                <div className="panel-cuerpo pequeno texto-3" style={{ borderTop: '1px solid var(--borde)' }}>
                  {ampliaciones.cantidad}{' '}
                  {ampliaciones.cantidad === 1 ? 'ampliación' : 'ampliaciones'} de alcance ·{' '}
                  <strong className="num texto-2">{dinero(ampliaciones.importe)}</strong> de trabajo extra
                  presupuestado
                </div>
              ) : undefined
            }
            acciones={
              <>
                <button
                  type="button"
                  className="btn pequeno"
                  disabled={db.plantillas.length === 0}
                  title={db.plantillas.length === 0 ? 'No hay plantillas todavía' : 'Añadir módulos de una plantilla'}
                  onClick={() => setAnadirDesdePlantilla(true)}
                >
                  <Icono nombre="nota" />
                  Desde plantilla
                </button>
                <button type="button" className="btn pequeno" onClick={() => setFormCorte('nuevo')}>
                  <Icono nombre="mas" />
                  Nuevo corte
                </button>
              </>
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
                          {idsSinFacturar.has(c.id) && <Insignia texto="Sin facturar" tono="aviso" />}
                          {c.origenCorteId && (
                            <Insignia
                              texto={`Amplía ${cortes.find((x) => x.id === c.origenCorteId)?.codigo ?? '—'}`}
                              tono="info"
                            />
                          )}
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
                                    guardarCorte({
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
                          {c.fechaEntrega && (
                            <span
                              style={
                                c.fechaObjetivo && c.fechaEntrega > c.fechaObjetivo
                                  ? { color: 'var(--aviso)' }
                                  : { color: 'var(--ok)' }
                              }
                            >
                              {' · entregado '}
                              {fmtFecha(c.fechaEntrega)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        {c.fueraDeAlcance && (
                          <button
                            type="button"
                            className="btn pequeno"
                            title="Convertir el fuera de alcance en un corte nuevo"
                            onClick={() => setAmpliando(c)}
                          >
                            <Icono nombre="rayo" />
                          </button>
                        )}
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

      {anadirDesdePlantilla && (
        <ModalPlantilla
          plantillas={db.plantillas}
          onCerrar={() => setAnadirDesdePlantilla(false)}
          onAnadir={(modulos) => {
            modulos.forEach((modulo, i) =>
              guardar('cortes', corteDesdeModulo(modulo, proyecto.id, cortes.length + 1 + i)),
            );
            setAnadirDesdePlantilla(false);
            setPestana('cortes');
          }}
        />
      )}

      {formTarea && (
        <FormTarea
          inicial={formTarea === 'nueva' ? undefined : formTarea}
          proyectoId={proyecto.id}
          cortes={cortes}
          siguienteOrden={tareas.length + 1}
          onCerrar={() => setFormTarea(null)}
          onGuardar={(t) => {
            guardarTarea(t);
            setFormTarea(null);
          }}
        />
      )}

      {ampliando && (
        <FormCorte
          inicial={ampliacionDesdeCorte(ampliando, cortes.length + 1, cortes.map((c) => c.codigo))}
          tituloModal={`Ampliar el alcance de ${ampliando.codigo}`}
          proyectoId={proyecto.id}
          siguienteOrden={cortes.length + 1}
          onCerrar={() => setAmpliando(null)}
          onGuardar={(c) => {
            guardarCorte(c);
            setAmpliando(null);
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
            guardarCorte(c);
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
          movimientos={db.movimientos}
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
