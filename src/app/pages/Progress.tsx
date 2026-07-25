import { motion } from 'motion/react';
import { BarChart2, Flame, Clock, Trophy, Target, TrendingUp, Star } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useApp, getLevel, getXpProgress } from '../context/AppContext';
import { units } from '../data/lessons';
import { usePageTitle } from '../hooks/usePageTitle';

function MiniStars({ count }: Readonly<{ count: number }>) {
  return (
    <span role="img" aria-label={`${count} de 3 estrellas`}>
      {[1,2,3].map(i => (
        <span key={i} aria-hidden="true" className={`text-xs ${i <= count ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
    </span>
  );
}

export function Progress() {
  const { state } = useApp();
  usePageTitle('Mi progreso');
  const level = getLevel(state.user.xp);
  const xpInfo = getXpProgress(state.user.xp);

  const allLessons = units.flatMap(u => u.lessons);
  const completedLessons = allLessons.filter(l => state.lessonProgress[l.id]?.completed);
  const totalStars: number = Object.values(state.lessonProgress).reduce((acc: number, p) => acc + (p.stars ?? 0), 0);
  const maxStars = allLessons.length * 3;
  const avgScore = completedLessons.length > 0
    ? Math.round(completedLessons.reduce((acc, l) => acc + (state.lessonProgress[l.id]?.score ?? 0), 0) / completedLessons.length)
    : 0;

  const hours = Math.floor(state.user.totalMinutes / 60);
  const mins = state.user.totalMinutes % 60;

  const overallPercent = Math.round((completedLessons.length / allLessons.length) * 100);

  const radialData = [
    { name: 'Progreso', value: overallPercent, fill: '#6366f1' },
  ];

  // Progress by unit
  const unitProgress = units.map(unit => {
    const done = unit.lessons.filter(l => state.lessonProgress[l.id]?.completed).length;
    return {
      ...unit,
      done,
      total: unit.lessons.length,
      pct: Math.round((done / unit.lessons.length) * 100),
    };
  });

  // Recent completed lessons
  const recent = completedLessons.slice(-5).reverse();

  const levelColors: Record<string, string> = {
    A1: 'text-emerald-700 bg-emerald-100',
    A2: 'text-orange-700 bg-orange-100',
    B1: 'text-purple-700 bg-purple-100',
    B2: 'text-blue-700 bg-blue-100',
    C1: 'text-rose-700 bg-rose-100',
    C2: 'text-slate-800 bg-slate-200',
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Mi Progreso</h1>
        <p className="text-slate-600" style={{ fontSize: '0.78rem' }}>Sigue tu evolución en el aprendizaje</p>
      </div>

      {/* Overall progress ring + level */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white"
      >
        <div className="flex items-center gap-5">
          {/* Radial chart */}
          <div className="relative w-24 h-24 flex-shrink-0" role="img" aria-label={`Progreso total del curso: ${overallPercent} por ciento`}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" startAngle={90} endAngle={-270} data={radialData}>
                <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.2)' }} cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
              <span className="text-white" style={{ fontWeight: 800, fontSize: '1.3rem', lineHeight: 1 }}>{overallPercent}%</span>
              <span className="text-indigo-100" style={{ fontSize: '0.7rem' }}>total</span>
            </div>
          </div>

          {/* Resumen enfocable: toda la información del bloque se lee de una
              vez, sin depender de que el lector recorra fragmentos sueltos. */}
          <div
            className="flex-1"
            role="group"
            tabIndex={0}
            aria-label={
              `${state.user.name}, nivel ${level}. ${state.user.xp.toLocaleString()} puntos de experiencia. ` +
              `${completedLessons.length} de ${allLessons.length} lecciones completadas. ` +
              `${xpInfo.current} de ${xpInfo.needed} XP para el siguiente nivel.`
            }
          >
            <div aria-hidden="true">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-full" style={{ fontWeight: 700, fontSize: '0.72rem' }}>Nivel {level}</span>
              </div>
              <p className="text-white mb-1" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{state.user.name}</p>
              <p className="text-indigo-100" style={{ fontSize: '0.78rem' }}>{state.user.xp.toLocaleString()} XP · {completedLessons.length}/{allLessons.length} lecciones</p>
              {/* XP bar */}
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${xpInfo.percent}%` }} />
              </div>
              <p className="text-indigo-100 mt-1" style={{ fontSize: '0.75rem' }}>{xpInfo.current}/{xpInfo.needed} XP para siguiente nivel</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <section aria-labelledby="progress-stats-title">
        <h2 id="progress-stats-title" className="sr-only">Resumen de estadísticas</h2>
        <ul className="grid grid-cols-2 gap-3 list-none p-0 m-0">
          {[
            { icon: <Flame className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-100', label: 'Racha actual', value: `${state.user.streak} días`, spoken: `Racha actual: ${state.user.streak} días` },
            { icon: <Clock className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-100', label: 'Tiempo total', value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, spoken: `Tiempo total de estudio: ${hours > 0 ? `${hours} horas y ${mins} minutos` : `${mins} minutos`}` },
            { icon: <Star className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-100', label: 'Estrellas ganadas', value: `${totalStars}/${maxStars}`, spoken: `Estrellas ganadas: ${totalStars} de ${maxStars}` },
            { icon: <Target className="w-4 h-4 text-green-600" />, bg: 'bg-green-100', label: 'Precisión media', value: `${avgScore}%`, spoken: `Precisión media: ${avgScore} por ciento` },
          ].map((s, i) => (
            <li key={s.label}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-full"
                role="group"
                tabIndex={0}
                aria-label={s.spoken}
              >
                <div aria-hidden="true">
                  <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className="text-slate-800" style={{ fontWeight: 700, fontSize: '1rem' }}>{s.value}</p>
                  <p className="text-slate-600" style={{ fontSize: '0.75rem' }}>{s.label}</p>
                </div>
              </motion.div>
            </li>
          ))}
        </ul>
      </section>

      {/* Progress by unit */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" aria-labelledby="progress-units-title">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          <h2 id="progress-units-title" className="text-slate-700" style={{ fontWeight: 700, fontSize: '0.875rem' }}>Progreso por unidad</h2>
        </div>
        <ul className="divide-y divide-slate-50 list-none p-0 m-0">
          {unitProgress.map(u => (
            <li key={u.id} className="px-4 py-3">
              {/* Lectura en una sola frase; lo visual queda oculto para no
                  repetir "2 barra 5" ni leer la barra de progreso decorativa. */}
              <p className="sr-only">
                {u.subtitle}, nivel {u.level}: {u.done} de {u.total} lecciones completadas, {u.pct} por ciento.
              </p>
              <div aria-hidden="true">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-xs ${levelColors[u.level] ?? 'bg-slate-100 text-slate-600'}`}
                      style={{ fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      {u.level}
                    </span>
                    <span className="text-slate-700" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.subtitle}</span>
                  </div>
                  <span className="text-slate-500" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{u.done}/{u.total}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${u.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full bg-gradient-to-r ${u.gradientFrom} ${u.gradientTo}`}
                  />
                </div>
                <p className="text-slate-600 mt-1" style={{ fontSize: '0.75rem' }}>{u.pct}% completado</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent lessons */}
      {recent.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" aria-labelledby="progress-recent-title">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <h2 id="progress-recent-title" className="text-slate-700" style={{ fontWeight: 700, fontSize: '0.875rem' }}>Lecciones completadas recientemente</h2>
          </div>
          <ul className="divide-y divide-slate-50 list-none p-0 m-0">
            {recent.map(lesson => {
              const p = state.lessonProgress[lesson.id];
              return (
                <li key={lesson.id} className="px-4 py-3">
                  <p className="sr-only">
                    {lesson.title}: {p?.stars ?? 0} de 3 estrellas, {p?.score ?? 0} por ciento de aciertos, {p?.xpEarned ?? 0} XP ganados.
                  </p>
                  <div className="flex items-center gap-3" aria-hidden="true">
                    <div className={`w-9 h-9 ${lesson.colorClass} rounded-xl flex items-center justify-center text-base flex-shrink-0`}>
                      {lesson.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 truncate" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{lesson.title}</p>
                      <div className="flex items-center gap-2">
                        <MiniStars count={p?.stars ?? 0} />
                        <span className="text-slate-600" style={{ fontSize: '0.75rem' }}>{p?.score ?? 0}% · +{p?.xpEarned ?? 0} XP</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {completedLessons.length === 0 && (
        <div className="text-center py-8 text-slate-600">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p style={{ fontWeight: 500 }}>Completa tu primera lección</p>
          <p className="mt-1" style={{ fontSize: '0.82rem' }}>para ver tus estadísticas aquí</p>
        </div>
      )}
    </div>
  );
}
