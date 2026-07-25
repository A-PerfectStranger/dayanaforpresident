import { useState } from 'react';
import type { ExerciseImage as ExerciseImageData } from '../data/exerciseImages';

interface ExerciseImageProps {
  id: string;
  image: ExerciseImageData;
}

/**
 * Imagen de un ejercicio de vocabulario.
 *
 * Muestra la fotografía de Unsplash y, si no hay foto o el archivo no carga,
 * cae al dibujo SVG propio. Lo importante es que el `alt` cambia con ella: cada
 * imagen describe lo que de verdad se está pintando, porque ese texto es la
 * única vía por la que una persona ciega resuelve el ejercicio (WCAG 1.1.1).
 *
 * El respaldo se resuelve con `onError` en lugar de comprobar el archivo antes,
 * de modo que un fallo de red o un despliegue sin las fotos degrada a dibujo en
 * vez de dejar el hueco vacío.
 */
export function ExerciseImage({ id, image }: Readonly<ExerciseImageProps>) {
  // Se guarda la ruta que falló, no un booleano: así, al pasar al siguiente
  // ejercicio, la foto nueva se intenta igualmente aunque la anterior fallara.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const { photo, drawing } = image;
  const shown = photo !== null && photo.src !== failedSrc ? photo : drawing;

  return (
    <img
      id={id}
      src={shown.src}
      alt={shown.alt}
      width={224}
      height={224}
      decoding="async"
      onError={() => setFailedSrc(shown.src)}
      className="w-56 h-56 max-w-full object-cover mx-auto mb-4 rounded-2xl border-2 border-slate-200 bg-white shadow-sm"
    />
  );
}
