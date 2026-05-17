import { Chess } from 'chess.js';
import { evaluatePosition, findBestMove } from './chessEngine.js';
import AIModel from '../models/AIModel.js';

// RL Hyperparameters
const LEARNING_RATE = 0.001;
const EPSILON_DECAY = 0.995;
const EPSILON_MIN = 0.05;
const GAMMA = 0.95;
const REPLAY_BUFFER_MAX = 5000;

// Cached model state
let modelCache = null;
let modelVersion = 0;

// Load or initialize the AI model
export const loadOrInitModel = async () => {
  if (modelCache) return modelCache;

  let model = await AIModel.findOne().sort({ version: -1 });
  if (!model) {
    model = await AIModel.create({
      version: 1,
      hyperparams: {
        learningRate: LEARNING_RATE,
        epsilon: 1.0,
        epsilonMin: EPSILON_MIN,
        epsilonDecay: EPSILON_DECAY,
        gamma: GAMMA,
        batchSize: 32
      }
    });
    console.log('🤖 New AI model initialized');
  }

  modelCache = model;
  modelVersion = model.version;
  console.log(`🤖 AI model v${model.version} loaded (${model.totalGamesPlayed} games played)`);
  return model;
};

// Get a position feature vector for Q-Learning
const getStateFeatures = (chess) => {
  const board = chess.board();
  const features = [];

  // Material counts
  const pieces = { wp: 0, wn: 0, wb: 0, wr: 0, wq: 0, bp: 0, bn: 0, bb: 0, br: 0, bq: 0 };
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p) {
        const key = p.color + p.type;
        if (pieces[key] !== undefined) pieces[key]++;
      }
    }
  }
  Object.values(pieces).forEach(v => features.push(v / 8));

  // Turn
  features.push(chess.turn() === 'w' ? 1 : 0);

  // Check status
  features.push(chess.isCheck() ? 1 : 0);

  // Move count (game phase)
  features.push(Math.min(chess.history().length / 80, 1));

  // Mobility
  features.push(chess.moves().length / 40);

  return features;
};

// State-action key for Q-table
const getQKey = (fen, uci) => {
  // Simplified: use board position hash + move
  const parts = fen.split(' ');
  return `${parts[0]}_${uci}`;
};

// Get Q-value for state-action pair
const getQValue = (model, fen, uci) => {
  const key = getQKey(fen, uci);
  return model.qTable?.get(key) || 0;
};

// Epsilon-greedy move selection with difficulty scaling
export const selectMove = async (fen, difficulty, gameId, moveHistory = []) => {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const model = await loadOrInitModel();
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Scale difficulty: level 1=95% random, level 10=5% random
  const difficultyEpsilon = Math.max(0.05, 1.0 - (difficulty / 10) * 0.95);
  // FIX: difficulty controls gameplay directly; model.epsilon is for training only
  const effectiveEpsilon = difficultyEpsilon;

  // Book moves for common openings (first 10 moves)
  if (moveHistory.length < 10 && model.openingBook) {
    const bookMove = model.openingBook.get(fen.split(' ')[0]);
    if (bookMove) {
      const move = moves.find(m => m.uci === bookMove || m.san === bookMove);
      if (move) return move;
    }
  }

  let selectedMove;

  // Exploration vs exploitation
  if (Math.random() < effectiveEpsilon) {
    // Explore: random move (weighted by piece value for lower difficulties)
    if (difficulty <= 3) {
      selectedMove = moves[Math.floor(Math.random() * moves.length)];
    } else {
      // Semi-random: prefer captures and checks
      const goodMoves = moves.filter(m => m.captured || m.san.includes('+'));
      selectedMove = goodMoves.length > 0 && Math.random() > 0.5
        ? goodMoves[Math.floor(Math.random() * goodMoves.length)]
        : moves[Math.floor(Math.random() * moves.length)];
    }
  } else {
    // Exploit: use minimax depth based on difficulty
    const depth = difficulty <= 3 ? 1 : difficulty <= 5 ? 2 : difficulty <= 7 ? 3 : 4;

    // FIX: normalize qTable to Map before any .get() calls
    if (model.qTable && !(model.qTable instanceof Map)) {
      model.qTable = new Map(Object.entries(model.qTable));
    }

    // Also check Q-table for learned values
    let bestQMove = null;
    let bestQVal = -Infinity;

    for (const move of moves) {
      const qVal = getQValue(model, fen, move.uci || `${move.from}${move.to}`);
      if (qVal > bestQVal) {
        bestQVal = qVal;
        bestQMove = move;
      }
    }

    // Blend Q-learning with minimax
    const useQTable = bestQVal > 0.5 && model.totalMovesLearned > 1000;
    if (useQTable && Math.random() < 0.4) {
      selectedMove = bestQMove;
    } else {
      const result = findBestMove(fen, depth);
      selectedMove = result?.move || moves[0];
    }
  }

  const evaluation = evaluatePosition(chess) + (selectedMove?.captured ? 50 : 0);
  return { ...selectedMove, evaluation };
};

