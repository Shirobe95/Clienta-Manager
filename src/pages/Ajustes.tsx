import { useRef, useState } from 'react';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { Campo, Panel } from '../components/ui';
import { datosEjemplo } from '../lib/seed';
import { exportarJSON, importarJSON } from '../lib/storage';
import { useAlmacen } from '../state/store';
import type { Ajustes as TipoAjustes } from '../lib/types';

export function Ajustes() {
  const { db, guardarAjustes, reemplazarTodo, reiniciar } = useAlmacen();
  const [ajustes, setAjustes] = useState<TipoAjustes>(db.ajustes);
  const [mensaje, setMensaje] = useState<{ texto: string; tono: 'ok' | 'error' } | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const blob = new Blob([exportarJSON(db)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `clienta-manager-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
    setMensaje({ texto: 'Copia descargada.', tono: 'ok' });
  };

  const importar = async (archivo: File) => {
    try {
      const datos = importarJSON(await archivo.text());
      reemplazarTodo(datos);
      setAjustes(datos.ajustes);
      setMensaje({ texto: 'Datos importados correctamente.', tono: 'ok' });
    } catch (error) {
      setMensaje({ texto: `No se pudo importar: ${(error as Error).message}`, tono: 'error' });
    }
  };

  const totalRegistros =
    db.clientes.length +
    db.proyectos.length +
    db.cortes.length +
    db.decisiones.length +
    db.movimientos.length +
    db.seguimientos.length;

  return (
    <>
      <Cabecera titulo="Ajustes" subtitulo="Preferencias, copias de seguridad y datos de ejemplo" />

      <div className="pagina">
        {mensaje && (
          <div
            className="panel panel-cuerpo pequeno"
            style={{ borderColor: mensaje.tono === 'ok' ? 'var(--acento-borde)' : 'rgba(248,113,113,0.4)' }}
          >
            {mensaje.texto}
          </div>
        )}

        <Panel
          titulo="Preferencias"
          icono="ajustes"
          acciones={
            <button
              type="button"
              className="btn primario pequeno"
              onClick={() => {
                guardarAjustes(ajustes);
                setMensaje({ texto: 'Preferencias guardadas.', tono: 'ok' });
              }}
            >
              <Icono nombre="check" />
              Guardar
            </button>
          }
        >
          <div className="form-grid">
            <Campo etiqueta="Moneda" pista="Código ISO: EUR, USD...">
              <input value={ajustes.moneda} onChange={(e) => setAjustes({ ...ajustes, moneda: e.target.value })} />
            </Campo>
            <Campo etiqueta="Idioma de formato" pista="es-ES, ca-ES, en-GB...">
              <input value={ajustes.locale} onChange={(e) => setAjustes({ ...ajustes, locale: e.target.value })} />
            </Campo>
            <Campo etiqueta="IVA por defecto (%)">
              <input
                type="number"
                step="0.01"
                value={ajustes.ivaPorDefecto}
                onChange={(e) => setAjustes({ ...ajustes, ivaPorDefecto: Number(e.target.value) })}
              />
            </Campo>
            <Campo etiqueta="IRPF por defecto (%)">
              <input
                type="number"
                step="0.01"
                value={ajustes.irpfPorDefecto}
                onChange={(e) => setAjustes({ ...ajustes, irpfPorDefecto: Number(e.target.value) })}
              />
            </Campo>
            <Campo etiqueta="Días de vencimiento" pista="Se aplica al crear un cobro">
              <input
                type="number"
                min={0}
                value={ajustes.diasVencimiento}
                onChange={(e) => setAjustes({ ...ajustes, diasVencimiento: Number(e.target.value) })}
              />
            </Campo>
            <Campo etiqueta="Objetivo anual" pista="Opcional, alimenta la barra del panel">
              <input
                type="number"
                min={0}
                value={ajustes.objetivoAnual ?? ''}
                onChange={(e) =>
                  setAjustes({ ...ajustes, objetivoAnual: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
            </Campo>
          </div>
        </Panel>

        <Panel titulo="Datos" icono="descargar">
          <p className="texto-2 pequeno">
            Todo se guarda en el almacenamiento local de este navegador: {totalRegistros} registros. No sale nada a
            ningún servidor. Haz copias con regularidad y guárdalas donde te venga bien.
          </p>
          <div className="fila" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={exportar}>
              <Icono nombre="descargar" />
              Exportar copia (JSON)
            </button>
            <button type="button" className="btn" onClick={() => entradaArchivo.current?.click()}>
              <Icono nombre="subir" />
              Importar copia
            </button>
            <input
              ref={entradaArchivo}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void importar(archivo);
                e.target.value = '';
              }}
            />
          </div>
        </Panel>

        <Panel titulo="Juego de datos de ejemplo" icono="rayo">
          <p className="texto-2 pequeno">
            Carga clientes, proyectos, cortes, decisiones y cobros ficticios para ver el panel con contenido. Sustituye
            todo lo que tengas ahora, así que exporta antes si te interesa conservarlo.
          </p>
          <div className="fila" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn primario"
              onClick={() => {
                if (totalRegistros > 0 && !confirm('Esto reemplaza los datos actuales. ¿Continuar?')) return;
                const datos = datosEjemplo();
                reemplazarTodo(datos);
                setAjustes(datos.ajustes);
                setMensaje({ texto: 'Datos de ejemplo cargados.', tono: 'ok' });
              }}
            >
              <Icono nombre="rayo" />
              Cargar datos de ejemplo
            </button>
          </div>
        </Panel>

        <Panel titulo="Zona peligrosa" icono="aviso">
          <p className="texto-2 pequeno">Borra todo el contenido guardado en este navegador. No se puede deshacer.</p>
          <div className="fila" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn peligro"
              onClick={() => {
                if (!confirm('Se borrarán todos los datos locales. ¿Seguro?')) return;
                reiniciar();
                setMensaje({ texto: 'Datos borrados.', tono: 'ok' });
              }}
            >
              <Icono nombre="borrar" />
              Borrar todos los datos
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
