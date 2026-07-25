#!/usr/bin/env node
/**
 * Gestiona las fotos de Unsplash de los ejercicios de vocabulario.
 *
 *   node scripts/unsplash-photos.mjs fetch [--force]
 *       Descarga a public/images/exercises/photos/ las fotos declaradas en
 *       src/app/data/unsplashPhotos.json y regenera los créditos de
 *       ATTRIBUTIONS.md. Con --force vuelve a bajar las que ya existan.
 *
 *   node scripts/unsplash-photos.mjs check
 *       Valida el manifiesto sin tocar la red: claves conocidas, atribución
 *       completa, y que cada foto declarada esté en disco y sea un JPEG.
 *
 * El manifiesto es la única fuente de verdad: la app lee de ahí las imágenes y
 * este script, los archivos y los créditos.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'src/app/data/unsplashPhotos.json');
const CATALOG = path.join(ROOT, 'src/app/data/exerciseImages.ts');
const DRAWINGS_DIR = path.join(ROOT, 'public/images/exercises');
const PHOTOS_DIR = path.join(DRAWINGS_DIR, 'photos');
const ATTRIBUTIONS = path.join(ROOT, 'ATTRIBUTIONS.md');

/**
 * Tamaño de descarga: la imagen se pinta a 224 px con `object-cover`, así que
 * 448 px cubre las pantallas de densidad doble sin engordar el repositorio.
 * El recorte cuadrado lo hace el CDN de Unsplash, no el navegador.
 */
const EDGE = 448;
const photoUrlFor = (id) =>
  `https://images.unsplash.com/${id}?w=${EDGE}&h=${EDGE}&fit=crop&crop=entropy&q=80&fm=jpg`;

const START = '<!-- unsplash:start -->';
const END = '<!-- unsplash:end -->';

// Node no usa HTTPS_PROXY en `fetch` salvo que se le pida antes de arrancar; en
// entornos con proxy (CI, contenedores) el script se relanza a sí mismo con la
// variable puesta para que la descarga no se quede colgada.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
  });
  process.exit(result.status ?? 1);
}

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

