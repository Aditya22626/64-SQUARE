import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chess-dark flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex flex-1 bg-chess-panel relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 h-full">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className={`${(Math.floor(i / 8) + i) % 2 === 0 ? 'bg-white' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
        <div className="relative text-center px-12">
          <div className="text-8xl mb-8">♟</div>
          <h1 className="font-display text-4xl font-bold text-white mb-4">64 SQUARE</h1>
          <p className="text-slate-400 text-lg max-w-sm mx-auto">
            A self-learning chess engine powered by reinforcement learning and neural networks
          </p>
          <div className="mt-8 flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold gradient-text">RL</div>
              <div className="text-xs text-slate-500">Reinforcement Learning</div>
            </div>
            <div>
              <div className="text-2xl font-bold gradient-text">Q-Net</div>
              <div className="text-xs text-slate-500">Neural Network</div>
            </div>
            <div>
              <div className="text-2xl font-bold gradient-text">DQN</div>
              <div className="text-xs text-slate-500">Deep Q-Learning</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3 lg:hidden">♟</div>
            <h2 className="font-display text-3xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-400 mt-2">Sign in to continue playing</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-chess-card border border-chess-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-chess-accent focus:ring-1 focus:ring-chess-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-chess-card border border-chess-border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-chess-accent focus:ring-1 focus:ring-chess-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-chess-accent hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? <div className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-chess-accent hover:text-indigo-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
