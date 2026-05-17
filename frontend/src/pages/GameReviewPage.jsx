import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { gamesAPI } from '../utils/api';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Home, Star, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const MOVE_ICONS = {
  brilliant: { icon: '⭐', color: '#00bcd4', label: 'Brilliant' },
  great: { icon: '!', color: '#4caf50', label: 'Great Move' },
  best: { icon: '✓', color: '#8bc34a', label: 'Best Move' },
  excellent: { icon: '✓', color: '#cddc39', label: 'Excellent' },
  good: { icon: '○', color: '#ffeb3b', label: 'Good' },
  inaccuracy: { icon: '?!', color: '#ff9800', label: 'Inaccuracy' },
  mistake: { icon: '?', color: '#ff5722', label: 'Mistake' },
  blunder: { icon: '??', color: '#f44336', label: 'Blunder' },
  book: { icon: '♟', color: '#9e9e9e', label: 'Book Move' }
};

const ACC_COLOR = (acc) => acc >= 90 ? '#4caf50' : acc >= 75 ? '#8bc34a' : acc >= 60 ? '#ff9800' : '#f44336';

export default function GameReviewPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await gamesAPI.getReview(gameId);
        const g = res.data.game;
        setGame(g);

        // Build all positions
        const tempChess = new Chess();
        const allPositions = [{ fen: tempChess.fen(), move: null, idx: -1 }];
        
        for (let i = 0; i < g.moves.length; i++) {
          const move = g.moves[i];
          try {
            const result = tempChess.move(move.san || { from: move.uci?.slice(0, 2), to: move.uci?.slice(2, 4) });
            if (result) {
              allPositions.push({
                fen: tempChess.fen(),
                move: { ...move, result },
                classification: g.analysis?.moveClassifications?.[i],
                bestMove: g.analysis?.bestMoves?.[i],
                idx: i
              });
            }
          } catch (e) {}
        }

        setPositions(allPositions);
        // Go to end by default
        setCurrentMoveIdx(allPositions.length - 1);
        setFen(allPositions[allPositions.length - 1]?.fen || 'start');
      } catch (err) {
        toast.error('Failed to load review');
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gameId]);

  const goToMove = (idx) => {
    if (idx < 0 || idx >= positions.length) return;
    setCurrentMoveIdx(idx);
    setFen(positions[idx].fen);
  };

  const currentPos = positions[currentMoveIdx];
  const classification = currentPos?.classification;
  const moveInfo = classification ? MOVE_ICONS[classification] : null;

  const getHighlightSquares = () => {
    const highlights = {};
    if (currentPos?.move?.result) {
      const { from, to } = currentPos.move.result;
      highlights[from] = { backgroundColor: 'rgba(99, 102, 241, 0.3)' };
      highlights[to] = { backgroundColor: 'rgba(99, 102, 241, 0.4)' };
    }
    return highlights;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">♟</div>
          <div className="spinner mx-auto" />
          <div className="text-slate-400 mt-4">Analyzing game...</div>
        </div>
      </div>
    );
  }

  const whitePlayer = game?.white?.username || 'White';
  const blackPlayer = game?.black?.username || 'Black';
  const analysis = game?.analysis;

  const StatBlock = ({ label, val, color }) => (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color }}>{val}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-chess-dark page-enter">
      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-full max-w-lg flex items-center justify-between">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <Home size={16} /> Back to History
          </button>
          <div className="text-slate-400 text-sm">
            Move {Math.max(0, currentMoveIdx)} / {positions.length - 1}
          </div>
        </div>

        {/* Player labels */}
        <div className="w-full max-w-lg flex justify-between items-center px-1">
          <span className="text-sm text-slate-300 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500" />
            {blackPlayer}
          </span>
          {analysis?.blackAccuracy && (
            <span className="text-xs font-mono" style={{ color: ACC_COLOR(analysis.blackAccuracy) }}>
              {analysis.blackAccuracy}% accuracy
            </span>
          )}
        </div>

        <div className="chess-board-wrapper w-full max-w-lg">
          <Chessboard
            position={fen}
            arePiecesDraggable={false}
            customSquareStyles={getHighlightSquares()}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            animationDuration={200}
          />
        </div>

        <div className="w-full max-w-lg flex justify-between items-center px-1">
          <span className="text-sm text-slate-300 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white" />
            {whitePlayer}
          </span>
          {analysis?.whiteAccuracy && (
            <span className="text-xs font-mono" style={{ color: ACC_COLOR(analysis.whiteAccuracy) }}>
              {analysis.whiteAccuracy}% accuracy
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {[
            { icon: SkipBack, action: () => goToMove(0), title: 'First move' },
            { icon: ChevronLeft, action: () => goToMove(currentMoveIdx - 1), title: 'Previous' },
            { icon: ChevronRight, action: () => goToMove(currentMoveIdx + 1), title: 'Next' },
            { icon: SkipForward, action: () => goToMove(positions.length - 1), title: 'Last move' }
          ].map(({ icon: Icon, action, title }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              className="bg-chess-panel border border-chess-border hover:border-chess-accent text-white rounded-xl p-3 transition-all hover:bg-chess-card"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Current move info */}
        {moveInfo && currentPos?.move && (
          <div className="w-full max-w-lg bg-chess-panel border border-chess-border rounded-xl p-4 flex items-center gap-4 animate-slide-up">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: `${moveInfo.color}20`, color: moveInfo.color }}
            >
              {moveInfo.icon}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">{moveInfo.label}</div>
              <div className="text-sm text-slate-400">
                Move {currentPos.idx + 1}: <span className="font-mono text-white">{currentPos.move?.san}</span>
                {currentPos.bestMove && currentPos.bestMove !== currentPos.move?.san && (
                  <span className="ml-2">
                    Best: <span className="font-mono text-chess-green">{currentPos.bestMove}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-72 flex flex-col border-l border-chess-border bg-chess-panel overflow-hidden">
        {/* Accuracy summary */}
        <div className="p-4 border-b border-chess-border">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Accuracy</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-chess-card rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white" /> {whitePlayer}
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color: ACC_COLOR(analysis?.whiteAccuracy || 0) }}>
                {analysis?.whiteAccuracy || '--'}%
              </div>
            </div>
            <div className="bg-chess-card rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-700 border border-slate-500" /> {blackPlayer}
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color: ACC_COLOR(analysis?.blackAccuracy || 0) }}>
                {analysis?.blackAccuracy || '--'}%
              </div>
            </div>
          </div>
        </div>

        {/* Move classification breakdown */}
        <div className="p-4 border-b border-chess-border">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Move Quality</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {[
              { key: 'Brilliant', wKey: 'whiteBrilliant', bKey: 'blackBrilliant', color: '#00bcd4', icon: '⭐' },
              { key: 'Great', wKey: 'whiteGreat', bKey: 'blackGreat', color: '#4caf50', icon: '!' },
              { key: 'Best', wKey: 'whiteBest', bKey: 'blackBest', color: '#8bc34a', icon: '✓' },
              { key: 'Good', wKey: 'whiteGood', bKey: 'blackGood', color: '#ffeb3b', icon: '○' },
              { key: 'Inaccuracy', wKey: 'whiteInaccuracy', bKey: 'blackInaccuracy', color: '#ff9800', icon: '?!' },
              { key: 'Mistake', wKey: 'whiteMistake', bKey: 'blackMistake', color: '#ff5722', icon: '?' },
              { key: 'Blunder', wKey: 'whiteBlunder', bKey: 'blackBlunder', color: '#f44336', icon: '??' }
            ].map(({ key, wKey, bKey, color, icon }) => (
              <React.Fragment key={key}>
                <div className="flex items-center gap-1.5">
                  <span style={{ color }}>{icon}</span>
                  <span className="text-slate-400">{key}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{analysis?.[wKey] ?? 0}</span>
                  <span className="text-slate-600">/</span>
                  <span>{analysis?.[bKey] ?? 0}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-2 pt-2 border-t border-chess-border">
            <span>White</span>
            <span>Black</span>
          </div>
        </div>

        {/* Move list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">All Moves</div>
          <div className="space-y-0.5">
            {positions.slice(1).map((pos, i) => {
              const isWhiteMove = i % 2 === 0;
              const cls = pos.classification;
              const clsInfo = cls ? MOVE_ICONS[cls] : null;
              const isCurrentMove = currentMoveIdx === i + 1;

              if (isWhiteMove) {
                const blackPos = positions[i + 2];
                const blackCls = blackPos?.classification;
                const blackClsInfo = blackCls ? MOVE_ICONS[blackCls] : null;

                return (
                  <div key={i} className="flex gap-1 items-center text-xs">
                    <span className="w-5 text-slate-600 font-mono flex-shrink-0">{Math.floor(i / 2) + 1}.</span>
                    <button
                      onClick={() => goToMove(i + 1)}
                      className={`flex-1 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-left transition-colors ${
                        isCurrentMove ? 'bg-chess-accent/20 text-chess-accent' : 'hover:bg-chess-card text-white'
                      }`}
                    >
                      {clsInfo && <span style={{ color: clsInfo.color }}>{clsInfo.icon}</span>}
                      {pos.move?.san}
                    </button>
                    {blackPos && (
                      <button
                        onClick={() => goToMove(i + 2)}
                        className={`flex-1 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-left transition-colors ${
                          currentMoveIdx === i + 2 ? 'bg-chess-accent/20 text-chess-accent' : 'hover:bg-chess-card text-slate-300'
                        }`}
                      >
                        {blackClsInfo && <span style={{ color: blackClsInfo.color }}>{blackClsInfo.icon}</span>}
                        {blackPos.move?.san}
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Critical moments */}
        {analysis?.criticalMoments?.length > 0 && (
          <div className="p-3 border-t border-chess-border">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Moments</div>
            <div className="space-y-1.5">
              {analysis.criticalMoments.slice(0, 3).map((moment, i) => (
                <button
                  key={i}
                  onClick={() => goToMove(moment.moveNumber)}
                  className="w-full text-left text-xs bg-chess-card hover:bg-chess-border rounded-lg p-2 transition-colors"
                >
                  <div className="text-slate-300">{moment.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
