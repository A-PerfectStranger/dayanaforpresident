import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Lock, RotateCcw, Play, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { units, type Level, type Lesson } from '../data/lessons';
import { usePageTitle } from '../hooks/usePageTitle';

type TopicFilter = 'all' | 'Gramática' | 'Vocabulario' | 'Conversación';
type LevelFilter = 'all' | Level;

function StarRow({ count, size = 'sm' }: Readonly<{ count: number; size?: 'sm' | 'md' }>) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${count} de 3 estrellas`}>
      {[1, 2, 3].map(i => (
        <span key={i} aria-hidden="true" className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${i <= count ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
    </div>
  );
}

const DIFFICULTY_LABEL: Record<string, string> = {
  A1: '⭐ Básico', A2: '⭐⭐ Elemental', B1: '⭐⭐⭐ Intermedio', B2: '⭐⭐⭐⭐ Intermedio alto', C1: '⭐⭐⭐⭐⭐ Avanzado', C2: '🏆 Maestría',
};
const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-orange-100 text-orange-700',
  B1: 'bg-purple-100 text-purple-700', B2: 'bg-blue-100 text-blue-700',
  C1: 'bg-rose-100 text-rose-700', C2: 'bg-slate-200 text-slate-800',
};

function LessonCard({
  lesson,
  idx,
  resetting,
  onStartReset,
  onConfirmReset,
  onCancelReset,
}: Readonly<{
  lesson: Lesson;
  idx: number;
  resetting: string | null;
  onStartReset: (lessonId: string) => void;
  onConfirmReset: (e: React.MouseEvent, lessonId: string) => void;
  onCancelReset: () => void;
}>) {
  const { state, isLessonLocked } = useApp();
  const navigate = useNavigate();

  const progress = state.lessonProgress[lesson.id];
  const locked = isLessonLocked(lesson.id);
  const completed = progress?.completed ?? false;
  const inProgress = !completed && (progress?.exerciseIndex ?? 0) > 0;
  const stars = progress?.stars ?? 0;
  const score = progress?.score ?? 0;

  const cardBorderClass = locked
    ? 'border-slate-200 bg-slate-50'
    : 'border-slate-100 hover:border-indigo-200 hover:shadow-md';

  // Estado leído por el lector de pantalla en una sola frase (lo visual va
  // marcado con aria-hidden para no repetir "100% · +50 XP" troceado).
  let spokenStatus: string;
  if (completed) {
    spokenStatus = `Completada con ${stars} de 3 estrellas, ${score} por ciento de aciertos y ${progress?.xpEarned ?? 0} XP ganados.`;
  } else if (inProgress) {
    spokenStatus = `En curso: ${Math.round(((progress?.exerciseIndex ?? 0) / lesson.exercises.length) * 100)} por ciento completado.`;
  } else if (locked) {
    spokenStatus = 'Bloqueada. Completa la lección anterior para desbloquearla.';
  } else {
    spokenStatus = `Disponible. ${lesson.exercises.length} ejercicios, ${lesson.xpReward} XP.`;
  }

  let statusContent: React.ReactNode;
  if (completed) {
    statusContent = (
      <>
        <StarRow count={stars} />
        <span className="text-slate-600" style={{ fontSize: '0.75rem' }}>{score}% aciertos · +{progress?.xpEarned ?? 0} XP</span>
      </>
    );
  } else if (inProgress) {
    statusContent = (
      <span className="text-indigo-600" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
        {Math.round(((progress?.exerciseIndex ?? 0) / lesson.exercises.length) * 100)}% completado
      </span>
    );
  } else if (locked) {
    statusContent = <span className="text-slate-500" style={{ fontSize: '0.72rem' }}>Bloqueado — completa la lección anterior</span>;
  } else {
    statusContent = <span className="text-slate-600" style={{ fontSize: '0.72rem' }}>{lesson.exercises.length} ejercicios · +{lesson.xpReward} XP</span>;
  }

  let actionLabel: string;
  let actionButtonClass: string;
  let actionButtonContent: React.ReactNode;
  if (completed) {
    actionLabel = 'Repasar';
    actionButtonClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
    actionButtonContent = <><RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />Repasar</>;
  } else if (inProgress) {
    actionLabel = 'Continuar';
    actionButtonClass = 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200';
    actionButtonContent = <><Play className="w-3.5 h-3.5 fill-indigo-500" aria-hidden="true" />Continuar</>;
  } else {
    actionLabel = 'Iniciar';
    actionButtonClass = 'bg-indigo-600 text-white hover:bg-indigo-700';
    actionButtonContent = <><Play className="w-3.5 h-3.5 fill-white" aria-hidden="true" />Iniciar</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
    >
      <div className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${cardBorderClass}`}>
        {/* Completed progress bar */}
        {completed && (
          <div className="h-1 bg-slate-50">
            <div
              className={`h-full ${lesson.colorClass}`}
              style={{ width: '100%' }}
            />
          </div>
        )}
        {inProgress && (
          <div className="h-1 bg-slate-50">
            <div
              className={`h-full ${lesson.colorClass} opacity-50`}
              style={{ width: `${((progress?.exerciseIndex ?? 0) / lesson.exercises.length) * 100}%` }}
            />
          </div>
        )}

        <div className="p-4 flex items-center gap-3">
          {/* Resumen hablado de la tarjeta */}
          <p className="sr-only">
            {lesson.title}. Nivel {lesson.level}, tema {lesson.topic}. {spokenStatus}
          </p>

          {/* Emoji icon */}
          <div className={`w-12 h-12 ${locked ? 'bg-slate-200' : lesson.colorClass} rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm`} aria-hidden="true">
            {locked ? <Lock className="w-5 h-5 text-slate-500" /> : lesson.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0" aria-hidden="true">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[lesson.level]}`} style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                {lesson.level}
              </span>
              <span className="text-slate-600" style={{ fontSize: '0.75rem' }}>{lesson.topic}</span>
            </div>
            <p className={`truncate ${locked ? 'text-slate-500' : 'text-slate-800'}`} style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {lesson.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {statusContent}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Reset button (if completed or in progress) */}
            {(completed || inProgress) && !locked && (
              <>
                {resetting === lesson.id ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => onConfirmReset(e, lesson.id)}
                      aria-label={`Confirmar reinicio de la lección ${lesson.title}`}
                      className="text-red-600 hover:text-red-700 bg-red-50 rounded-lg px-2 py-1 transition-colors"
                      style={{ fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      ¿Seguro?
                    </button>
                    <button
                      onClick={onCancelReset}
                      aria-label={`Cancelar reinicio de la lección ${lesson.title}`}
                      className="text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg px-2 py-1 transition-colors"
                      style={{ fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onStartReset(lesson.id); }}
                    aria-label={`Reiniciar progreso de la lección ${lesson.title}`}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </>
            )}

            {/* Start/Continue button */}
            {!locked && resetting !== lesson.id && (
              <button
                onClick={() => navigate(`/exercise/${lesson.id}`)}
                aria-label={`${actionLabel} lección ${lesson.title}, nivel ${lesson.level}`}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${actionButtonClass}`}
                style={{ fontWeight: 600, fontSize: '0.78rem' }}
              >
                {actionButtonContent}
              </button>
            )}

            {locked && (
              <div className="w-8 h-8 flex items-center justify-center" aria-hidden="true">
                <Lock className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LessonList() {
  const { resetLesson } = useApp();
  usePageTitle('Lecciones');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const allLessons = units.flatMap(u => u.lessons);
  const filtered = allLessons.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (topicFilter !== 'all' && l.topic !== topicFilter) return false;
    return true;
  });

  const handleReset = (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation();
    resetLesson(lessonId);
    setResetting(null);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Lecciones</h1>
          <p className="text-slate-600" style={{ fontSize: '0.78rem' }}>{allLessons.length} lecciones disponibles · niveles A1 a C2</p>
        </div>
        <button
          onClick={() => setShowFilters(s => !s)}
          aria-expanded={showFilters}
          aria-controls="lesson-filters"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          style={{ fontWeight: 500, fontSize: '0.8rem' }}
        >
          <Filter className="w-3.5 h-3.5" aria-hidden="true" />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          id="lesson-filters"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3"
        >
          <fieldset>
            <legend className="text-slate-600 mb-2" style={{ fontSize: '0.72rem', fontWeight: 600 }}>NIVEL</legend>
            <div className="flex flex-wrap gap-2">
              {(['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLevelFilter(l)}
                  aria-pressed={levelFilter === l}
                  className={`px-3 py-1.5 rounded-full transition-colors ${levelFilter === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {l === 'all' ? 'Todos' : l}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-slate-600 mb-2" style={{ fontSize: '0.72rem', fontWeight: 600 }}>TEMA</legend>
            <div className="flex flex-wrap gap-2">
              {(['all', 'Gramática', 'Vocabulario', 'Conversación'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t)}
                  aria-pressed={topicFilter === t}
                  className={`px-3 py-1.5 rounded-full transition-colors ${topicFilter === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {t === 'all' ? 'Todos' : t}
                </button>
              ))}
            </div>
          </fieldset>
        </motion.div>
      )}

      {/* Results count */}
      {(levelFilter !== 'all' || topicFilter !== 'all') && (
        <p className="text-slate-600" role="status" aria-live="polite" style={{ fontSize: '0.78rem' }}>
          {filtered.length} lección{filtered.length !== 1 ? 'es' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Lessons grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <p className="text-3xl mb-3" aria-hidden="true">🔍</p>
          <p style={{ fontWeight: 500 }}>No se encontraron lecciones</p>
          <button
            onClick={() => { setLevelFilter('all'); setTopicFilter('all'); }}
            className="mt-3 text-indigo-500 hover:text-indigo-700"
            style={{ fontSize: '0.85rem', fontWeight: 500 }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {filtered.map((lesson, idx) => (
            <li key={lesson.id}>
              <LessonCard
                lesson={lesson}
                idx={idx}
                resetting={resetting}
                onStartReset={setResetting}
                onConfirmReset={handleReset}
                onCancelReset={() => setResetting(null)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
