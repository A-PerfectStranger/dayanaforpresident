import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { RotateCcw, ChevronRight, Home, Trophy, Clock, Target, Zap, XCircle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { getLessonById, getUnitForLesson } from '../data/lessons';
import { usePageTitle } from '../hooks/usePageTitle';

interface ResultState {
  score: number;
  stars: number;
  xpEarned: number;
  timeMinutes: number;
  errors: { exercise: { id: string; question?: string; correctAnswer: string; explanation: string }; userAnswer: string }[];
  totalExercises: number;
  correctCount: number;
}

function StarDisplay({ count }: Readonly<{ count: number }>) {
  return (
    <div className="flex gap-2 justify-center" role="img" aria-label={`Has ganado ${count} de 3 estrellas`}>
      {[1, 2, 3].map(i => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.8 + i * 0.15, type: 'spring', stiffness: 400 }}
          aria-hidden="true"
          className={`text-3xl ${i <= count ? 'filter-none' : 'grayscale opacity-30'}`}
        >
          ⭐
        </motion.span>
      ))}
    </div>
  );
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'from-green-700 to-emerald-800';
  if (score >= 60) return 'from-amber-700 to-orange-800';
  return 'from-red-700 to-rose-800';
}

function getScoreRing(score: number): string {
  if (score >= 80) return 'ring-green-300';
  if (score >= 60) return 'ring-amber-300';
  return 'ring-red-300';
}

function getScoreMessage(score: number): string {
  if (score === 100) return '¡Perfecto! 🏆';
  if (score >= 80) return '¡Excelente! 🎉';
  if (score >= 60) return '¡Bien hecho! 👍';
  return 'Sigue practicando 💪';
}

// Misma valoración sin emojis, para el resumen que lee el lector de pantalla.
function getScoreMessagePlain(score: number): string {
  if (score === 100) return '¡Perfecto!';
  if (score >= 80) return '¡Excelente!';
  if (score >= 60) return '¡Bien hecho!';
  return 'Sigue practicando';
}

