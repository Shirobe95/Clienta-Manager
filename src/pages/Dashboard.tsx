import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cabecera } from '../components/Cabecera';
import { GraficoBarras } from '../components/GraficoBarras';
import type { SerieGrafico } from '../components/GraficoBarras';
import { Icono } from '../components/Icono';
import { Insignia, Kpi, Panel, Vacio } from '../components/ui';
import { diasEntre, hoy } from '../lib/format';
import { estadosCorte, estadosMovimiento, tiposSeguimiento } from '../lib/labels';
import {
  calcularKpis,
  cobrosPorVencer,
  estadoCalculado,
  rankingClientes,
  seguimientosProximos,
  serieMensual,
  totalConImpuestos,
} from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import { FormMovimiento } from '../components/formularios';
import { conceptoDeCorte, cortesSinFacturar } from '../lib/facturacion';
import { conceptoDeTarea, tareasEnCurso, tareasSinFacturar } from '../lib/tareas';
import type { TareaSinFacturar } from '../lib/tareas';
import { resumenEntregas } from '../lib/entregas';
import { estadoCopia } from '../lib/copias';
import { mensualidadesPendientes, movimientoDeMensualidad, recurrenteMensual } from '../lib/suscripciones';
import type { MensualidadPendiente } from '../lib/suscripciones';
import type { CorteSinFacturar } from '../lib/facturacion';
import { estadosTarea } from '../lib/labels';

const SERIES: SerieGrafico[] = [
  { clave: 'cobrado', texto: 'Cobrado', color: 'var(--serie-cobrado)' },
  { clave: 'pendiente', texto: 'Pendiente', color: 'var(--serie-pendiente)' },
  { clave: 'gastos', texto: 'Gastos', color: 'var(--serie-gastos)' },
];

