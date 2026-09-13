/**
 * Mete el CSS, el JavaScript y el icono dentro de un unico HTML.
 *
 * Un navegador bloquea por CORS los modulos cargados desde file://, pero
 * ejecuta sin problema un modulo escrito en linea. Al inlinarlo todo, el
 * archivo resultante se abre con doble clic, sin servidor y sin conexion.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SALIDA = join(DIST, 'gremio.html');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No hay dist/index.html. Ejecuta antes: npm run build');
  process.exit(1);
}

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

/** Un "</script>" dentro del codigo cerraria la etiqueta antes de tiempo. */
const escaparCierre = (codigo) => codigo.replace(/<\/script/gi, '<\\/script');

/**
 * Sustituye pasando una funcion: si el reemplazo fuese una cadena, las
 * secuencias $& o $` del codigo minificado se interpretarian como referencias
 * a la coincidencia y romperian el archivo.
 */
const sustituir = (texto, etiqueta, contenido) => texto.replace(etiqueta, () => contenido);

const estilos = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
for (const [etiqueta, ruta] of estilos) {
  const css = readFileSync(join(DIST, ruta.replace(/^\.?\//, '')), 'utf8');
  html = sustituir(html, etiqueta, `<style>\n${css}\n</style>`);
}

const guiones = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)];
for (const [etiqueta, ruta] of guiones) {
  const js = readFileSync(join(DIST, ruta.replace(/^\.?\//, '')), 'utf8');
  html = sustituir(html, etiqueta, `<script type="module">\n${escaparCierre(js)}\n</script>`);
}

const iconos = [...html.matchAll(/<link[^>]+rel="icon"[^>]*href="([^"]+)"[^>]*>/g)];
for (const [etiqueta, ruta] of iconos) {
  const archivo = join(DIST, ruta.replace(/^\.?\//, ''));
  if (!existsSync(archivo)) continue;
  const svg = readFileSync(archivo, 'utf8');
  const datos = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  html = sustituir(html, etiqueta, `<link rel="icon" type="image/svg+xml" href="${datos}" />`);
}

const pendientes = /(<script[^>]*src=)|(<link[^>]+rel="stylesheet")/.test(html);
if (pendientes) {
  console.error('Han quedado recursos externos sin inlinar. Revisa scripts/empaquetar.mjs');
  process.exit(1);
}

writeFileSync(SALIDA, html);
console.log(`${SALIDA} · ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB · ábrelo con doble clic`);
