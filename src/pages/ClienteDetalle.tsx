import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { ListaSeguimientos } from '../components/ListaSeguimientos';
import { TablaMovimientos } from '../components/TablaMovimientos';
import { FormCliente, FormMovimiento, FormProyecto, FormSeguimiento } from '../components/formularios';
import { BotonBorrar, Insignia, Kpi, Panel, Pestanas, Vacio } from '../components/ui';
import { hoy, iniciales } from '../lib/format';
import { estadosCliente, estadosProyecto, modelosFacturacion } from '../lib/labels';
import { progresoProyecto, resumenCliente } from '../lib/metrics';
import { totalConImpuestos } from '../lib/metrics';
import { movimientoDeMensualidad, periodosPendientes, suscripcionVigente } from '../lib/suscripciones';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Movimiento, Proyecto, Seguimiento } from '../lib/types';

type Pestana = 'resumen' | 'proyectos' | 'cobros' | 'agenda';

export function ClienteDetalle() {
  const { id = '' } = useParams();
  const { db, guardar, eliminar } = useAlmacen();
  const { dinero, fecha: fmtFecha } = useFormato();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [formProyecto, setFormProyecto] = useState<Proyecto | 'nuevo' | null>(null);
  const [formMovimiento, setFormMovimiento] = useState<Movimiento | 'nuevo' | null>(null);
  const [formSeguimiento, setFormSeguimiento] = useState<Seguimiento | 'nuevo' | null>(null);

  const cliente = db.clientes.find((c) => c.id === id);
  if (!cliente) return <Navigate to="/clientes" replace />;

  const fecha = hoy();
  const resumen = resumenCliente(db, cliente.id, fecha);
  const proyectos = db.proyectos.filter((p) => p.clienteId === cliente.id);
  const movimientos = db.movimientos
    .filter((m) => m.clienteId === cliente.id)
    .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
  const seguimientos = db.seguimientos
    .filter((s) => s.clienteId === cliente.id)
    .sort((a, b) => a.fechaPrevista.localeCompare(b.fechaPrevista));
  const estado = estadosCliente.de(cliente.estado);
  const suscripcion = cliente.suscripcion;
  const pendientesCuota = periodosPendientes(cliente, db.movimientos, fecha);

  const emitirCuotas = (periodos: string[]) => {
    let acumulados = db.movimientos;
    for (const periodo of periodos) {
      const movimiento = movimientoDeMensualidad(cliente, periodo, acumulados, db.ajustes);
      acumulados = [...acumulados, movimiento];
      guardar('movimientos', movimiento);
    }
  };

  return (
    <>
      <Cabecera
        titulo={cliente.nombre}
        subtitulo={[cliente.empresa, cliente.ciudad, cliente.email].filter(Boolean).join(' · ') || 'Ficha de cliente'}
        volverA="/clientes"
        acciones={
          <>
            <button type="button" className="btn" onClick={() => setEditandoCliente(true)}>
              <Icono nombre="editar" />
              Editar
            </button>
            <button type="button" className="btn primario" onClick={() => setFormMovimiento('nuevo')}>
              <Icono nombre="mas" />
              Cobro
            </button>
          </>
        }
      />

      <div className="pagina">
        <div className="fila">
          <span className="avatar" style={{ width: 40, height: 40 }}>
            {iniciales(cliente.nombre)}
          </span>
          <Insignia texto={estado.texto} tono={estado.tono} />
          {cliente.tarifaHora ? <span className="etiqueta">{dinero(cliente.tarifaHora)}/h</span> : null}
          {cliente.etiquetas.map((e) => (
            <span className="etiqueta" key={e}>
              {e}
            </span>
          ))}
          <div className="crecer" />
          <BotonBorrar etiqueta="Eliminar cliente" onBorrar={() => eliminar('clientes', cliente.id)} />
        </div>

        <div className="grid grid-kpi">
          <Kpi etiqueta="Cobrado histórico" valor={dinero(resumen.cobrado)} tono="ok" />
          <Kpi
            etiqueta="Pendiente"
            valor={dinero(resumen.pendiente)}
            tono={resumen.pendiente > 0 ? 'aviso' : 'neutro'}
          />
          <Kpi etiqueta="Vencido" valor={dinero(resumen.vencido)} tono={resumen.vencido > 0 ? 'critico' : 'neutro'} />
          <Kpi
            etiqueta="Último cobro"
            valor={resumen.ultimoCobro ? fmtFecha(resumen.ultimoCobro) : '—'}
            pie={`${proyectos.length} proyectos en total`}
          />
        </div>

        <Pestanas<Pestana>
          activa={pestana}
          onChange={setPestana}
          opciones={[
            { valor: 'resumen', texto: 'Resumen' },
            { valor: 'proyectos', texto: 'Proyectos', cuenta: proyectos.length },
            { valor: 'cobros', texto: 'Cobros y pagos', cuenta: movimientos.length },
            { valor: 'agenda', texto: 'Agenda', cuenta: seguimientos.filter((s) => s.estado === 'pendiente').length },
          ]}
        />

        {pestana === 'resumen' && (
          <div className="grid grid-2">
            <Panel titulo="Contacto" icono="clientes">
              <div className="grid" style={{ gap: 10 }}>
                <Dato etiqueta="Email" valor={cliente.email} />
                <Dato etiqueta="Teléfono" valor={cliente.telefono} />
                <Dato etiqueta="Ciudad" valor={cliente.ciudad} />
                <Dato etiqueta="Alta" valor={fmtFecha(cliente.creadoEn.slice(0, 10))} />
              </div>
            </Panel>
            {suscripcion && (
              <Panel
                titulo="Mensualidad"
                icono="reloj"
                acciones={
                  pendientesCuota.length > 0 ? (
                    <button type="button" className="btn primario pequeno" onClick={() => emitirCuotas(pendientesCuota)}>
                      Emitir {pendientesCuota.length}
                    </button>
                  ) : undefined
                }
              >
                <div className="grid" style={{ gap: 10 }}>
                  <div className="fila fila-sep">
                    <span className="texto-3 pequeno">{suscripcion.concepto}</span>
                    <Insignia
                      texto={suscripcionVigente(suscripcion, fecha) ? 'Vigente' : 'Parada'}
                      tono={suscripcionVigente(suscripcion, fecha) ? 'ok' : 'neutro'}
                    />
                  </div>
                  <Dato etiqueta="Importe mensual" valor={dinero(totalConImpuestos(suscripcion))} />
                  <Dato etiqueta="Día de cobro" valor={`Cada día ${suscripcion.diaCobro}`} />
                  <Dato etiqueta="Inicio" valor={fmtFecha(suscripcion.inicio)} />
                  <Dato etiqueta="Baja" valor={suscripcion.fin ? fmtFecha(suscripcion.fin) : undefined} />
                  <div className="pequeno texto-3">
                    {pendientesCuota.length === 0
                      ? 'Todas las cuotas emitidas hasta hoy.'
                      : `Pendientes de emitir: ${pendientesCuota.join(', ')}.`}
                  </div>
                </div>
              </Panel>
            )}

            <Panel titulo="Notas" icono="nota">
              {cliente.notas ? (
                <p className="pre-linea texto-2">{cliente.notas}</p>
              ) : (
                <Vacio titulo="Sin notas" descripcion="Usa Editar para añadir contexto del cliente." />
              )}
            </Panel>
          </div>
        )}

        {pestana === 'proyectos' && (
          <Panel
            titulo="Proyectos del cliente"
            icono="proyectos"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => setFormProyecto('nuevo')}>
                <Icono nombre="mas" />
                Nuevo
              </button>
            }
          >
            {proyectos.length === 0 ? (
              <Vacio titulo="Sin proyectos" descripcion="Crea el primero para organizar cortes y decisiones." icono="proyectos" />
            ) : (
              <div className="lista">
                {proyectos.map((p) => {
                  const cortes = db.cortes.filter((c) => c.proyectoId === p.id);
                  const ep = estadosProyecto.de(p.estado);
                  return (
                    <Link className="lista-item" to={`/proyectos/${p.id}`} key={p.id}>
                      <div className="crecer">
                        <div className="titulo recorte">{p.nombre}</div>
                        <div className="meta recorte">
                          {modelosFacturacion.de(p.modelo).texto}
                          {p.presupuesto ? ` · ${dinero(p.presupuesto)}` : ''} · {cortes.length} cortes ·{' '}
                          {progresoProyecto(cortes)}% aceptado
                        </div>
                      </div>
                      <Insignia texto={ep.texto} tono={ep.tono} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {pestana === 'cobros' && (
          <Panel
            titulo="Movimientos"
            icono="cobros"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => setFormMovimiento('nuevo')}>
                <Icono nombre="mas" />
                Nuevo
              </button>
            }
          >
            <TablaMovimientos
              movimientos={movimientos}
              mostrarCliente={false}
              onEditar={(m) => setFormMovimiento(m)}
            />
          </Panel>
        )}

        {pestana === 'agenda' && (
          <Panel
            titulo="Seguimientos y actualizaciones"
            icono="agenda"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => setFormSeguimiento('nuevo')}>
                <Icono nombre="mas" />
                Nuevo
              </button>
            }
          >
            <ListaSeguimientos
              seguimientos={seguimientos}
              mostrarCliente={false}
              onEditar={(s) => setFormSeguimiento(s)}
            />
          </Panel>
        )}
      </div>

      {editandoCliente && (
        <FormCliente
          inicial={cliente}
          proyectos={db.proyectos}
          ajustes={db.ajustes}
          onCerrar={() => setEditandoCliente(false)}
          onGuardar={(c) => {
            guardar('clientes', c);
            setEditandoCliente(false);
          }}
        />
      )}

      {formProyecto && (
        <FormProyecto
          inicial={formProyecto === 'nuevo' ? undefined : formProyecto}
          clientes={db.clientes}
          clienteIdPorDefecto={cliente.id}
          onCerrar={() => setFormProyecto(null)}
          onGuardar={(p) => {
            guardar('proyectos', p);
            setFormProyecto(null);
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
          contexto={{ clienteId: cliente.id }}
          onCerrar={() => setFormMovimiento(null)}
          onGuardar={(m) => {
            guardar('movimientos', m);
            setFormMovimiento(null);
          }}
        />
      )}

      {formSeguimiento && (
        <FormSeguimiento
          inicial={formSeguimiento === 'nuevo' ? undefined : formSeguimiento}
          clientes={db.clientes}
          proyectos={db.proyectos}
          contexto={{ clienteId: cliente.id }}
          onCerrar={() => setFormSeguimiento(null)}
          onGuardar={(s) => {
            guardar('seguimientos', s);
            setFormSeguimiento(null);
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
