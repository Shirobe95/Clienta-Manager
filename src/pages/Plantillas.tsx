import { useState } from 'react';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { FormPlantilla } from '../components/formularios';
import { BotonBorrar, Panel, Vacio } from '../components/ui';
import { importeDePlantilla } from '../lib/entregas';
import { nuevoId } from '../lib/id';
import { modelosFacturacion } from '../lib/labels';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Plantilla } from '../lib/types';

export function Plantillas() {
  const { db, guardar, eliminar } = useAlmacen();
  const { dinero } = useFormato();
  const [formulario, setFormulario] = useState<Plantilla | 'nueva' | null>(null);

  const lista = [...db.plantillas].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const duplicar = (p: Plantilla) =>
    guardar('plantillas', {
      ...p,
      id: nuevoId('pla'),
      nombre: `${p.nombre} (copia)`,
      modulos: p.modulos.map((m) => ({ ...m, id: nuevoId('mod') })),
      creadoEn: new Date().toISOString(),
    });

  return (
    <>
      <Cabecera
        titulo="Plantillas"
        subtitulo="Módulos reutilizables para montar proyectos sin reescribirlos"
        acciones={
          <button type="button" className="btn primario" onClick={() => setFormulario('nueva')}>
            <Icono nombre="mas" />
            Nueva plantilla
          </button>
        }
      />

      <div className="pagina">
        {lista.length === 0 ? (
          <Panel>
            <Vacio
              icono="nota"
              titulo="Sin plantillas"
              descripcion="Define una vez los módulos que sueles vender, con su precio y sus criterios, y reutilízalos en cada proyecto."
              accion={
                <button type="button" className="btn primario" onClick={() => setFormulario('nueva')}>
                  <Icono nombre="mas" />
                  Nueva plantilla
                </button>
              }
            />
          </Panel>
        ) : (
          <div className="grid grid-tarjetas">
            {lista.map((p) => (
              <article className="panel" key={p.id}>
                <div className="panel-cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="fila" style={{ flexWrap: 'nowrap' }}>
                    <div className="crecer">
                      <div style={{ fontWeight: 600 }} className="recorte">
                        {p.nombre}
                      </div>
                      <div className="pequeno texto-3 recorte">
                        {modelosFacturacion.de(p.modelo).texto} · {p.modulos.length} módulos
                      </div>
                    </div>
                    <span className="num">{dinero(importeDePlantilla(p))}</span>
                  </div>

                  {p.descripcion && <p className="pequeno texto-2 recorte">{p.descripcion}</p>}

                  <div className="lista" style={{ borderTop: '1px solid var(--borde)' }}>
                    {p.modulos.map((m) => (
                      <div className="lista-item" key={m.id} style={{ padding: '8px 0' }}>
                        <span className="etiqueta mono">{m.codigo}</span>
                        <span className="crecer recorte pequeno">{m.titulo || 'Sin título'}</span>
                        <span className="num pequeno texto-2">{m.importe ? dinero(m.importe) : '—'}</span>
                      </div>
                    ))}
                    {p.modulos.length === 0 && <span className="pequeno texto-3">Sin módulos todavía.</span>}
                  </div>

                  <div className="fila fila-sep">
                    <button type="button" className="btn pequeno" onClick={() => duplicar(p)}>
                      Duplicar
                    </button>
                    <div className="fila" style={{ gap: 6 }}>
                      <button type="button" className="btn discreto pequeno" title="Editar" onClick={() => setFormulario(p)}>
                        <Icono nombre="editar" />
                      </button>
                      <BotonBorrar etiqueta="" onBorrar={() => eliminar('plantillas', p.id)} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {formulario && (
        <FormPlantilla
          inicial={formulario === 'nueva' ? undefined : formulario}
          onCerrar={() => setFormulario(null)}
          onGuardar={(p) => {
            guardar('plantillas', p);
            setFormulario(null);
          }}
        />
      )}
    </>
  );
}
