import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pause, CheckCircle2, XCircle, Lightbulb, ChevronRight, Volume2, Mic, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLessonById, type ExerciseItem, type ExerciseType } from '../data/lessons';
import { PauseModal } from '../components/PauseModal';
import { usePageTitle } from '../hooks/usePageTitle';

// ─────────────────────────────────────────────
// Identificadores del enunciado.
//
// Solo hay un ejercicio en pantalla a la vez (AnimatePresence mode="wait"), así
// que los ids pueden ser constantes. Se usan para dos cosas:
//   1. `aria-labelledby` del grupo que recibe el foco al cambiar de ejercicio:
//      el lector de pantalla lee tipo + instrucción + imagen + pregunta de una
//      sola vez, sin duplicar texto (referencia los nodos que ya se muestran).
//   2. `aria-describedby` de CADA control de respuesta: así la pregunta se
//      vuelve a leer junto a la respuesta al tabular por las opciones, que era
//      justo lo que faltaba (antes solo se leía la respuesta).
// ─────────────────────────────────────────────
const COUNTER_ID = 'exercise-counter';
const INSTRUCTION_ID = 'exercise-instruction';
const QUESTION_ID = 'exercise-question';
const IMAGE_ID = 'exercise-image';
const SENTENCE_ID = 'exercise-sentence';
const SPEAK_ID = 'exercise-speaking-phrase';
const ANSWER_ID = 'exercise-current-answer';

const TYPE_NAMES: Record<ExerciseType, string> = {
  'multiple-choice': 'Selección múltiple',
  'image-choice': 'Imagen con opciones',
  'fill-blank': 'Completar oración',
  'word-order': 'Ordenar palabras',
  'translate': 'Traducción',
  'speaking': 'Pronunciación',
};

const TYPE_ICONS: Record<ExerciseType, string> = {
  'multiple-choice': '🔘',
  'image-choice': '🖼️',
  'fill-blank': '✏️',
  'word-order': '🔀',
  'translate': '🌍',
  'speaking': '🎤',
};

// Texto que se añade al nombre de cada grupo de botones para que quien no ve la
// pantalla sepa que puede moverse con las flechas.
const ARROW_HINT = 'Usa las flechas para moverte entre las opciones y Enter para elegir';

// ─────────────────────────────────────────────
// Navegación con flechas dentro de un grupo de botones (roving tabindex).
//
// Antes cada opción era una parada de tabulador y, si te pasabas una palabra,
// había que recorrer toda la página para volver a ella. Ahora el grupo entero
// ocupa UNA parada: dentro se circula con ←/→/↑/↓ (con vuelta al principio) e
// Inicio/Fin, y Tab sale del grupo. Es el patrón de las prácticas ARIA para
// widgets compuestos.
//
// El tabindex se ajusta sobre el DOM tras cada render porque el conjunto de
// botones cambia (palabras que pasan del banco a la respuesta y viceversa).
// ─────────────────────────────────────────────
function useArrowNavigation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);

  const getButtons = () =>
    Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []).filter(b => !b.disabled);

  const applyTabIndex = (buttons: HTMLButtonElement[], activeIndex: number) => {
    buttons.forEach((button, i) => { button.tabIndex = i === activeIndex ? 0 : -1; });
  };

  useEffect(() => {
    const buttons = getButtons();
    if (buttons.length === 0) return;
    activeIndexRef.current = Math.min(activeIndexRef.current, buttons.length - 1);
    applyTabIndex(buttons, activeIndexRef.current);
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = getButtons();
    if (buttons.length === 0) return;
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % buttons.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    activeIndexRef.current = nextIndex;
    applyTabIndex(buttons, nextIndex);
    buttons[nextIndex].focus();
  };

  // Al llegar al grupo con el ratón, con el cursor del lector o por foco
  // programado, la parada de tabulador pasa a ser el botón donde estás.
  const handleFocus = (event: React.FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const buttons = getButtons();
    const index = buttons.indexOf(target);
    if (index === -1) return;
    activeIndexRef.current = index;
    applyTabIndex(buttons, index);
  };

  return { containerRef, groupProps: { onKeyDown: handleKeyDown, onFocus: handleFocus } };
}

// ─────────────────────────────────────────────
// Answer normalisation
// ─────────────────────────────────────────────
function normalise(s: string) {
  return s.toLowerCase().trim().replace(/[.!?]$/, '').trim().replace(/\s+/g, ' ');
}
function checkAnswer(userAns: string, correct: string, accepted?: string[]): boolean {
  const n = normalise(userAns);
  return [correct, ...(accepted ?? [])].map(normalise).includes(n);
}

