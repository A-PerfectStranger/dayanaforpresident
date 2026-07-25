
  # LinguaFlow AF

  This is a code bundle for LinguaFlow AF. The original project is available at https://www.figma.com/design/1W6IQHI3eEeHVb8Pjc9GWY/LinguaFlow-AF.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Contenido: niveles de inglés (MCER)

  La app cubre **los seis niveles del Marco Común Europeo de Referencia**, cada uno con su propia unidad, lecciones y ejercicios:

  | Unidad | Nivel | Contenido |
  |--------|-------|-----------|
  | 1 | A1 — Principiante | Saludos, verbo *to be*, presente simple, familia, **vocabulario con imágenes (animales y casa)** |
  | 2 | A2 — Elemental | Pasado simple, presente continuo, comida, preguntas *wh-*, **vocabulario con imágenes (transporte)** |
  | 3 | B1 — Intermedio | Pasado continuo, presente perfecto, trabajo, condicionales 1 y 2 |
  | 4 | B2 — Intermedio alto | Presente perfecto continuo, voz pasiva, viajes, estilo indirecto |
  | 5 | C1 — Avanzado | Tercer condicional, phrasal verbs, conectores, modales de deducción |
  | 6 | C2 — Maestría | Expresiones idiomáticas, estructuras enfáticas, registro formal, colocaciones |

  Cada lección incluye 6 tipos de ejercicio (selección múltiple, **imagen con opciones**, completar oración, ordenar palabras, traducción y pronunciación) con retroalimentación explicativa inmediata.

  ### Ejercicios con imágenes

  Los ejercicios de tipo `image-choice` muestran una imagen (por ejemplo, un perro) y piden elegir cómo se dice en inglés entre cuatro opciones.

  Cada concepto tiene **dos** imágenes, y las dos viven en el catálogo `src/app/data/exerciseImages.ts`:

  1. **La fotografía**, obtenida de [Unsplash](https://unsplash.com) y guardada en el propio repositorio, en `public/images/exercises/photos/`. Es lo que se muestra.
  2. **El dibujo SVG propio**, en `public/images/exercises/`, que actúa de respaldo: se pinta si el concepto todavía no tiene foto elegida o si el archivo no llega a cargar en el navegador. Así la app nunca deja el hueco vacío ni depende de que un archivo esté presente.

  Para que estos ejercicios funcionen igual sin ver la pantalla, **cada una de las dos imágenes lleva su propio `alt`** en español, y la pantalla usa el de la que realmente ha pintado: «Fotografía de un perro…» cuando se ve la foto, «Dibujo de un perro marrón con las orejas caídas, visto de frente» cuando se ve el dibujo. Describir un dibujo mientras en pantalla hay una fotografía dejaría el ejercicio sin solución. Ese texto:

  - se lee al entrar en el ejercicio, dentro del enunciado completo;
  - acompaña a cada opción de respuesta mediante `aria-describedby`, de modo que al recorrer las respuestas se vuelve a oír de qué imagen se trata.

  El `alt` es obligatorio en las dos imágenes del tipo `ExerciseImage`: sin él, el ejercicio no tendría solución para una persona ciega.

  #### Añadir o cambiar una foto

  Qué foto de Unsplash corresponde a cada concepto se declara en `src/app/data/unsplashPhotos.json`, que es la única fuente de verdad: de ahí salen las imágenes de la app y los créditos de `ATTRIBUTIONS.md`. Cada entrada lleva el identificador de la foto, su `alt` y la atribución del autor:

  ```json
  {
    "photos": {
      "dog": {
        "id": "photo-1543466835-00a7907e9de1",
        "alt": "Fotografía de un perro labrador dorado sentado sobre la hierba, mirando a la cámara",
        "photographer": "Nombre del autor",
        "photographerUrl": "https://unsplash.com/@usuario",
        "photoUrl": "https://unsplash.com/photos/identificador"
      }
    }
  }
  ```

  Después:

  ```bash
  npm run photos:fetch   # descarga las fotos a public/ y regenera los créditos
  npm run photos:check   # valida catálogo, atribución y archivos, sin tocar la red
  ```

  `photos:fetch` pide las fotos al CDN de Unsplash ya recortadas a 448 × 448 (el doble de los 224 px a los que se pintan, para pantallas de densidad doble). `photos:check` falla si una foto declarada no está en disco, si le falta atribución o si su `alt` describe un dibujo en lugar de una fotografía.

  Al elegir una foto, comprueba que el objeto se reconoce **sin contexto y recortado en cuadrado**: la imagen es el enunciado del ejercicio, así que una foto ambigua lo vuelve irresoluble.

  ## Accesibilidad — WCAG 2.2 (nivel AA)

  La app está pensada para usarse **sin ver la pantalla**. Dos reglas guían todo el código de la interfaz:

  1. **La pregunta se lee siempre junto a la respuesta.** Cada ejercicio tiene un grupo de enunciado que recibe el foco al abrirse (tipo de ejercicio, número, instrucción, imagen y pregunta se leen de una vez), y además cada control de respuesta apunta con `aria-describedby` a la pregunta y a la imagen. Así, al recorrer las opciones con el tabulador, el lector de pantalla no dice solo «Good morning», sino «Good morning, opción 1 de 4, ¿Cómo se dice "Buenos días" en inglés?». El botón «Repetir el enunciado» de la barra superior vuelve a leerlo cuando haga falta.
  2. **Ninguna tarjeta informativa queda muda.** Las tarjetas de datos (bienvenida, racha, tiempo, lecciones, resultados) concentran su información en un nombre accesible y son alcanzables con el tabulador, de modo que aparecen tanto al leer la página como al navegar con teclado.
  3. **Nada importante vive solo en texto oculto.** La oración de los ejercicios de completar es un único elemento visible y legible (antes había una copia visual con `aria-hidden` y otra `sr-only`, y algunos lectores no llegaban a ninguna). Cuando el contenido no es un control —como esa oración— se hace además alcanzable con el tabulador.

  ### Teclado en los ejercicios

  Cada grupo de opciones (respuestas, banco de palabras, palabras ya colocadas) es **una sola parada de tabulador**: dentro se circula con **←/→/↑/↓**, con vuelta al principio, y con **Inicio/Fin** se salta a la primera o la última. Antes cada opción era una parada distinta y, si te pasabas una palabra, había que recorrer toda la página para volver a ella. El nombre de cada grupo lo anuncia («Usa las flechas para moverte entre las opciones y Enter para elegir»).

  Recorrido típico de un ejercicio, solo con teclado: enunciado (recibe el foco y se lee entero) → Tab → respuestas (flechas + Enter) → panel de resultado (recibe el foco y se lee entero) → Tab → «Continuar». En los ejercicios de escritura, el cuadro de texto es la **primera** parada tras el enunciado y tiene etiqueta visible asociada.

  La interfaz aplica los cuatro principios POUR de las Pautas de Accesibilidad para el Contenido Web 2.2:

  ### Perceptible
  - Contraste de texto ≥ 4.5:1 y de componentes ≥ 3:1 (criterios 1.4.3 y 1.4.11).
  - Toda imagen de ejercicio lleva `alt` descriptivo en español, que además acompaña a las respuestas (1.1.1).
  - El color nunca es la única señal: aciertos y errores se comunican también con iconos, texto («Tu respuesta, incorrecta»; «Esta era la respuesta correcta») y el panel de resultado (1.4.1).
  - Nombres accesibles en todos los elementos no textuales: estrellas, barras de progreso (`role="progressbar"` con `aria-valuenow`), gráficos radiales e iconos; los elementos decorativos llevan `aria-hidden` (1.1.1).
  - Modo de alto contraste activable desde el perfil, y tipografía Atkinson Hyperlegible de alta legibilidad.

  ### Operable
  - Toda la interfaz es manejable por teclado: las tarjetas interactivas son botones reales y los modales atrapan el foco, dejan inerte el fondo y se cierran con `Escape` (2.1.1, 2.1.2).
  - Los grupos de opciones usan *roving tabindex*: una parada de tabulador por grupo y flechas para moverse dentro (2.4.3, 2.1.1).
  - Enlaces «saltar al contenido» en el layout y en la pantalla de ejercicios (2.4.1).
  - El foco nunca se pierde: se mueve al enunciado al cambiar de ejercicio, al panel de resultado al responder, al resumen al terminar la lección y a la palabra vecina cuando un botón desaparece al ordenar palabras (2.4.3).
  - Foco visible con contorno de 3 px (2.4.7, 2.4.11) y objetivos táctiles de al menos 24×24 px (2.5.8, nuevo en WCAG 2.2).
  - El temporizador de la lección puede pausarse en cualquier momento (2.2.1) y se respeta `prefers-reduced-motion` (2.3.3).

  ### Comprensible
  - `lang="es"` en el documento y `lang="en"` en el contenido en inglés para una pronunciación correcta de los lectores de pantalla (3.1.1, 3.1.2).
  - Título de página propio en cada vista (2.4.2) y navegación consistente en todas las pantallas (3.2.3).
  - Errores identificados con texto y explicación gramatical, no solo con color (3.3.1); las instrucciones acompañan cada ejercicio (3.3.2).

  ### Robusto
  - HTML semántico (`header`, `nav`, `main`, listas) y ARIA correcto: `role="dialog"` con `aria-modal`, `role="switch"` con `aria-checked`, `aria-pressed` en filtros y `aria-expanded` en desplegables (4.1.2).
  - Mensajes de estado anunciados con `role="status"` y `aria-live` sin mover el foco (4.1.3): cambio de pantalla, oración en construcción al completar o al ordenar palabras, resultado del reconocimiento de voz y cambios en el perfil.
  - El ejercicio de pronunciación ofrece **siempre visible** la alternativa de escritura, sin depender del micrófono ni de que el navegador soporte reconocimiento de voz.

  ### Cómo comprobarlo
  Con NVDA, VoiceOver o TalkBack: entra en cualquier lección y tabula por las respuestas; cada una debe leerse junto a la pregunta. En el inicio, tabula por la tarjeta de bienvenida y las tres tarjetas de estadísticas: cada una se anuncia como una frase completa.
