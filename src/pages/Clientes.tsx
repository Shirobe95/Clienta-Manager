import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { FormCliente } from '../components/formularios';
import { Buscador, Insignia, Panel, Selector, Vacio } from '../components/ui';
import { hoy, iniciales } from '../lib/format';
import { estadosCliente } from '../lib/labels';
import { resumenCliente } from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Cliente, EstadoCliente } from '../lib/types';

type Filtro = EstadoCliente | 'todos';

export function Clientes() {
  const { db, guardar } = useAlmacen();
  const { dinero } = useFormato();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [creando, setCreando] = useState(false);
  const fecha = hoy();

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return db.clientes
      .filter((c) => (filtro === 'todos' ? true : c.estado === filtro))
      .filter((c) =>
        texto
          ? [c.nombre, c.empresa, c.email, c.etiquetas.join(' ')]
              .filter(Boolean)
              .some((campo) => campo!.toLowerCase().includes(texto))
          : true,
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.clientes, busqueda, filtro]);

  return (
    <>
      <Cabecera
        titulo="Clientes"
        subtitulo={`${db.clientes.length} fichas · ${db.clientes.filter((c) => c.estado === 'activo').length} activos`}
        acciones={
          <button type="button" className="btn primario" onClick={() => setCreando(true)}>
            <Icono nombre="mas" />
            Nuevo cliente
          </button>
        }
      />

      <div className="pagina">
        <div className="fila">
          <Buscador valor={busqueda} onChange={setBusqueda} marcador="Buscar por nombre, empresa o etiqueta" />
          <div style={{ width: 180 }}>
            <Selector<Filtro>
              valor={filtro}
              opciones={[{ valor: 'todos', texto: 'Todos los estados' }, ...estadosCliente.lista.map((e) => ({ valor: e.valor as Filtro, texto: e.texto }))]}
              onChange={setFiltro}
            />
          </div>
        </div>

        {lista.length === 0 ? (
          <Panel>
            <Vacio
              icono="clientes"
              titulo="Sin clientes que mostrar"
              descripcion={db.clientes.length ? 'Prueba con otro filtro o búsqueda.' : 'Crea el primero para empezar.'}
              accion={
                db.clientes.length === 0 ? (
                  <button type="button" className="btn primario" onClick={() => setCreando(true)}>
                    <Icono nombre="mas" />
                    Nuevo cliente
                  </button>
                ) : undefined
              }
            />
          </Panel>
        ) : (
          <div className="grid grid-tarjetas">
            {lista.map((c) => {
              const r = resumenCliente(db, c.id, fecha);
              const estado = estadosCliente.de(c.estado);
              return (
                <article className="panel" key={c.id}>
                  <div className="panel-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="fila" style={{ flexWrap: 'nowrap' }}>
                      <span className="avatar">{iniciales(c.nombre)}</span>
                      <div className="crecer">
                        <Link to={`/clientes/${c.id}`} style={{ fontWeight: 600 }} className="recorte">
                          {c.nombre}
                        </Link>
                        <div className="pequeno texto-3 recorte">{c.empresa || c.email || 'Sin empresa'}</div>
                      </div>
                      <Insignia texto={estado.texto} tono={estado.tono} />
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div className="kpi-etiqueta">Cobrado</div>
                        <div className="num">{dinero(r.cobrado)}</div>
                      </div>
                      <div>
                        <div className="kpi-etiqueta">Pendiente</div>
                        <div className="num" style={{ color: r.vencido > 0 ? 'var(--critico)' : undefined }}>
                          {dinero(r.pendiente)}
                        </div>
                      </div>
                    </div>

                    <div className="fila fila-sep">
                      <span className="pequeno texto-3">
                        {r.proyectosActivos} proyecto{r.proyectosActivos === 1 ? '' : 's'} activo
                        {r.proyectosActivos === 1 ? '' : 's'}
                      </span>
                      <div className="fila" style={{ gap: 6 }}>
                        <button type="button" className="btn discreto pequeno" onClick={() => setEditando(c)}>
                          <Icono nombre="editar" />
                        </button>
                        <Link className="btn pequeno" to={`/clientes/${c.id}`}>
                          Abrir
                        </Link>
                      </div>
                    </div>

                    {c.etiquetas.length > 0 && (
                      <div className="fila" style={{ gap: 6 }}>
                        {c.etiquetas.map((e) => (
                          <span className="etiqueta" key={e}>
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {(creando || editando) && (
        <FormCliente
          inicial={editando ?? undefined}
          proyectos={db.proyectos}
          ajustes={db.ajustes}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardar={(c) => {
            guardar('clientes', c);
            setCreando(false);
            setEditando(null);
          }}
        />
      )}
    </>
  );
}
