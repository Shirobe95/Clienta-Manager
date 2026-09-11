import { useMemo, useState } from 'react';
import { Campo, Modal, Selector } from './ui';
import { Icono } from './Icono';
import { importeDePlantilla } from '../lib/entregas';
import { siguienteNumeroFactura } from '../lib/facturacion';
import { hoy, sumarDias } from '../lib/format';
import { nuevoId } from '../lib/id';
import {
  estadosCliente,
  estadosCorte,
  estadosDecision,
  estadosMovimiento,
  estadosProyecto,
  estadosSeguimiento,
  modelosFacturacion,
  recurrencias,
  tiposSeguimiento,
} from '../lib/labels';
import type {
  Ajustes,
  Cliente,
  Corte,
  CriterioAceptacion,
  Decision,
  EstadoMovimiento,
  ID,
  ModuloPlantilla,
  Movimiento,
  Plantilla,
  Proyecto,
  Seguimiento,
} from '../lib/types';

function opciones<T extends string>(m: { lista: { valor: T; texto: string }[] }) {
  return m.lista.map((e) => ({ valor: e.valor, texto: e.texto }));
}

function listaEtiquetas(texto: string): string[] {
  return texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function PieFormulario({ onCerrar, etiqueta }: { onCerrar: () => void; etiqueta: string }) {
  return (
    <>
      <button type="button" className="btn" onClick={onCerrar}>
        Cancelar
      </button>
      <button type="submit" className="btn primario">
        <Icono nombre="check" />
        {etiqueta}
      </button>
    </>
  );
}

/** Envoltorio comun: modal + formulario con submit. */
function ModalFormulario({
  titulo,
  onCerrar,
  onGuardar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  onGuardar: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar();
        }}
        style={{ display: 'contents' }}
      >
        <div className="form-grid">{children}</div>
        <div className="modal-pie" style={{ margin: '4px -18px -18px', padding: '14px 18px' }}>
          <PieFormulario onCerrar={onCerrar} etiqueta="Guardar" />
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Cliente ---------- */

export function FormCliente({
  inicial,
  onGuardar,
  onCerrar,
}: {
  inicial?: Cliente;
  onGuardar: (c: Cliente) => void;
  onCerrar: () => void;
}) {
  const [c, setC] = useState<Cliente>(
    () =>
      inicial ?? {
        id: nuevoId('cli'),
        nombre: '',
        estado: 'potencial',
        etiquetas: [],
        creadoEn: new Date().toISOString(),
      },
  );
  const [etiquetas, setEtiquetas] = useState(c.etiquetas.join(', '));

  return (
    <ModalFormulario
      titulo={inicial ? 'Editar cliente' : 'Nuevo cliente'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!c.nombre.trim()) return;
        onGuardar({ ...c, etiquetas: listaEtiquetas(etiquetas) });
      }}
    >
      <Campo etiqueta="Nombre" anchoTotal>
        <input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Empresa">
        <input value={c.empresa ?? ''} onChange={(e) => setC({ ...c, empresa: e.target.value })} />
      </Campo>
      <Campo etiqueta="Estado">
        <Selector valor={c.estado} opciones={opciones(estadosCliente)} onChange={(v) => setC({ ...c, estado: v })} />
      </Campo>
      <Campo etiqueta="Email">
        <input type="email" value={c.email ?? ''} onChange={(e) => setC({ ...c, email: e.target.value })} />
      </Campo>
      <Campo etiqueta="Teléfono">
        <input value={c.telefono ?? ''} onChange={(e) => setC({ ...c, telefono: e.target.value })} />
      </Campo>
      <Campo etiqueta="Ciudad">
        <input value={c.ciudad ?? ''} onChange={(e) => setC({ ...c, ciudad: e.target.value })} />
      </Campo>
      <Campo etiqueta="Tarifa por hora" pista="Opcional, en la moneda configurada">
        <input
          type="number"
          min={0}
          step="0.01"
          value={c.tarifaHora ?? ''}
          onChange={(e) => setC({ ...c, tarifaHora: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </Campo>
      <Campo etiqueta="Etiquetas" pista="Separadas por comas" anchoTotal>
        <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} placeholder="wordpress, retainer" />
      </Campo>
      <Campo etiqueta="Notas" anchoTotal>
        <textarea value={c.notas ?? ''} onChange={(e) => setC({ ...c, notas: e.target.value })} />
      </Campo>
    </ModalFormulario>
  );
}

/* ---------- Proyecto ---------- */

export function FormProyecto({
  inicial,
  clientes,
  clienteIdPorDefecto,
  onGuardar,
  onCerrar,
}: {
  inicial?: Proyecto;
  clientes: Cliente[];
  clienteIdPorDefecto?: ID;
  onGuardar: (p: Proyecto) => void;
  onCerrar: () => void;
}) {
  const [p, setP] = useState<Proyecto>(
    () =>
      inicial ?? {
        id: nuevoId('pro'),
        clienteId: clienteIdPorDefecto ?? clientes[0]?.id ?? '',
        nombre: '',
        estado: 'propuesta',
        modelo: 'fijo',
        enlaces: [],
        etiquetas: [],
        fechaInicio: hoy(),
        creadoEn: new Date().toISOString(),
      },
  );
  const [etiquetas, setEtiquetas] = useState(p.etiquetas.join(', '));

  return (
    <ModalFormulario
      titulo={inicial ? 'Editar proyecto' : 'Nuevo proyecto'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!p.nombre.trim() || !p.clienteId) return;
        onGuardar({ ...p, etiquetas: listaEtiquetas(etiquetas) });
      }}
    >
      <Campo etiqueta="Nombre" anchoTotal>
        <input value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Cliente">
        <Selector
          valor={p.clienteId}
          opciones={clientes.map((c) => ({ valor: c.id, texto: c.nombre }))}
          onChange={(v) => setP({ ...p, clienteId: v })}
        />
      </Campo>
      <Campo etiqueta="Estado">
        <Selector valor={p.estado} opciones={opciones(estadosProyecto)} onChange={(v) => setP({ ...p, estado: v })} />
      </Campo>
      <Campo etiqueta="Modelo de facturación">
        <Selector
          valor={p.modelo}
          opciones={opciones(modelosFacturacion)}
          onChange={(v) => setP({ ...p, modelo: v })}
        />
      </Campo>
      <Campo etiqueta="Presupuesto">
        <input
          type="number"
          min={0}
          step="0.01"
          value={p.presupuesto ?? ''}
          onChange={(e) => setP({ ...p, presupuesto: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </Campo>
      <Campo etiqueta="Inicio">
        <input type="date" value={p.fechaInicio ?? ''} onChange={(e) => setP({ ...p, fechaInicio: e.target.value })} />
      </Campo>
      <Campo etiqueta="Entrega prevista">
        <input
          type="date"
          value={p.fechaEntrega ?? ''}
          onChange={(e) => setP({ ...p, fechaEntrega: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Descripción corta" anchoTotal>
        <input value={p.descripcion ?? ''} onChange={(e) => setP({ ...p, descripcion: e.target.value })} />
      </Campo>
      <Campo etiqueta="Visión general" pista="Contexto, objetivo y límites del proyecto" anchoTotal>
        <textarea
          value={p.visionGeneral ?? ''}
          onChange={(e) => setP({ ...p, visionGeneral: e.target.value })}
          rows={6}
        />
      </Campo>
      <Campo etiqueta="Etiquetas" pista="Separadas por comas" anchoTotal>
        <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} />
      </Campo>
      <EditorEnlaces enlaces={p.enlaces} onChange={(enlaces) => setP({ ...p, enlaces })} />
    </ModalFormulario>
  );
}

function EditorEnlaces({
  enlaces,
  onChange,
}: {
  enlaces: { label: string; url: string }[];
  onChange: (e: { label: string; url: string }[]) => void;
}) {
  return (
    <div className="campo ancho-total">
      <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Enlaces</span>
      {enlaces.map((enlace, i) => (
        <div className="fila" key={i} style={{ flexWrap: 'nowrap' }}>
          <input
            value={enlace.label}
            placeholder="Etiqueta"
            style={{ flex: '0 0 32%' }}
            onChange={(e) => onChange(enlaces.with(i, { ...enlace, label: e.target.value }))}
          />
          <input
            value={enlace.url}
            placeholder="https://"
            onChange={(e) => onChange(enlaces.with(i, { ...enlace, url: e.target.value }))}
          />
          <button
            type="button"
            className="btn discreto pequeno"
            onClick={() => onChange(enlaces.filter((_, j) => j !== i))}
            aria-label="Quitar enlace"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn pequeno"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange([...enlaces, { label: '', url: '' }])}
      >
        <Icono nombre="mas" />
        Añadir enlace
      </button>
    </div>
  );
}

/* ---------- Corte ---------- */

export function FormCorte({
  inicial,
  proyectoId,
  siguienteOrden,
  onGuardar,
  onCerrar,
}: {
  inicial?: Corte;
  proyectoId: ID;
  siguienteOrden: number;
  onGuardar: (c: Corte) => void;
  onCerrar: () => void;
}) {
  const [c, setC] = useState<Corte>(
    () =>
      inicial ?? {
        id: nuevoId('cor'),
        proyectoId,
        codigo: `C${siguienteOrden}`,
        titulo: '',
        estado: 'planificado',
        criterios: [],
        orden: siguienteOrden,
        creadoEn: new Date().toISOString(),
      },
  );
  const [nuevoCriterio, setNuevoCriterio] = useState('');

  const anadirCriterio = () => {
    const texto = nuevoCriterio.trim();
    if (!texto) return;
    const criterio: CriterioAceptacion = { id: nuevoId('cri'), texto, hecho: false };
    setC({ ...c, criterios: [...c.criterios, criterio] });
    setNuevoCriterio('');
  };

  return (
    <ModalFormulario
      titulo={inicial ? `Editar corte ${c.codigo}` : 'Nuevo corte'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!c.titulo.trim()) return;
        onGuardar(c);
      }}
    >
      <Campo etiqueta="Código" pista="C1, C2, hotfix...">
        <input value={c.codigo} onChange={(e) => setC({ ...c, codigo: e.target.value })} />
      </Campo>
      <Campo etiqueta="Estado">
        <Selector valor={c.estado} opciones={opciones(estadosCorte)} onChange={(v) => setC({ ...c, estado: v })} />
      </Campo>
      <Campo etiqueta="Título" anchoTotal>
        <input value={c.titulo} onChange={(e) => setC({ ...c, titulo: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Fecha objetivo">
        <input
          type="date"
          value={c.fechaObjetivo ?? ''}
          onChange={(e) => setC({ ...c, fechaObjetivo: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Entregado el" pista="Se rellena solo al pasar a revisión">
        <input
          type="date"
          value={c.fechaEntrega ?? ''}
          onChange={(e) => setC({ ...c, fechaEntrega: e.target.value || undefined })}
        />
      </Campo>
      <Campo etiqueta="Importe asociado">
        <input
          type="number"
          min={0}
          step="0.01"
          value={c.importe ?? ''}
          onChange={(e) => setC({ ...c, importe: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </Campo>
      <Campo etiqueta="Objetivo / alcance" anchoTotal>
        <textarea value={c.objetivo ?? ''} onChange={(e) => setC({ ...c, objetivo: e.target.value })} />
      </Campo>
      <Campo etiqueta="Fuera de alcance" pista="Lo que este corte NO incluye" anchoTotal>
        <textarea
          value={c.fueraDeAlcance ?? ''}
          onChange={(e) => setC({ ...c, fueraDeAlcance: e.target.value })}
          rows={3}
        />
      </Campo>

      <div className="campo ancho-total">
        <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Criterios de aceptación</span>
        {c.criterios.map((cr) => (
          <div className="fila" key={cr.id} style={{ flexWrap: 'nowrap' }}>
            <input
              type="checkbox"
              checked={cr.hecho}
              onChange={(e) =>
                setC({
                  ...c,
                  criterios: c.criterios.map((x) => (x.id === cr.id ? { ...x, hecho: e.target.checked } : x)),
                })
              }
            />
            <input
              value={cr.texto}
              onChange={(e) =>
                setC({
                  ...c,
                  criterios: c.criterios.map((x) => (x.id === cr.id ? { ...x, texto: e.target.value } : x)),
                })
              }
            />
            <button
              type="button"
              className="btn discreto pequeno"
              onClick={() => setC({ ...c, criterios: c.criterios.filter((x) => x.id !== cr.id) })}
              aria-label="Quitar criterio"
            >
              <Icono nombre="cerrar" />
            </button>
          </div>
        ))}
        <div className="fila" style={{ flexWrap: 'nowrap' }}>
          <input
            value={nuevoCriterio}
            placeholder="Nuevo criterio"
            onChange={(e) => setNuevoCriterio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                anadirCriterio();
              }
            }}
          />
          <button type="button" className="btn pequeno" onClick={anadirCriterio}>
            <Icono nombre="mas" />
          </button>
        </div>
      </div>

      <Campo etiqueta="Notas" anchoTotal>
        <textarea value={c.notas ?? ''} onChange={(e) => setC({ ...c, notas: e.target.value })} rows={3} />
      </Campo>
    </ModalFormulario>
  );
}

/* ---------- Decision ---------- */

export function FormDecision({
  inicial,
  proyectoId,
  onGuardar,
  onCerrar,
}: {
  inicial?: Decision;
  proyectoId: ID;
  onGuardar: (d: Decision) => void;
  onCerrar: () => void;
}) {
  const [d, setD] = useState<Decision>(
    () =>
      inicial ?? {
        id: nuevoId('dec'),
        proyectoId,
        titulo: '',
        estado: 'propuesta',
        fecha: hoy(),
        creadoEn: new Date().toISOString(),
      },
  );

  return (
    <ModalFormulario
      titulo={inicial ? 'Editar decisión' : 'Nueva decisión'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!d.titulo.trim()) return;
        onGuardar(d);
      }}
    >
      <Campo etiqueta="Título" anchoTotal>
        <input value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Estado">
        <Selector valor={d.estado} opciones={opciones(estadosDecision)} onChange={(v) => setD({ ...d, estado: v })} />
      </Campo>
      <Campo etiqueta="Fecha">
        <input type="date" value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} />
      </Campo>
      <Campo etiqueta="Contexto" pista="Qué problema o situación la motiva" anchoTotal>
        <textarea value={d.contexto ?? ''} onChange={(e) => setD({ ...d, contexto: e.target.value })} rows={3} />
      </Campo>
      <Campo etiqueta="Decisión" anchoTotal>
        <textarea value={d.decision ?? ''} onChange={(e) => setD({ ...d, decision: e.target.value })} rows={3} />
      </Campo>
      <Campo etiqueta="Alternativas descartadas" anchoTotal>
        <textarea
          value={d.alternativas ?? ''}
          onChange={(e) => setD({ ...d, alternativas: e.target.value })}
          rows={3}
        />
      </Campo>
      <Campo etiqueta="Consecuencias" anchoTotal>
        <textarea
          value={d.consecuencias ?? ''}
          onChange={(e) => setD({ ...d, consecuencias: e.target.value })}
          rows={3}
        />
      </Campo>
    </ModalFormulario>
  );
}

/* ---------- Movimiento ---------- */

export function FormMovimiento({
  inicial,
  clientes,
  proyectos,
  cortes,
  movimientos,
  ajustes,
  contexto,
  onGuardar,
  onCerrar,
}: {
  inicial?: Movimiento;
  clientes: Cliente[];
  proyectos: Proyecto[];
  cortes: Corte[];
  movimientos: Movimiento[];
  ajustes: Ajustes;
  contexto?: { clienteId?: ID; proyectoId?: ID; corteId?: ID; concepto?: string; importe?: number };
  onGuardar: (m: Movimiento) => void;
  onCerrar: () => void;
}) {
  const [m, setM] = useState<Movimiento>(() => {
    if (inicial) return inicial;
    const emision = hoy();
    return {
      id: nuevoId('mov'),
      tipo: 'cobro',
      clienteId: contexto?.clienteId ?? clientes[0]?.id,
      proyectoId: contexto?.proyectoId,
      corteId: contexto?.corteId,
      concepto: contexto?.concepto ?? '',
      importe: contexto?.importe ?? 0,
      // Facturar un corte es una accion explicita: se reserva ya el numero de serie.
      numeroFactura: contexto?.corteId ? siguienteNumeroFactura(movimientos, ajustes) : undefined,
      ivaPct: ajustes.ivaPorDefecto,
      irpfPct: ajustes.irpfPorDefecto,
      estado: 'pendiente',
      fechaEmision: emision,
      fechaVencimiento: sumarDias(emision, ajustes.diasVencimiento),
      creadoEn: new Date().toISOString(),
    };
  });

  const proyectosCliente = useMemo(
    () => proyectos.filter((p) => !m.clienteId || p.clienteId === m.clienteId),
    [proyectos, m.clienteId],
  );
  const cortesProyecto = useMemo(
    () => cortes.filter((c) => c.proyectoId === m.proyectoId),
    [cortes, m.proyectoId],
  );

  const total = m.importe * (1 + m.ivaPct / 100 - m.irpfPct / 100);

  return (
    <ModalFormulario
      titulo={inicial ? 'Editar movimiento' : 'Nuevo movimiento'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!m.concepto.trim()) return;
        onGuardar(m);
      }}
    >
      <Campo etiqueta="Tipo">
        <Selector
          valor={m.tipo}
          opciones={[
            { valor: 'cobro' as const, texto: 'Cobro (entra)' },
            { valor: 'pago' as const, texto: 'Pago (sale)' },
          ]}
          onChange={(v) => setM({ ...m, tipo: v })}
        />
      </Campo>
      <Campo etiqueta="Estado">
        <Selector
          valor={m.estado}
          opciones={estadosMovimiento.lista
            .filter((e) => e.valor !== 'vencido')
            .map((e) => ({ valor: e.valor as EstadoMovimiento, texto: e.texto }))}
          onChange={(v) =>
            setM({ ...m, estado: v, fechaPago: v === 'pagado' ? (m.fechaPago ?? hoy()) : undefined })
          }
        />
      </Campo>
      <Campo etiqueta="Concepto" anchoTotal>
        <input value={m.concepto} onChange={(e) => setM({ ...m, concepto: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Cliente">
        <Selector
          valor={m.clienteId ?? ''}
          opciones={[{ valor: '', texto: 'Sin cliente' }, ...clientes.map((c) => ({ valor: c.id, texto: c.nombre }))]}
          onChange={(v) => setM({ ...m, clienteId: v || undefined, proyectoId: undefined, corteId: undefined })}
        />
      </Campo>
      <Campo etiqueta="Proyecto">
        <Selector
          valor={m.proyectoId ?? ''}
          opciones={[
            { valor: '', texto: 'Sin proyecto' },
            ...proyectosCliente.map((p) => ({ valor: p.id, texto: p.nombre })),
          ]}
          onChange={(v) => setM({ ...m, proyectoId: v || undefined, corteId: undefined })}
        />
      </Campo>
      <Campo etiqueta="Corte">
        <Selector
          valor={m.corteId ?? ''}
          opciones={[
            { valor: '', texto: 'Sin corte' },
            ...cortesProyecto.map((c) => ({ valor: c.id, texto: `${c.codigo} · ${c.titulo}` })),
          ]}
          onChange={(v) => setM({ ...m, corteId: v || undefined })}
        />
      </Campo>
      <Campo etiqueta="Base imponible">
        <input
          type="number"
          step="0.01"
          value={m.importe}
          onChange={(e) => setM({ ...m, importe: Number(e.target.value) })}
          required
        />
      </Campo>
      <Campo etiqueta="IVA %">
        <input type="number" step="0.01" value={m.ivaPct} onChange={(e) => setM({ ...m, ivaPct: Number(e.target.value) })} />
      </Campo>
      <Campo etiqueta="IRPF %">
        <input
          type="number"
          step="0.01"
          value={m.irpfPct}
          onChange={(e) => setM({ ...m, irpfPct: Number(e.target.value) })}
        />
      </Campo>
      <Campo etiqueta="Emisión">
        <input
          type="date"
          value={m.fechaEmision}
          onChange={(e) => setM({ ...m, fechaEmision: e.target.value })}
          required
        />
      </Campo>
      <Campo etiqueta="Vencimiento">
        <input
          type="date"
          value={m.fechaVencimiento ?? ''}
          onChange={(e) => setM({ ...m, fechaVencimiento: e.target.value || undefined })}
        />
      </Campo>
      <Campo etiqueta="Fecha de pago">
        <input
          type="date"
          value={m.fechaPago ?? ''}
          onChange={(e) => setM({ ...m, fechaPago: e.target.value || undefined })}
        />
      </Campo>
      <Campo etiqueta="Nº factura" pista={`Siguiente libre: ${siguienteNumeroFactura(movimientos, ajustes)}`}>
        <div className="fila" style={{ flexWrap: 'nowrap' }}>
          <input
            value={m.numeroFactura ?? ''}
            onChange={(e) => setM({ ...m, numeroFactura: e.target.value })}
            placeholder="Sin numerar"
          />
          <button
            type="button"
            className="btn pequeno"
            title="Asignar el siguiente número de la serie"
            onClick={() =>
              setM({
                ...m,
                numeroFactura: siguienteNumeroFactura(
                  movimientos.filter((x) => x.id !== m.id),
                  ajustes,
                ),
              })
            }
          >
            Generar
          </button>
        </div>
      </Campo>
      <Campo etiqueta="Método">
        <input
          value={m.metodo ?? ''}
          placeholder="Transferencia, Stripe..."
          onChange={(e) => setM({ ...m, metodo: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Notas" anchoTotal>
        <textarea value={m.notas ?? ''} onChange={(e) => setM({ ...m, notas: e.target.value })} rows={3} />
      </Campo>
      <div className="ancho-total pequeno texto-2">
        Total con impuestos:{' '}
        <strong className="num" style={{ color: 'var(--acento-fuerte)' }}>
          {new Intl.NumberFormat(ajustes.locale, { style: 'currency', currency: ajustes.moneda }).format(total)}
        </strong>
      </div>
    </ModalFormulario>
  );
}

/* ---------- Seguimiento ---------- */

export function FormSeguimiento({
  inicial,
  clientes,
  proyectos,
  contexto,
  onGuardar,
  onCerrar,
}: {
  inicial?: Seguimiento;
  clientes: Cliente[];
  proyectos: Proyecto[];
  contexto?: { clienteId?: ID; proyectoId?: ID };
  onGuardar: (s: Seguimiento) => void;
  onCerrar: () => void;
}) {
  const [s, setS] = useState<Seguimiento>(
    () =>
      inicial ?? {
        id: nuevoId('seg'),
        clienteId: contexto?.clienteId ?? clientes[0]?.id ?? '',
        proyectoId: contexto?.proyectoId,
        titulo: '',
        tipo: 'seguimiento',
        fechaPrevista: sumarDias(hoy(), 30),
        recurrencia: 'ninguna',
        estado: 'pendiente',
        creadoEn: new Date().toISOString(),
      },
  );

  const proyectosCliente = proyectos.filter((p) => p.clienteId === s.clienteId);

  return (
    <ModalFormulario
      titulo={inicial ? 'Editar seguimiento' : 'Nuevo seguimiento'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!s.titulo.trim() || !s.clienteId) return;
        onGuardar(s);
      }}
    >
      <Campo etiqueta="Título" anchoTotal>
        <input value={s.titulo} onChange={(e) => setS({ ...s, titulo: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Cliente">
        <Selector
          valor={s.clienteId}
          opciones={clientes.map((c) => ({ valor: c.id, texto: c.nombre }))}
          onChange={(v) => setS({ ...s, clienteId: v, proyectoId: undefined })}
        />
      </Campo>
      <Campo etiqueta="Proyecto">
        <Selector
          valor={s.proyectoId ?? ''}
          opciones={[
            { valor: '', texto: 'Sin proyecto' },
            ...proyectosCliente.map((p) => ({ valor: p.id, texto: p.nombre })),
          ]}
          onChange={(v) => setS({ ...s, proyectoId: v || undefined })}
        />
      </Campo>
      <Campo etiqueta="Tipo">
        <Selector valor={s.tipo} opciones={opciones(tiposSeguimiento)} onChange={(v) => setS({ ...s, tipo: v })} />
      </Campo>
      <Campo etiqueta="Fecha prevista">
        <input
          type="date"
          value={s.fechaPrevista}
          onChange={(e) => setS({ ...s, fechaPrevista: e.target.value })}
          required
        />
      </Campo>
      <Campo etiqueta="Recurrencia" pista="Al marcarlo hecho se crea el siguiente">
        <Selector
          valor={s.recurrencia}
          opciones={opciones(recurrencias)}
          onChange={(v) => setS({ ...s, recurrencia: v })}
        />
      </Campo>
      <Campo etiqueta="Estado">
        <Selector
          valor={s.estado}
          opciones={opciones(estadosSeguimiento)}
          onChange={(v) => setS({ ...s, estado: v })}
        />
      </Campo>
      <Campo etiqueta="Notas" anchoTotal>
        <textarea value={s.notas ?? ''} onChange={(e) => setS({ ...s, notas: e.target.value })} rows={3} />
      </Campo>
    </ModalFormulario>
  );
}

/* ---------- Plantilla ---------- */

export function FormPlantilla({
  inicial,
  onGuardar,
  onCerrar,
}: {
  inicial?: Plantilla;
  onGuardar: (p: Plantilla) => void;
  onCerrar: () => void;
}) {
  const [p, setP] = useState<Plantilla>(
    () =>
      inicial ?? {
        id: nuevoId('pla'),
        nombre: '',
        modelo: 'fijo',
        modulos: [],
        creadoEn: new Date().toISOString(),
      },
  );

  const cambiarModulo = (i: number, cambios: Partial<ModuloPlantilla>) =>
    setP({ ...p, modulos: p.modulos.with(i, { ...p.modulos[i]!, ...cambios }) });

  return (
    <ModalFormulario
      titulo={inicial ? 'Editar plantilla' : 'Nueva plantilla'}
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!p.nombre.trim()) return;
        onGuardar(p);
      }}
    >
      <Campo etiqueta="Nombre" anchoTotal>
        <input value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="Modelo de facturación">
        <Selector
          valor={p.modelo}
          opciones={opciones(modelosFacturacion)}
          onChange={(v) => setP({ ...p, modelo: v })}
        />
      </Campo>
      <Campo etiqueta="Descripción" anchoTotal>
        <input value={p.descripcion ?? ''} onChange={(e) => setP({ ...p, descripcion: e.target.value })} />
      </Campo>

      <div className="campo ancho-total">
        <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
          Módulos · suma {p.modulos.length ? importeDePlantilla(p) : 0}
        </span>
        {p.modulos.map((modulo, i) => (
          <div
            key={modulo.id}
            className="panel"
            style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div className="fila" style={{ flexWrap: 'nowrap' }}>
              <input
                value={modulo.codigo}
                placeholder="C1"
                style={{ flex: '0 0 80px' }}
                onChange={(e) => cambiarModulo(i, { codigo: e.target.value })}
              />
              <input
                value={modulo.titulo}
                placeholder="Título del módulo"
                onChange={(e) => cambiarModulo(i, { titulo: e.target.value })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={modulo.importe ?? ''}
                placeholder="Precio"
                style={{ flex: '0 0 110px' }}
                onChange={(e) =>
                  cambiarModulo(i, { importe: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
              <button
                type="button"
                className="btn discreto pequeno"
                aria-label="Quitar módulo"
                onClick={() => setP({ ...p, modulos: p.modulos.filter((_, j) => j !== i) })}
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
            <textarea
              value={modulo.objetivo ?? ''}
              placeholder="Objetivo del módulo"
              rows={2}
              onChange={(e) => cambiarModulo(i, { objetivo: e.target.value })}
            />
            <textarea
              value={modulo.criterios.join('\n')}
              placeholder="Criterios de aceptación, uno por línea"
              rows={3}
              onChange={(e) =>
                cambiarModulo(i, { criterios: e.target.value.split('\n').map((t) => t.trim()).filter(Boolean) })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="btn pequeno"
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            setP({
              ...p,
              modulos: [
                ...p.modulos,
                { id: nuevoId('mod'), codigo: `C${p.modulos.length + 1}`, titulo: '', criterios: [] },
              ],
            })
          }
        >
          <Icono nombre="mas" />
          Añadir módulo
        </button>
      </div>
    </ModalFormulario>
  );
}

/* ---------- Proyecto a partir de una plantilla ---------- */

export function FormProyectoDesdePlantilla({
  plantillas,
  clientes,
  onGuardar,
  onCerrar,
}: {
  plantillas: Plantilla[];
  clientes: Cliente[];
  onGuardar: (datos: { plantilla: Plantilla; proyecto: Proyecto }) => void;
  onCerrar: () => void;
}) {
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? '');
  const plantilla = plantillas.find((p) => p.id === plantillaId);
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const [fechaInicio, setFechaInicio] = useState(hoy());

  const elegirPlantilla = (id: ID) => {
    setPlantillaId(id);
    const elegida = plantillas.find((p) => p.id === id);
    // Solo se propone el nombre mientras no lo hayas tocado o siga siendo el de otra plantilla.
    if (elegida && (!nombre || plantillas.some((p) => p.nombre === nombre))) setNombre(elegida.nombre);
  };

  return (
    <ModalFormulario
      titulo="Nuevo proyecto desde plantilla"
      onCerrar={onCerrar}
      onGuardar={() => {
        if (!plantilla || !nombre.trim() || !clienteId) return;
        onGuardar({
          plantilla,
          proyecto: {
            id: nuevoId('pro'),
            clienteId,
            nombre: nombre.trim(),
            descripcion: plantilla.descripcion,
            estado: 'propuesta',
            modelo: plantilla.modelo,
            presupuesto: importeDePlantilla(plantilla) || undefined,
            fechaInicio,
            enlaces: [],
            etiquetas: [],
            creadoEn: new Date().toISOString(),
          },
        });
      }}
    >
      <Campo etiqueta="Plantilla" anchoTotal>
        <Selector
          valor={plantillaId}
          opciones={plantillas.map((p) => ({
            valor: p.id,
            texto: `${p.nombre} · ${p.modulos.length} módulos`,
          }))}
          onChange={elegirPlantilla}
        />
      </Campo>
      <Campo etiqueta="Nombre del proyecto" anchoTotal>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
      </Campo>
      <Campo etiqueta="Cliente">
        <Selector
          valor={clienteId}
          opciones={clientes.map((c) => ({ valor: c.id, texto: c.nombre }))}
          onChange={setClienteId}
        />
      </Campo>
      <Campo etiqueta="Inicio">
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
      </Campo>
      {plantilla && (
        <div className="ancho-total">
          <div className="pequeno texto-3" style={{ marginBottom: 6 }}>
            Se crearán {plantilla.modulos.length} cortes con sus criterios. Presupuesto propuesto:{' '}
            {importeDePlantilla(plantilla)}.
          </div>
          <div className="lista panel">
            {plantilla.modulos.map((m) => (
              <div className="lista-item" key={m.id}>
                <span className="etiqueta mono">{m.codigo}</span>
                <span className="crecer recorte">{m.titulo || 'Sin título'}</span>
                <span className="num texto-2">{m.importe ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalFormulario>
  );
}

/* ---------- Anadir modulos de una plantilla a un proyecto ---------- */

export function ModalPlantilla({
  plantillas,
  onAnadir,
  onCerrar,
}: {
  plantillas: Plantilla[];
  onAnadir: (modulos: ModuloPlantilla[]) => void;
  onCerrar: () => void;
}) {
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? '');
  const plantilla = plantillas.find((p) => p.id === plantillaId);
  const [descartados, setDescartados] = useState<Set<ID>>(new Set());

  // Por defecto entran todos los modulos; se marcan los que se quieren dejar fuera.
  const elegidos = (plantilla?.modulos ?? []).filter((m) => !descartados.has(m.id));

  const alternar = (id: ID) =>
    setDescartados((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <ModalFormulario
      titulo="Añadir módulos de una plantilla"
      onCerrar={onCerrar}
      onGuardar={() => {
        if (elegidos.length === 0) return;
        onAnadir(elegidos);
      }}
    >
      <Campo etiqueta="Plantilla" anchoTotal>
        <Selector
          valor={plantillaId}
          opciones={plantillas.map((p) => ({ valor: p.id, texto: `${p.nombre} · ${p.modulos.length} módulos` }))}
          onChange={(id) => {
            setPlantillaId(id);
            setDescartados(new Set());
          }}
        />
      </Campo>

      <div className="ancho-total">
        <div className="pequeno texto-3" style={{ marginBottom: 6 }}>
          Se añadirán {elegidos.length} de {plantilla?.modulos.length ?? 0} módulos como cortes planificados.
        </div>
        <div className="panel lista">
          {(plantilla?.modulos ?? []).map((m) => (
            <label className="lista-item" key={m.id} style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={!descartados.has(m.id)} onChange={() => alternar(m.id)} />
              <span className="etiqueta mono">{m.codigo}</span>
              <span className="crecer recorte">{m.titulo || 'Sin título'}</span>
              <span className="num texto-2">{m.importe ?? '—'}</span>
            </label>
          ))}
          {plantilla?.modulos.length === 0 && (
            <span className="pequeno texto-3" style={{ padding: 12 }}>
              Esta plantilla no tiene módulos.
            </span>
          )}
        </div>
      </div>
    </ModalFormulario>
  );
}
