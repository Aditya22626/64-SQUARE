import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="h-screen bg-chess-dark flex flex-col items-center justify-center">
      <div className="text-4xl mb-4 animate-bounce">♟</div>
      <div className="text-white font-display text-xl mb-2">ChessAI</div>
      <div className="spinner mt-4"></div>
    </div>
  );
}
