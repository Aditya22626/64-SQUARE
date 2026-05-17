import { Chess } from 'chess.js';

// Piece values for evaluation
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables for positional evaluation
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

// Evaluate a position statically
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

  // Mobility bonus
  const moves = chess.moves().length;
  const mobilityBonus = chess.turn() === 'w' ? moves * 2 : -moves * 2;
  score += mobilityBonus;

  return score;
};

// Minimax with alpha-beta pruning
export const minimax = (chess, depth, alpha, beta, isMaximizing) => {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess);
  }

  const moves = chess.moves({ verbose: true });

  // Move ordering: captures first, then checks
  moves.sort((a, b) => {
    const aScore = (a.captured ? PIECE_VALUES[a.captured] || 0 : 0);
    const bScore = (b.captured ? PIECE_VALUES[b.captured] || 0 : 0);
    return bScore - aScore;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const eval_ = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const eval_ = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// Find the best move at a given depth
export const findBestMove = (fen, depth = 3) => {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Move ordering: captures, center control, development
  moves.sort((a, b) => {
    const aScore = (a.captured ? PIECE_VALUES[a.captured] || 0 : 0) + (a.flags.includes('c') ? 10 : 0);
    const bScore = (b.captured ? PIECE_VALUES[b.captured] || 0 : 0) + (b.flags.includes('c') ? 10 : 0);
    return bScore - aScore;
  });

  const isMaximizing = chess.turn() === 'w';
  let bestMove = null;
  let bestEval = isMaximizing ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const eval_ = minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
    chess.undo();

    if (isMaximizing ? eval_ > bestEval : eval_ < bestEval) {
      bestEval = eval_;
      bestMove = move;
    }
  }

  return { move: bestMove, evaluation: bestEval };
};

// Classify a move based on evaluation difference
export const classifyMove = (evalBefore, evalAfter, isWhiteTurn) => {
  // Eval is always from white's perspective
  const evalLoss = isWhiteTurn ? evalBefore - evalAfter : evalAfter - evalBefore;

  if (evalLoss < -50) return 'brilliant'; // Improves significantly
  if (evalLoss <= 0) return 'best';
  if (evalLoss <= 20) return 'excellent';
  if (evalLoss <= 50) return 'good';
  if (evalLoss <= 100) return 'inaccuracy';
  if (evalLoss <= 200) return 'mistake';
  return 'blunder';
};

// Full game analysis
export const analyzeGame = async (moves) => {
  const chess = new Chess();
  const classifications = [];
  const bestMoves = [];
  const evalHistory = [0];
  const criticalMoments = [];

  let whiteStats = { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, total: 0, totalLoss: 0 };
  let blackStats = { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, total: 0, totalLoss: 0 };

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const isWhiteTurn = chess.turn() === 'w';

    // Evaluate before move
    const evalBefore = evaluatePosition(chess);

    // Find best move at this position
    const bestResult = findBestMove(chess.fen(), 2);
    const bestMoveStr = bestResult?.move?.san || null;
    bestMoves.push(bestMoveStr);

    // Make the actual move
    let moveResult;
    try {
      moveResult = chess.move(move.san || { from: move.uci?.slice(0, 2), to: move.uci?.slice(2, 4) });
    } catch (e) {
      classifications.push('good');
      continue;
    }

    // Evaluate after move
    const evalAfter = evaluatePosition(chess);
    evalHistory.push(evalAfter);

    // Classify
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

    // Mark critical moments
    if (classification === 'blunder' || classification === 'brilliant') {
      criticalMoments.push({
        moveNumber: i + 1,
        description: `Move ${Math.ceil((i + 1) / 2)}: ${moveResult.san} was a ${classification}!`,
        type: classification
      });
    }
  }

  // Calculate accuracy scores (chess.com style)
  const calcAccuracy = (stats) => {
    if (stats.total === 0) return null;
    const avgLoss = stats.totalLoss / stats.total;
    // Convert average centipawn loss to accuracy percentage
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