// Calculate reward from game outcome
const calculateReward = (result, moveColor) => {
  const winner = result?.winner;
  const method = result?.method;

  if (!winner || winner === 'draw') return 0.1;

  const didWin = (moveColor === 'white' && winner === 'white') ||
                 (moveColor === 'black' && winner === 'black');

  if (didWin) {
    if (method === 'checkmate') return 1.0;
    if (method === 'timeout') return 0.7;
    return 0.8;
  } else {
    if (method === 'checkmate') return -1.0;
    if (method === 'resignation') return -0.8;
    return -0.7;
  }
};

// Q-learning update after game ends
export const learnFromGame = async (game) => {
  try {
    const model = await loadOrInitModel();
    const moves = game.moves || [];
    const result = game.result;

    if (moves.length < 5) return;

    // Build replay buffer entries
    const newExperiences = [];
    const chess = new Chess();

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const stateBefore = chess.fen();
      const isWhiteTurn = chess.turn() === 'w';
      const moveColor = isWhiteTurn ? 'white' : 'black';

      try {
        chess.move(move.san || { from: move.uci?.slice(0, 2), to: move.uci?.slice(2, 4) });
      } catch (e) { continue; }

      const stateAfter = chess.fen();
      const isDone = chess.isGameOver() || i === moves.length - 1;

      // Immediate reward: positive for captures, checks; negative for blunders
      let immediateReward = 0;
      if (move.isCapture) immediateReward += 0.1;
      if (move.isCheck) immediateReward += 0.05;

      // Terminal reward
      const terminalReward = isDone ? calculateReward(result, moveColor) : 0;
      const totalReward = immediateReward + terminalReward;

      newExperiences.push({
        state: stateBefore,
        action: move.uci || `${move.san}`,
        reward: totalReward,
        nextState: stateAfter,
        done: isDone,
        timestamp: new Date()
      });
    }

    // Q-table update (simplified TD learning)
    // FIX: MongoDB returns qTable as plain Object (not Map), must convert entries
    const qTableSource = model.qTable instanceof Map
      ? model.qTable
      : new Map(Object.entries(model.qTable || {}));
    const qTableUpdates = new Map(qTableSource);
    const lr = model.hyperparams?.learningRate || LEARNING_RATE;
    const gamma = model.hyperparams?.gamma || GAMMA;

    for (const exp of newExperiences) {
      const key = getQKey(exp.state, exp.action);
      const currentQ = qTableUpdates.get(key) || 0;

      // Q(s,a) = Q(s,a) + lr * (r + gamma * max_Q(s') - Q(s,a))
      const nextStateChess = new Chess(exp.nextState);
      const nextMoves = nextStateChess.moves({ verbose: true });
      let maxNextQ = 0;
      if (!exp.done && nextMoves.length > 0) {
        maxNextQ = Math.max(...nextMoves.map(m =>
          qTableUpdates.get(getQKey(exp.nextState, m.uci || `${m.from}${m.to}`)) || 0
        ));
      }

      const newQ = currentQ + lr * (exp.reward + gamma * maxNextQ - currentQ);
      qTableUpdates.set(key, newQ);
    }

    // Decay epsilon (less exploration over time)
    const newEpsilon = Math.max(
      EPSILON_MIN,
      (model.hyperparams?.epsilon || 1.0) * EPSILON_DECAY
    );

    // Calculate improvement metrics
    const gameAccuracy = result?.analysis?.whiteAccuracy || result?.analysis?.blackAccuracy || 50;

    // Update performance history
    const perfEntry = {
      gameNumber: model.totalGamesPlayed + 1,
      winRate: calculateWinRate(model, result),
      avgMoveQuality: gameAccuracy,
      accuracyScore: gameAccuracy,
      explorationRate: newEpsilon,
      timestamp: new Date()
    };

    // Keep replay buffer size bounded
    const replayBuffer = [...(model.replayBuffer || []), ...newExperiences]
      .slice(-REPLAY_BUFFER_MAX);

    // Update model in DB (trim Q-table if too large)
    const qTableObj = Object.fromEntries(
      [...qTableUpdates.entries()].slice(-10000) // Keep latest 10k entries
    );

    const updateData = {
      $set: {
        qTable: qTableObj,
        replayBuffer,
        'hyperparams.epsilon': newEpsilon,
        totalMovesLearned: (model.totalMovesLearned || 0) + newExperiences.length,
        lastTrainedAt: new Date()
      },
      $inc: { totalGamesPlayed: 1 },
      $push: {
        performanceHistory: {
          $each: [perfEntry],
          $slice: -500 // Keep last 500 entries
        }
      }
    };

    await AIModel.findByIdAndUpdate(model._id, updateData);
    modelCache = null; // Invalidate cache

    console.log(`🧠 AI learned from game. Epsilon: ${newEpsilon.toFixed(4)}, Q-entries: ${qTableUpdates.size}`);
  } catch (err) {
    console.error('Error learning from game:', err);
  }
};

