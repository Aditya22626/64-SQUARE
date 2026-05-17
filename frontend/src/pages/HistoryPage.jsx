import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Eye, ChevronLeft, ChevronRight, Trophy, Cpu, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const RESULT_CONFIG = {
  win: { label: 'Win', color: 'text-chess-green', bg: 'bg-chess-green/10 border-chess-green/30', icon: '🏆' },
  loss: { label: 'Loss', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '😔' },
  draw: { label: 'Draw', color: 'text-chess-gold', bg: 'bg-chess-gold/10 border-chess-gold/30', icon: '🤝' }
};

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filter, setFilter] = useState('all'); // all | ai | human

  useEffect(() => {
    loadGames();
  }, [page, filter]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const mode = filter !== 'all' ? filter : undefined;
      const res = await gamesAPI.getHistory(page, 15, mode);
      setGames(res.data.games);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load game history');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerResult = (game) => {
    const isWhite = game.white?.userId?.toString() === user?._id?.toString();
    const playerColor = isWhite ? 'white' : 'black';
    const winner = game.result?.winner;
    if (!winner) return null;
    if (winner === 'draw') return 'draw';
    return winner === playerColor ? 'win' : 'loss';
  };

  const getOpponent = (game) => {
    const isWhite = game.white?.userId?.toString() === user?._id?.toString();
    return isWhite ? game.black : game.white;
  };

  const getAccuracy = (game) => {
    const isWhite = game.white?.userId?.toString() === user?._id?.toString();
    return isWhite ? game.analysis?.whiteAccuracy : game.analysis?.blackAccuracy;
  };

  const formatDuration = (game) => {
    const totalSeconds = game.moves?.length * 3 || 0;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
  };

  const totalGames = pagination.total || 0;
  const wins = games.filter(g => getPlayerResult(g) === 'win').length;
  const losses = games.filter(g => getPlayerResult(g) === 'loss').length;
  const draws = games.filter(g => getPlayerResult(g) === 'draw').length;

  return (
    <div className="p-6 max-w-5xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white mb-1">Game History</h1>
        <p className="text-slate-400">Review your past games and improve</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Games', value: totalGames, color: 'text-chess-accent' },
          { label: 'Wins', value: user?.stats ? (user.stats.winsVsAI || 0) + (user.stats.winsVsHuman || 0) : 0, color: 'text-chess-green' },
          { label: 'Losses', value: user?.stats?.losses || 0, color: 'text-red-400' },
          { label: 'Draws', value: user?.stats?.draws || 0, color: 'text-chess-gold' }
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-chess-panel border border-chess-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-slate-500">Filter:</span>
        {['all', 'ai', 'human'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === f
                ? 'bg-chess-accent text-white'
                : 'bg-chess-panel border border-chess-border text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            {f === 'ai' ? '🤖 vs AI' : f === 'human' ? '👥 vs Human' : '📋 All Games'}
          </button>
        ))}
      </div>

      {/* Game list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" />
            <div className="text-slate-500 text-sm">Loading games...</div>
          </div>
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">♟</div>
          <div className="text-xl font-semibold text-white mb-2">No games yet</div>
          <div className="text-slate-400 text-sm mb-6">Play your first game to see it here</div>
          <button
            onClick={() => navigate('/')}
            className="bg-chess-accent hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Start Playing
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const result = getPlayerResult(game);
            const opponent = getOpponent(game);
            const resultConfig = result ? RESULT_CONFIG[result] : null;
            const accuracy = getAccuracy(game);
            const isWhite = game.white?.userId?.toString() === user?._id?.toString();

            return (
              <div
                key={game._id}
                className="bg-chess-panel border border-chess-border hover:border-chess-accent/50 rounded-xl p-4 flex items-center gap-4 transition-all group cursor-pointer"
                onClick={() => navigate(`/review/${game.gameId}`)}
              >
                {/* Result badge */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border flex-shrink-0 ${resultConfig?.bg || 'bg-chess-card border-chess-border'}`}>
                  <div className="text-lg">{resultConfig?.icon || '?'}</div>
                  <div className={`text-xs font-bold ${resultConfig?.color || 'text-slate-400'}`}>
                    {resultConfig?.label || '--'}
                  </div>
                </div>

                {/* Game info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium truncate">
                      {isWhite ? '♔' : '♚'} vs {opponent?.username || 'Unknown'}
                    </span>
                    {opponent?.isAI && <Cpu size={12} className="text-chess-accent flex-shrink-0" />}
                    {game.mode === 'ai' && !opponent?.isAI && <Users size={12} className="text-chess-green flex-shrink-0" />}
                    {game.aiDifficulty && (
                      <span className="text-xs text-slate-500 bg-chess-card px-2 py-0.5 rounded-full">
                        Lv.{game.aiDifficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {game.timeControl?.initial ? `${game.timeControl.initial / 60}min` : 'Custom'}
                    </span>
                    <span>{game.moves?.length || 0} moves</span>
                    <span>
                      {game.createdAt ? formatDistanceToNow(new Date(game.createdAt), { addSuffix: true }) : '--'}
                    </span>
                    {game.result?.method && (
                      <span className="capitalize">{game.result.method.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>

                {/* Accuracy */}
                {accuracy && (
                  <div className="text-center flex-shrink-0">
                    <div className={`text-lg font-bold font-mono ${
                      accuracy >= 90 ? 'text-chess-green' :
                      accuracy >= 75 ? 'text-lime-400' :
                      accuracy >= 60 ? 'text-chess-gold' : 'text-red-400'
                    }`}>{accuracy}%</div>
                    <div className="text-xs text-slate-500">accuracy</div>
                  </div>
                )}

                {/* Review button */}
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/review/${game.gameId}`); }}
                  className="flex items-center gap-1.5 bg-chess-accent/10 hover:bg-chess-accent/20 text-chess-accent border border-chess-accent/20 rounded-lg px-3 py-2 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <Eye size={13} /> Review
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 bg-chess-panel border border-chess-border rounded-lg text-sm text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="flex items-center gap-1 px-3 py-2 bg-chess-panel border border-chess-border rounded-lg text-sm text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
