import chess

# Standard piece values
PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0 # King has no numeric value; losing it ends the game
}

def evaluate_board(board: chess.Board) -> float:
    """
    Evaluates the board state.
    Positive score means White is winning.
    Negative score means Black is winning.
    """
    if board.is_checkmate():
        # If it's White's turn and they are in checkmate, Black wins (-9999)
        return -9999 if board.turn == chess.WHITE else 9999
    
    # 🐛 FIX: Replaced board.is_draw() with board.is_game_over()
    if board.is_game_over():
        return 0

    score = 0
    # Loop through all 64 squares... (keep the rest the same)
    # Loop through all 64 squares
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            value = PIECE_VALUES.get(piece.piece_type, 0)
            if piece.color == chess.WHITE:
                score += value
            else:
                score -= value
                
    return score