import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icono } from './Icono';
import { BotonBorrar, Insignia, Vacio } from './ui';
import { hoy } from '../lib/format';
import { textoRecordatorio } from '../lib/facturacion';
import { estadosMovimiento } from '../lib/labels';
import { estadoCalculado, totalConImpuestos } from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Movimiento } from '../lib/types';

export function TablaMovimientos({
  movimientos,
  mostrarCliente = true,
  mostrarProyecto = true,
  onEditar,
}: {
  movimientos: Movimiento[];
  mostrarCliente?: boolean;
  mostrarProyecto?: boolean;
  onEditar: (m: Movimiento) => void;
}) {
  const { db, guardar, eliminar } = useAlmacen();
  const { dinero, fecha: fmtFecha } = useFormato();
  const [copiado, setCopiado] = useState<string | null>(null);
  const fecha = hoy();

  const copiarRecordatorio = async (m: Movimiento) => {
    try {
      await navigator.clipboard.writeText(textoRecordatorio(m, db, fecha));
      setCopiado(m.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sin permiso de portapapeles: se deja el texto a la vista para copiarlo a mano.
      window.prompt('Copia el recordatorio:', textoRecordatorio(m, db, fecha));
    }
  };

  if (movimientos.length === 0) {
    return <Vacio titulo="Sin movimientos" descripcion="Registra cobros y pagos para verlos aquí." icono="cobros" />;
  }

  return (
    <div className="tabla-envoltorio">
      <table className="tabla">
        <thead>
          <tr>
            <th>Estado</th>
            <th>Concepto</th>
            {mostrarCliente && <th>Cliente</th>}
            {mostrarProyecto && <th>Proyecto</th>}
            <th>Emisión</th>
            <th>Vencimiento</th>
            <th className="num">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => {
            const estado = estadoCalculado(m, fecha);
            const etiqueta = estadosMovimiento.de(estado);
            const cliente = db.clientes.find((c) => c.id === m.clienteId);
            const proyecto = db.proyectos.find((p) => p.id === m.proyectoId);
            const corte = db.cortes.find((c) => c.id === m.corteId);
            const tarea = db.tareas.find((t) => t.id === m.tareaId);
            return (
              <tr key={m.id}>
                <td>
                  <Insignia texto={etiqueta.texto} tono={etiqueta.tono} />
                </td>
                <td>
                  <div className="fila" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <span className={m.tipo === 'pago' ? 'texto-2' : undefined}>{m.concepto}</span>
                    {m.tipo === 'pago' && <span className="etiqueta">Gasto</span>}
                    {corte && <span className="etiqueta mono">{corte.codigo}</span>}
                    {tarea && <span className="etiqueta">Tarea</span>}
                  </div>
                  {m.numeroFactura && <div className="pequeno texto-3 mono">{m.numeroFactura}</div>}
                </td>
                {mostrarCliente && (
                  <td className="texto-2">
                    {cliente ? <Link to={`/clientes/${cliente.id}`}>{cliente.nombre}</Link> : '—'}
                  </td>
                )}
                {mostrarProyecto && (
                  <td className="texto-2">
                    {proyecto ? <Link to={`/proyectos/${proyecto.id}`}>{proyecto.nombre}</Link> : '—'}
                  </td>
                )}
                <td className="texto-2">{fmtFecha(m.fechaEmision)}</td>
                <td className={estado === 'vencido' ? '' : 'texto-2'} style={estado === 'vencido' ? { color: 'var(--critico)' } : undefined}>
                  {fmtFecha(m.fechaVencimiento)}
                </td>
                <td className="num" style={{ color: m.tipo === 'pago' ? 'var(--texto-2)' : undefined }}>
                  {m.tipo === 'pago' ? '−' : ''}
                  {dinero(totalConImpuestos(m))}
                </td>
                <td>
                  <div className="fila" style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                    {estado === 'vencido' && (
                      <button
                        type="button"
                        className="btn pequeno"
                        title="Copiar recordatorio de impago"
                        onClick={() => void copiarRecordatorio(m)}
                      >
                        <Icono nombre={copiado === m.id ? 'check' : 'nota'} />
                      </button>
                    )}
                    {m.estado !== 'pagado' && (
                      <button
                        type="button"
                        className="btn pequeno"
                        title="Marcar como pagado"
                        onClick={() => guardar('movimientos', { ...m, estado: 'pagado', fechaPago: fecha })}
                      >
                        <Icono nombre="check" />
                      </button>
                    )}
                    <button type="button" className="btn discreto pequeno" title="Editar" onClick={() => onEditar(m)}>
                      <Icono nombre="editar" />
                    </button>
                    <BotonBorrar etiqueta="" onBorrar={() => eliminar('movimientos', m.id)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
