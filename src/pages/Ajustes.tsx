import { useRef, useState } from 'react';
import { Cabecera } from '../components/Cabecera';
import { Icono } from '../components/Icono';
import { BotonBorrar, Campo, Insignia, Modal, Panel, Vacio } from '../components/ui';
import {
  MOTIVOS,
  borrarInstantanea,
  contar,
  crearInstantanea,
  estadoCopia,
  fusionar,
  listarInstantaneas,
  previsualizarFusion,
  restaurarInstantanea,
} from '../lib/copias';
import type { Instantanea, ResumenFusion } from '../lib/copias';
import { datosEjemplo } from '../lib/seed';
import { exportarJSON, importarJSON } from '../lib/storage';
import { useFormato } from '../state/formato';
import { useAlmacen } from '../state/store';
import type { Ajustes as TipoAjustes, BaseDatos } from '../lib/types';

interface Importacion {
  nombre: string;
  datos: BaseDatos;
  resumen: ResumenFusion;
}

export function Ajustes() {
  const { db, guardarAjustes, reemplazarTodo, reiniciar, marcarCopiaHecha } = useAlmacen();
  const { locale } = useFormato();
  const [ajustes, setAjustes] = useState<TipoAjustes>(db.ajustes);
  const [mensaje, setMensaje] = useState<{ texto: string; tono: 'ok' | 'error' } | null>(null);
  const [instantaneas, setInstantaneas] = useState<Instantanea[]>(() => listarInstantaneas());
  const [importacion, setImportacion] = useState<Importacion | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const recuento = contar(db);
  const copia = estadoCopia(db);

  const momento = (valor: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));

  const exportar = () => {
    const blob = new Blob([exportarJSON(db)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `gremio-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
    marcarCopiaHecha();
    setMensaje({ texto: 'Copia descargada y anotada como última copia.', tono: 'ok' });
  };

  const prepararImportacion = async (archivo: File) => {
    try {
      const datos = importarJSON(await archivo.text());
      setImportacion({ nombre: archivo.name, datos, resumen: previsualizarFusion(db, datos) });
    } catch (error) {
      setMensaje({ texto: `No se pudo leer el archivo: ${(error as Error).message}`, tono: 'error' });
    }
  };

  const aplicarImportacion = (modo: 'reemplazar' | 'fusionar') => {
    if (!importacion) return;
    const resultado = modo === 'reemplazar' ? importacion.datos : fusionar(db, importacion.datos);
    reemplazarTodo(resultado, 'antes_de_importar');
    setAjustes(resultado.ajustes);
    setInstantaneas(listarInstantaneas());
    setImportacion(null);
    setMensaje({
      texto:
        modo === 'reemplazar'
          ? 'Datos reemplazados. Se guardó una instantánea de lo anterior.'
          : `Fusionado: ${importacion.resumen.nuevos} nuevos y ${importacion.resumen.actualizados} actualizados.`,
      tono: 'ok',
    });
  };

  const restaurar = (instantanea: Instantanea) => {
    if (!confirm('Se sustituirán los datos actuales por los de esta instantánea. ¿Continuar?')) return;
    const datos = restaurarInstantanea(instantanea.id);
    if (!datos) {
      setMensaje({ texto: 'Esa instantánea ya no está disponible.', tono: 'error' });
      return;
    }
    reemplazarTodo(datos, 'antes_de_restaurar');
    setAjustes(datos.ajustes);
    setInstantaneas(listarInstantaneas());
    setMensaje({ texto: `Restaurada la instantánea del ${momento(instantanea.creadoEn)}.`, tono: 'ok' });
  };

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
            <Campo etiqueta="Serie de facturación" pista="Prefijo del número: 2026 → 2026-007">
              <input
                value={ajustes.serieFactura}
                onChange={(e) => setAjustes({ ...ajustes, serieFactura: e.target.value })}
                placeholder="Sin prefijo"
              />
            </Campo>
            <Campo etiqueta="Dígitos del número" pista="3 → 007">
              <input
                type="number"
                min={1}
                max={8}
                value={ajustes.digitosFactura}
                onChange={(e) => setAjustes({ ...ajustes, digitosFactura: Number(e.target.value) })}
              />
            </Campo>
            <Campo etiqueta="Avisar de copia cada" pista="Días sin copia antes de avisar en el panel">
              <input
                type="number"
                min={1}
                max={90}
                value={ajustes.diasAvisoCopia}
                onChange={(e) => setAjustes({ ...ajustes, diasAvisoCopia: Number(e.target.value) })}
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

        <Panel
          titulo="Copia de seguridad"
          icono="descargar"
          acciones={
            <Insignia
              texto={copia.dias === null ? 'Sin copia' : copia.avisar ? 'Copia pendiente' : 'Al día'}
              tono={copia.dias === null || copia.avisar ? 'aviso' : 'ok'}
            />
          }
        >
          <p className="texto-2 pequeno">
            {recuento.total} registros guardados solo en este navegador: {recuento.clientes} clientes,{' '}
            {recuento.proyectos} proyectos, {recuento.cortes} cortes, {recuento.movimientos} movimientos,{' '}
            {recuento.seguimientos} seguimientos, {recuento.plantillas} plantillas y {recuento.decisiones} decisiones.
          </p>
          <p className="texto-3 pequeno">
            {db.ajustes.ultimaCopia
              ? `Última copia: ${momento(db.ajustes.ultimaCopia)}${
                  copia.dias ? ` · hace ${copia.dias} día${copia.dias === 1 ? '' : 's'}` : ' · hoy'
                }.`
              : 'Todavía no has exportado ninguna copia.'}{' '}
            {copia.hayCambios && 'Hay cambios posteriores a la última copia.'} El archivo exportado es lo único
            que sobrevive si borras los datos del navegador o cambias de equipo.
          </p>
          <div className="fila" style={{ marginTop: 12 }}>
            <button type="button" className="btn primario" onClick={exportar}>
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
                if (archivo) void prepararImportacion(archivo);
                e.target.value = '';
              }}
            />
          </div>
        </Panel>

        <Panel
          titulo="Instantáneas de este navegador"
          icono="reloj"
          sinRelleno
          acciones={
            <button
              type="button"
              className="btn pequeno"
              disabled={recuento.total === 0}
              title={recuento.total === 0 ? 'No hay nada que guardar' : undefined}
              onClick={() => {
                setInstantaneas(crearInstantanea(db, 'manual'));
                setMensaje({ texto: 'Instantánea creada.', tono: 'ok' });
              }}
            >
              <Icono nombre="mas" />
              Crear ahora
            </button>
          }
          pie={
            <div className="panel-cuerpo pequeno texto-3" style={{ borderTop: '1px solid var(--borde)' }}>
              Sirven para deshacer un borrado o una importación que no querías. Viven en este mismo navegador, así
              que <strong>no sustituyen a la copia en archivo</strong>.
            </div>
          }
        >
          {instantaneas.length === 0 ? (
            <Vacio titulo="Sin instantáneas" descripcion="Se crea una sola al abrir la app cada día." icono="reloj" />
          ) : (
            <div className="lista">
              {instantaneas.map((instantanea) => (
                <div className="lista-item" key={instantanea.id}>
                  <div className="crecer">
                    <div className="titulo">{momento(instantanea.creadoEn)}</div>
                    <div className="meta">
                      {MOTIVOS[instantanea.motivo]} · {instantanea.registros} registros
                    </div>
                  </div>
                  <button type="button" className="btn pequeno" onClick={() => restaurar(instantanea)}>
                    Restaurar
                  </button>
                  <BotonBorrar
                    etiqueta=""
                    onBorrar={() => setInstantaneas(borrarInstantanea(instantanea.id))}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel titulo="Juego de datos de ejemplo" icono="rayo">
          <p className="texto-2 pequeno">
            Carga clientes, proyectos, cortes, decisiones y cobros ficticios para ver el panel con contenido.
            Sustituye lo que tengas ahora, pero antes se guarda una instantánea por si acaso.
          </p>
          <div className="fila" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn primario"
              onClick={() => {
                if (recuento.total > 0 && !confirm('Esto reemplaza los datos actuales. ¿Continuar?')) return;
                const datos = datosEjemplo();
                reemplazarTodo(datos, 'antes_de_ejemplo');
                setAjustes(datos.ajustes);
                setInstantaneas(listarInstantaneas());
                setMensaje({ texto: 'Datos de ejemplo cargados.', tono: 'ok' });
              }}
            >
              <Icono nombre="rayo" />
              Cargar datos de ejemplo
            </button>
          </div>
        </Panel>

        <Panel titulo="Zona peligrosa" icono="aviso">
          <p className="texto-2 pequeno">
            Borra todo el contenido guardado en este navegador. Queda una instantánea desde la que puedes volver,
            pero no cuentes con ella: exporta antes.
          </p>
          <div className="fila" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn peligro"
              onClick={() => {
                if (!confirm('Se borrarán todos los datos locales. ¿Seguro?')) return;
                reiniciar();
                setInstantaneas(listarInstantaneas());
                setMensaje({ texto: 'Datos borrados. Puedes recuperarlos desde la última instantánea.', tono: 'ok' });
              }}
            >
              <Icono nombre="borrar" />
              Borrar todos los datos
            </button>
          </div>
        </Panel>
      </div>

      {importacion && (
        <Modal
          titulo="Importar copia"
          onCerrar={() => setImportacion(null)}
          pie={
            <>
              <button type="button" className="btn" onClick={() => setImportacion(null)}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={() => aplicarImportacion('reemplazar')}>
                Reemplazar todo
              </button>
              <button
                type="button"
                className="btn primario"
                onClick={() => aplicarImportacion('fusionar')}
                disabled={importacion.resumen.nuevos + importacion.resumen.actualizados === 0}
              >
                <Icono nombre="check" />
                Fusionar
              </button>
            </>
          }
        >
          <p className="pequeno texto-2">
            Archivo <span className="mono">{importacion.nombre}</span>: {contar(importacion.datos).total} registros.
          </p>

          <div className="grid grid-3">
            <div>
              <div className="kpi-etiqueta">Nuevos</div>
              <div className="kpi-valor">{importacion.resumen.nuevos}</div>
            </div>
            <div>
              <div className="kpi-etiqueta">Actualizados</div>
              <div className="kpi-valor">{importacion.resumen.actualizados}</div>
            </div>
            <div>
              <div className="kpi-etiqueta">Sin cambios</div>
              <div className="kpi-valor">{importacion.resumen.iguales}</div>
            </div>
          </div>

          <div className="pequeno texto-3">
            <p>
              <strong className="texto-2">Fusionar</strong> añade lo que falta y actualiza lo que coincide por id.
              No borra nada de lo que solo está en este navegador, y deja tus preferencias como están.
            </p>
            <p>
              <strong className="texto-2">Reemplazar todo</strong> deja el documento exactamente como el archivo,
              preferencias incluidas. Tus {recuento.total} registros actuales desaparecen de la vista.
            </p>
            <p>En los dos casos se guarda antes una instantánea, así que puedes deshacerlo.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
