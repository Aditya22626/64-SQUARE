import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { selectMove, getAIStats } from '../services/aiService.js';
import { evaluatePosition } from '../services/chessEngine.js';
import { Chess } from 'chess.js';
import Game from '../models/Game.js';

const router = express.Router();

// POST /api/ai/move - get AI's next move
router.post('/move', authenticate, async (req, res) => {
  try {
    const { fen, difficulty = 5, gameId, moveHistory = [] } = req.body;

    if (!fen) return res.status(400).json({ error: 'FEN is required' });

    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      return res.status(400).json({ error: 'Game is already over' });
    }

    const startTime = Date.now();
    const moveResult = await selectMove(fen, difficulty, gameId, moveHistory);
    const thinkingTime = Date.now() - startTime;

    if (!moveResult) {
      return res.status(400).json({ error: 'No legal moves available' });
    }

    // Make move to get proper evaluation
    const chessCopy = new Chess(fen);
    chessCopy.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion || 'q' });
    const evaluation = evaluatePosition(chessCopy);

    res.json({
      move: {
        from: moveResult.from,
        to: moveResult.to,
        promotion: moveResult.promotion || null,
        san: moveResult.san
      },
      evaluation,
      thinkingTime
    });
  } catch (err) {
    console.error('AI move error:', err);
    res.status(500).json({ error: 'AI failed to compute move' });
  }
});

// GET /api/ai/performance - AI learning performance data
router.get('/performance', authenticate, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const stats = await getAIStats();

    // Get recent games for win rate calculation
    const recentGames = await Game.find({
      mode: 'ai',
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('result white black aiDifficulty createdAt analysis')
      .lean();

    // Build win/loss/draw chart data
    const performanceChart = recentGames.reverse().map((g, i) => {
      // FIX: detect AI color from both sides (AI can be white or black)
      const aiIsBlack = g.black?.isAI === true;
      const aiIsWhite = g.white?.isAI === true;
      const aiColor = aiIsBlack ? 'black' : 'white'; // default white if neither flagged
      const aiWon = g.result?.winner === aiColor;
      const isDraw = g.result?.winner === 'draw';
      // FIX: also handle case where AI color is neither flagged (older games)
      // Use: if game mode=ai and no isAI flag, assume AI=black (player chose white)
      const acc = aiIsBlack ? g.analysis?.blackAccuracy : g.analysis?.whiteAccuracy;

      return {
        game: i + 1,
        result: aiWon ? 'win' : isDraw ? 'draw' : 'loss',
        difficulty: g.aiDifficulty || 5,
        accuracy: acc || null,
        date: g.createdAt
      };
    });

    // Win rate over time (rolling 10-game window)
    const rollingWinRate = [];
    for (let i = 0; i < performanceChart.length; i++) {
      const window = performanceChart.slice(Math.max(0, i - 9), i + 1);
      const wins = window.filter(g => g.result === 'win').length;
      rollingWinRate.push({
        game: i + 1,
        winRate: Math.round((wins / window.length) * 100),
        accuracy: window.reduce((s, g) => s + (g.accuracy || 50), 0) / window.length
      });
    }

    // Stats by difficulty
    const difficultyStats = {};
    recentGames.forEach(g => {
      const d = g.aiDifficulty || 5;
      if (!difficultyStats[d]) difficultyStats[d] = { wins: 0, losses: 0, draws: 0, total: 0 };
      const aiColor = g.black?.isAI ? 'black' : 'white';
      const aiWon = g.result?.winner === aiColor;
      const isDraw = g.result?.winner === 'draw';
      difficultyStats[d].total++;
      if (aiWon) difficultyStats[d].wins++;
      else if (isDraw) difficultyStats[d].draws++;
      else difficultyStats[d].losses++;
    });

    res.json({
      ...stats,
      performanceChart,
      rollingWinRate,
      difficultyStats,
      totalAnalyzedGames: recentGames.length
    });
  } catch (err) {
    console.error('Performance fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch AI performance' });
  }
});

// GET /api/ai/status - Quick model status
router.get('/status', authenticate, async (req, res) => {
  try {
    const stats = await getAIStats();
    res.json({
      status: 'active',
      version: stats.version,
      gamesPlayed: stats.totalGamesPlayed,
      explorationRate: stats.explorationRate,
      movesLearned: stats.totalMovesLearned,
      improvementRate: stats.improvementRate,
      lastTrained: stats.lastTrainedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

export default router;