// Shared text-answer submission logic for Translate & Speaking
function useTextAnswer(exercise: ExerciseItem, onAnswer: (answer: string) => void) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!value.trim() || submitted) return;
    setSubmitted(true);
    onAnswer(value.trim());
  };

  const isCorrect = checkAnswer(value, exercise.correctAnswer, exercise.acceptedAnswers);

  return { value, setValue, submitted, submit, isCorrect };
}

// ─────────────────────────────────────────────
// Opciones (selección múltiple y ejercicios con imagen)
//
// El nombre accesible de cada botón se calcula desde su contenido (no con
// aria-label) para poder marcar la palabra inglesa con lang="en" y que el
// lector de pantalla la pronuncie con voz inglesa (WCAG 3.1.2).
// ─────────────────────────────────────────────
function ChoiceOptions({
  exercise,
  onAnswer,
  describedBy,
}: Readonly<{
  exercise: ExerciseItem;
  onAnswer: (answer: string) => void;
  describedBy: string;
}>) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = exercise.options ?? [];
  const { containerRef, groupProps } = useArrowNavigation();

  const pick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    onAnswer(opt);
  };

  return (
    <div
      ref={containerRef}
      {...groupProps}
      className="space-y-3"
      role="group"
      aria-label={`Opciones de respuesta. ${ARROW_HINT}`}
    >
      {options.map((opt, i) => {
        const isChosenRight = selected === opt && opt === exercise.correctAnswer;
        const isChosenWrong = selected === opt && opt !== exercise.correctAnswer;
        const isRevealedCorrect = !!selected && !isChosenRight && opt === exercise.correctAnswer;

        let optionClass: string;
        let indicatorClass: string;
        if (isChosenRight || isRevealedCorrect) {
          optionClass = 'border-green-400 bg-green-50 text-green-800';
          indicatorClass = 'border-green-500 bg-green-500';
        } else if (isChosenWrong) {
          optionClass = 'border-red-400 bg-red-50 text-red-800';
          indicatorClass = 'border-red-400 bg-red-400';
        } else {
          optionClass = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700';
          indicatorClass = 'border-slate-300';
        }

        // Estado leído por el lector de pantalla: el color nunca es la única
        // señal de acierto o error (WCAG 1.4.1).
        let stateText = '';
        if (isChosenRight) stateText = '. Tu respuesta, correcta';
        else if (isChosenWrong) stateText = '. Tu respuesta, incorrecta';
        else if (isRevealedCorrect) stateText = '. Esta era la respuesta correcta';

        return (
          <button
            key={opt}
            onClick={() => pick(opt)}
            disabled={!!selected}
            aria-describedby={describedBy}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${optionClass}`}
            style={{ fontWeight: 500 }}
          >
            <span className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${indicatorClass}`}
                aria-hidden="true"
              >
                {(isChosenRight || isRevealedCorrect) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                {isChosenWrong && <XCircle className="w-3.5 h-3.5 text-white" />}
              </span>
              <span lang="en">{opt}</span>
              <span className="sr-only">. Opción {i + 1} de {options.length}{stateText}</span>
              {(isChosenRight || isRevealedCorrect) && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" aria-hidden="true" />}
              {isChosenWrong && <XCircle className="w-4 h-4 text-red-500 ml-auto" aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Fill Blank
// ─────────────────────────────────────────────
function FillBlank({
  exercise,
  onAnswer,
}: Readonly<{
  exercise: ExerciseItem;
  onAnswer: (answer: string) => void;
}>) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { containerRef, groupProps } = useArrowNavigation();

  const pick = (word: string) => {
    if (submitted) return;
    setChosen(prev => (prev === word ? null : word));
  };

  const submit = () => {
    if (!chosen || submitted) return;
    setSubmitted(true);
    onAnswer(chosen);
  };

  const parts = exercise.sentence!.split('[BLANK]');
  const wordBank = exercise.wordBank ?? [];
  const isCorrect = chosen === exercise.correctAnswer;

  let blankClass: string;
  if (!chosen) {
    blankClass = 'border-dashed border-slate-300 bg-white text-slate-500';
  } else if (submitted && isCorrect) {
    blankClass = 'border-green-400 bg-green-100 text-green-800';
  } else if (submitted && !isCorrect) {
    blankClass = 'border-red-400 bg-red-100 text-red-800';
  } else {
    blankClass = 'border-indigo-400 bg-indigo-100 text-indigo-800';
  }

  return (
    <div className="space-y-5">
      {/* La oración es UN SOLO elemento visible y legible: nada de una copia
          visual con aria-hidden y otra copia sr-only. Cualquier lector de
          pantalla (o lector simple que solo recorra el texto visible) la
          encuentra al leer la página. Además es región viva, así que al elegir
          una palabra se anuncia cómo queda la oración completa, y es la
          descripción de cada botón del banco (aria-describedby). */}
      {/* tabIndex={0}: quien navega solo con Tab nunca llega al texto que no es
          un control, así que la oración es además una parada de tabulador
          justo antes de las palabras. */}
      <p
        id={SENTENCE_ID}
        role="status"
        aria-live="polite"
        tabIndex={0}
        className="bg-slate-50 rounded-2xl p-4 text-center"
        style={{ fontSize: '1rem', lineHeight: 1.6, color: '#1e293b', fontWeight: 500 }}
      >
        <span className="sr-only">Oración: </span>
        <span lang="en">{parts[0]}</span>
        <span
          className={`inline-block min-w-[80px] px-3 py-0.5 mx-1 rounded-lg border-2 transition-colors ${blankClass}`}
          style={{ fontWeight: 600 }}
        >
          {chosen
            ? <span lang="en">{chosen}</span>
            : <><span aria-hidden="true">___</span><span className="sr-only">espacio en blanco</span></>}
        </span>
        <span lang="en">{parts[1]}</span>
      </p>

      {/* Word bank */}
      <div
        ref={containerRef}
        {...groupProps}
        className="flex flex-wrap gap-2 justify-center"
        role="group"
        aria-label={`Palabras para completar la oración. ${ARROW_HINT}`}
      >
        {wordBank.map((word, i) => {
          const isChosenWord = chosen === word;
          let wordClass: string;
          if (isChosenWord && submitted) {
            wordClass = isCorrect ? 'border-green-400 bg-green-100 text-green-800' : 'border-red-400 bg-red-100 text-red-800';
          } else if (isChosenWord) {
            wordClass = 'border-indigo-400 bg-indigo-100 text-indigo-700';
          } else if (submitted) {
            wordClass = 'border-slate-200 bg-slate-100 text-slate-400 opacity-50';
          } else {
            wordClass = 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50';
          }
          return (
            <button
              key={word}
              onClick={() => pick(word)}
              disabled={submitted}
              aria-pressed={isChosenWord}
              aria-describedby={SENTENCE_ID}
              className={`px-4 py-2 rounded-xl border-2 transition-all ${wordClass}`}
              style={{ fontWeight: 500 }}
            >
              <span lang="en">{word}</span>
              <span className="sr-only">. Palabra {i + 1} de {wordBank.length}</span>
            </button>
          );
        })}
      </div>

      {/* Submit */}
      {!submitted && (
        <button
          onClick={submit}
          disabled={!chosen}
          aria-describedby={SENTENCE_ID}
          className={`w-full py-3.5 rounded-2xl transition-all ${
            chosen
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          style={{ fontWeight: 600 }}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Word Order
// ─────────────────────────────────────────────
function WordOrder({
  exercise,
  onAnswer,
}: Readonly<{
  exercise: ExerciseItem;
  onAnswer: (answer: string) => void;
}>) {
  const [available, setAvailable] = useState<string[]>([...(exercise.wordBank ?? [])]);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Dos grupos navegables con flechas: la respuesta en construcción y el banco
  // de palabras. Cada uno es una sola parada de tabulador.
  const answerNav = useArrowNavigation();
  const bankNav = useArrowNavigation();
  const answerRef = answerNav.containerRef;
  const bankRef = bankNav.containerRef;

  // Al elegir o quitar una palabra su botón desaparece del DOM y el foco se
  // caería al <body>: quien navega con teclado o lector de pantalla tendría que
  // recorrer la página otra vez. Lo movemos al botón que ocupa ese hueco
  // (WCAG 2.4.3, orden del foco).
  const submitRef = useRef<HTMLButtonElement>(null);
  const [focusTarget, setFocusTarget] = useState<{ zone: 'bank' | 'answer'; index: number } | null>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const focusIn = (container: HTMLElement | null, index: number) => {
      const buttons = container?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
      if (!buttons || buttons.length === 0) return false;
      buttons[Math.min(index, buttons.length - 1)].focus();
      return true;
    };
    const primary = focusTarget.zone === 'bank' ? bankRef.current : answerRef.current;
    const fallback = focusTarget.zone === 'bank' ? answerRef.current : bankRef.current;
    if (!focusIn(primary, focusTarget.index)) {
      // Si el banco se queda vacío, lo siguiente que toca es comprobar.
      if (focusTarget.zone === 'bank' && submitRef.current) {
        submitRef.current.focus();
      } else if (!focusIn(fallback, 0)) {
        submitRef.current?.focus();
      }
    }
    setFocusTarget(null);
  }, [focusTarget]);

  const addWord = (word: string, idx: number) => {
    if (submitted) return;
    setAvailable(a => a.filter((_, i) => i !== idx));
    setSelected(s => [...s, word]);
    setFocusTarget({ zone: 'bank', index: idx });
  };

  const removeWord = (idx: number) => {
    if (submitted) return;
    const word = selected[idx];
    setSelected(s => s.filter((_, i) => i !== idx));
    setAvailable(a => [...a, word]);
    setFocusTarget({ zone: 'answer', index: idx });
  };

  const submit = () => {
    if (selected.length === 0 || submitted) return;
    setSubmitted(true);
    onAnswer(selected.join(' '));
  };

  const userAnswer = selected.join(' ');
  const isCorrect = checkAnswer(userAnswer, exercise.correctAnswer);

  let answerAreaClass: string;
  if (submitted) {
    answerAreaClass = isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';
  } else {
    answerAreaClass = 'border-dashed border-slate-300';
  }

  return (
    <div className="space-y-5">
      {/* Respuesta en construcción: región viva + descripción de los botones,
          para que quien no ve la pantalla sepa siempre cómo va la oración. */}
      <p id={ANSWER_ID} className="sr-only" role="status" aria-live="polite">
        {selected.length === 0
          ? 'Tu respuesta está vacía.'
          : <>Tu respuesta: <span lang="en">{userAnswer}</span></>}
      </p>

      {/* Answer area */}
      <div
        ref={answerRef}
        {...answerNav.groupProps}
        className={`min-h-[3.5rem] bg-white rounded-2xl border-2 p-3 flex flex-wrap gap-2 transition-colors ${answerAreaClass}`}
        role="group"
        aria-label={`Tu respuesta. Activa una palabra para quitarla. ${ARROW_HINT}`}
      >
        {selected.length === 0 && (
          <span className="text-slate-500 self-center mx-auto" style={{ fontSize: '0.85rem' }}>
            Elige palabras del banco de abajo para ordenarlas
          </span>
        )}
        {selected.map((word, i) => {
          let selectedWordClass: string;
          if (submitted) {
            selectedWordClass = isCorrect ? 'border-green-400 bg-green-100 text-green-800' : 'border-red-300 bg-red-100 text-red-800';
          } else {
            selectedWordClass = 'border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200';
          }
          return (
            <button
              key={`${word}-${i}`}
              onClick={() => removeWord(i)}
              disabled={submitted}
              className={`px-3 py-1.5 rounded-xl border-2 transition-all ${selectedWordClass}`}
              style={{ fontWeight: 600 }}
            >
              <span lang="en">{word}</span>
              <span className="sr-only">. Posición {i + 1} de tu respuesta. Activa para quitarla</span>
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-px bg-slate-100" aria-hidden="true" />

      {/* Word bank */}
      <div
        ref={bankRef}
        {...bankNav.groupProps}
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={`Banco de palabras disponibles. ${ARROW_HINT}`}
      >
        {available.map((word, i) => (
          <button
            key={`${word}-${i}`}
            onClick={() => addWord(word, i)}
            disabled={submitted}
            aria-describedby={ANSWER_ID}
            className={`px-3 py-2 rounded-xl border-2 transition-all ${
              submitted
                ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-40'
                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 active:scale-95'
            }`}
            style={{ fontWeight: 500 }}
          >
            <span lang="en">{word}</span>
            <span className="sr-only">. Palabra {i + 1} de {available.length} disponibles. Activa para añadirla a tu respuesta</span>
          </button>
        ))}
      </div>

      {/* Submit */}
      {!submitted && (
        <button
          ref={submitRef}
          onClick={submit}
          disabled={selected.length === 0}
          aria-describedby={ANSWER_ID}
          className={`w-full py-3.5 rounded-2xl transition-all ${
            selected.length > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          style={{ fontWeight: 600 }}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Translate
// ─────────────────────────────────────────────
function Translate({
  exercise,
  onAnswer,
}: Readonly<{
  exercise: ExerciseItem;
  onAnswer: (answer: string) => void;
}>) {
  const { value, setValue, submitted, submit, isCorrect } = useTextAnswer(exercise, onAnswer);

  let textareaClass: string;
  if (submitted) {
    textareaClass = isCorrect ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800';
  } else {
    textareaClass = 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400';
  }

  return (
    <div className="space-y-4">
      {/* Etiqueta VISIBLE asociada al campo (antes solo existía un aria-label):
          se lee al recorrer la página, es un objetivo de clic y deja claro que
          lo siguiente en el orden de tabulación es el cuadro de escritura. El
          nombre del campo incluye además la frase a traducir. */}
      <label
        htmlFor="translate-answer"
        id="translate-answer-label"
        className="block text-slate-700"
        style={{ fontWeight: 600, fontSize: '0.9rem' }}
      >
        Escribe aquí tu respuesta en inglés:
      </label>
      <textarea
        id="translate-answer"
        value={value}
        onChange={e => !submitted && setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder="Escribe tu respuesta en inglés..."
        aria-labelledby={`translate-answer-label ${QUESTION_ID}`}
        lang="en"
        disabled={submitted}
        className={`w-full rounded-2xl border-2 p-4 resize-none outline-none transition-colors placeholder:text-slate-500 ${textareaClass}`}
        rows={3}
        style={{ fontWeight: 500 }}
      />

      {/* Submit */}
      {!submitted && (
        <button
          onClick={submit}
          disabled={!value.trim()}
          aria-describedby={QUESTION_ID}
          className={`w-full py-3.5 rounded-2xl transition-all ${
            value.trim()
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          style={{ fontWeight: 600 }}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Speaking (pronunciación) — con alternativa de texto siempre visible
// ─────────────────────────────────────────────
function Speaking({
  exercise,
  onAnswer,
}: Readonly<{
  exercise: ExerciseItem;
  onAnswer: (answer: string) => void;
}>) {
  const { value, setValue, submitted, submit, isCorrect } = useTextAnswer(exercise, onAnswer);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('');

  const SpeechRecognitionCtor =
    typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(exercise.correctAnswer);
    utter.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const startListening = () => {
    if (!SpeechRecognitionCtor || submitted) return;
    const recognizer = new SpeechRecognitionCtor();
    recognizer.lang = 'en-US';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    setListening(true);
    setStatus('Escuchando… habla ahora.');
    recognizer.onresult = (event: any) => {
      const heard = event.results[0][0].transcript;
      setValue(heard);
      setStatus(`Escuché: "${heard}". Pulsa Comprobar o edita el texto.`);
    };
    recognizer.onerror = () => {
      setStatus('No pude escucharte bien. Intenta de nuevo o escribe tu respuesta abajo.');
    };
    recognizer.onend = () => setListening(false);
    recognizer.start();
  };

  let fallbackInputClass: string;
  if (submitted) {
    fallbackInputClass = isCorrect ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800';
  } else {
    fallbackInputClass = 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400';
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-2xl p-5 text-center">
        <p id={SPEAK_ID} className="text-slate-800" lang="en" style={{ fontWeight: 700, fontSize: '1.15rem' }}>
          {exercise.correctAnswer}
        </p>
        <p className="text-slate-600 mt-1" style={{ fontSize: '0.78rem' }}>Pronuncia la oración o escríbela si prefieres.</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={speak}
          aria-describedby={SPEAK_ID}
          className="w-12 h-12 rounded-full bg-slate-100 text-indigo-600 flex items-center justify-center border border-slate-200"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">Escuchar la pronunciación de la frase</span>
        </button>
        <button
          onClick={startListening}
          disabled={!SpeechRecognitionCtor || submitted}
          aria-pressed={listening}
          aria-describedby={SPEAK_ID}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-colors ${
            SpeechRecognitionCtor ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-200 text-slate-400'
          }`}
        >
          <Mic className="w-6 h-6" aria-hidden="true" />
          <span className="sr-only">Grabar mi pronunciación</span>
        </button>
      </div>

      <p className="text-center text-slate-500 min-h-[1.2rem]" role="status" aria-live="polite" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
        {status || (!SpeechRecognitionCtor ? 'El reconocimiento de voz no está disponible en este navegador. Escribe tu respuesta abajo.' : '')}
      </p>

      {/* La alternativa de texto está siempre visible (antes se escondía dentro
          de un <details>): sin micrófono, sin permisos o sin soporte del
          navegador, el ejercicio sigue siendo resoluble. */}
      <div className="border-t border-slate-100 pt-3">
        <label htmlFor="speaking-text-answer" className="text-indigo-700 block mb-2" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          O escribe la frase en inglés:
        </label>
        <input
          id="speaking-text-answer"
          type="text"
          value={value}
          onChange={e => !submitted && setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          disabled={submitted}
          aria-describedby={SPEAK_ID}
          lang="en"
          placeholder="Escribe la oración aquí..."
          className={`w-full rounded-xl border-2 p-3 outline-none transition-colors ${fallbackInputClass}`}
        />
      </div>

      {!submitted && (
        <button
          onClick={submit}
          disabled={!value.trim()}
          aria-describedby={SPEAK_ID}
          className={`w-full py-3.5 rounded-2xl transition-all ${
            value.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          style={{ fontWeight: 600 }}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Enunciado del ejercicio
//
// Se enfoca a sí mismo al montarse (cada ejercicio nuevo lo remonta), porque
// AnimatePresence mode="wait" retrasa el montaje del siguiente ejercicio: un
// efecto en la página padre se ejecutaría antes de que este nodo exista.
// Al recibir el foco, el lector de pantalla lee su nombre accesible, que es el
// enunciado completo: tipo y número de ejercicio, instrucción, imagen y pregunta.
// ─────────────────────────────────────────────
function ExercisePrompt({
  promptRef,
  labelledBy,
  children,
}: Readonly<{
  promptRef: React.RefObject<HTMLDivElement | null>;
  labelledBy: string;
  children: React.ReactNode;
}>) {
  useEffect(() => {
    promptRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={promptRef} tabIndex={-1} role="group" aria-labelledby={labelledBy} className="outline-none">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Feedback Panel
// ─────────────────────────────────────────────
function FeedbackPanel({
  isCorrect,
  exercise,
  userAnswer,
  isAlternate,
  isLastExercise,
  onContinue,
}: Readonly<{
  isCorrect: boolean;
  exercise: ExerciseItem;
  userAnswer: string;
  isAlternate: boolean;
  isLastExercise: boolean;
  onContinue: () => void;
}>) {
  let feedbackMessage: string;
  if (isCorrect && isAlternate) {
    feedbackMessage = '¡Tu respuesta también es correcta!';
  } else if (isCorrect) {
    feedbackMessage = '¡Correcto!';
  } else {
    feedbackMessage = '¡Casi! Revisa la explicación';
  }

  // El foco va al panel completo, no al botón "Continuar": al ser un grupo con
  // nombre accesible (resultado + respuestas + explicación), el lector de
  // pantalla lee TODO el resultado en cuanto aparece. Es más fiable que un
  // aria-live sobre un nodo que acaba de insertarse en el DOM. "Continuar" es
  // el siguiente elemento tabulable.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const labelIds = ['feedback-heading', 'feedback-explanation'];
  if (!isCorrect) labelIds.splice(1, 0, 'feedback-detail');

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      ref={panelRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={labelIds.join(' ')}
      className={`fixed bottom-0 left-0 right-0 z-30 rounded-t-3xl shadow-2xl border-t-4 ${
        isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
      }`}
    >
      <div className="max-w-2xl mx-auto px-5 py-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`} aria-hidden="true">
            {isCorrect
              ? <CheckCircle2 className="w-5 h-5 text-green-600" />
              : <XCircle className="w-5 h-5 text-red-500" />
            }
          </div>
          <div className="flex-1">
            <h2 id="feedback-heading" className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`} style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {feedbackMessage} <span aria-hidden="true">{isCorrect ? '🎉' : ''}</span>
            </h2>
            {!isCorrect && (
              <div id="feedback-detail" className="mt-1 space-y-0.5">
                <p className="text-red-700" style={{ fontSize: '0.75rem' }}>Tu respuesta: <span lang="en" style={{ fontWeight: 600 }}>"{userAnswer}"</span></p>
                <p className="text-green-700" style={{ fontSize: '0.75rem' }}>Respuesta correcta: <span lang="en" style={{ fontWeight: 600 }}>"{exercise.correctAnswer}"</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Explanation */}
        <div className={`rounded-xl p-3 mb-4 flex gap-2 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
          <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCorrect ? 'text-green-600' : 'text-red-500'}`} aria-hidden="true" />
          <p id="feedback-explanation" className={`${isCorrect ? 'text-green-800' : 'text-red-800'}`} style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
            {exercise.explanation}
          </p>
        </div>

        {/* Continue */}
        <button
          onClick={onContinue}
          className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors ${
            isCorrect
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          style={{ fontWeight: 600 }}
        >
          Continuar
          <span className="sr-only">{isLastExercise ? ' y ver los resultados de la lección' : ' al siguiente ejercicio'}</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Exercise Page
// ─────────────────────────────────────────────
type ExStatus = 'answering' | 'correct' | 'incorrect';

interface ErrorEntry {
  exercise: ExerciseItem;
  userAnswer: string;
}

export function Exercise() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { state, saveProgress, resetLesson } = useApp();

  const lesson = lessonId ? getLessonById(lessonId) : null;
  usePageTitle(lesson ? `${lesson.title} — Ejercicio` : 'Ejercicio');
  const savedProgress = lessonId ? state.lessonProgress[lessonId] : null;

  const [exerciseIdx, setExerciseIdx] = useState<number>(() => {
    if (!savedProgress || savedProgress.completed) return 0;
    return Math.min(savedProgress.exerciseIndex, (lesson?.exercises.length ?? 1) - 1);
  });
  const [status, setStatus] = useState<ExStatus>('answering');
  const [userAnswer, setUserAnswer] = useState('');
  const [isAlternate, setIsAlternate] = useState(false);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [exerciseKey, setExerciseKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Grupo del enunciado: recibe el foco al entrar en la lección y cada vez que
  // cambia de ejercicio, de modo que el lector de pantalla lee el enunciado
  // completo (tipo, instrucción, imagen y pregunta) sin que el usuario tenga
  // que buscarlo. El botón "Repetir enunciado" vuelve a enfocarlo.
  const promptRef = useRef<HTMLDivElement>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, []);
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Start timer on mount; stop on unmount
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause / resume
  useEffect(() => {
    if (isPaused) stopTimer(); else startTimer();
  }, [isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson || !lessonId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Lección no encontrada</p>
          <button onClick={() => navigate('/')} className="mt-3 text-indigo-500">Ir al inicio</button>
        </div>
      </div>
    );
  }

  const exercises = lesson.exercises;
  const current = exercises[exerciseIdx];
  const progress = (exerciseIdx / exercises.length) * 100;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeLabel = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  const isLastExercise = exerciseIdx === exercises.length - 1;

  // Nombre accesible del enunciado: referencia los nodos ya visibles en pantalla
  // (no duplica texto oculto) y se lee de una vez al enfocar el grupo.
  const promptIds = [COUNTER_ID, INSTRUCTION_ID];
  if (current.image) promptIds.push(IMAGE_ID);
  if (current.question) promptIds.push(QUESTION_ID);
  if (current.type === 'fill-blank') promptIds.push(SENTENCE_ID);
  if (current.type === 'speaking') promptIds.push(SPEAK_ID);

  // Descripción que acompaña a cada respuesta: la pregunta (y la imagen, si la
  // hay). Es lo que hace que el lector de pantalla lea pregunta + respuesta.
  const answerDescIds: string[] = [];
  if (current.question) answerDescIds.push(QUESTION_ID);
  if (current.image) answerDescIds.push(IMAGE_ID);
  const answerDescribedBy = answerDescIds.join(' ') || INSTRUCTION_ID;

  const handleAnswer = (answer: string) => {
    stopTimer();
    const correct = checkAnswer(answer, current.correctAnswer, current.acceptedAnswers);
    const alternate = correct && normalise(answer) !== normalise(current.correctAnswer);
    setUserAnswer(answer);
    setIsAlternate(alternate);
    setStatus(correct ? 'correct' : 'incorrect');
    if (correct) {
      setCorrectCount(c => c + 1);
    } else {
      setErrors(e => [...e, { exercise: current, userAnswer: answer }]);
    }
    saveProgress(lessonId, exerciseIdx);
  };

  const handleContinue = () => {
    const nextIdx = exerciseIdx + 1;
    if (nextIdx >= exercises.length) {
      // All done → navigate to results
      // correctCount & errors already reflect the last answer (state was updated before user clicked Continue)
      const finalScore = Math.round((correctCount / exercises.length) * 100);
      let stars: number;
      if (finalScore >= 90) {
        stars = 3;
      } else if (finalScore >= 60) {
        stars = 2;
      } else {
        stars = 1;
      }
      const baseXp = lesson.xpReward;
      const bonusXp = finalScore === 100 ? 25 : 0;
      const xpEarned = Math.round((finalScore / 100) * baseXp) + bonusXp;
      const timeMinutes = Math.max(1, Math.round(seconds / 60));
      navigate(`/results/${lessonId}`, {
        state: {
          score: finalScore,
          stars,
          xpEarned,
          timeMinutes,
          errors,
          totalExercises: exercises.length,
          correctCount,
        },
      });
    } else {
      setExerciseIdx(nextIdx);
      setStatus('answering');
      setUserAnswer('');
      setIsAlternate(false);
      setExerciseKey(k => k + 1);
      saveProgress(lessonId, nextIdx);
      startTimer();
    }
  };

  const handleExit = () => {
    saveProgress(lessonId, exerciseIdx);
    navigate('/lessons');
  };

  const handleRestart = () => {
    resetLesson(lessonId);
    setExerciseIdx(0);
    setStatus('answering');
    setUserAnswer('');
    setErrors([]);
    setCorrectCount(0);
    setSeconds(0);
    setExerciseKey(k => k + 1);
    setIsPaused(false);
    // timer will be restarted by the isPaused effect (false → startTimer)
  };

  // Con el modal de pausa abierto, el resto de la pantalla queda inerte: el
  // lector de pantalla no puede salirse del diálogo con el cursor virtual
  // (el atrapado de Tab por sí solo no lo impide).
  const inertWhilePaused = (isPaused ? { inert: '' } : {}) as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <a href="#exercise-content" className="skip-link">Saltar al ejercicio</a>
      {/* ── TOP BAR ── */}
      <header {...inertWhilePaused} className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
          {/* Close */}
          <button
            onClick={handleExit}
            aria-label="Salir de la lección y volver a lecciones"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Progress bar */}
          <div
            className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden"
            role="img"
            aria-label={`Progreso de la lección: ejercicio ${exerciseIdx + 1} de ${exercises.length}`}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Timer — el texto visible es abreviado, el hablado es completo.
              (aria-label sobre un <span> sin rol no lo exponen todos los
              lectores de pantalla, así que se usa texto para lectores.) */}
          <span className="text-slate-500 flex-shrink-0" style={{ fontWeight: 600, fontSize: '0.8rem', minWidth: '3rem', textAlign: 'right' }}>
            <span aria-hidden="true">{timeLabel}</span>
            <span className="sr-only">
              {`Tiempo transcurrido: ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${remainingSeconds} ${remainingSeconds === 1 ? 'segundo' : 'segundos'}`}
            </span>
          </span>

          {/* Repetir enunciado */}
          <button
            onClick={() => promptRef.current?.focus()}
            aria-label="Repetir el enunciado del ejercicio"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Pause */}
          <button
            onClick={() => setIsPaused(true)}
            aria-label="Pausar lección"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Pause className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Exercise counter (decorativo: el conteo se anuncia en el enunciado) */}
        <div className="pb-2 px-4 flex justify-center">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {exercises.map((exercise, i) => {
              let dotClass: string;
              if (i < exerciseIdx) {
                dotClass = 'w-2 h-2 bg-indigo-400';
              } else if (i === exerciseIdx) {
                dotClass = 'w-3 h-3 bg-indigo-600';
              } else {
                dotClass = 'w-2 h-2 bg-slate-200';
              }
              return (
                <div
                  key={exercise.id}
                  className={`rounded-full transition-all duration-300 ${dotClass}`}
                />
              );
            })}
          </div>
        </div>
      </header>

      {/* ── EXERCISE AREA ── */}
      <main {...inertWhilePaused} id="exercise-content" tabIndex={-1} className="flex-1 pt-[5.5rem] pb-6">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={exerciseKey}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── ENUNCIADO (grupo enfocable que se lee entero) ── */}
              <ExercisePrompt promptRef={promptRef} labelledBy={promptIds.join(' ')}>
                {/* Exercise type + posición */}
                <p id={COUNTER_ID} className="text-slate-600 mb-3" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  <span aria-hidden="true">{TYPE_ICONS[current.type]} </span>
                  {TYPE_NAMES[current.type]} · Ejercicio {exerciseIdx + 1} de {exercises.length}
                </p>

                {/* Instruction */}
                <h1 id={INSTRUCTION_ID} className="text-slate-800 mb-3" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {current.instruction}
                </h1>

                {/* Imagen del ejercicio: el alt es la única vía de acceso al
                    dibujo para quien no ve, así que describe el objeto. */}
                {current.image && (
                  <img
                    id={IMAGE_ID}
                    src={current.image.src}
                    alt={current.image.alt}
                    width={176}
                    height={176}
                    className="w-44 h-44 mx-auto mb-4 rounded-2xl border-2 border-slate-200 bg-white shadow-sm"
                  />
                )}

                {/* Question */}
                {current.question && (
                  <div className="bg-indigo-50 rounded-2xl p-4 mb-5 border border-indigo-100">
                    <p id={QUESTION_ID} className="text-indigo-800" style={{ fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 }}>
                      {current.question}
                    </p>
                  </div>
                )}
              </ExercisePrompt>

              {/* Exercise component */}
              <div className={status !== 'answering' ? 'pb-44' : ''}>
                {(current.type === 'multiple-choice' || current.type === 'image-choice') && (
                  <ChoiceOptions key={exerciseKey} exercise={current} onAnswer={handleAnswer} describedBy={answerDescribedBy} />
                )}
                {current.type === 'fill-blank' && (
                  <FillBlank key={exerciseKey} exercise={current} onAnswer={handleAnswer} />
                )}
                {current.type === 'word-order' && (
                  <WordOrder key={exerciseKey} exercise={current} onAnswer={handleAnswer} />
                )}
                {current.type === 'translate' && (
                  <Translate key={exerciseKey} exercise={current} onAnswer={handleAnswer} />
                )}
                {current.type === 'speaking' && (
                  <Speaking key={exerciseKey} exercise={current} onAnswer={handleAnswer} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── FEEDBACK PANEL ── */}
      <div {...inertWhilePaused}>
        <AnimatePresence>
          {status !== 'answering' && (
            <FeedbackPanel
              isCorrect={status === 'correct'}
              exercise={current}
              userAnswer={userAnswer}
              isAlternate={isAlternate}
              isLastExercise={isLastExercise}
              onContinue={handleContinue}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── PAUSE MODAL ── */}
      <PauseModal
        isOpen={isPaused}
        lessonTitle={lesson.title}
        onResume={() => setIsPaused(false)}
        onExit={handleExit}
        onRestart={handleRestart}
      />
    </div>
  );
}
