import unsplashPhotos from './unsplashPhotos.json';

/**
 * Catálogo de las imágenes de los ejercicios de vocabulario.
 *
 * Cada entrada tiene dos representaciones del mismo concepto:
 *
 * - `photo`: la fotografía de Unsplash (https://unsplash.com) descargada al
 *   repositorio en `public/images/exercises/photos/`. Es lo que se muestra.
 * - `drawing`: el dibujo SVG propio, que actúa de respaldo si esa foto todavía
 *   no se ha incorporado o si el archivo no llega a cargar en el navegador.
 *
 * Las dos llevan su propio `alt`, y la pantalla de ejercicio usa el de la imagen
 * que realmente ha pintado. No es un detalle menor: el `alt` es la ÚNICA vía por
 * la que una persona ciega recibe el contenido de la imagen (WCAG 1.1.1), así
 * que describir un dibujo cuando en pantalla hay una fotografía —o al revés—
 * dejaría el ejercicio sin solución.
 *
 * Qué foto corresponde a cada concepto se declara en `unsplashPhotos.json`, que
 * es la única fuente de verdad: de ahí salen tanto las imágenes de la app como
 * los créditos de ATTRIBUTIONS.md. Para incorporar o cambiar fotos, edita ese
 * archivo y ejecuta `npm run photos:fetch`; `npm run photos:check` valida que
 * cada foto declarada existe en disco y tiene su atribución completa.
 */

/** Atribución de una foto de Unsplash. */
export interface PhotoCredit {
  /** Identificador de la foto en Unsplash (el `photo-…` de images.unsplash.com). */
  id: string;
  /** Nombre del autor tal y como aparece en Unsplash. */
  photographer: string;
  /** Perfil del autor en Unsplash. */
  photographerUrl: string;
  /** Página de la foto en Unsplash. */
  photoUrl: string;
}

/** Fotografía de Unsplash, servida desde el propio repositorio. */
export interface ExercisePhoto {
  src: string;
  /**
   * Descripción en español de LO QUE SE VE EN LA FOTO, con detalle suficiente
   * para responder al ejercicio sin verla.
   */
  alt: string;
  credit: PhotoCredit;
}

/** Dibujo SVG propio, respaldo de la fotografía. */
export interface ExerciseDrawing {
  src: string;
  alt: string;
}

export interface ExerciseImage {
  /** Foto de Unsplash, o `null` mientras no se haya incorporado. */
  photo: ExercisePhoto | null;
  drawing: ExerciseDrawing;
}

type PhotoManifestEntry = PhotoCredit & { alt: string };

const manifest = (unsplashPhotos as { photos?: Record<string, PhotoManifestEntry> }).photos ?? {};

/**
 * Une la foto declarada en el manifiesto con su ruta en `public/`. Devuelve
 * `null` si el concepto aún no tiene foto elegida, y entonces se usa el dibujo.
 */
function photoFor(key: string): ExercisePhoto | null {
  const entry = manifest[key];
  if (!entry) return null;

  const { alt, ...credit } = entry;
  return {
    src: `/images/exercises/photos/${key}.jpg`,
    alt,
    credit,
  };
}

/** La clave del concepto da nombre al SVG, al archivo de la foto y a su entrada en el manifiesto. */
const image = (key: string, drawingAlt: string): ExerciseImage => ({
  photo: photoFor(key),
  drawing: { src: `/images/exercises/${key}.svg`, alt: drawingAlt },
});

export const exerciseImages = {
  dog: image('dog', 'Dibujo de un perro marrón con las orejas caídas, visto de frente'),
  cat: image('cat', 'Dibujo de un gato naranja con orejas puntiagudas y bigotes'),
  house: image('house', 'Dibujo de una casa amarilla con tejado rojo, una puerta y dos ventanas'),
  book: image('book', 'Dibujo de un libro abierto con dos páginas y líneas de texto'),
  sun: image('sun', 'Dibujo del sol, un círculo amarillo con rayos alrededor'),
  tree: image('tree', 'Dibujo de un árbol con tronco marrón y copa verde sobre la hierba'),
  apple: image('apple', 'Dibujo de una manzana roja con una hoja verde y el rabito marrón'),
  bread: image('bread', 'Dibujo de una barra de pan dorada con tres cortes en la corteza'),
  car: image('car', 'Dibujo de un coche rojo de perfil, con dos ventanillas y dos ruedas'),
  bus: image('bus', 'Dibujo de un autobús naranja de perfil, con tres ventanillas grandes'),
  bicycle: image('bicycle', 'Dibujo de una bicicleta azul de perfil, con dos ruedas y manillar'),
  train: image('train', 'Dibujo de un tren azul sobre las vías, con chimenea y tres ruedas'),
  airplane: image('airplane', 'Dibujo de un avión azul volando, visto desde un lado'),
  boat: image('boat', 'Dibujo de un barco de vela sobre el agua, con una vela blanca y otra roja'),
} satisfies Record<string, ExerciseImage>;
