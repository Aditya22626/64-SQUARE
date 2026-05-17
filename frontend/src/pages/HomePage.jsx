import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gamesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Brain, Users, Zap, Shield, Trophy, Clock } from 'lucide-react';

const DIFFICULTY_LABELS = {
  1: 'Beginner', 2: 'Beginner', 3: 'Easy', 4: 'Easy',
  5: 'Medium', 6: 'Medium', 7: 'Hard', 8: 'Hard',
  9: 'Expert', 10: 'Master'
};

const DIFFICULTY_COLORS = {
  1: '#10b981', 2: '#10b981', 3: '#84cc16', 4: '#84cc16',
  5: '#f59e0b', 6: '#f59e0b', 7: '#f97316', 8: '#f97316',
  9: '#ef4444', 10: '#7c3aed'
};

const TIME_CONTROLS = [
  { label: 'Bullet', time: 60, icon: '⚡', desc: '1 min' },
  { label: 'Blitz', time: 180, icon: '🔥', desc: '3 min' },
  { label: 'Rapid', time: 600, icon: '⏱', desc: '10 min' },
  { label: 'Classical', time: 1800, icon: '♟', desc: '30 min' }
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get('mode') || null;

  const [mode, setMode] = useState(defaultMode);
  const [difficulty, setDifficulty] = useState(5);
  const [color, setColor] = useState('random');
  const [timeControl, setTimeControl] = useState(600);
  const [loading, setLoading] = useState(false);

  const startGame = async () => {
    setLoading(true);
    try {
      const res = await gamesAPI.create(mode, difficulty, color, { initial: timeControl, increment: 0 });
      navigate(`/game/${res.data.game.gameId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const totalGames = (user?.stats?.gamesVsAI || 0) + (user?.stats?.gamesVsHuman || 0);
  const totalWins = (user?.stats?.winsVsAI || 0) + (user?.stats?.winsVsHuman || 0);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto page-enter">
      {/* Header */}
      {/* Header */}
<div className="mb-10 flex justify-between items-start">

  {/* Left Side */}
  <div>
    <h1 className="font-display text-3xl font-bold text-white">
      Welcome, <span className="gradient-text">{user?.username}</span>
    </h1>

    <p className="text-slate-400 mt-1">
      Choose your game mode and start playing
    </p>
  </div>

  {/* Right Side */}
  <h1 className="text-4xl font-bold text-chess-accent">
    ♟ 64 Square
  </h1>

</div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Rating', value: user?.stats?.rating || 1200, icon: '⚡', color: 'text-chess-gold' },
          { label: 'Games', value: totalGames, icon: '♟', color: 'text-chess-accent' },
          { label: 'Win Rate', value: `${winRate}%`, icon: '🏆', color: 'text-chess-green' },
          { label: 'Best Rating', value: user?.stats?.bestRating || 1200, icon: '⭐', color: 'text-purple-400' }
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-chess-panel border border-chess-border rounded-xl p-4">
            <div className="text-2xl mb-1">{icon}</div>
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Game mode selection */}
      {!mode ? (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Choose Game Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('ai')}
              className="group bg-chess-panel border border-chess-border hover:border-chess-accent rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-chess-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="text-chess-accent" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Play vs AI</h3>
              <p className="text-slate-400 text-sm mb-4">
                Challenge our self-learning chess engine powered by reinforcement learning and neural networks.
                The AI learns from every game!
              </p>
              <div className="flex gap-2 flex-wrap">
                {['RL Engine', 'Q-Learning', 'Neural Net', 'Self-Improving'].map(tag => (
                  <span key={tag} className="text-xs bg-chess-accent/10 text-chess-accent px-2 py-1 rounded-full border border-chess-accent/20">
                    {tag}
                  </span>
                ))}
              </div>
            </button>

            <button
              onClick={() => setMode('human')}
              className="group bg-chess-panel border border-chess-border hover:border-chess-green rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-chess-green/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="text-chess-green" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">2 Players</h3>
              <p className="text-slate-400 text-sm mb-4">
                Play against a friend on the same device. Pass and play style with a beautiful chess board interface.
              </p>
              <div className="flex gap-2 flex-wrap">
                {['Local Multiplayer', 'Full Analysis', 'Game Review', 'History Saved'].map(tag => (
                  <span key={tag} className="text-xs bg-chess-green/10 text-chess-green px-2 py-1 rounded-full border border-chess-green/20">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <button
            onClick={() => setMode(null)}
            className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
          >
            ← Back to mode selection
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Settings */}
            <div className="space-y-5">
              <div className="bg-chess-panel border border-chess-border rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-chess-accent" />
                  Time Control
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_CONTROLS.map(({ label, time, icon, desc }) => (
                    <button
                      key={time}
                      onClick={() => setTimeControl(time)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        timeControl === time
                          ? 'border-chess-accent bg-chess-accent/10'
                          : 'border-chess-border hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-sm font-medium text-white">{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'ai' && (
                <>
                  <div className="bg-chess-panel border border-chess-border rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap size={16} className="text-chess-gold" />
                      AI Difficulty
                      <span className="ml-auto text-sm font-mono" style={{ color: DIFFICULTY_COLORS[difficulty] }}>
                        {DIFFICULTY_LABELS[difficulty]}
                      </span>
                    </h3>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={difficulty}
                      onChange={e => setDifficulty(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Beginner</span>
                      <span>Master</span>
                    </div>
                  </div>

                  <div className="bg-chess-panel border border-chess-border rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield size={16} className="text-chess-green" />
                      Play As
                    </h3>
                    <div className="flex gap-2">
                      {['white', 'black', 'random'].map(c => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`flex-1 py-2.5 rounded-xl border transition-all text-sm font-medium capitalize ${
                            color === c
                              ? 'border-chess-accent bg-chess-accent/10 text-chess-accent'
                              : 'border-chess-border text-slate-400 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {c === 'white' ? '♔ White' : c === 'black' ? '♚ Black' : '🎲 Random'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Preview & Start */}
            <div className="bg-chess-panel border border-chess-border rounded-2xl p-5 flex flex-col">
              <h3 className="font-semibold text-white mb-4">Game Summary</h3>
              <div className="space-y-3 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Mode</span>
                  <span className="text-white font-medium">{mode === 'ai' ? '🤖 vs AI' : '👥 2 Players'}</span>
                </div>
                {mode === 'ai' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Difficulty</span>
                      <span className="font-medium" style={{ color: DIFFICULTY_COLORS[difficulty] }}>
                        {difficulty}/10 — {DIFFICULTY_LABELS[difficulty]}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Color</span>
                      <span className="text-white font-medium capitalize">{color}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time</span>
                  <span className="text-white font-medium">
                    {TIME_CONTROLS.find(t => t.time === timeControl)?.label} ({timeControl / 60}min)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Analysis</span>
                  <span className="text-chess-green font-medium">✓ Full review included</span>
                </div>
              </div>

              <button
                onClick={startGame}
                disabled={loading}
                className="mt-6 w-full bg-chess-accent hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all duration-200 text-lg flex items-center justify-center gap-2 glow-indigo"
              >
                {loading ? <div className="spinner" /> : (
                  <>♟ Start Game</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent games quick links */}
      <div className="mt-8 p-4 bg-chess-panel border border-chess-border rounded-xl flex items-center gap-4">
        <Trophy size={20} className="text-chess-gold flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm text-slate-300">
            You've played <span className="text-white font-semibold">{totalGames}</span> games total with a{' '}
            <span className="text-chess-green font-semibold">{winRate}%</span> win rate
          </div>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="text-xs text-chess-accent hover:text-indigo-300 transition-colors flex-shrink-0"
        >
          View History →
        </button>
      </div>
    </div>
  );
}
