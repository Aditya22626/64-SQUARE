import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ]
};

export const evaluatePosition = (chess) => {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -50000 : 50000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const pieceVal = PIECE_VALUES[piece.type] || 0;
      const pstIdx = piece.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const pstVal = PST[piece.type]?.[pstIdx] || 0;
      const total = pieceVal + pstVal;
      score += piece.color === 'w' ? total : -total;
    }
  }

  const moves = chess.moves().length;
  score += chess.turn() === 'w' ? moves * 2 : -moves * 2;
  return score;
};

// Move ordering: MVV-LVA captures first, then checks, then killers
const orderMoves = (moves) => {
  return moves.sort((a, b) => {
    const aCapture = a.captured ? (PIECE_VALUES[a.captured] || 0) - (PIECE_VALUES[a.piece] || 0) / 10 : 0;
    const bCapture = b.captured ? (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[b.piece] || 0) / 10 : 0;
    const aCheck = a.san.includes('+') ? 50 : 0;
    const bCheck = b.san.includes('+') ? 50 : 0;
    return (bCapture + bCheck) - (aCapture + aCheck);
  });
};

// Time-limited minimax with alpha-beta pruning
// startTime + timeLimit let us abort early if we're taking too long
export const minimax = (chess, depth, alpha, beta, isMaximizing, startTime, timeLimit) => {
  // Time check — abort if over budget
  if (timeLimit && Date.now() - startTime > timeLimit) {
    return evaluatePosition(chess);
  }

  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const eval_ = minimax(chess, depth - 1, alpha, beta, false, startTime, timeLimit);
      chess.undo();
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const eval_ = minimax(chess, depth - 1, alpha, beta, true, startTime, timeLimit);
      chess.undo();
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// Iterative deepening — search depth 1, 2, 3... until time runs out
// This ensures we always have SOME answer even if deep search is cut short
export const findBestMove = (fen, depth = 3, timeLimitMs = 1500) => {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) return null;

  // If only one legal move, return it immediately
  if (moves.length === 1) {
    return { move: moves[0], evaluation: evaluatePosition(chess) };
  }

  const isMaximizing = chess.turn() === 'w';
  const startTime = Date.now();

  let bestMove = moves[0]; // fallback
  let bestEval = isMaximizing ? -Infinity : Infinity;

  // Iterative deepening: search depth 1 → target depth, stop if time exceeded
  for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
    // Check time before starting a new depth
    if (Date.now() - startTime > timeLimitMs * 0.85) break;

    let depthBestMove = null;
    let depthBestEval = isMaximizing ? -Infinity : Infinity;

    for (const move of moves) {
      if (Date.now() - startTime > timeLimitMs) break; // hard cutoff mid-search

      chess.move(move);
      const eval_ = minimax(chess, currentDepth - 1, -Infinity, Infinity, !isMaximizing, startTime, timeLimitMs);
      chess.undo();

      if (isMaximizing ? eval_ > depthBestEval : eval_ < depthBestEval) {
        depthBestEval = eval_;
        depthBestMove = move;
      }
    }

    // Only update best if we completed this depth (not timed out mid-way)
    if (depthBestMove) {
      bestMove = depthBestMove;
      bestEval = depthBestEval;
    }
  }

  return { move: bestMove, evaluation: bestEval };
};

export const classifyMove = (evalBefore, evalAfter, isWhiteTurn) => {
  const evalLoss = isWhiteTurn ? evalBefore - evalAfter : evalAfter - evalBefore;
  if (evalLoss < -50) return 'brilliant';
  if (evalLoss <= 0) return 'best';
  if (evalLoss <= 20) return 'excellent';
  if (evalLoss <= 50) return 'good';
  if (evalLoss <= 100) return 'inaccuracy';
  if (evalLoss <= 200) return 'mistake';
  return 'blunder';
};

export const analyzeGame = async (moves) => {
  const chess = new Chess();
  const classifications = [];
  const bestMoves = [];
  const evalHistory = [0];
  const criticalMoments = [];

  let whiteStats = { brilliant:0, great:0, best:0, excellent:0, good:0, inaccuracy:0, mistake:0, blunder:0, total:0, totalLoss:0 };
  let blackStats = { brilliant:0, great:0, best:0, excellent:0, good:0, inaccuracy:0, mistake:0, blunder:0, total:0, totalLoss:0 };

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const isWhiteTurn = chess.turn() === 'w';
    const evalBefore = evaluatePosition(chess);

    // Use depth 2 + 800ms limit for analysis (fast)
    const bestResult = findBestMove(chess.fen(), 2, 800);
    bestMoves.push(bestResult?.move?.san || null);

    let moveResult;
    try {
      moveResult = chess.move(move.san || { from: move.uci?.slice(0,2), to: move.uci?.slice(2,4) });
    } catch (e) {
      classifications.push('good');
      continue;
    }

    const evalAfter = evaluatePosition(chess);
    evalHistory.push(evalAfter);

    const classification = classifyMove(evalBefore, evalAfter, isWhiteTurn);
    classifications.push(classification);

    const evalLoss = isWhiteTurn ? evalBefore - evalAfter : evalAfter - evalBefore;

    if (isWhiteTurn) {
      whiteStats[classification]++;
      whiteStats.total++;
      whiteStats.totalLoss += Math.max(0, evalLoss);
    } else {
      blackStats[classification]++;
      blackStats.total++;
      blackStats.totalLoss += Math.max(0, evalLoss);
    }

    if (classification === 'blunder' || classification === 'brilliant') {
      criticalMoments.push({
        moveNumber: i + 1,
        description: `Move ${Math.ceil((i+1)/2)}: ${moveResult.san} was a ${classification}!`,
        type: classification
      });
    }
  }

  const calcAccuracy = (stats) => {
    if (stats.total === 0) return null;
    const avgLoss = stats.totalLoss / stats.total;
    const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * (avgLoss / 10)) - 3.1669));
    return Math.round(accuracy * 10) / 10;
  };

  return {
    whiteAccuracy: calcAccuracy(whiteStats),
    blackAccuracy: calcAccuracy(blackStats),
    whiteBrilliant: whiteStats.brilliant,
    whiteGreat: whiteStats.great,
    whiteBest: whiteStats.best + whiteStats.excellent,
    whiteGood: whiteStats.good,
    whiteInaccuracy: whiteStats.inaccuracy,
    whiteMistake: whiteStats.mistake,
    whiteBlunder: whiteStats.blunder,
    blackBrilliant: blackStats.brilliant,
    blackGreat: blackStats.great,
    blackBest: blackStats.best + blackStats.excellent,
    blackGood: blackStats.good,
    blackInaccuracy: blackStats.inaccuracy,
    blackMistake: blackStats.mistake,
    blackBlunder: blackStats.blunder,
    moveClassifications: classifications,
    bestMoves,
    evalHistory,
    criticalMoments: criticalMoments.slice(0, 10)
  };
};