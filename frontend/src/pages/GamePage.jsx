import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import { gamesAPI, aiAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Flag, RotateCcw, Eye, Clock, Cpu, User, FlipHorizontal, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

// Piece values for material advantage
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_SYMBOLS = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
};

// Compute captured pieces and material advantage from current FEN
function getMaterialInfo(fen) {
  const startPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const counts = { w: { p:0,n:0,b:0,r:0,q:0 }, b: { p:0,n:0,b:0,r:0,q:0 } };
  const rows = (fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').split(' ')[0].split('/');
  for (const row of rows) {
    for (const ch of row) {
      if (isNaN(ch)) {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        if (counts[color][type] !== undefined) counts[color][type]++;
      }
    }
  }
  const captured = { w: {}, b: {} };
  let advantage = 0;
  for (const type of ['p','n','b','r','q']) {
    const whiteLost = startPieces[type] - counts.w[type];
    const blackLost = startPieces[type] - counts.b[type];
    if (blackLost > 0) captured.w[type] = blackLost;
    if (whiteLost > 0) captured.b[type] = whiteLost;
    advantage += (blackLost - whiteLost) * PIECE_VALUES[type];
  }
  return { captured, advantage };
}

function CapturedPieces({ capturedByMe, advantage, color, showAdvantage }) {
  const entries = Object.entries(capturedByMe).filter(([,c]) => c > 0);
  if (entries.length === 0 && advantage <= 0) return <div className="h-4" />;
  return (
    <div className="flex items-center gap-0.5 h-5 flex-wrap">
      {entries.map(([type, count]) =>
        Array.from({ length: count }).map((_, i) => (
          <span key={`${type}-${i}`} className="text-sm leading-none opacity-90">
            {PIECE_SYMBOLS[color === 'w' ? 'b' : 'w'][type]}
          </span>
        ))
      )}
      {showAdvantage && advantage > 0 && (
        <span className="text-xs font-bold text-slate-300 ml-1">+{advantage}</span>
      )}
    </div>
  );
}

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState(null);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [moves, setMoves] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [lastMove, setLastMove] = useState(null);
  const [evaluation, setEvaluation] = useState(0);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [promotionPending, setPromotionPending] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoveSquares, setLegalMoveSquares] = useState({});
  const [viewingMoveIdx, setViewingMoveIdx] = useState(-1);
  const [allPositions, setAllPositions] = useState([]);
  // Premove: queued move to execute when it becomes the player's turn
  const [premove, setPremove] = useState(null); // { from, to, promo }

  const moveListRef = useRef(null);
  const gameRef = useRef(null);
  const aiThinkingRef = useRef(false);
  const selectedMoveRef = useRef(null);

  const isViewingHistory = viewingMoveIdx >= 0 && viewingMoveIdx < allPositions.length - 1;
  const displayFen = isViewingHistory ? (allPositions[viewingMoveIdx]?.fen || fen) : fen;

  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    const temp = new Chess();
    const positions = [{ fen: temp.fen(), move: null }];
    for (const m of moves) {
      try {
        temp.move(m.san || { from: m.uci?.slice(0,2), to: m.uci?.slice(2,4) });
        positions.push({ fen: temp.fen(), move: m });
      } catch (_) {}
    }
    setAllPositions(positions);
  }, [moves]);

  useEffect(() => {
    if (selectedMoveRef.current) {
      selectedMoveRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [viewingMoveIdx, moves]);

  useEffect(() => {
    const loadGame = async () => {
      try {
        const res = await gamesAPI.getGame(gameId);
        const g = res.data.game;
        setGame(g);
        gameRef.current = g;
        const isWhite = g.white?.userId?.toString() === user?._id?.toString();
        const color = g.mode === 'ai' ? (isWhite ? 'white' : 'black') : 'white';
        setPlayerColor(color);
        setWhiteTime(g.timeControl?.initial || 600);
        setBlackTime(g.timeControl?.initial || 600);
        if (g.moves?.length > 0) {
          chess.reset();
          for (const m of g.moves) {
            try { chess.move(m.san || { from: m.uci?.slice(0,2), to: m.uci?.slice(2,4) }); } catch (_) {}
          }
          setFen(chess.fen());
          setMoves(g.moves);
        }
        if (g.mode === 'ai' && !isWhite && chess.turn() === 'w') {
          setTimeout(() => doAIMove(g), 800);
        }
      } catch (err) {
        toast.error('Failed to load game');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadGame();
  }, [gameId]);

  useEffect(() => {
    if (!game || gameOver || isViewingHistory) return;
    const id = setInterval(() => {
      if (chess.turn() === 'w') {
        setWhiteTime(t => { if (t <= 1) { endGame('black', 'timeout'); return 0; } return t - 1; });
      } else {
        setBlackTime(t => { if (t <= 1) { endGame('white', 'timeout'); return 0; } return t - 1; });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [game, gameOver, fen, isViewingHistory]);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const buildMD = (r) => ({
    san: r.san,
    uci: `${r.from}${r.to}${r.promotion || ''}`,
    fen: chess.fen(),
    isCapture: !!r.captured,
    isCheck: chess.isCheck(),
    isCastle: r.san === 'O-O' || r.san === 'O-O-O',
    piece: r.piece,
    timeTaken: 500
  });

  const doAIMove = useCallback(async (g) => {
    const cur = g || gameRef.current;
    if (!cur) return;
    setAiThinking(true);
    aiThinkingRef.current = true;
    try {
      const res = await aiAPI.getMove(chess.fen(), cur.aiDifficulty || 5, gameId, chess.history());
      if (res.data?.move) {
        const r = chess.move({ from: res.data.move.from, to: res.data.move.to, promotion: res.data.move.promotion || 'q' });
        if (r) {
          const md = buildMD(r);
          setMoves(p => [...p, md]);
          setFen(chess.fen());
          setLastMove({ from: r.from, to: r.to });
          setEvaluation(res.data.evaluation || 0);
          setViewingMoveIdx(-1);
          await gamesAPI.saveMove(gameId, md);
          if (checkGameOver()) return;
          // Fire queued premove now that it's the player's turn
          setPremove(pending => {
            if (pending) {
              setTimeout(() => {
                execMove(pending.from, pending.to, pending.promo || 'q');
              }, 80);
            }
            return null;
          });
        }
      }
    } catch (err) { console.error('AI error:', err); }
    finally { setAiThinking(false); aiThinkingRef.current = false; }
  }, [chess, gameId]);

  const clearSelection = () => {
    setSelectedSquare(null);
    setLegalMoveSquares({});
  };

  const clearPremove = () => setPremove(null);

  const getLegalSquaresFor = (square) => {
    const legalMoves = chess.moves({ square, verbose: true });
    const squares = {};
    legalMoves.forEach(m => {
      const target = chess.get(m.to);
      squares[m.to] = target
        ? { background: 'radial-gradient(circle, rgba(239,68,68,0.4) 65%, transparent 65%)', borderRadius: '0' }
        : { background: 'radial-gradient(circle, rgba(99,102,241,0.6) 28%, transparent 28%)', borderRadius: '0' };
    });
    return squares;
  };

  const canInteract = () => {
    if (isViewingHistory) return false;
    if (gameOver || aiThinkingRef.current || promotionPending) return false;
    if (game?.mode === 'ai') {
      const turn = chess.turn() === 'w' ? 'white' : 'black';
      if (turn !== playerColor) return false;
    }
    return true;
  };

  const execMove = async (from, to, promo = 'q') => {
    if (aiThinkingRef.current) return false;
    try {
      const r = chess.move({ from, to, promotion: promo });
      if (!r) return false;
      const md = buildMD(r);
      setMoves(p => [...p, md]);
      setFen(chess.fen());
      setLastMove({ from, to });
      setViewingMoveIdx(-1);
      clearSelection();
      await gamesAPI.saveMove(gameId, md);
      if (checkGameOver()) return true;
      if (gameRef.current?.mode === 'ai') setTimeout(() => doAIMove(), 350);
      return true;
    } catch { return false; }
  };

  // Allow queuing a premove when it's the opponent's turn (AI mode only)
  const canPremove = () => {
    if (isViewingHistory || gameOver || promotionPending) return false;
    if (game?.mode !== 'ai') return false; // premove only vs AI
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    return turn !== playerColor; // it's opponent's turn
  };

  const onSquareClick = useCallback((square) => {
    // If it's opponent's turn, handle premove logic
    if (canPremove()) {
      if (selectedSquare) {
        // Second click — set the premove
        const piece = chess.get(selectedSquare);
        if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
          // Validate loosely: piece belongs to player
          if (square !== selectedSquare) {
            setPremove({ from: selectedSquare, to: square, promo: 'q' });
            clearSelection();
            return;
          }
        }
        clearSelection();
        return;
      }
      // First click — select own piece for premove
      const piece = chess.get(square);
      const myColor = playerColor === 'white' ? 'w' : 'b';
      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
        // Show premove destinations (grey dots) — all squares except own pieces
        const allSquares = {};
        'abcdefgh'.split('').forEach(file => {
          '12345678'.split('').forEach(rank => {
            const sq = file + rank;
            const target = chess.get(sq);
            if (sq !== square && !(target && target.color === myColor)) {
              allSquares[sq] = target
                ? { background: 'radial-gradient(circle, rgba(245,158,11,0.45) 65%, transparent 65%)', borderRadius: '0' }
                : { background: 'radial-gradient(circle, rgba(245,158,11,0.55) 28%, transparent 28%)', borderRadius: '0' };
            }
          });
        });
        setLegalMoveSquares(allSquares);
      }
      return;
    }

    if (!canInteract()) { clearSelection(); return; }
    if (selectedSquare) {
      if (legalMoveSquares[square] !== undefined) {
        const piece = chess.get(selectedSquare);
        const isPromo = piece?.type === 'p' &&
          ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));
        if (isPromo) { setPromotionPending({ from: selectedSquare, to: square }); clearSelection(); return; }
        execMove(selectedSquare, square);
        return;
      }
      const clickedPiece = chess.get(square);
      if (clickedPiece && clickedPiece.color === chess.turn()) {
        setSelectedSquare(square);
        setLegalMoveSquares(getLegalSquaresFor(square));
        return;
      }
      clearSelection();
      return;
    }
    const piece = chess.get(square);
    if (!piece || piece.color !== chess.turn()) return;
    setSelectedSquare(square);
    setLegalMoveSquares(getLegalSquaresFor(square));
  }, [selectedSquare, legalMoveSquares, chess, game, playerColor, gameOver, promotionPending, isViewingHistory]);

  const onDrop = useCallback((src, tgt) => {
    if (!canInteract()) return false;
    const piece = chess.get(src);
    const isPromo = piece?.type === 'p' &&
      ((piece.color === 'w' && tgt[1] === '8') || (piece.color === 'b' && tgt[1] === '1'));
    if (isPromo) {
      const test = new Chess(chess.fen());
      if (!test.move({ from: src, to: tgt, promotion: 'q' })) return false;
      setPromotionPending({ from: src, to: tgt });
      clearSelection();
      return false;
    }
    execMove(src, tgt);
    clearSelection();
    return true;
  }, [game, chess, playerColor, gameOver, promotionPending, isViewingHistory]);

  const checkGameOver = () => {
    if (!chess.isGameOver()) return false;
    let winner = null, method = null;
    if (chess.isCheckmate()) { winner = chess.turn() === 'w' ? 'black' : 'white'; method = 'checkmate'; }
    else if (chess.isDraw()) {
      winner = 'draw';
      method = chess.isStalemate() ? 'stalemate' : chess.isInsufficientMaterial() ? 'insufficient_material' : 'threefold_repetition';
    }
    setGameOver({ winner, method });
    endGame(winner, method);
    return true;
  };

  const endGame = async (winner, method) => {
    setGameOver(prev => prev || { winner, method });
    try { await gamesAPI.endGame(gameId, { winner, method }); } catch (e) { console.error(e); }
  };

  const resign = () => {
    if (window.confirm('Are you sure you want to resign?')) endGame(playerColor === 'white' ? 'black' : 'white', 'resignation');
  };

  const goToMove = (idx) => {
    clearSelection();
    const last = allPositions.length - 1;
    if (idx >= last || idx < 0) { setViewingMoveIdx(-1); }
    else { setViewingMoveIdx(idx); }
  };
  const goFirst = () => goToMove(0);
  const goPrev  = () => { const cur = viewingMoveIdx === -1 ? allPositions.length - 1 : viewingMoveIdx; goToMove(cur - 1); };
  const goNext  = () => { const cur = viewingMoveIdx === -1 ? allPositions.length - 1 : viewingMoveIdx; goToMove(cur + 1); };
  const goLast  = () => goToMove(-1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewingMoveIdx, allPositions]);

  const getCustomSquareStyles = () => {
    const h = { ...legalMoveSquares };
    let highlightFrom, highlightTo;
    if (isViewingHistory && viewingMoveIdx > 0) {
      const mv = allPositions[viewingMoveIdx]?.move;
      if (mv) { highlightFrom = mv.uci?.slice(0,2); highlightTo = mv.uci?.slice(2,4); }
    } else if (lastMove) {
      highlightFrom = lastMove.from; highlightTo = lastMove.to;
    }
    if (highlightFrom) h[highlightFrom] = { ...(h[highlightFrom]||{}), backgroundColor: 'rgba(99,102,241,0.35)' };
    if (highlightTo)   h[highlightTo]   = { ...(h[highlightTo]||{}),   backgroundColor: 'rgba(99,102,241,0.50)' };
    if (selectedSquare) h[selectedSquare] = { ...(h[selectedSquare]||{}), backgroundColor: 'rgba(99,102,241,0.65)' };

    // Premove highlights (amber/gold)
    if (premove) {
      h[premove.from] = { ...(h[premove.from]||{}), backgroundColor: 'rgba(245,158,11,0.5)' };
      h[premove.to]   = { ...(h[premove.to]||{}),   backgroundColor: 'rgba(245,158,11,0.65)' };
    }
    if (!isViewingHistory && chess.isCheck()) {
      chess.board().forEach((row, r) => row.forEach((p, f) => {
        if (p?.type === 'k' && p.color === chess.turn())
          h[`${'abcdefgh'[f]}${8 - r}`] = { backgroundColor: 'rgba(239,68,68,0.55)' };
      }));
    }
    return h;
  };

  const materialInfo = useMemo(() => getMaterialInfo(displayFen || fen), [displayFen, fen]);
  const { captured, advantage } = materialInfo;
  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const capturedByWhite = captured.w;
  const capturedByBlack = captured.b;
  const opponentCaptured = opponentColor === 'white' ? capturedByWhite : capturedByBlack;
  const myCaptured = playerColor === 'white' ? capturedByWhite : capturedByBlack;
  const myAdvantage = playerColor === 'white' ? advantage : -advantage;
  const opponentAdvantage = -myAdvantage;

  const evalPct = () => 50 + (Math.max(-1000, Math.min(1000, evaluation)) / 1000) * 40;
  const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
  const isMyTurn = game?.mode !== 'ai' || currentTurn === playerColor;
  const boardOrientation = game?.mode === 'human' ? (boardFlipped ? 'black' : 'white') : playerColor;
  const activePlayer2P = game?.mode === 'human' ? (currentTurn === 'white' ? game?.white?.username : game?.black?.username) : null;
  const opponentName = game?.mode === 'ai' ? `Chess AI Lv.${game?.aiDifficulty}` : (playerColor === 'white' ? game?.black?.username : game?.white?.username) || 'Player 2';

  const PROMO_SYMBOLS = { q: ['♕','♛'], r: ['♖','♜'], b: ['♗','♝'], n: ['♘','♞'] };
  const PROMO_NAMES   = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };
  const turnIdx = chess.turn() === 'w' ? 0 : 1;

  const movePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        w: { move: moves[i], posIdx: i + 1 },
        b: moves[i+1] ? { move: moves[i+1], posIdx: i + 2 } : null
      });
    }
    return pairs;
  }, [moves]);

  const activePosIdx = viewingMoveIdx === -1 ? allPositions.length - 1 : viewingMoveIdx;

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-chess-dark">
      <div className="text-center"><div className="text-5xl mb-4 animate-bounce">♟</div><div className="spinner mx-auto" /><div className="text-slate-400 mt-4 text-sm">Loading game...</div></div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-chess-dark page-enter">
      {/* Eval bar */}
      <div className="flex flex-col items-center justify-center w-10 flex-shrink-0 py-6">
        <span className="text-slate-600 font-mono mb-1" style={{ fontSize: 9 }}>+∞</span>
        <div className="flex-1 relative w-3 rounded-full overflow-hidden" style={{ background: '#1a1a2e', minHeight: 200 }}>
          <div className="absolute bottom-0 w-full transition-all duration-500 rounded-full"
            style={{ height: `${evalPct()}%`, background: 'linear-gradient(to top, #f0d9b5, #fff)' }} />
        </div>
        <span className="text-slate-600 font-mono mt-1" style={{ fontSize: 9 }}>-∞</span>
        <div className="text-slate-500 font-mono mt-2" style={{ fontSize: 10 }}>
          {evaluation > 0 ? '+' : ''}{(evaluation / 100).toFixed(1)}
        </div>
      </div>

      {/* Board column */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 min-w-0">

        {/* Opponent bar */}
        <div className="w-full max-w-[520px]">
          <div className="flex items-center gap-3 bg-chess-panel rounded-xl px-4 py-2 border border-chess-border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
              {game?.mode === 'ai' ? <Cpu size={16} className="text-chess-accent" /> : <User size={16} className="text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white flex items-center gap-2">
                {opponentName}
                {game?.mode === 'ai' && aiThinking && <span className="text-xs text-chess-accent animate-pulse">● thinking…</span>}
              </div>
              <CapturedPieces capturedByMe={opponentCaptured} advantage={opponentAdvantage} color={opponentColor === 'white' ? 'w' : 'b'} showAdvantage={opponentAdvantage > 0} />
            </div>
            <div className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              !gameOver && currentTurn !== playerColor ? 'bg-chess-accent/20 text-chess-accent border border-chess-accent/30' : 'text-slate-500'
            }`}>
              <Clock size={12} />{fmtTime(playerColor === 'white' ? blackTime : whiteTime)}
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="chess-board-wrapper w-full max-w-[520px] relative">
          {isViewingHistory && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-chess-gold/90 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg pointer-events-none">
              Move {activePosIdx} / {allPositions.length - 1} — ← → or click to navigate
            </div>
          )}
          <Chessboard
            position={displayFen || 'start'}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardOrientation={boardOrientation}
            customSquareStyles={getCustomSquareStyles()}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            animationDuration={isViewingHistory ? 80 : 180}
            areArrowsAllowed={!isViewingHistory}
            arePiecesDraggable={!gameOver && !aiThinking && !promotionPending && !isViewingHistory}
          />

          {promotionPending && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center rounded-xl z-50">
              <div className="bg-chess-panel border border-chess-border rounded-2xl p-6 text-center shadow-2xl">
                <div className="text-white font-semibold mb-4">Promote pawn to:</div>
                <div className="flex gap-3">
                  {['q','r','b','n'].map(p => (
                    <button key={p} onClick={() => { execMove(promotionPending.from, promotionPending.to, p); setPromotionPending(null); }}
                      className="w-14 h-16 bg-chess-card hover:bg-chess-accent/20 border border-chess-border hover:border-chess-accent rounded-xl flex flex-col items-center justify-center transition-all">
                      <span className="text-3xl">{PROMO_SYMBOLS[p][turnIdx]}</span>
                      <span className="text-xs text-slate-500 mt-1">{PROMO_NAMES[p]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My player bar */}
        <div className="w-full max-w-[520px]">
          <div className="flex items-center gap-3 bg-chess-panel rounded-xl px-4 py-2 border border-chess-border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{user?.username} <span className="text-slate-500 text-xs">(You)</span></div>
              <CapturedPieces capturedByMe={myCaptured} advantage={myAdvantage} color={playerColor === 'white' ? 'w' : 'b'} showAdvantage={myAdvantage > 0} />
            </div>
            <div className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              isMyTurn && !gameOver ? 'bg-chess-green/20 text-chess-green border border-chess-green/30 animate-pulse' : 'text-slate-500'
            }`}>
              <Clock size={12} />{fmtTime(playerColor === 'white' ? whiteTime : blackTime)}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="w-full max-w-[520px] flex items-center justify-center gap-1">
          {[
            { icon: SkipBack,     action: goFirst, title: 'First' },
            { icon: ChevronLeft,  action: goPrev,  title: 'Prev (←)' },
            { icon: ChevronRight, action: goNext,  title: 'Next (→)' },
            { icon: SkipForward,  action: goLast,  title: 'Latest' },
          ].map(({ icon: Icon, action, title }) => (
            <button key={title} onClick={action} title={title}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-chess-panel border border-chess-border hover:bg-chess-card hover:border-chess-accent text-slate-400 hover:text-white transition-all">
              <Icon size={14} />
            </button>
          ))}
          {isViewingHistory && (
            <button onClick={goLast}
              className="ml-2 px-3 h-9 flex items-center gap-1.5 rounded-lg bg-chess-gold/20 border border-chess-gold/40 text-chess-gold hover:bg-chess-gold/30 text-xs font-semibold transition-all">
              ▶ Live
            </button>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-64 flex flex-col border-l border-chess-border bg-chess-panel flex-shrink-0">
        <div className="p-3 border-b border-chess-border text-center">
          <div className="text-xs text-slate-500">{game?.mode === 'ai' ? `AI Mode · Difficulty ${game?.aiDifficulty}/10` : '2-Player Local'}</div>
          {game?.mode === 'human' && !gameOver && (
            <div className="mt-1.5 flex items-center justify-center gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full border ${currentTurn === 'white' ? 'bg-white border-slate-400' : 'bg-slate-800 border-slate-500'}`} />
              <span className="text-white font-semibold">{activePlayer2P}'s turn</span>
            </div>
          )}
        </div>

        {/* Move list */}
        <div className="flex-1 overflow-hidden flex flex-col p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Moves</div>
          <div className="flex-1 overflow-y-auto move-list" ref={moveListRef}>
            {movePairs.length === 0 && (
              <div className="text-slate-600 text-xs text-center py-6">No moves yet</div>
            )}
            {movePairs.map(({ num, w, b }) => (
              <div key={num} className="flex gap-1 items-center text-xs mb-0.5">
                <span className="w-6 text-slate-600 font-mono flex-shrink-0">{num}.</span>
                <button
                  ref={activePosIdx === w.posIdx ? selectedMoveRef : null}
                  onClick={() => goToMove(w.posIdx)}
                  className={`flex-1 px-1.5 py-1 rounded font-mono text-left transition-colors ${
                    activePosIdx === w.posIdx ? 'bg-chess-accent text-white font-bold' : 'text-white hover:bg-chess-card'
                  }`}
                >{w.move?.san || ''}</button>
                {b ? (
                  <button
                    ref={activePosIdx === b.posIdx ? selectedMoveRef : null}
                    onClick={() => goToMove(b.posIdx)}
                    className={`flex-1 px-1.5 py-1 rounded font-mono text-left transition-colors ${
                      activePosIdx === b.posIdx ? 'bg-chess-accent text-white font-bold' : 'text-slate-300 hover:bg-chess-card'
                    }`}
                  >{b.move?.san || ''}</button>
                ) : <span className="flex-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        {gameOver ? (
          <div className="p-3 border-t border-chess-border space-y-2">
            <div className={`text-center py-3 rounded-xl mb-1 font-bold text-sm ${
              gameOver.winner === 'draw' ? 'bg-chess-gold/20 text-chess-gold' :
              gameOver.winner === playerColor ? 'bg-chess-green/20 text-chess-green' : 'bg-red-500/20 text-red-400'
            }`}>
              {gameOver.winner === 'draw' ? '🤝 Draw' : gameOver.winner === playerColor ? '🏆 You Won!' : '😔 You Lost'}
              <div className="text-xs font-normal opacity-70 mt-0.5 capitalize">{gameOver.method?.replace(/_/g, ' ')}</div>
            </div>
            <button onClick={() => navigate(`/review/${gameId}`)}
              className="w-full flex items-center justify-center gap-2 bg-chess-accent/20 hover:bg-chess-accent/30 text-chess-accent border border-chess-accent/30 rounded-xl py-2.5 text-xs font-medium transition-colors">
              <Eye size={13} /> Review Game
            </button>
            <button onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 bg-chess-card hover:bg-chess-border text-white rounded-xl py-2.5 text-xs font-medium transition-colors">
              <RotateCcw size={13} /> New Game
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-chess-border space-y-2">
            <div className="text-xs text-center text-slate-500 mb-0.5">
              {isViewingHistory ? '📖 Reviewing history' :
               aiThinking ? '🤖 AI thinking…' :
               premove ? '⚡ Premove queued' :
               isMyTurn ? '⚡ Your turn' :
               game?.mode === 'human' ? `⚡ ${activePlayer2P}'s turn` : '⏳ Opponent…'}
            </div>
            <div className="text-center text-xs text-slate-600 mb-1">Click piece · dots = legal moves</div>
            {premove && (
              <button onClick={clearPremove}
                className="w-full flex items-center justify-center gap-2 bg-chess-gold/10 hover:bg-chess-gold/20 text-chess-gold border border-chess-gold/20 rounded-xl py-2 text-xs font-medium transition-colors">
                ✕ Cancel Premove ({premove.from}→{premove.to})
              </button>
            )}
            {game?.mode === 'human' && (
              <button onClick={() => setBoardFlipped(f => !f)}
                className="w-full flex items-center justify-center gap-2 bg-chess-card hover:bg-chess-border text-slate-300 border border-chess-border rounded-xl py-2 text-xs font-medium transition-colors">
                <FlipHorizontal size={13} /> Flip Board
              </button>
            )}
            <button onClick={resign}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-2 text-xs font-medium transition-colors">
              <Flag size={13} /> {game?.mode === 'human' ? 'End Game' : 'Resign'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}