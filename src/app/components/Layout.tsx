import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Home, BookOpen, Dumbbell, BarChart2, Settings, Zap, User } from 'lucide-react';
import { useApp, getLevel, getXpProgress } from '../context/AppContext';

const navItems = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/lessons', label: 'Lecciones', icon: BookOpen, end: false },
  { to: '/practice', label: 'Práctica', icon: Dumbbell, end: false },
  { to: '/progress', label: 'Progreso', icon: BarChart2, end: false },
  { to: '/profile', label: 'Config.', icon: Settings, end: false },
];

export function Layout() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const level = getLevel(state.user.xp);
  const xpInfo = getXpProgress(state.user.xp);
  // Cambiar de pestaña no mueve el foco ni recarga la página, así que el lector
  // de pantalla no diría nada: se anuncia la nueva pantalla en una región viva
  // (WCAG 4.1.3), sin robar el foco de la barra de navegación.
  const [routeAnnouncement, setRouteAnnouncement] = useState('');

  useEffect(() => {
    if (!state.onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [state.onboardingCompleted, navigate]);

  useEffect(() => {
    // Las páginas hijas fijan document.title en sus propios efectos, que se
    // ejecutan antes que este por ser componentes más internos.
    setRouteAnnouncement(document.title.replace(' · LinguaFlow', ''));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
      <p role="status" aria-live="polite" className="sr-only">
        {routeAnnouncement ? `Pantalla: ${routeAnnouncement}` : ''}
      </p>

      {/* ── TOP HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm" aria-hidden="true">
              <span className="text-sm">🌟</span>
            </div>
            <span className="hidden sm:block text-slate-800" style={{ fontWeight: 700, fontSize: '1rem' }}>LinguaFlow</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full" role="img" aria-label={`Racha de ${state.user.streak} días de estudio`}>
              <span className="text-base" aria-hidden="true">🔥</span>
              <span className="text-orange-700" aria-hidden="true" style={{ fontWeight: 700, fontSize: '0.75rem' }}>{state.user.streak}</span>
            </div>

            {/* Level + XP */}
            <div className="flex items-center gap-1.5" role="img" aria-label={`Nivel ${level}, ${state.user.xp.toLocaleString()} puntos de experiencia`}>
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full" aria-hidden="true" style={{ fontWeight: 700, fontSize: '0.7rem' }}>{level}</span>
              <div className="flex items-center gap-1" aria-hidden="true">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="text-slate-700" style={{ fontWeight: 600, fontSize: '0.75rem' }}>{state.user.xp.toLocaleString()}</span>
              </div>
            </div>

            {/* Profile */}
            <button
              onClick={() => navigate('/profile')}
              aria-label="Ir a mi perfil y configuración"
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 transition-colors"
            >
              <User className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* XP Progress bar */}
        <div
          className="h-[3px] bg-slate-100"
          role="progressbar"
          aria-label="Progreso hacia el siguiente nivel"
          aria-valuenow={xpInfo.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${xpInfo.current} de ${xpInfo.needed} XP`}
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
            style={{ width: `${xpInfo.percent}%` }}
          />
        </div>

        {/* Desktop Navigation tabs */}
        <nav aria-label="Navegación principal" className="hidden md:flex border-t border-slate-100 max-w-2xl mx-auto w-full">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-5 py-2.5 transition-colors border-b-2 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`
              }
              style={{ fontSize: '0.8rem', fontWeight: 500 }}
            >
              <item.icon className="w-4 h-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16 md:pt-[calc(3.5rem+2.75rem)] pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav aria-label="Navegación principal" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-1px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? 'text-indigo-600' : 'text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-indigo-100' : ''}`}>
                    <item.icon className="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
