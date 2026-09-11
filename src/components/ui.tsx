import { useEffect } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Icono } from './Icono';
import type { NombreIcono } from './Icono';
import type { Tono } from '../lib/labels';

/* ---------- Panel ---------- */

export function Panel({
  titulo,
  icono,
  acciones,
  sinRelleno,
  children,
  pie,
}: {
  titulo?: string;
  icono?: NombreIcono;
  acciones?: ReactNode;
  sinRelleno?: boolean;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <section className="panel">
      {titulo && (
        <header className="panel-cabecera">
          {icono && <span className="texto-3"><Icono nombre={icono} /></span>}
          <h2>{titulo}</h2>
          {acciones && <div className="acciones">{acciones}</div>}
        </header>
      )}
      <div className={sinRelleno ? 'panel-cuerpo sin-relleno' : 'panel-cuerpo'}>{children}</div>
      {pie}
    </section>
  );
}

/* ---------- KPI ---------- */

export function Kpi({
  etiqueta,
  valor,
  pie,
  tono = 'neutro',
  progreso,
}: {
  etiqueta: string;
  valor: string;
  pie?: ReactNode;
  tono?: 'neutro' | 'acento' | 'ok' | 'aviso' | 'critico';
  progreso?: number;
}) {
  return (
    <article className={`panel kpi ${tono}`}>
      <span className="kpi-etiqueta">{etiqueta}</span>
      <span className="kpi-valor">{valor}</span>
      {progreso !== undefined && (
        <div className="barra-progreso" role="presentation">
          <span style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }} />
        </div>
      )}
      {pie && <span className="kpi-pie">{pie}</span>}
    </article>
  );
}

/* ---------- Insignia ---------- */

export function Insignia({
  texto,
  tono = 'neutro',
  sinPunto,
}: {
  texto: string;
  tono?: Tono;
  sinPunto?: boolean;
}) {
  const clases = ['insignia', tono === 'neutro' ? '' : tono, sinPunto ? 'sin-punto' : '']
    .filter(Boolean)
    .join(' ');
  return <span className={clases}>{texto}</span>;
}

/* ---------- Estado vacio ---------- */

export function Vacio({
  titulo,
  descripcion,
  accion,
  icono = 'nota',
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: NombreIcono;
}) {
  return (
    <div className="vacio">
      <Icono nombre={icono} tamano={22} />
      <span className="titulo">{titulo}</span>
      {descripcion && <span className="pequeno">{descripcion}</span>}
      {accion && <div style={{ marginTop: 6 }}>{accion}</div>}
    </div>
  );
}

/* ---------- Campos ---------- */

export function Campo({
  etiqueta,
  pista,
  anchoTotal,
  children,
}: {
  etiqueta: string;
  pista?: string;
  anchoTotal?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`campo ${anchoTotal ? 'ancho-total' : ''}`}>
      <span>{etiqueta}</span>
      {children}
      {pista && <span className="pista">{pista}</span>}
    </label>
  );
}

export function Selector<T extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: T;
  opciones: { valor: T; texto: string }[];
  onChange: (valor: T) => void;
}) {
  return (
    <select value={valor} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  titulo,
  onCerrar,
  children,
  pie,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <div
      className="capa-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal-cabecera">
          <h2>{titulo}</h2>
          <button
            type="button"
            className="btn discreto pequeno"
            style={{ marginLeft: 'auto' }}
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <Icono nombre="cerrar" />
          </button>
        </header>
        <div className="modal-cuerpo">{children}</div>
        {pie && <footer className="modal-pie">{pie}</footer>}
      </div>
    </div>
  );
}

/* ---------- Pestanas ---------- */

export function Pestanas<T extends string>({
  activa,
  opciones,
  onChange,
}: {
  activa: T;
  opciones: { valor: T; texto: string; cuenta?: number }[];
  onChange: (valor: T) => void;
}) {
  return (
    <div className="pestanas" role="tablist">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={o.valor === activa}
          className={`pestana ${o.valor === activa ? 'activa' : ''}`}
          onClick={() => onChange(o.valor)}
        >
          {o.texto}
          {o.cuenta !== undefined && <span className="cuenta">{o.cuenta}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Buscador ---------- */

export function Buscador({
  valor,
  onChange,
  marcador = 'Buscar...',
}: {
  valor: string;
  onChange: (v: string) => void;
  marcador?: string;
}) {
  return (
    <div className="fila" style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
      <span style={{ position: 'absolute', left: 10, color: 'var(--texto-3)', display: 'flex' }}>
        <Icono nombre="buscar" />
      </span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={marcador}
        style={{ paddingLeft: 32 }}
        aria-label={marcador}
      />
    </div>
  );
}

/* ---------- Confirmacion ---------- */

export function BotonBorrar({ onBorrar, etiqueta = 'Eliminar' }: { onBorrar: () => void; etiqueta?: string }) {
  return (
    <button
      type="button"
      className="btn peligro pequeno"
      onClick={() => {
        if (confirm('¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.')) onBorrar();
      }}
    >
      <Icono nombre="borrar" />
      {etiqueta}
    </button>
  );
}