export function Results() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { completeLesson, resetLesson } = useApp();
  const confettiFired = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  usePageTitle('Resultados de la lección');

  const resultData = location.state as ResultState | null;
  const lesson = lessonId ? getLessonById(lessonId) : null;
  const unit = lessonId ? getUnitForLesson(lessonId) : null;

  const score = resultData?.score ?? 0;
  const stars = resultData?.stars ?? 1;
  const xpEarned = resultData?.xpEarned ?? 0;
  const timeMinutes = resultData?.timeMinutes ?? 0;
  const errors = resultData?.errors ?? [];
  const correctCount = resultData?.correctCount ?? 0;
  const totalExercises = resultData?.totalExercises ?? 5;

  useEffect(() => {
    if (!confettiFired.current && score >= 70) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({
          particleCount: score === 100 ? 200 : 100,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
        });
      }, 400);
    }
    if (lessonId && resultData) {
      completeLesson(lessonId, score, stars, xpEarned, timeMinutes);
    }
    // Al llegar desde el ejercicio el foco se quedaría en <body> y el lector de
    // pantalla no diría nada: lo llevamos al resumen del resultado.
    summaryRef.current?.focus();
  }, []);

  const handleRetry = () => {
    if (lessonId) {
      resetLesson(lessonId);
      navigate(`/exercise/${lessonId}`, { replace: true });
    }
  };

  const handleNext = () => {
    navigate('/lessons');
  };

  const scoreBg = getScoreBg(score);
  const scoreRing = getScoreRing(score);
  const scoreMsg = getScoreMessage(score);

  // Resumen hablado del resultado (se anuncia al enfocar el bloque de la nota).
  const summaryLabel =
    `${getScoreMessagePlain(score)} Resultado de la lección ${lesson?.title ?? ''}. ` +
    `Puntuación: ${score} por ciento de aciertos. ${correctCount} de ${totalExercises} respuestas correctas. ` +
    `Has ganado ${stars} de 3 estrellas y ${xpEarned} XP. Tiempo empleado: ${timeMinutes} ${timeMinutes === 1 ? 'minuto' : 'minutos'}. ` +
    (errors.length > 0
      ? `Tienes ${errors.length} ${errors.length === 1 ? 'error' : 'errores'} para repasar más abajo.`
      : 'No has cometido ningún error.');

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => navigate('/')} className="text-indigo-500">Ir al inicio</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between max-w-2xl mx-auto w-full">
        <button onClick={() => navigate('/')} aria-label="Volver al inicio" className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
          <Home className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="text-center">
          <p className="text-slate-600" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{unit?.title ?? ''}</p>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{lesson.title}</h1>
        </div>
        <div className="w-8" />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5 pb-10">
        {/* Score circle — grupo enfocable que recibe el foco al abrir la
            pantalla: el lector de pantalla lee el resultado completo sin que
            haya que buscarlo por la página. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center outline-none"
          ref={summaryRef}
          tabIndex={-1}
          role="group"
          aria-label={summaryLabel}
        >
          <output className="text-slate-700 mb-3 block" aria-hidden="true" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{scoreMsg}</output>

          <div
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${scoreBg} ring-8 ${scoreRing} flex flex-col items-center justify-center shadow-lg mb-4`}
            aria-hidden="true"
          >
            <Trophy className="w-5 h-5 text-white mb-0.5" />
            <span className="text-white" style={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>{score}%</span>
            <span className="text-white" style={{ fontSize: '0.7rem', fontWeight: 500 }}>aciertos</span>
          </div>

          <div aria-hidden="true">
            <StarDisplay count={stars} />
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 list-none p-0 m-0"
          role="list"
        >
          {[
            {
              key: 'correct',
              label: `${correctCount} de ${totalExercises} respuestas correctas`,
              value: `${correctCount}/${totalExercises}`,
              caption: 'correctas',
              bg: 'bg-green-100',
              icon: <Target className="w-4 h-4 text-green-600" />,
            },
            {
              key: 'time',
              label: `Tiempo empleado: ${timeMinutes} ${timeMinutes === 1 ? 'minuto' : 'minutos'}`,
              value: `${timeMinutes}m`,
              caption: 'tiempo',
              bg: 'bg-blue-100',
              icon: <Clock className="w-4 h-4 text-blue-500" />,
            },
            {
              key: 'xp',
              label: `${xpEarned} puntos de experiencia ganados`,
              value: `+${xpEarned}`,
              caption: 'XP ganados',
              bg: 'bg-amber-100',
              icon: <Zap className="w-4 h-4 text-amber-500" />,
            },
          ].map(stat => (
            <div
              key={stat.key}
              role="listitem"
              className="bg-white rounded-2xl p-3.5 text-center shadow-sm border border-slate-100 min-w-0"
            >
              <div role="group" tabIndex={0} aria-label={stat.label}>
                <div aria-hidden="true">
                  <div className="flex justify-center mb-1.5">
                    <div className={`w-8 h-8 ${stat.bg} rounded-xl flex items-center justify-center`}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stat.value}</p>
                  <p className="text-slate-600" style={{ fontSize: '0.75rem' }}>{stat.caption}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Error review */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
              <h2 className="text-slate-700" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                Errores a repasar ({errors.length})
              </h2>
            </div>
            <ul className="divide-y divide-slate-100 list-none">
              {errors.map((err) => (
                <li key={err.exercise.id} className="px-4 py-3">
                  <p className="text-slate-600 mb-1.5" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                    {err.exercise.question ?? err.exercise.correctAnswer}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
                    <span className="text-red-700" style={{ fontSize: '0.78rem' }}>Tu respuesta: <span lang="en" style={{ fontWeight: 600 }}>"{err.userAnswer}"</span></span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-hidden="true" />
                    <span className="text-green-700" style={{ fontSize: '0.78rem' }}>Correcto: <span lang="en" style={{ fontWeight: 600 }}>"{err.exercise.correctAnswer}"</span></span>
                  </div>
                  <p className="text-slate-600 pl-5" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                    {err.exercise.explanation}
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="space-y-3"
        >
          <button
            onClick={handleNext}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            Continuar al siguiente nivel
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={handleRetry}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors"
            style={{ fontWeight: 600 }}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reintentar lección
          </button>
        </motion.div>
      </main>
    </div>
  );
}
