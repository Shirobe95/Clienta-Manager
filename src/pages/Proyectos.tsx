import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { FormProyecto, FormProyectoDesdePlantilla } from '../components/formularios';
import { Buscador, Insignia, Panel, Selector, Vacio } from '../components/ui';
import { estadosProyecto, modelosFacturacion } from '../lib/labels';
import { cortesDesdePlantilla } from '../lib/entregas';
import { progresoProyecto } from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { EstadoProyecto, Proyecto } from '../lib/types';

type Filtro = EstadoProyecto | 'todos' | 'vivos';

export function Proyectos() {
  const { db, guardar } = useAlmacen();
  const { dinero, fecha: fmtFecha } = useFormato();
  const navegar = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('vivos');
  const [formulario, setFormulario] = useState<Proyecto | 'nuevo' | null>(null);
  const [desdePlantilla, setDesdePlantilla] = useState(false);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return db.proyectos
      .filter((p) => {
        if (filtro === 'todos') return true;
        if (filtro === 'vivos') return p.estado === 'activo' || p.estado === 'mantenimiento' || p.estado === 'propuesta';
        return p.estado === filtro;
      })
      .filter((p) =>
        texto
          ? [p.nombre, p.descripcion, p.etiquetas.join(' ')]
              .filter(Boolean)
              .some((campo) => campo!.toLowerCase().includes(texto))
          : true,
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.proyectos, busqueda, filtro]);

  return (
    <>
      <Cabecera
        titulo="Proyectos"
        subtitulo={`${db.proyectos.length} proyectos · ${db.cortes.length} cortes registrados`}
        acciones={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setDesdePlantilla(true)}
              disabled={db.clientes.length === 0 || db.plantillas.length === 0}
              title={
                db.plantillas.length === 0 ? 'Crea antes una plantilla' : 'Montar el proyecto desde una plantilla'
              }
            >
              <Icono nombre="nota" />
              Desde plantilla
            </button>
            <button
              type="button"
              className="btn primario"
              onClick={() => setFormulario('nuevo')}
              disabled={db.clientes.length === 0}
              title={db.clientes.length === 0 ? 'Crea antes un cliente' : undefined}
            >
              <Icono nombre="mas" />
              Nuevo proyecto
            </button>
          </>
        }
      />

      <div className="pagina">
        <div className="fila">
          <Buscador valor={busqueda} onChange={setBusqueda} marcador="Buscar proyecto" />
          <div style={{ width: 200 }}>
            <Selector<Filtro>
              valor={filtro}
              opciones={[
                { valor: 'vivos', texto: 'En marcha' },
                { valor: 'todos', texto: 'Todos los estados' },
                ...estadosProyecto.lista.map((e) => ({ valor: e.valor as Filtro, texto: e.texto })),
              ]}
              onChange={setFiltro}
            />
          </div>
        </div>

        {lista.length === 0 ? (
          <Panel>
            <Vacio
              icono="proyectos"
              titulo="Sin proyectos que mostrar"
              descripcion={
                db.clientes.length === 0
                  ? 'Primero necesitas al menos un cliente.'
                  : 'Cambia el filtro o crea un proyecto nuevo.'
              }
              accion={
                db.clientes.length === 0 ? (
                  <Link className="btn primario" to="/clientes">
                    Ir a clientes
                  </Link>
                ) : undefined
              }
            />
          </Panel>
        ) : (
          <div className="grid grid-tarjetas">
            {lista.map((p) => {
              const cliente = db.clientes.find((c) => c.id === p.clienteId);
              const cortes = db.cortes.filter((c) => c.proyectoId === p.id);
              const progreso = progresoProyecto(cortes);
              const ep = estadosProyecto.de(p.estado);
              return (
                <article className="panel" key={p.id}>
                  <div className="panel-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="fila" style={{ flexWrap: 'nowrap' }}>
                      <div className="crecer">
                        <Link to={`/proyectos/${p.id}`} style={{ fontWeight: 600 }} className="recorte">
                          {p.nombre}
                        </Link>
                        <div className="pequeno texto-3 recorte">
                          {cliente ? cliente.nombre : 'Sin cliente'} · {modelosFacturacion.de(p.modelo).texto}
                        </div>
                      </div>
                      <Insignia texto={ep.texto} tono={ep.tono} />
                    </div>

                    {p.descripcion && <p className="pequeno texto-2 recorte">{p.descripcion}</p>}

                    <div>
                      <div className="fila fila-sep pequeno texto-3" style={{ marginBottom: 5 }}>
                        <span>
                          {cortes.filter((c) => c.estado === 'aceptado').length}/{cortes.length} cortes aceptados
                        </span>
                        <span>{progreso}%</span>
                      </div>
                      <div className="barra-progreso">
                        <span style={{ width: `${progreso}%` }} />
                      </div>
                    </div>

                    <div className="fila fila-sep pequeno texto-3">
                      <span>{p.presupuesto ? dinero(p.presupuesto) : 'Sin presupuesto'}</span>
                      <span>{p.fechaEntrega ? `Entrega ${fmtFecha(p.fechaEntrega)}` : 'Sin fecha de entrega'}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {desdePlantilla && (
        <FormProyectoDesdePlantilla
          plantillas={db.plantillas}
          clientes={db.clientes}
          onCerrar={() => setDesdePlantilla(false)}
          onGuardar={({ plantilla, proyecto }) => {
            guardar('proyectos', proyecto);
            for (const corte of cortesDesdePlantilla(plantilla, proyecto.id)) guardar('cortes', corte);
            setDesdePlantilla(false);
            navegar(`/proyectos/${proyecto.id}`);
          }}
        />
      )}

      {formulario && (
        <FormProyecto
          inicial={formulario === 'nuevo' ? undefined : formulario}
          clientes={db.clientes}
          onCerrar={() => setFormulario(null)}
          onGuardar={(p) => {
            guardar('proyectos', p);
            setFormulario(null);
          }}
        />
      )}
    </>
  );
}
