import { useMemo, useState } from 'react';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { ListaSeguimientos } from '../components/ListaSeguimientos';
import { FormSeguimiento } from '../components/formularios';
import { Kpi, Panel, Selector } from '../components/ui';
import { diasEntre, hoy } from '../lib/format';
import { estadosSeguimiento } from '../lib/labels';
import { useAlmacen } from '../state/store';
import type { EstadoSeguimiento, Seguimiento } from '../lib/types';

type Filtro = EstadoSeguimiento | 'todos';

export function Agenda() {
  const { db, guardar } = useAlmacen();
  const [filtro, setFiltro] = useState<Filtro>('pendiente');
  const [clienteId, setClienteId] = useState('');
  const [formulario, setFormulario] = useState<Seguimiento | 'nuevo' | null>(null);
  const fecha = hoy();

  const lista = useMemo(
    () =>
      db.seguimientos
        .filter((s) => (filtro === 'todos' ? true : s.estado === filtro))
        .filter((s) => (clienteId ? s.clienteId === clienteId : true))
        .sort((a, b) => a.fechaPrevista.localeCompare(b.fechaPrevista)),
    [db.seguimientos, filtro, clienteId],
  );

  const pendientes = db.seguimientos.filter((s) => s.estado === 'pendiente');
  const atrasados = pendientes.filter((s) => diasEntre(fecha, s.fechaPrevista) < 0);
  const estaSemana = pendientes.filter((s) => {
    const d = diasEntre(fecha, s.fechaPrevista);
    return d >= 0 && d <= 7;
  });

  return (
    <>
      <Cabecera
        titulo="Agenda"
        subtitulo="Mantenimientos, renovaciones y próximas actualizaciones"
        acciones={
          <button
            type="button"
            className="btn primario"
            onClick={() => setFormulario('nuevo')}
            disabled={db.clientes.length === 0}
            title={db.clientes.length === 0 ? 'Crea antes un cliente' : undefined}
          >
            <Icono nombre="mas" />
            Nuevo seguimiento
          </button>
        }
      />

      <div className="pagina">
        <div className="grid grid-3">
          <Kpi etiqueta="Pendientes" valor={String(pendientes.length)} tono="acento" />
          <Kpi etiqueta="Esta semana" valor={String(estaSemana.length)} tono={estaSemana.length ? 'aviso' : 'neutro'} />
          <Kpi etiqueta="Atrasados" valor={String(atrasados.length)} tono={atrasados.length ? 'critico' : 'ok'} />
        </div>

        <div className="fila">
          <div style={{ width: 200 }}>
            <Selector<Filtro>
              valor={filtro}
              opciones={[
                { valor: 'todos', texto: 'Todos los estados' },
                ...estadosSeguimiento.lista.map((e) => ({ valor: e.valor as Filtro, texto: e.texto })),
              ]}
              onChange={setFiltro}
            />
          </div>
          <div style={{ width: 220 }}>
            <Selector
              valor={clienteId}
              opciones={[
                { valor: '', texto: 'Todos los clientes' },
                ...db.clientes.map((c) => ({ valor: c.id, texto: c.nombre })),
              ]}
              onChange={setClienteId}
            />
          </div>
        </div>

        <Panel sinRelleno>
          <ListaSeguimientos seguimientos={lista} onEditar={(s) => setFormulario(s)} />
        </Panel>
      </div>

      {formulario && (
        <FormSeguimiento
          inicial={formulario === 'nuevo' ? undefined : formulario}
          clientes={db.clientes}
          proyectos={db.proyectos}
          contexto={clienteId ? { clienteId } : undefined}
          onCerrar={() => setFormulario(null)}
          onGuardar={(s) => {
            guardar('seguimientos', s);
            setFormulario(null);
          }}
        />
      )}
    </>
  );
}
