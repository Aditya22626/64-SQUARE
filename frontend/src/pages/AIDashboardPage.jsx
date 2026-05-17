import React, { useState, useEffect } from 'react';
import { aiAPI } from '../utils/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { Brain, Zap, TrendingUp, Database, Target, RefreshCw, BookOpen, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';

const DIFF_LABELS = { 1: 'Beg', 2: 'Beg', 3: 'Easy', 4: 'Easy', 5: 'Med', 6: 'Med', 7: 'Hard', 8: 'Hard', 9: 'Expert', 10: 'Master' };

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-chess-accent', iconBg = 'bg-chess-accent/20' }) => (
  <div className="bg-chess-panel border border-chess-border rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon size={20} className={color} />
      </div>
    </div>
    <div className={`text-2xl font-bold font-mono ${color} mb-0.5`}>{value}</div>
    <div className="text-sm text-white font-medium">{label}</div>
    {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-chess-card border border-chess-border rounded-xl p-3 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">Game #{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AIDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await aiAPI.getPerformance(100);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load AI performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🧠</div>
          <div className="spinner mx-auto mb-3" />
          <div className="text-slate-400 text-sm">Loading AI performance data...</div>
        </div>
      </div>
    );
  }

  const stats = data || {};
  const perfHistory = stats.performanceHistory || [];
  const rollingWinRate = stats.rollingWinRate || [];
  const diffStats = stats.difficultyStats || {};
  const perfChart = stats.performanceChart || [];

  // Build accuracy trend from performance history
  const accuracyTrend = perfHistory.slice(-50).map((p, i) => ({
    game: i + 1,
    accuracy: Math.round(p.avgMoveQuality || 50),
    exploration: Math.round((p.explorationRate || 0.5) * 100)
  }));

  // Results chart data
  const resultsTrend = rollingWinRate.slice(-40).map((r, i) => ({
    game: i + 1,
    winRate: r.winRate,
    accuracy: Math.round(r.accuracy || 0)
  }));

  // Difficulty breakdown
  const diffChartData = Object.entries(diffStats).map(([d, s]) => ({
    difficulty: `Lv.${d}`,
    wins: s.wins,
    losses: s.losses,
    draws: s.draws,
    winRate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0
  }));

  // Recent game results (last 20)
  const recentResults = perfChart.slice(-20).map((g, i) => ({
    game: i + 1,
    result: g.result === 'win' ? 100 : g.result === 'draw' ? 50 : 0,
    accuracy: g.accuracy || 50
  }));

  // Neural network "radar" - conceptual AI capabilities
  const radarData = [
    { axis: 'Opening', value: Math.min(95, 40 + (stats.totalMovesLearned || 0) / 200) },
    { axis: 'Tactics', value: Math.min(95, 35 + (stats.totalGamesPlayed || 0) / 10) },
    { axis: 'Endgame', value: Math.min(90, 30 + (stats.totalGamesPlayed || 0) / 15) },
    { axis: 'Strategy', value: Math.min(85, 25 + (stats.totalMovesLearned || 0) / 300) },
    { axis: 'Defense', value: Math.min(90, 45 + (stats.totalGamesPlayed || 0) / 12) },
    { axis: 'Learning', value: Math.min(99, 50 + (1 - (stats.currentEpsilon || 1)) * 49) }
  ];

  const explorationPct = stats.explorationRate || 100;
  const exploitationPct = 100 - explorationPct;
  const gamesPlayed = stats.totalGamesPlayed || 0;
  const movesLearned = stats.totalMovesLearned || 0;
  const improvementRate = stats.improvementRate || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">AI Performance</h1>
          <p className="text-slate-400 text-sm">Self-learning reinforcement learning model dashboard</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-chess-panel border border-chess-border rounded-xl text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Brain}
          label="Games Played"
          value={gamesPlayed.toLocaleString()}
          sub="Total training games"
          color="text-chess-accent"
          iconBg="bg-chess-accent/20"
        />
        <StatCard
          icon={Database}
          label="Moves Learned"
          value={movesLearned.toLocaleString()}
          sub="Q-table entries"
          color="text-purple-400"
          iconBg="bg-purple-500/20"
        />
        <StatCard
          icon={Target}
          label="Exploitation"
          value={`${exploitationPct.toFixed(1)}%`}
          sub={`Exploration: ${explorationPct.toFixed(1)}%`}
          color="text-chess-green"
          iconBg="bg-chess-green/20"
        />
        <StatCard
          icon={TrendingUp}
          label="Improvement"
          value={`${improvementRate > 0 ? '+' : ''}${improvementRate.toFixed(1)}%`}
          sub="vs previous period"
          color={improvementRate >= 0 ? 'text-chess-green' : 'text-red-400'}
          iconBg={improvementRate >= 0 ? 'bg-chess-green/20' : 'bg-red-500/20'}
        />
      </div>

      {/* Model architecture info */}
      <div className="bg-chess-panel border border-chess-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu size={14} /> Model Architecture
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Algorithm', value: 'DQN + Q-Learning', icon: '🧠' },
            { label: 'Search', value: 'Minimax α-β', icon: '♟' },
            { label: 'Version', value: `v${stats.version || 1}`, icon: '🔢' },
            { label: 'Last Trained', value: stats.lastTrainedAt ? new Date(stats.lastTrainedAt).toLocaleDateString() : 'Never', icon: '📅' }
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-chess-card rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-white font-medium text-sm">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exploration vs Exploitation bar */}
      <div className="bg-chess-panel border border-chess-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} /> Exploration vs Exploitation (ε-greedy)
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-chess-accent" />
              <span className="text-slate-400">Explore (random): {explorationPct.toFixed(1)}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-chess-green" />
              <span className="text-slate-400">Exploit (learned): {exploitationPct.toFixed(1)}%</span>
            </span>
          </div>
        </div>
        <div className="h-6 bg-chess-card rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-chess-accent to-purple-500 transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${explorationPct}%` }}
          >
            {explorationPct > 15 && <span className="text-white text-xs font-bold">ε={((stats.currentEpsilon || 1) * 100).toFixed(0)}%</span>}
          </div>
          <div
            className="h-full bg-gradient-to-r from-chess-green to-emerald-400 flex-1 transition-all duration-500"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          As the AI plays more games, ε (epsilon) decays → it exploits learned Q-values more and explores less.
          Currently at ε={((stats.currentEpsilon || 1)).toFixed(4)}
        </p>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Win rate trend */}
        <div className="bg-chess-panel border border-chess-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Win Rate Trend (Rolling 10-game window)
          </h2>
          {resultsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={resultsTrend}>
                <defs>
                  <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="game" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="winRate" name="Win Rate" stroke="#10b981" fill="url(#winGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
              Play more games to see win rate trend
            </div>
          )}
        </div>

        {/* Accuracy over time */}
        <div className="bg-chess-panel border border-chess-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Move Quality & Exploration Decay
          </h2>
          {accuracyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="game" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} />
                <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="exploration" name="Exploration %" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
              Play more games to see trends
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance by difficulty */}
        <div className="bg-chess-panel border border-chess-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Performance by Difficulty
          </h2>
          {diffChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={diffChartData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="difficulty" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} />
                <Bar dataKey="wins" name="Wins" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="draws" name="Draws" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
              Play games at different difficulties to see stats
            </div>
          )}
        </div>

        {/* AI capabilities radar */}
        <div className="bg-chess-panel border border-chess-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            AI Capability Radar
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a2a4a" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Radar name="AI" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent game results heatmap-style */}
      {recentResults.length > 0 && (
        <div className="bg-chess-panel border border-chess-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Recent Game Results (last {recentResults.length} games)
          </h2>
          <div className="flex flex-wrap gap-2">
            {perfChart.slice(-40).map((g, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 cursor-default ${
                  g.result === 'win' ? 'bg-chess-green/20 text-chess-green border border-chess-green/30' :
                  g.result === 'draw' ? 'bg-chess-gold/20 text-chess-gold border border-chess-gold/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
                title={`Game ${i + 1}: ${g.result} (Lv.${g.difficulty})`}
              >
                {g.result === 'win' ? 'W' : g.result === 'draw' ? 'D' : 'L'}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-chess-green/30 border border-chess-green/30" /> Win</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/30" /> Loss</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-chess-gold/30 border border-chess-gold/30" /> Draw</span>
          </div>
        </div>
      )}

      {/* Learning info */}
      <div className="bg-chess-panel border border-chess-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BookOpen size={14} /> How the AI Learns
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            {
              title: '1. Q-Learning',
              icon: '📊',
              desc: 'For every move, the AI updates Q(s,a) = Q(s,a) + α[r + γ·max Q(s\') - Q(s,a)]. Over time, it learns which moves lead to wins.'
            },
            {
              title: '2. Minimax + α-β Pruning',
              icon: '♟',
              desc: 'For exploitation, the AI searches N moves deep using minimax with alpha-beta pruning, evaluating positions via piece values + PST.'
            },
            {
              title: '3. ε-Greedy Exploration',
              icon: '🎲',
              desc: 'With probability ε, the AI explores random moves. As it plays more games, ε decays so it uses its learned knowledge more.'
            }
          ].map(({ title, icon, desc }) => (
            <div key={title} className="bg-chess-card rounded-xl p-4">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-white font-semibold mb-1">{title}</div>
              <div className="text-slate-400 text-xs leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
