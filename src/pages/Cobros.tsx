import { useMemo, useState } from 'react';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { TablaMovimientos } from '../components/TablaMovimientos';
import { FormMovimiento } from '../components/formularios';
import { Buscador, Insignia, Kpi, Panel, Selector } from '../components/ui';
import { movimientosACSV, revisarNumeracion } from '../lib/facturacion';
import { hoy } from '../lib/format';
import { estadosMovimiento } from '../lib/labels';
import { estadoCalculado, totalConImpuestos } from '../lib/metrics';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { EstadoMovimientoCalculado, Movimiento } from '../lib/types';

type FiltroEstado = EstadoMovimientoCalculado | 'todos';
type FiltroTipo = 'todos' | 'cobro' | 'pago';

export function Cobros() {
  const { db, guardar } = useAlmacen();
  const { dinero } = useFormato();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [clienteId, setClienteId] = useState('');
  const [formulario, setFormulario] = useState<Movimiento | 'nuevo' | null>(null);
  const fecha = hoy();

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return db.movimientos
      .filter((m) => (tipo === 'todos' ? true : m.tipo === tipo))
      .filter((m) => (estado === 'todos' ? true : estadoCalculado(m, fecha) === estado))
      .filter((m) => (clienteId ? m.clienteId === clienteId : true))
      .filter((m) =>
        texto
          ? [m.concepto, m.numeroFactura, m.notas].filter(Boolean).some((c) => c!.toLowerCase().includes(texto))
          : true,
      )
      .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
  }, [db.movimientos, busqueda, estado, tipo, clienteId, fecha]);

  const avisos = useMemo(() => revisarNumeracion(db.movimientos, db.ajustes), [db.movimientos, db.ajustes]);
  const huecos = avisos.filter((a) => a.tipo === 'hueco');

  /** Descarga la vista actual, no todo el histórico: lo que ves es lo que exportas. */
  const exportarCSV = () => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + movimientosACSV(lista, db)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `gremio-movimientos-${fecha}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const totales = useMemo(() => {
    let cobrado = 0;
    let pendiente = 0;
    let gastos = 0;
    for (const m of lista) {
      const total = totalConImpuestos(m);
      if (m.tipo === 'pago') {
        if (m.estado === 'pagado') gastos += total;
      } else if (m.estado === 'pagado') cobrado += total;
      else if (m.estado === 'pendiente') pendiente += total;
    }
    return { cobrado, pendiente, gastos };
  }, [lista]);

  return (
    <>
      <Cabecera
        titulo="Cobros y pagos"
        subtitulo={`${lista.length} movimientos en la vista actual`}
        acciones={
          <>
            <button type="button" className="btn" onClick={exportarCSV} disabled={lista.length === 0}>
              <Icono nombre="descargar" />
              Exportar CSV
            </button>
            <button type="button" className="btn primario" onClick={() => setFormulario('nuevo')}>
              <Icono nombre="mas" />
              Nuevo movimiento
            </button>
          </>
        }
      />

      <div className="pagina">
        <div className="grid grid-3">
          <Kpi etiqueta="Cobrado (filtro)" valor={dinero(totales.cobrado)} tono="ok" />
          <Kpi etiqueta="Pendiente (filtro)" valor={dinero(totales.pendiente)} tono="aviso" />
          <Kpi
            etiqueta="Gastos (filtro)"
            valor={dinero(totales.gastos)}
            pie={`Neto ${dinero(totales.cobrado - totales.gastos)}`}
          />
        </div>

        <div className="fila">
          <Buscador valor={busqueda} onChange={setBusqueda} marcador="Buscar concepto o nº de factura" />
          <div style={{ width: 160 }}>
            <Selector<FiltroTipo>
              valor={tipo}
              opciones={[
                { valor: 'todos', texto: 'Cobros y pagos' },
                { valor: 'cobro', texto: 'Solo cobros' },
                { valor: 'pago', texto: 'Solo pagos' },
              ]}
              onChange={setTipo}
            />
          </div>
          <div style={{ width: 160 }}>
            <Selector<FiltroEstado>
              valor={estado}
              opciones={[
                { valor: 'todos', texto: 'Todos los estados' },
                ...estadosMovimiento.lista.map((e) => ({ valor: e.valor as FiltroEstado, texto: e.texto })),
              ]}
              onChange={setEstado}
            />
          </div>
          <div style={{ width: 200 }}>
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

        {avisos.length > 0 && (
          <Panel titulo="Revisión de la numeración" icono="aviso" sinRelleno>
            <div className="lista">
              {avisos
                .filter((a) => a.tipo === 'duplicado')
                .map((aviso) => (
                  <div className="lista-item" key={`dup-${aviso.numero}`}>
                    <Insignia texto="Duplicado" tono="critico" />
                    <span className="mono">{aviso.numero}</span>
                    <span className="meta crecer">{aviso.detalle}</span>
                  </div>
                ))}
              {huecos.length > 0 && (
                <div className="lista-item">
                  <Insignia texto="Huecos" tono="aviso" />
                  <div className="crecer">
                    <div className="mono">{huecos.map((a) => a.numero).join(', ')}</div>
                    <div className="meta">
                      {huecos.length === 1
                        ? 'Este número no está asignado a ningún movimiento.'
                        : `${huecos.length} números de la serie sin asignar.`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        <Panel sinRelleno>
          <TablaMovimientos movimientos={lista} onEditar={(m) => setFormulario(m)} />
        </Panel>
      </div>

      {formulario && (
        <FormMovimiento
          inicial={formulario === 'nuevo' ? undefined : formulario}
          clientes={db.clientes}
          proyectos={db.proyectos}
          cortes={db.cortes}
          movimientos={db.movimientos}
          ajustes={db.ajustes}
          contexto={clienteId ? { clienteId } : undefined}
          onCerrar={() => setFormulario(null)}
          onGuardar={(m) => {
            guardar('movimientos', m);
            setFormulario(null);
          }}
        />
      )}
    </>
  );
}
