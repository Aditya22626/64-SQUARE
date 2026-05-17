import express from 'express';
import User from '../models/User.js';
import Game from '../models/Game.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await User.find({})
      .select('username stats.rating stats.gamesVsAI stats.gamesVsHuman stats.winsVsAI stats.winsVsHuman stats.losses stats.draws')
      .sort({ 'stats.rating': -1 })
      .limit(50)
      .lean();

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      _id: u._id,
      username: u.username,
      rating: u.stats?.rating || 1200,
      totalGames: (u.stats?.gamesVsAI || 0) + (u.stats?.gamesVsHuman || 0),
      totalWins: (u.stats?.winsVsAI || 0) + (u.stats?.winsVsHuman || 0),
      losses: u.stats?.losses || 0,
      draws: u.stats?.draws || 0,
      winRate: (() => {
        const total = (u.stats?.gamesVsAI || 0) + (u.stats?.gamesVsHuman || 0);
        const wins = (u.stats?.winsVsAI || 0) + (u.stats?.winsVsHuman || 0);
        return total > 0 ? Math.round((wins / total) * 100) : 0;
      })()
    }));

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/users/me/stats
router.get('/me/stats', authenticate, async (req, res) => {
  try {
    const user = req.user;

    // Recent games
    const recentGames = await Game.find({
      $or: [{ 'white.userId': user._id }, { 'black.userId': user._id }],
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Win/loss streak
    let currentStreak = 0;
    let streakType = null;
    for (const game of recentGames) {
      const isWhite = game.white?.userId?.toString() === user._id.toString();
      const playerColor = isWhite ? 'white' : 'black';
      const isWin = game.result?.winner === playerColor;
      const isDraw = game.result?.winner === 'draw';
      const isLoss = !isWin && !isDraw;

      if (currentStreak === 0) streakType = isWin ? 'win' : isLoss ? 'loss' : 'draw';
      if ((isWin && streakType === 'win') || (isLoss && streakType === 'loss')) {
        currentStreak++;
      } else break;
    }

    // Monthly game count
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthlyGames = await Game.countDocuments({
      $or: [{ 'white.userId': user._id }, { 'black.userId': user._id }],
      status: 'completed',
      createdAt: { $gte: monthAgo }
    });

    // Average accuracy from recent games
    let totalAccuracy = 0, accuracyCount = 0;
    for (const game of recentGames) {
      const isWhite = game.white?.userId?.toString() === user._id.toString();
      const acc = isWhite ? game.analysis?.whiteAccuracy : game.analysis?.blackAccuracy;
      if (acc) { totalAccuracy += acc; accuracyCount++; }
    }
    const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : null;

    res.json({
      stats: {
        ...user.stats?.toObject?.() || user.stats,
        currentStreak,
        streakType,
        monthlyGames,
        avgAccuracy
      },
      recentGames: recentGames.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/users/:userId/profile
router.get('/:userId/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const recentGames = await Game.find({
      $or: [{ 'white.userId': user._id }, { 'black.userId': user._id }],
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ user, recentGames });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
