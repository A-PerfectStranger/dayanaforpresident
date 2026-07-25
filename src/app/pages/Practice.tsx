import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Dumbbell, Play, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { units } from '../data/lessons';
import { usePageTitle } from '../hooks/usePageTitle';

export function Practice() {
  const { state, isLessonLocked } = useApp();
  const navigate = useNavigate();
  usePageTitle('Práctica');

  // Only show lessons that are unlocked
  const unlocked = units
    .flatMap(u => u.lessons)
    .filter(l => !isLessonLocked(l.id));

  const completed = unlocked.filter(l => state.lessonProgress[l.id]?.completed);

  const practiceTypes = [
    {
      id: 'review',
      icon: '🔄',
      title: 'Repasar lecciones',
      description: 'Vuelve a practicar lecciones completadas para reforzar lo aprendido.',
      available: completed.length > 0,
    },
    {
      id: 'next',
      icon: '⚡',
      title: 'Próxima lección',
      description: 'Continúa con la siguiente lección de tu ruta de aprendizaje.',
      available: true,
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Práctica</h1>
        <p className="text-slate-600" style={{ fontSize: '0.78rem' }}>Elige cómo quieres practicar hoy</p>
      </div>

      {/* Quick practice options — botones reales para que el teclado y los
          lectores de pantalla puedan activarlos (WCAG 2.1.1 / 4.1.2). */}
      <div className="space-y-3">
        {practiceTypes.map(pt => (
          <motion.button
            key={pt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            disabled={!pt.available}
            aria-label={`${pt.title}. ${pt.description}${pt.available ? '' : ' No disponible: completa al menos una lección primero.'}`}
            className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 ${pt.available ? 'hover:border-indigo-200 hover:shadow-md cursor-pointer' : 'bg-slate-50'} transition-all`}
            onClick={() => {
              if (!pt.available) return;
              if (pt.id === 'next') navigate('/lessons');
              if (pt.id === 'review') {
                const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % completed.length;
                const random = completed[randomIndex];
                if (random) navigate(`/exercise/${random.id}`);
              }
            }}
          >
            <span className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">
              {pt.icon}
            </span>
            <span className="flex-1" aria-hidden="true">
              <span className="text-slate-800 block" style={{ fontWeight: 600 }}>{pt.title}</span>
              <span className="text-slate-600 block" style={{ fontSize: '0.78rem' }}>{pt.description}</span>
              {!pt.available && (
                <span className="text-amber-700 mt-0.5 block" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  Completa al menos una lección primero
                </span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </motion.button>
        ))}
      </div>

      {/* Unlocked lessons to practice */}
      {unlocked.length > 0 && (
        <div>
          <h2 className="text-slate-700 mb-3" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Lecciones disponibles
          </h2>
          <div className="space-y-2">
            {unlocked.map((lesson, i) => {
              const progress = state.lessonProgress[lesson.id];
              const isCompleted = progress?.completed;
              const statusText = isCompleted
                ? `Completada con ${progress?.stars ?? 0} de 3 estrellas`
                : 'Sin completar';

              return (
                <motion.button
                  key={lesson.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/exercise/${lesson.id}`)}
                  aria-label={`Practicar la lección ${lesson.title}. Nivel ${lesson.level}, tema ${lesson.topic}. ${statusText}`}
                  className="w-full bg-white rounded-xl p-3.5 shadow-sm border border-slate-100 flex items-center gap-3 hover:border-indigo-200 hover:shadow-md transition-all text-left"
                >
                  <span className={`w-10 h-10 ${lesson.colorClass} rounded-xl flex items-center justify-center text-lg flex-shrink-0`} aria-hidden="true">
                    {lesson.emoji}
                  </span>
                  <span className="flex-1 min-w-0" aria-hidden="true">
                    <span className="text-slate-800 truncate block" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{lesson.title}</span>
                    <span className="text-slate-600 block" style={{ fontSize: '0.72rem' }}>{lesson.level} · {lesson.topic}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0" aria-hidden="true">
                    {isCompleted ? (
                      <span className="flex">
                        {[1,2,3].map(starIdx => (
                          <span key={`star-${starIdx}`} className={`text-xs ${starIdx <= (progress?.stars ?? 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                        ))}
                      </span>
                    ) : (
                      <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {unlocked.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
          <p style={{ fontWeight: 500 }}>No hay lecciones disponibles</p>
          <p className="mt-1" style={{ fontSize: '0.82rem' }}>Completa la primera lección para desbloquear práctica</p>
        </div>
      )}
    </div>
  );
}
