import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Volume2, Bell, Contrast, RotateCcw, ChevronRight, Edit2, Check, AlertTriangle } from 'lucide-react';
import { useApp, getLevel, getXpProgress } from '../context/AppContext';
import { usePageTitle } from '../hooks/usePageTitle';

export function Profile() {
  const { state, updateSettings, resetAllProgress, updateUserName } = useApp();
  usePageTitle('Perfil y configuración');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(state.user.name);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Mensajes de estado anunciados sin mover el foco (WCAG 4.1.3).
  const [statusMsg, setStatusMsg] = useState('');

  const level = getLevel(state.user.xp);
  const xpInfo = getXpProgress(state.user.xp);
  const completedCount = Object.values(state.lessonProgress).filter(p => p.completed).length;
  const totalStars: number = Object.values(state.lessonProgress).reduce((acc: number, p) => acc + (p.stars ?? 0), 0);
  const hours = Math.floor(state.user.totalMinutes / 60);
  const mins = state.user.totalMinutes % 60;

  const saveName = () => {
    const trimmed = nameVal.trim();
    if (trimmed) {
      updateUserName(trimmed);
      setStatusMsg(`Nombre actualizado a ${trimmed}.`);
    }
    setEditingName(false);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Región de anuncios para lectores de pantalla */}
      <p role="status" aria-live="polite" className="sr-only">{statusMsg}</p>

      {/* Header */}
      <div>
        <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Perfil & Configuración</h1>
        <p className="text-slate-600" style={{ fontSize: '0.78rem' }}>Gestiona tu aprendizaje</p>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { saveName(); }
                    if (e.key === 'Escape') { setEditingName(false); }
                  }}
                  aria-label="Editar tu nombre"
                  autoComplete="name"
                  className="bg-white/20 rounded-xl px-3 py-1.5 text-white placeholder-white/50 outline-none border border-white/30 focus:border-white"
                  style={{ fontWeight: 600, fontSize: '0.95rem', width: '150px' }}
                  autoFocus
                />
                <button onClick={saveName} aria-label="Guardar nombre" className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-white" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{state.user.name}</p>
                <button
                  onClick={() => { setNameVal(state.user.name); setEditingName(true); }}
                  aria-label="Editar mi nombre"
                  className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-white" aria-hidden="true" />
                </button>
              </div>
            )}
            <p className="text-indigo-100" style={{ fontSize: '0.78rem' }}>Nivel {level} · {state.user.xp.toLocaleString()} XP total</p>
          </div>
        </div>

        {/* XP progress */}
        <div
          role="group"
          tabIndex={0}
          aria-label={`Progreso al siguiente nivel: ${xpInfo.current} de ${xpInfo.needed} XP, un ${xpInfo.percent} por ciento.`}
        >
          <div aria-hidden="true">
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Progreso al siguiente nivel</span>
              <span style={{ fontSize: '0.72rem' }} className="text-indigo-100">{xpInfo.current}/{xpInfo.needed} XP</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${xpInfo.percent}%` }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <section aria-labelledby="profile-stats-title">
        <h2 id="profile-stats-title" className="sr-only">Tus cifras</h2>
        <ul className="grid grid-cols-2 gap-3 list-none p-0 m-0">
          {[
            { label: 'Racha', value: `${state.user.streak} días`, spoken: `Racha: ${state.user.streak} días`, emoji: '🔥', color: 'bg-orange-50 border-orange-100' },
            { label: 'Tiempo total', value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, spoken: `Tiempo total: ${hours > 0 ? `${hours} horas y ${mins} minutos` : `${mins} minutos`}`, emoji: '⏱️', color: 'bg-blue-50 border-blue-100' },
            { label: 'Lecciones', value: `${completedCount} completadas`, spoken: `Lecciones: ${completedCount} completadas`, emoji: '📚', color: 'bg-indigo-50 border-indigo-100' },
            { label: 'Estrellas', value: `${totalStars} ganadas`, spoken: `Estrellas: ${totalStars} ganadas`, emoji: '⭐', color: 'bg-amber-50 border-amber-100' },
          ].map(item => (
            <li key={item.label} className={`${item.color} border rounded-2xl p-3.5`}>
              <p className="sr-only">{item.spoken}</p>
              <div aria-hidden="true">
                <span className="text-xl">{item.emoji}</span>
                <p className="text-slate-800 mt-1" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.value}</p>
                <p className="text-slate-600" style={{ fontSize: '0.7rem' }}>{item.label}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Settings — cada interruptor toma su nombre del texto visible
          (aria-labelledby) y su estado de aria-checked, así el lector anuncia
          "Sonido, efectos de audio, interruptor, activado" (WCAG 2.5.3). */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" aria-labelledby="profile-prefs-title">
        <div className="px-4 py-3 border-b border-slate-50">
          <h2 id="profile-prefs-title" className="text-slate-500" style={{ fontSize: '0.72rem', fontWeight: 600 }}>PREFERENCIAS</h2>
        </div>

        {/* Sound */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center" aria-hidden="true">
              <Volume2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p id="setting-sound-label" className="text-slate-700" style={{ fontWeight: 500, fontSize: '0.875rem' }}>Sonido</p>
              <p id="setting-sound-desc" className="text-slate-600" style={{ fontSize: '0.72rem' }}>Efectos de audio</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={state.sound}
            aria-labelledby="setting-sound-label setting-sound-desc"
            onClick={() => updateSettings({ sound: !state.sound })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${state.sound ? 'bg-indigo-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${state.sound ? 'translate-x-5' : 'translate-x-0.5'}`} aria-hidden="true" />
          </button>
        </div>

        {/* Notifications */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center" aria-hidden="true">
              <Bell className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p id="setting-notif-label" className="text-slate-700" style={{ fontWeight: 500, fontSize: '0.875rem' }}>Notificaciones</p>
              <p id="setting-notif-desc" className="text-slate-600" style={{ fontSize: '0.72rem' }}>Recordatorios diarios</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={state.notifications}
            aria-labelledby="setting-notif-label setting-notif-desc"
            onClick={() => updateSettings({ notifications: !state.notifications })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${state.notifications ? 'bg-indigo-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${state.notifications ? 'translate-x-5' : 'translate-x-0.5'}`} aria-hidden="true" />
          </button>
        </div>

        {/* High contrast */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center" aria-hidden="true">
              <Contrast className="w-4 h-4 text-white" />
            </div>
            <div>
              <p id="setting-contrast-label" className="text-slate-700" style={{ fontWeight: 500, fontSize: '0.875rem' }}>Alto contraste</p>
              <p id="setting-contrast-desc" className="text-slate-600" style={{ fontSize: '0.72rem' }}>Mejora la legibilidad visual</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={state.highContrast}
            aria-labelledby="setting-contrast-label setting-contrast-desc"
            onClick={() => updateSettings({ highContrast: !state.highContrast })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${state.highContrast ? 'bg-indigo-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${state.highContrast ? 'translate-x-5' : 'translate-x-0.5'}`} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Level info */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" aria-labelledby="profile-levels-title">
        <div className="px-4 py-3 border-b border-slate-50">
          <h2 id="profile-levels-title" className="text-slate-500" style={{ fontSize: '0.72rem', fontWeight: 600 }}>NIVELES DE INGLÉS</h2>
        </div>
        {[
          { level: 'A1', label: 'Principiante', xp: '0–199 XP' },
          { level: 'A2', label: 'Elemental', xp: '200–499 XP' },
          { level: 'B1', label: 'Intermedio', xp: '500–899 XP' },
          { level: 'B2', label: 'Intermedio alto', xp: '900–1399 XP' },
          { level: 'C1', label: 'Avanzado', xp: '1400–1999 XP' },
          { level: 'C2', label: 'Maestría', xp: '2000+ XP' },
        ].map(({ level: lvl, label, xp }) => (
          <div
            key={lvl}
            className={`px-4 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-0 ${lvl === level ? 'bg-indigo-50' : ''}`}
          >
            <span
              className={`w-8 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                lvl === level ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
              style={{ fontWeight: 700, fontSize: '0.72rem' }}
            >
              {lvl}
            </span>
            <div className="flex-1">
              <p className={`${lvl === level ? 'text-indigo-700' : 'text-slate-600'}`} style={{ fontWeight: lvl === level ? 600 : 400, fontSize: '0.85rem' }}>{label}</p>
            </div>
            <p className="text-slate-600" style={{ fontSize: '0.72rem' }}>{xp}</p>
            {lvl === level && <span className="text-indigo-700" style={{ fontSize: '0.75rem', fontWeight: 700 }}>ACTUAL</span>}
          </div>
        ))}
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" aria-labelledby="profile-danger-title">
        <div className="px-4 py-3 border-b border-slate-50">
          <h2 id="profile-danger-title" className="text-slate-500" style={{ fontSize: '0.72rem', fontWeight: 600 }}>ZONA DE PELIGRO</h2>
        </div>
        {showResetConfirm ? (
          <div className="px-4 py-4 space-y-3" role="alertdialog" aria-labelledby="reset-warning">
            <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p id="reset-warning" className="text-red-700" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                Esto borrará todo tu progreso, XP y lecciones completadas. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { resetAllProgress(); setShowResetConfirm(false); setStatusMsg('Todo el progreso se ha reiniciado.'); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 transition-colors"
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Sí, reiniciar todo
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-2.5 transition-colors"
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            aria-label="Reiniciar todo el progreso. Borra todo y empieza desde cero"
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <span className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <RotateCcw className="w-4 h-4 text-red-500" />
            </span>
            <span className="flex-1" aria-hidden="true">
              <span className="text-red-600 block" style={{ fontWeight: 500, fontSize: '0.875rem' }}>Reiniciar todo el progreso</span>
              <span className="text-slate-600 block" style={{ fontSize: '0.72rem' }}>Borra todo y empieza desde cero</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
          </button>
        )}
      </section>
    </div>
  );
}
