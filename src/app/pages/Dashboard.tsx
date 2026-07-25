import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Play, Lock, CheckCircle2, ChevronRight, Flame, Clock, Trophy } from 'lucide-react';
import { useApp, getLevel, getXpProgress } from '../context/AppContext';
import { units, getLessonById } from '../data/lessons';
import { usePageTitle } from '../hooks/usePageTitle';

function StarRow({ count }: Readonly<{ count: number }>) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${count} de 3 estrellas`}>
      {[1, 2, 3].map(i => (
        <span key={i} aria-hidden="true" className={`text-xs ${i <= count ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
    </div>
  );
}

/**
 * Tarjeta de dato (racha, tiempo, lecciones).
 *
 * El contenido visual va oculto para el lector de pantalla y toda la
 * información se concentra en `label`, que se lee como una sola frase. La
 * tarjeta es enfocable (`tabIndex={0}`) a propósito: así aparece también al
 * tabular, no solo al recorrer la página en modo lectura. En una app pensada
 * para personas ciegas es preferible un punto de tabulación extra a que un dato
 * quede fuera del recorrido del teclado.
 */
function StatCard({
  label,
  value,
  caption,
  icon,
  iconBgClass,
}: Readonly<{
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  iconBgClass: string;
}>) {
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={label}
      className="bg-white rounded-2xl p-3.5 text-center shadow-sm border border-slate-100 min-w-0 h-full"
    >
      <div aria-hidden="true">
        <div className="flex justify-center mb-1.5">
          <div className={`w-8 h-8 ${iconBgClass} rounded-xl flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <p className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{value}</p>
        <p className="text-slate-600" style={{ fontSize: '0.75rem' }}>{caption}</p>
      </div>
    </div>
  );
}

// Zigzag positions (normalized 0..1) cycling per lesson
const ZIGZAG = [0.25, 0.65, 0.80, 0.40, 0.25, 0.70, 0.85, 0.35];

export function Dashboard() {
  const { state, isLessonLocked, getInProgressLesson } = useApp();
  const navigate = useNavigate();
  usePageTitle('Inicio');

  const level = getLevel(state.user.xp);
  const xpInfo = getXpProgress(state.user.xp);
  const continueLessonId = getInProgressLesson();
  const continueLesson = continueLessonId ? getLessonById(continueLessonId) : null;

  const hours = Math.floor(state.user.totalMinutes / 60);
  const mins = state.user.totalMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const spokenTime = hours > 0 ? `${hours} horas y ${mins} minutos` : `${mins} minutos`;

  const completedCount = Object.values(state.lessonProgress).filter(p => p.completed).length;

  const missingXp = xpInfo.needed - xpInfo.current;
  const nextLevel = getLevel(state.user.xp + missingXp);
  const levelSummary =
    `Nivel ${level}. Llevas ${xpInfo.current} de ${xpInfo.needed} puntos de experiencia, ` +
    `un ${xpInfo.percent} por ciento del nivel. Te faltan ${missingXp} XP para llegar al nivel ${nextLevel}.`;

  return (
    <div className="space-y-5 pb-4">
      {/* ── HERO GREETING ── */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        aria-labelledby="dashboard-welcome"
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-lg"
      >
        {/* El saludo completo vive dentro del h1: se lee de una vez ("Bienvenido/a
            de vuelta, Alex") tanto al recorrer la página como al saltar por
            encabezados, y no depende de un aria-label sobre texto oculto. */}
        <h1 id="dashboard-welcome" className="text-white mb-3" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
          <span className="block text-indigo-100 mb-1" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
            Bienvenido/a de vuelta,
          </span>
          {state.user.name} <span aria-hidden="true">👋</span>
        </h1>

        {/* Level progress */}
        <div
          className="bg-white/20 rounded-2xl p-3"
          role="group"
          tabIndex={0}
          aria-label={levelSummary}
        >
          <div aria-hidden="true">
            <div className="flex justify-between items-center mb-1.5">
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nivel {level}</span>
              <span style={{ fontSize: '0.72rem' }} className="text-indigo-100">{xpInfo.current} / {xpInfo.needed} XP</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpInfo.percent}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <p className="text-indigo-100 mt-1.5" style={{ fontSize: '0.75rem' }}>
              {missingXp} XP para {nextLevel}
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── STATS ROW ── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        aria-labelledby="dashboard-stats"
      >
        <h2 id="dashboard-stats" className="sr-only">Tus estadísticas</h2>
        <ul className="grid grid-cols-3 gap-3 list-none p-0 m-0">
          <li>
            <StatCard
              label={`Racha de estudio: ${state.user.streak} días seguidos`}
              value={`${state.user.streak}`}
              caption="días racha"
              iconBgClass="bg-orange-100"
              icon={<Flame className="w-4 h-4 text-orange-500" />}
            />
          </li>
          <li>
            <StatCard
              label={`Tiempo total de estudio: ${spokenTime}`}
              value={timeLabel}
              caption="tiempo total"
              iconBgClass="bg-blue-100"
              icon={<Clock className="w-4 h-4 text-blue-500" />}
            />
          </li>
          <li>
            <StatCard
              label={`Lecciones completadas: ${completedCount}`}
              value={`${completedCount}`}
              caption="lecciones"
              iconBgClass="bg-indigo-100"
              icon={<Trophy className="w-4 h-4 text-indigo-500" />}
            />
          </li>
        </ul>
      </motion.section>

      {/* ── CONTINUE CARD ── */}
      {continueLesson && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => navigate(`/exercise/${continueLesson.id}`)}
            aria-label={`Continuar donde lo dejaste: lección ${continueLesson.title}. ${continueLesson.subtitle}. Nivel ${continueLesson.level}`}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:border-indigo-200 transition-all group text-left"
          >
            <span className={`w-12 h-12 ${continueLesson.colorClass} rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm`} aria-hidden="true">
              {continueLesson.emoji}
            </span>
            <span className="flex-1 min-w-0" aria-hidden="true">
              <span className="text-indigo-700 mb-0.5 block" style={{ fontSize: '0.7rem', fontWeight: 600 }}>▶ CONTINUAR DONDE LO DEJASTE</span>
              <span className="text-slate-800 truncate block" style={{ fontWeight: 600 }}>{continueLesson.title}</span>
              <span className="text-slate-600 block" style={{ fontSize: '0.75rem' }}>{continueLesson.subtitle}</span>
            </span>
            <span className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 transition-colors flex-shrink-0" aria-hidden="true">
              <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:text-white transition-colors" />
            </span>
          </button>
        </motion.div>
      )}

      {/* ── LEARNING PATH ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        aria-labelledby="dashboard-path"
      >
        <h2 id="dashboard-path" className="text-slate-700 mb-4" style={{ fontWeight: 700, fontSize: '1rem' }}>Ruta de Aprendizaje</h2>

        <div className="space-y-8">
          {units.map((unit) => {
            const allCompleted = unit.lessons.every(l => state.lessonProgress[l.id]?.completed);
            return (
              <section key={unit.id} aria-labelledby={`unit-${unit.id}`}>
                {/* Unit header */}
                <div className={`bg-gradient-to-r ${unit.gradientFrom} ${unit.gradientTo} rounded-2xl p-4 mb-5 flex items-center justify-between`}>
                  <h3 id={`unit-${unit.id}`} className="text-white" style={{ fontWeight: 700 }}>
                    <span className="block" style={{ fontSize: '0.7rem', fontWeight: 600 }}>{unit.title} · Nivel {unit.level}</span>
                    {unit.subtitle}
                  </h3>
                  {allCompleted && (
                    <div className="w-8 h-8 bg-white/30 rounded-xl flex items-center justify-center" role="img" aria-label="Unidad completada">
                      <CheckCircle2 className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Lesson path (zigzag) */}
                <div className="relative" style={{ minHeight: `${unit.lessons.length * 90}px` }}>
                  {/* SVG Curved path */}
                  <svg
                    className="absolute inset-0 w-full pointer-events-none"
                    style={{ height: `${unit.lessons.length * 90}px` }}
                    preserveAspectRatio="none"
                    viewBox={`0 0 100 ${unit.lessons.length * 90}`}
                    aria-hidden="true"
                  >
                    {unit.lessons.slice(0, -1).map((lesson, i) => {
                      const x1 = ZIGZAG[i % ZIGZAG.length] * 100;
                      const y1 = i * 90 + 32;
                      const x2 = ZIGZAG[(i + 1) % ZIGZAG.length] * 100;
                      const y2 = (i + 1) * 90 + 32;
                      return (
                        <path
                          key={`${lesson.id}-${unit.lessons[i + 1].id}`}
                          d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`}
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="2.5"
                          strokeDasharray="5 4"
                        />
                      );
                    })}
                  </svg>

                  {/* Lesson nodes */}
                  {unit.lessons.map((lesson, i) => {
                    const xPct = ZIGZAG[i % ZIGZAG.length];
                    const progress = state.lessonProgress[lesson.id];
                    const locked = isLessonLocked(lesson.id);
                    const completed = progress?.completed ?? false;
                    const inProgress = !completed && (progress?.exerciseIndex ?? 0) > 0;
                    const stars = progress?.stars ?? 0;

                    let statusLabel: string;
                    if (locked) {
                      statusLabel = 'Bloqueada, completa la lección anterior para desbloquearla';
                    } else if (completed) {
                      statusLabel = `Completada con ${stars} de 3 estrellas`;
                    } else if (inProgress) {
                      statusLabel = 'En curso';
                    } else {
                      statusLabel = 'Disponible';
                    }

                    let nodeStateClass: string;
                    if (locked) {
                      nodeStateClass = 'bg-slate-200 cursor-not-allowed shadow-none';
                    } else if (completed) {
                      nodeStateClass = `${lesson.colorClass} shadow-lg hover:scale-105 active:scale-95`;
                    } else if (inProgress) {
                      nodeStateClass = `${lesson.colorClass} opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 ring-4 ring-offset-2 ring-indigo-300`;
                    } else {
                      nodeStateClass = `${lesson.colorClass} opacity-75 hover:opacity-100 hover:scale-105 active:scale-95`;
                    }

                    return (
                      <div
                        key={lesson.id}
                        className="absolute"
                        style={{ left: `calc(${xPct * 100}% - 32px)`, top: `${i * 90}px` }}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Node button — el nombre accesible lleva lección,
                              posición, nivel y estado; lo visible se oculta al
                              lector para no repetirlo. */}
                          <button
                            onClick={() => !locked && navigate(`/exercise/${lesson.id}`)}
                            disabled={locked}
                            aria-label={`Lección ${i + 1} de ${unit.lessons.length} de la ${unit.title}: ${lesson.title}, nivel ${lesson.level}. ${statusLabel}`}
                            className={`w-16 h-16 rounded-2xl shadow-md flex flex-col items-center justify-center transition-all ${nodeStateClass}`}
                          >
                            {locked ? (
                              <Lock className="w-6 h-6 text-slate-500" aria-hidden="true" />
                            ) : (
                              <span className="text-xl" aria-hidden="true">{lesson.emoji}</span>
                            )}
                            {inProgress && !locked && (
                              <span className="w-1.5 h-1.5 bg-white rounded-full mt-0.5 animate-pulse" aria-hidden="true" />
                            )}
                          </button>

                          {/* Estado visual: ya está en el nombre del botón */}
                          <div aria-hidden="true" className="flex flex-col items-center gap-1.5">
                            {!locked && completed && <StarRow count={stars} />}
                            {!locked && inProgress && (
                              <div className="flex items-center gap-1 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                <Play className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500" />
                                <span className="text-indigo-700" style={{ fontSize: '0.75rem', fontWeight: 600 }}>EN CURSO</span>
                              </div>
                            )}

                            {/* Label */}
                            <p
                              className={`text-center max-w-[90px] leading-tight ${locked ? 'text-slate-500' : 'text-slate-700'}`}
                              style={{ fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              {lesson.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
