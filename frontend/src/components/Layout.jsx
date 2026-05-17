import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Swords, History, Brain, LogOut, Menu, X, Trophy, ChevronRight } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/history', icon: History, label: 'Game History' },
  { to: '/ai-dashboard', icon: Brain, label: 'AI Performance' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-chess-dark overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 flex flex-col bg-chess-panel border-r border-chess-border flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-chess-border">
          <div className="w-8 h-8 rounded-lg bg-chess-accent flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">♟</span>
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-display font-bold text-white text-sm">ChessAI</div>
              <div className="text-xs text-indigo-400">Self-Learning Engine</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-slate-400 hover:text-white transition-colors">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-chess-accent/20 text-chess-accent border border-chess-accent/30'
                    : 'text-slate-400 hover:text-white hover:bg-chess-card'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
              {sidebarOpen && <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
            </NavLink>
          ))}

          {/* Quick play */}
          {sidebarOpen && (
            <div className="pt-4 mt-4 border-t border-chess-border">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Quick Play</div>
              <button onClick={() => navigate('/?mode=ai')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-chess-card transition-all text-sm">
                <Brain size={16} /><span>vs AI</span>
              </button>
              <button onClick={() => navigate('/?mode=human')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-chess-card transition-all text-sm">
                <Swords size={16} /><span>2 Players</span>
              </button>
            </div>
          )}
        </nav>

        {/* User profile */}
        <div className="border-t border-chess-border p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user?.username}</div>
                  <div className="text-xs text-chess-gold">⚡ {user?.stats?.rating || 1200}</div>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors" title="Logout">
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