// Calculate current win rate from recent games
const calculateWinRate = (model, latestResult) => {
  const history = model.performanceHistory || [];
  if (history.length < 5) return 50;
  const recent = history.slice(-20);
  const avgWinRate = recent.reduce((sum, h) => sum + (h.winRate || 50), 0) / recent.length;
  return avgWinRate;
};

// Get AI performance stats for dashboard
export const getAIStats = async () => {
  const model = await loadOrInitModel();

  const history = model.performanceHistory || [];
  const recentHistory = history.slice(-100);

  // Calculate improvement rate
  const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
  const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
  const firstAvg = firstHalf.length ? firstHalf.reduce((s, h) => s + h.avgMoveQuality, 0) / firstHalf.length : 50;
  const secondAvg = secondHalf.length ? secondHalf.reduce((s, h) => s + h.avgMoveQuality, 0) / secondHalf.length : 50;
  const improvementRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  return {
    version: model.version,
    totalGamesPlayed: model.totalGamesPlayed,
    totalMovesLearned: model.totalMovesLearned,
    currentEpsilon: model.hyperparams?.epsilon || 1.0,
    explorationRate: Math.round((model.hyperparams?.epsilon || 1.0) * 100),
    improvementRate: Math.round(improvementRate * 10) / 10,
    currentStrength: model.currentStrength || 1200,
    qTableSize: model.qTable instanceof Map ? model.qTable.size : Object.keys(model.qTable || {}).length,
    replayBufferSize: (model.replayBuffer || []).length,
    performanceHistory: recentHistory,
    hyperparams: model.hyperparams,
    lastTrainedAt: model.lastTrainedAt
  };
};
