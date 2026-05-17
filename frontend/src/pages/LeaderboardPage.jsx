import React, { useState, useEffect } from 'react';
import { usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Zap, Swords, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TITLE = (rating) => {
  if (rating >= 2000) return { label: 'Master', color: 'text-purple-400' };
  if (rating >= 1800) return { label: 'Expert', color: 'text-red-400' };
  if (rating >= 1600) return { label: 'Advanced', color: 'text-orange-400' };
  if (rating >= 1400) return { label: 'Intermediate', color: 'text-chess-gold' };
  if (rating >= 1200) return { label: 'Beginner', color: 'text-chess-green' };
  return { label: 'Novice', color: 'text-slate-400' };
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getLeaderboard()
      .then(res => setLeaderboard(res.data.leaderboard || []))
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, []);

  const myRank = leaderboard.find(u => u._id?.toString() === user?._id?.toString());

  return (
    <div className="p-6 max-w-4xl mx-auto page-enter">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white mb-1">Leaderboard</h1>
        <p className="text-slate-400">Top players ranked by rating</p>
      </div>

      {/* My rank highlight */}
      {myRank && (
        <div className="mb-5 bg-chess-accent/10 border border-chess-accent/30 rounded-xl p-4 flex items-center gap-4">
          <div className="text-2xl font-bold text-chess-accent font-mono w-10 text-center">#{myRank.rank}</div>
          <div className="flex-1">
            <div className="text-white font-semibold">{myRank.username} <span className="text-chess-accent text-xs">(You)</span></div>
            <div className="text-xs text-slate-400 mt-0.5">
              {myRank.totalGames} games · {myRank.winRate}% win rate
            </div>
          </div>
          <div className="text-right">
            <div className="text-chess-gold font-bold font-mono text-lg">⚡ {myRank.rating}</div>
            <div className={`text-xs ${TITLE(myRank.rating).color}`}>{TITLE(myRank.rating).label}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center"><div className="spinner mx-auto mb-3" /><div className="text-slate-500 text-sm">Loading rankings...</div></div>
        </div>
      ) : (
        <div className="bg-chess-panel border border-chess-border rounded-xl overflow-hidden">
          <table className="chess-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Player</th>
                <th className="text-right">Rating</th>
                <th className="text-right">Games</th>
                <th className="text-right">Wins</th>
                <th className="text-right">Win %</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isMe = entry._id?.toString() === user?._id?.toString();
                const title = TITLE(entry.rating);
                return (
                  <tr key={entry._id} className={isMe ? 'bg-chess-accent/5' : ''}>
                    <td className="font-mono text-center">
                      {MEDAL[entry.rank] || <span className="text-slate-500">{entry.rank}</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {entry.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${isMe ? 'text-chess-accent' : 'text-white'}`}>
                            {entry.username} {isMe && '(You)'}
                          </div>
                          <div className={`text-xs ${title.color}`}>{title.label}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="text-chess-gold font-bold font-mono">⚡ {entry.rating}</span>
                    </td>
                    <td className="text-right text-slate-400 font-mono text-sm">{entry.totalGames}</td>
                    <td className="text-right text-chess-green font-mono text-sm">{entry.totalWins}</td>
                    <td className="text-right">
                      <span className={`font-mono text-sm font-bold ${
                        entry.winRate >= 60 ? 'text-chess-green' :
                        entry.winRate >= 40 ? 'text-chess-gold' : 'text-red-400'
                      }`}>{entry.winRate}%</span>
                    </td>
                  </tr>
                );
              })}
              {leaderboard.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">No players yet — be the first!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