export function Dashboard() {
  const { db, guardar } = useAlmacen();
  const [facturando, setFacturando] = useState<CorteSinFacturar | null>(null);
  const [facturandoTarea, setFacturandoTarea] = useState<TareaSinFacturar | null>(null);
  const { dinero, fecha: fmtFecha, moneda, locale } = useFormato();
  const fecha = hoy();

  const kpis = calcularKpis(db, fecha);
  const serie = serieMensual(db, fecha, 12, locale);
  const vencimientos = cobrosPorVencer(db, fecha, 30).slice(0, 6);
  const agenda = seguimientosProximos(db, fecha, 45).slice(0, 6);
  const ranking = rankingClientes(db, fecha, 5);
  const sinFacturar = cortesSinFacturar(db);
  const enCurso = tareasEnCurso(db);
  const tareasPorFacturar = tareasSinFacturar(db);
  const entregas = resumenEntregas(db, fecha);
  const mensualidades = mensualidadesPendientes(db, fecha);
  const recurrente = recurrenteMensual(db, fecha);
  const copia = estadoCopia(db);

  /**
   * Emite las cuotas en cadena: cada movimiento se numera contando el anterior,
   * para que una tanda salga correlativa y no repita numero.
   */
  const emitirMensualidades = (lista: MensualidadPendiente[]) => {
    let acumulados = db.movimientos;
    for (const pendiente of lista) {
      const movimiento = movimientoDeMensualidad(pendiente.cliente, pendiente.periodo, acumulados, db.ajustes);
      acumulados = [...acumulados, movimiento];
      guardar('movimientos', movimiento);
    }
  };
  const cortesVivos = db.cortes
    .filter((c) => c.estado === 'en_curso' || c.estado === 'en_revision')
    .sort((a, b) => (a.fechaObjetivo ?? '9999').localeCompare(b.fechaObjetivo ?? '9999'))
    .slice(0, 6);

  const vacio = db.clientes.length === 0 && db.movimientos.length === 0;
  const anio = fecha.slice(0, 4);

  return (
    <>
      <Cabecera
        titulo="Panel"
        subtitulo={`Vista general · ${new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date())}`}
        acciones={
          <Link to="/cobros" className="btn primario">
            <Icono nombre="cobros" />
            Ir a cobros
          </Link>
        }
      />

      <div className="pagina">
        {vacio ? (
          <Panel>
            <Vacio
              icono="rayo"
              titulo="Todavía no hay datos"
              descripcion="Crea tu primer cliente o carga el juego de datos de ejemplo desde Ajustes para ver cómo queda el panel."
              accion={
                <div className="fila">
                  <Link to="/clientes" className="btn primario">
                    <Icono nombre="mas" />
                    Nuevo cliente
                  </Link>
                  <Link to="/ajustes" className="btn">
                    Cargar ejemplo
                  </Link>
                </div>
              }
            />
          </Panel>
        ) : null}

        {copia.avisar && (
          <div className="panel panel-cuerpo pequeno fila" style={{ borderColor: 'var(--aviso)', gap: 10 }}>
            <span style={{ color: 'var(--aviso)', display: 'flex' }}>
              <Icono nombre="aviso" />
            </span>
            <span className="texto-2 crecer">
              {copia.dias === null
                ? 'Todavía no has exportado ninguna copia de tus datos.'
                : `Hace ${copia.dias} días de la última copia y hay cambios sin guardar en un archivo.`}
            </span>
            <Link to="/ajustes" className="btn pequeno">
              <Icono nombre="descargar" />
              Hacer copia
            </Link>
          </div>
        )}

        <div className="grid grid-kpi">
          <Kpi
            etiqueta="Cobrado este mes"
            valor={dinero(kpis.cobradoMes)}
            tono="acento"
            pie={`${kpis.clientesActivos} clientes activos`}
          />
          <Kpi
            etiqueta={`Cobrado ${anio}`}
            valor={dinero(kpis.cobradoAnio)}
            tono="ok"
            progreso={kpis.progresoObjetivo ?? undefined}
            pie={
              kpis.progresoObjetivo !== null
                ? `${Math.round(kpis.progresoObjetivo)}% del objetivo anual`
                : `Neto ${dinero(kpis.netoAnio)} tras gastos`
            }
          />
          <Kpi
            etiqueta="Pendiente de cobro"
            valor={dinero(kpis.pendiente)}
            tono={kpis.pendiente > 0 ? 'aviso' : 'neutro'}
            pie={`${kpis.proyectosActivos} proyectos en marcha`}
          />
          {recurrente.clientes > 0 && (
            <Kpi
              etiqueta="Recurrente mensual"
              valor={dinero(recurrente.totalMensual)}
              tono="acento"
              pie={`${recurrente.clientes} cliente${recurrente.clientes === 1 ? '' : 's'} con mensualidad`}
            />
          )}
          <Kpi
            etiqueta="Vencido"
            valor={dinero(kpis.vencido)}
            tono={kpis.vencido > 0 ? 'critico' : 'neutro'}
            pie={
              kpis.numVencidos > 0
                ? `${kpis.numVencidos} factura${kpis.numVencidos === 1 ? '' : 's'} fuera de plazo`
                : 'Todo al día'
            }
          />
        </div>

        {enCurso.length > 0 && (
          <Panel
            titulo="En qué estoy trabajando"
            icono="rayo"
            sinRelleno
            pie={
              <div className="panel-cuerpo pequeno texto-3" style={{ borderTop: '1px solid var(--borde)' }}>
                {db.tareas.filter((t) => t.estado === 'pendiente').length} tareas más esperando turno.
              </div>
            }
          >
            <div className="lista">
              {enCurso.map(({ tarea, proyecto, cliente }) => (
                <div className="lista-item" key={tarea.id}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      flex: 'none',
                      background: tarea.prioridad === 'alta' ? 'var(--critico)' : 'var(--acento)',
                    }}
                  />
                  <div className="crecer">
                    <div className="titulo recorte">{tarea.titulo}</div>
                    <div className="meta recorte">
                      <Link to={`/proyectos/${proyecto.id}`}>{proyecto.nombre}</Link>
                      {cliente ? ` · ${cliente.nombre}` : ''}
                      {tarea.fechaObjetivo ? ` · objetivo ${fmtFecha(tarea.fechaObjetivo)}` : ''}
                    </div>
                  </div>
                  {tarea.importe ? <span className="num">{dinero(tarea.importe)}</span> : null}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tareasPorFacturar.length > 0 && (
          <Panel
            titulo="Tareas subidas pendientes de facturar"
            icono="aviso"
            sinRelleno
            pie={
              <div className="panel-cuerpo pequeno texto-3" style={{ borderTop: '1px solid var(--borde)' }}>
                Total sin facturar:{' '}
                <strong className="num texto-2">
                  {dinero(tareasPorFacturar.reduce((suma, x) => suma + (x.tarea.importe ?? 0), 0))}
                </strong>
              </div>
            }
          >
            <div className="lista">
              {tareasPorFacturar.map((x) => (
                <div className="lista-item" key={x.tarea.id}>
                  <Insignia texto={estadosTarea.de('subida').texto} tono="ok" />
                  <div className="crecer">
                    <div className="titulo recorte">{x.tarea.titulo}</div>
                    <div className="meta recorte">
                      <Link to={`/proyectos/${x.proyecto.id}`}>{x.proyecto.nombre}</Link>
                      {x.cliente ? ` · ${x.cliente.nombre}` : ''}
                      {x.tarea.fechaSubida ? ` · subida ${fmtFecha(x.tarea.fechaSubida)}` : ''}
                    </div>
                  </div>
                  <span className="num">{dinero(x.tarea.importe ?? 0)}</span>
                  <button type="button" className="btn pequeno" onClick={() => setFacturandoTarea(x)}>
                    <Icono nombre="cobros" />
                    Facturar
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {mensualidades.length > 0 && (
          <Panel
            titulo="Mensualidades por emitir"
            icono="reloj"
            sinRelleno
            acciones={
              <button type="button" className="btn pequeno" onClick={() => emitirMensualidades(mensualidades)}>
                <Icono nombre="check" />
                Emitir todas ({mensualidades.length})
              </button>
            }
          >
            <div className="lista">
              {mensualidades.map((m) => (
                <div className="lista-item" key={`${m.cliente.id}-${m.periodo}`}>
                  <span className="etiqueta mono">{m.periodo}</span>
                  <div className="crecer">
                    <div className="titulo recorte">
                      <Link to={`/clientes/${m.cliente.id}`}>{m.cliente.nombre}</Link>
                    </div>
                    <div className="meta recorte">
                      {m.cliente.suscripcion?.concepto} · emisión {fmtFecha(m.emision)}
                    </div>
                  </div>
                  <span className="num">{dinero(m.total)}</span>
                  <button type="button" className="btn pequeno" onClick={() => emitirMensualidades([m])}>
                    Emitir
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {sinFacturar.length > 0 && (
          <Panel
            titulo="Cortes aceptados pendientes de facturar"
            icono="aviso"
            sinRelleno
            pie={
              <div className="panel-cuerpo pequeno texto-3" style={{ borderTop: '1px solid var(--borde)' }}>
                Total sin facturar:{' '}
                <strong className="num texto-2">
                  {dinero(sinFacturar.reduce((suma, x) => suma + (x.corte.importe ?? 0), 0))}
                </strong>
              </div>
            }
          >
            <div className="lista">
              {sinFacturar.map((x) => (
                <div className="lista-item" key={x.corte.id}>
                  <span className="etiqueta mono">{x.corte.codigo}</span>
                  <div className="crecer">
                    <div className="titulo recorte">{x.corte.titulo}</div>
                    <div className="meta recorte">
                      <Link to={`/proyectos/${x.proyecto.id}`}>{x.proyecto.nombre}</Link>
                      {x.cliente ? ` · ${x.cliente.nombre}` : ''}
                    </div>
                  </div>
                  <span className="num">{dinero(x.corte.importe ?? 0)}</span>
                  <button type="button" className="btn pequeno" onClick={() => setFacturando(x)}>
                    <Icono nombre="cobros" />
                    Facturar
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel titulo="Evolución de los últimos 12 meses" icono="metricas">
          {db.movimientos.length === 0 ? (
            <Vacio
              icono="metricas"
              titulo="Sin movimientos que representar"
              descripcion="En cuanto registres cobros y pagos verás aquí la evolución mes a mes."
            />
          ) : (
            <GraficoBarras datos={serie} series={SERIES} moneda={moneda} locale={locale} />
          )}
        </Panel>

        <Panel titulo={`Entregas ${anio}`} icono="brujula">
          <div className="grid grid-3">
            <div>
              <div className="kpi-etiqueta">Módulos aceptados</div>
              <div className="kpi-valor">{entregas.aceptadosAnio}</div>
              <div className="kpi-pie">
                {entregas.entregadosAnio} entregados, revisión incluida
              </div>
            </div>
            <div>
              <div className="kpi-etiqueta">Importe medio por módulo</div>
              <div className="kpi-valor">{dinero(entregas.importeMedio)}</div>
              <div className="kpi-pie">Sobre los módulos aceptados con precio</div>
            </div>
            <div>
              <div className="kpi-etiqueta">Entregas a tiempo</div>
              <div className="kpi-valor" style={puntualidadColor(entregas.puntualidad)}>
                {entregas.puntualidad === null ? '—' : `${entregas.puntualidad}%`}
              </div>
              <div className="kpi-pie">
                {entregas.conFechas === 0
                  ? 'Hace falta fecha objetivo y de entrega'
                  : `${entregas.fueraDePlazo} de ${entregas.conFechas} fuera de plazo`}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid grid-2">
          <Panel
            titulo="Próximos vencimientos"
            icono="reloj"
            sinRelleno
            acciones={
              <Link to="/cobros" className="btn discreto pequeno">
                Ver todo
              </Link>
            }
          >
            {vencimientos.length === 0 ? (
              <Vacio titulo="Sin vencimientos en 30 días" icono="check" />
            ) : (
              <div className="lista">
                {vencimientos.map((m) => {
                  const estado = estadoCalculado(m, fecha);
                  const dias = m.fechaVencimiento ? diasEntre(fecha, m.fechaVencimiento) : 0;
                  const cliente = db.clientes.find((c) => c.id === m.clienteId);
                  return (
                    <div className="lista-item" key={m.id}>
                      <div className="crecer">
                        <div className="titulo recorte">{m.concepto}</div>
                        <div className="meta recorte">
                          {cliente?.nombre ?? 'Sin cliente'} · vence {fmtFecha(m.fechaVencimiento)}
                          {estado === 'vencido' ? ` · ${Math.abs(dias)} días de retraso` : ` · en ${dias} días`}
                        </div>
                      </div>
                      <span className="num">{dinero(totalConImpuestos(m))}</span>
                      <Insignia {...insignia(estado)} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            titulo="Agenda de los próximos 45 días"
            icono="agenda"
            sinRelleno
            acciones={
              <Link to="/agenda" className="btn discreto pequeno">
                Ver todo
              </Link>
            }
          >
            {agenda.length === 0 ? (
              <Vacio titulo="Nada previsto" icono="agenda" />
            ) : (
              <div className="lista">
                {agenda.map((s) => {
                  const cliente = db.clientes.find((c) => c.id === s.clienteId);
                  const tipo = tiposSeguimiento.de(s.tipo);
                  return (
                    <div className="lista-item" key={s.id}>
                      <div className="crecer">
                        <div className="titulo recorte">{s.titulo}</div>
                        <div className="meta recorte">
                          {cliente?.nombre ?? '—'} · {fmtFecha(s.fechaPrevista)}
                        </div>
                      </div>
                      <Insignia texto={tipo.texto} tono={tipo.tono} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid grid-2">
          <Panel titulo={`Clientes por facturación (${anio})`} icono="clientes" sinRelleno>
            {ranking.length === 0 ? (
              <Vacio titulo="Sin movimientos registrados" icono="cobros" />
            ) : (
              <div className="tabla-envoltorio">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th className="num">Cobrado</th>
                      <th className="num">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((f) => (
                      <tr key={f.clienteId}>
                        <td>
                          <Link to={`/clientes/${f.clienteId}`}>{f.nombre}</Link>
                        </td>
                        <td className="num">{dinero(f.cobrado)}</td>
                        <td className="num texto-2">{dinero(f.pendiente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel titulo="Cortes en curso" icono="brujula" sinRelleno>
            {cortesVivos.length === 0 ? (
              <Vacio titulo="Ningún corte abierto" icono="brujula" />
            ) : (
              <div className="lista">
                {cortesVivos.map((c) => {
                  const proyecto = db.proyectos.find((p) => p.id === c.proyectoId);
                  const etiqueta = estadosCorte.de(c.estado);
                  return (
                    <Link className="lista-item" key={c.id} to={`/proyectos/${c.proyectoId}`}>
                      <span className="etiqueta mono">{c.codigo}</span>
                      <div className="crecer">
                        <div className="titulo recorte">{c.titulo}</div>
                        <div className="meta recorte">
                          {proyecto?.nombre ?? '—'}
                          {c.fechaObjetivo ? ` · objetivo ${fmtFecha(c.fechaObjetivo)}` : ''}
                        </div>
                      </div>
                      <Insignia texto={etiqueta.texto} tono={etiqueta.tono} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {facturandoTarea && (
        <FormMovimiento
          clientes={db.clientes}
          proyectos={db.proyectos}
          cortes={db.cortes}
          movimientos={db.movimientos}
          ajustes={db.ajustes}
          contexto={{
            clienteId: facturandoTarea.cliente?.id,
            proyectoId: facturandoTarea.proyecto.id,
            corteId: facturandoTarea.tarea.corteId,
            tareaId: facturandoTarea.tarea.id,
            concepto: conceptoDeTarea(
              facturandoTarea.proyecto,
              facturandoTarea.tarea,
              db.cortes.find((c) => c.id === facturandoTarea.tarea.corteId),
            ),
            importe: facturandoTarea.tarea.importe,
          }}
          onCerrar={() => setFacturandoTarea(null)}
          onGuardar={(m) => {
            guardar('movimientos', m);
            setFacturandoTarea(null);
          }}
        />
      )}

      {facturando && (
        <FormMovimiento
          clientes={db.clientes}
          proyectos={db.proyectos}
          cortes={db.cortes}
          movimientos={db.movimientos}
          ajustes={db.ajustes}
          contexto={{
            clienteId: facturando.cliente?.id,
            proyectoId: facturando.proyecto.id,
            corteId: facturando.corte.id,
            concepto: conceptoDeCorte(facturando.proyecto, facturando.corte),
            importe: facturando.corte.importe,
          }}
          onCerrar={() => setFacturando(null)}
          onGuardar={(m) => {
            guardar('movimientos', m);
            setFacturando(null);
          }}
        />
      )}
    </>
  );
}

/** Verde a partir del 80%, ámbar por debajo: un plazo incumplido de cada cinco ya escuece. */
function puntualidadColor(valor: number | null) {
  if (valor === null) return undefined;
  return { color: valor >= 80 ? 'var(--ok)' : 'var(--aviso)' };
}

function insignia(estado: ReturnType<typeof estadoCalculado>) {
  const e = estadosMovimiento.de(estado);
  return { texto: e.texto, tono: e.tono };
}