/** Claves del catálogo, leídas de exerciseImages.ts para no duplicar la lista. */
async function catalogKeys() {
  const source = await readFile(CATALOG, 'utf8');
  return [...source.matchAll(/^ {2}(\w+): image\('/gm)].map((m) => m[1]);
}

async function readManifest() {
  const raw = JSON.parse(await readFile(MANIFEST, 'utf8'));
  return raw.photos ?? {};
}

const REQUIRED = ['id', 'alt', 'photographer', 'photographerUrl', 'photoUrl'];

/** Comprueba el manifiesto entrada por entrada. Devuelve el nº de errores. */
function validateManifest(photos, keys) {
  let errors = 0;
  const note = (msg) => {
    fail(msg);
    errors++;
  };

  for (const [key, entry] of Object.entries(photos)) {
    if (!keys.includes(key)) {
      note(`«${key}» no es un concepto del catálogo (${keys.join(', ')}).`);
      continue;
    }
    for (const field of REQUIRED) {
      if (!entry[field]) note(`«${key}»: falta «${field}».`);
    }
    if (entry.id && !/^photo-[A-Za-z0-9-]+$/.test(entry.id)) {
      note(`«${key}»: «id» debe ser el identificador de images.unsplash.com (photo-…), no «${entry.id}».`);
    }
    if (entry.photographerUrl && !entry.photographerUrl.startsWith('https://unsplash.com/@')) {
      note(`«${key}»: «photographerUrl» debe apuntar al perfil del autor en Unsplash.`);
    }
    if (entry.photoUrl && !entry.photoUrl.startsWith('https://unsplash.com/photos/')) {
      note(`«${key}»: «photoUrl» debe apuntar a la página de la foto en Unsplash.`);
    }
    // El alt es la única vía de acceso a la imagen para quien no ve: una
    // descripción de tres palabras deja el ejercicio sin resolver.
    if (entry.alt && entry.alt.trim().length < 15) {
      note(`«${key}»: el «alt» es demasiado corto para describir la foto.`);
    }
    if (entry.alt && /^dibujo/i.test(entry.alt.trim())) {
      note(`«${key}»: el «alt» describe un dibujo, pero lo que se muestra es una fotografía.`);
    }
  }
  return errors;
}

/** Un JPEG empieza por FF D8 FF; sirve para no dar por buena una respuesta de error. */
async function isJpeg(file) {
  const { size } = await stat(file);
  if (size < 1024) return false;
  const handle = await readFile(file);
  return handle[0] === 0xff && handle[1] === 0xd8 && handle[2] === 0xff;
}

async function checkFiles(photos) {
  let errors = 0;
  for (const key of Object.keys(photos)) {
    const file = path.join(PHOTOS_DIR, `${key}.jpg`);
    if (!existsSync(file)) {
      fail(`«${key}»: falta ${path.relative(ROOT, file)}. Ejecuta «npm run photos:fetch».`);
      errors++;
    } else if (!(await isJpeg(file))) {
      fail(`«${key}»: ${path.relative(ROOT, file)} no es un JPEG válido.`);
      errors++;
    }
  }
  return errors;
}

async function download(key, entry, force) {
  const file = path.join(PHOTOS_DIR, `${key}.jpg`);
  if (existsSync(file) && !force) {
    console.log(`· ${key}: ya descargada`);
    return true;
  }

  const url = photoUrlFor(entry.id);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    fail(`${key}: Unsplash respondió ${response.status} a ${url}`);
    return false;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    fail(`${key}: la respuesta de Unsplash no es un JPEG.`);
    return false;
  }

  await writeFile(file, bytes);
  console.log(`✓ ${key}: ${(bytes.length / 1024).toFixed(0)} KB · ${entry.photographer}`);
  return true;
}

/** Reescribe el bloque de créditos de ATTRIBUTIONS.md a partir del manifiesto. */
async function writeAttributions(photos, keys) {
  const ordered = keys.filter((key) => photos[key]);
  const lines = ordered.length
    ? ordered.map((key) => {
        const { photographer, photographerUrl, photoUrl } = photos[key];
        return `- **${key}** — [foto](${photoUrl}) de [${photographer}](${photographerUrl})`;
      })
    : ['_Todavía no hay fotos incorporadas; los ejercicios usan los dibujos SVG propios._'];

  const block = [
    START,
    '',
    '### Fotos de los ejercicios',
    '',
    'Fotografías de [Unsplash](https://unsplash.com), usadas según su [licencia](https://unsplash.com/license).',
    'Este bloque lo genera `npm run photos:fetch`; no lo edites a mano.',
    '',
    ...lines,
    '',
    END,
  ].join('\n');

  const current = await readFile(ATTRIBUTIONS, 'utf8');
  const next =
    current.includes(START) && current.includes(END)
      ? current.replace(new RegExp(`${START}[\\s\\S]*${END}`), block)
      : `${current.trimEnd()}\n\n${block}\n`;

  await writeFile(ATTRIBUTIONS, next);
}

async function main() {
  const [command = 'check', ...flags] = process.argv.slice(2);
  const keys = await catalogKeys();
  const photos = await readManifest();

  if (keys.length === 0) {
    fail('No se han podido leer las claves de exerciseImages.ts.');
    return;
  }

  const manifestErrors = validateManifest(photos, keys);

  if (command === 'check') {
    const fileErrors = await checkFiles(photos);
    const pending = keys.filter((key) => !photos[key]);
    if (pending.length) {
      console.log(`\nSin foto todavía (usan el dibujo SVG): ${pending.join(', ')}`);
    }
    if (manifestErrors + fileErrors === 0) {
      console.log(`\n✓ ${Object.keys(photos).length} de ${keys.length} conceptos con foto de Unsplash correcta.`);
    }
    return;
  }

  if (command !== 'fetch') {
    fail(`Comando desconocido «${command}». Usa «fetch» o «check».`);
    return;
  }

  if (manifestErrors > 0) {
    fail('Corrige el manifiesto antes de descargar.');
    return;
  }

  await mkdir(PHOTOS_DIR, { recursive: true });
  const force = flags.includes('--force');
  const entries = keys.filter((key) => photos[key]);

  if (entries.length === 0) {
    console.log('El manifiesto no declara ninguna foto todavía: no hay nada que descargar.');
  }

  for (const key of entries) {
    await download(key, photos[key], force);
  }

  await writeAttributions(photos, keys);
  console.log('\nCréditos actualizados en ATTRIBUTIONS.md');

  // Avisa de fotos huérfanas: archivos que ya no declara el manifiesto.
  if (existsSync(PHOTOS_DIR)) {
    const orphans = (await readdir(PHOTOS_DIR))
      .filter((f) => f.endsWith('.jpg'))
      .filter((f) => !photos[path.basename(f, '.jpg')]);
    if (orphans.length) {
      console.log(`Sobran en public/images/exercises/photos/: ${orphans.join(', ')}`);
    }
  }
}

await main();
