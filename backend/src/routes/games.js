import express from 'express';
import { Chess } from 'chess.js';
import Game from '../models/Game.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeGame } from '../services/chessEngine.js';
import { learnFromGame } from '../services/aiService.js';

const router = express.Router();

const genGameId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

// POST /api/games/create
router.post('/create', authenticate, async (req, res) => {
  try {
    const { mode, aiDifficulty = 5, color, timeControl } = req.body;

    if (!['ai', 'human'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "ai" or "human"' });
    }

    let playerColor = color;
    if (!playerColor || playerColor === 'random') {
      playerColor = Math.random() < 0.5 ? 'white' : 'black';
    }

    const gameId = genGameId();
    const playerInfo = {
      userId: req.user._id,
      username: req.user.username,
      rating: req.user.stats?.rating || 1200
    };

    const aiInfo = {
      username: `ChessAI (Lv.${aiDifficulty})`,
      rating: 1200 + (Number(aiDifficulty) - 5) * 80,
      isAI: true
    };

    let whitePlayer, blackPlayer;

    if (mode === 'ai') {
      whitePlayer = playerColor === 'white' ? playerInfo : aiInfo;
      blackPlayer = playerColor === 'black' ? playerInfo : aiInfo;
    } else {
      // 2-player pass & play: user is always white for simplicity
      whitePlayer = { ...playerInfo, username: req.user.username + ' (W)' };
      blackPlayer = { userId: req.user._id, username: req.user.username + ' (B)', rating: req.user.stats?.rating || 1200 };
    }

    const game = await Game.create({
      gameId,
      mode,
      white: whitePlayer,
      black: blackPlayer,
      aiDifficulty: mode === 'ai' ? Number(aiDifficulty) : undefined,
      timeControl: {
        initial: timeControl?.initial || 600,
        increment: timeControl?.increment || 0
      },
      status: 'active'
    });

    res.status(201).json({ game: game.toObject() });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/games/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, mode } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      $or: [{ 'white.userId': req.user._id }, { 'black.userId': req.user._id }],
      status: { $in: ['completed', 'abandoned'] }
    };
    if (mode && ['ai', 'human'].includes(mode)) query.mode = mode;

    const [games, total] = await Promise.all([
      Game.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Game.countDocuments(query)
    ]);

    res.json({
      games,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/games/:gameId
router.get('/:gameId', authenticate, async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /api/games/:gameId/move
router.post('/:gameId/move', authenticate, async (req, res) => {
  try {
    const { san, uci, fen, isCapture, isCheck, isCastle, piece, timeTaken } = req.body;
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });

    const moveData = {
      san, uci, fen,
      isCapture: !!isCapture, isCheck: !!isCheck, isCastle: !!isCastle,
      piece, timeTaken, moveNumber: game.moves.length + 1
    };

    game.moves.push(moveData);
    await game.save();
    req.io?.to(game.gameId).emit('move', moveData);
    res.json({ success: true, move: moveData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save move' });
  }
});

// POST /api/games/:gameId/end
router.post('/:gameId/end', authenticate, async (req, res) => {
  try {
    const { winner, method } = req.body;
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'active') return res.status(400).json({ error: 'Game already ended' });

    const chess = new Chess();
    for (const move of game.moves) {
      try { chess.move(move.san); } catch (e) {}
    }

    game.status = 'completed';
    game.result = { winner, method, endedAt: new Date() };
    game.finalFen = chess.fen();
    game.pgn = chess.pgn();
    game.analysisStatus = 'processing';
    await game.save();

    await updateUserStats(game, winner);
    analyzeAndLearn(game).catch(console.error);
    req.io?.to(game.gameId).emit('gameOver', { winner, method });
    res.json({ success: true, game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end game' });
  }
});

// GET /api/games/:gameId/review
router.get('/:gameId/review', authenticate, async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (!game.analysis && game.status === 'completed' && game.moves.length > 0) {
      try {
        const analysis = await analyzeGame(game.moves);
        game.analysis = analysis;
        game.analysisStatus = 'complete';
        await game.save();
      } catch (e) {
        console.error('On-demand analysis failed:', e);
      }
    }

    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load review' });
  }
});

const analyzeAndLearn = async (game) => {
  try {
    if (game.moves.length < 3) return;
    const analysis = await analyzeGame(game.moves);
    game.analysis = analysis;
    game.analysisStatus = 'complete';
    await game.save();
    if (game.mode === 'ai') {
      await learnFromGame({ ...game.toObject(), analysis });
    }
    console.log(`✅ Game ${game.gameId} analyzed & learned`);
  } catch (err) {
    console.error('Analyze error:', err.message);
    await Game.findByIdAndUpdate(game._id, { analysisStatus: 'failed' });
  }
};

const updateUserStats = async (game, winner) => {
  try {
    const isAIMode = game.mode === 'ai';

    const doUpdate = async (playerInfo, color) => {
      if (!playerInfo?.userId) return;
      const isWin = winner === color;
      const isDraw = winner === 'draw';
      const isLoss = !isWin && !isDraw;

      const user = await User.findById(playerInfo.userId);
      if (!user) return;

      const ratingChange = isWin ? 15 : isDraw ? 2 : -12;
      const newRating = Math.max(400, (user.stats?.rating || 1200) + ratingChange);

      const incData = {
        [`stats.${isAIMode ? 'gamesVsAI' : 'gamesVsHuman'}`]: 1,
        'stats.losses': isLoss ? 1 : 0,
        'stats.draws': isDraw ? 1 : 0,
        'stats.totalMoves': Math.ceil(game.moves.length / 2)
      };
      if (isAIMode && isWin) incData['stats.winsVsAI'] = 1;
      if (!isAIMode && isWin) incData['stats.winsVsHuman'] = 1;

      const setData = { 'stats.rating': newRating };
      if (newRating > (user.stats?.bestRating || 1200)) setData['stats.bestRating'] = newRating;

      await User.findByIdAndUpdate(playerInfo.userId, { $inc: incData, $set: setData });
    };

    await doUpdate(game.white, 'white');
    // Only update black if it's a real user (not AI)
    if (!game.black?.isAI) await doUpdate(game.black, 'black');
  } catch (err) {
    console.error('Update stats error:', err);
  }
};

export default router;
