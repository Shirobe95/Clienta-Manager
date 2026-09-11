import { Link } from 'react-router-dom';
import { Icono } from './Icono';
import { BotonBorrar, Insignia, Vacio } from './ui';
import { diasEntre, hoy, sumarMeses } from '../lib/format';
import { nuevoId } from '../lib/id';
import { MESES_RECURRENCIA, estadosSeguimiento, tiposSeguimiento } from '../lib/labels';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Seguimiento } from '../lib/types';

export function ListaSeguimientos({
  seguimientos,
  mostrarCliente = true,
  onEditar,
}: {
  seguimientos: Seguimiento[];
  mostrarCliente?: boolean;
  onEditar: (s: Seguimiento) => void;
}) {
  const { db, guardar, eliminar } = useAlmacen();
  const { fecha: fmtFecha } = useFormato();
  const fecha = hoy();

  /** Marca hecho y, si es recurrente, deja programada la siguiente vuelta. */
  const marcarHecho = (s: Seguimiento) => {
    guardar('seguimientos', { ...s, estado: 'hecho' });
    const meses = MESES_RECURRENCIA[s.recurrencia];
    if (meses > 0) {
      guardar('seguimientos', {
        ...s,
        id: nuevoId('seg'),
        estado: 'pendiente',
        fechaPrevista: sumarMeses(s.fechaPrevista, meses),
        creadoEn: new Date().toISOString(),
      });
    }
  };

  if (seguimientos.length === 0) {
    return <Vacio titulo="Sin seguimientos" descripcion="Programa mantenimientos, renovaciones o avisos." icono="agenda" />;
  }

  return (
    <div className="lista">
      {seguimientos.map((s) => {
        const cliente = db.clientes.find((c) => c.id === s.clienteId);
        const proyecto = db.proyectos.find((p) => p.id === s.proyectoId);
        const tipo = tiposSeguimiento.de(s.tipo);
        const estado = estadosSeguimiento.de(s.estado);
        const dias = diasEntre(fecha, s.fechaPrevista);
        const atrasado = s.estado === 'pendiente' && dias < 0;

        return (
          <div className="lista-item" key={s.id}>
            <Insignia texto={tipo.texto} tono={tipo.tono} />
            <div className="crecer">
              <div className="titulo recorte">{s.titulo}</div>
              <div className="meta recorte">
                {mostrarCliente && cliente && (
                  <>
                    <Link to={`/clientes/${cliente.id}`}>{cliente.nombre}</Link>
                    {' · '}
                  </>
                )}
                {proyecto && (
                  <>
                    <Link to={`/proyectos/${proyecto.id}`}>{proyecto.nombre}</Link>
                    {' · '}
                  </>
                )}
                {fmtFecha(s.fechaPrevista)}
                {s.estado === 'pendiente' && (
                  <span style={atrasado ? { color: 'var(--critico)' } : undefined}>
                    {atrasado ? ` · ${Math.abs(dias)} días de retraso` : ` · en ${dias} días`}
                  </span>
                )}
                {s.recurrencia !== 'ninguna' && ' · recurrente'}
              </div>
            </div>
            {s.estado !== 'pendiente' && <Insignia texto={estado.texto} tono={estado.tono} />}
            <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
              {s.estado === 'pendiente' && (
                <button type="button" className="btn pequeno" title="Marcar como hecho" onClick={() => marcarHecho(s)}>
                  <Icono nombre="check" />
                </button>
              )}
              <button type="button" className="btn discreto pequeno" title="Editar" onClick={() => onEditar(s)}>
                <Icono nombre="editar" />
              </button>
              <BotonBorrar etiqueta="" onBorrar={() => eliminar('seguimientos', s.id)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
