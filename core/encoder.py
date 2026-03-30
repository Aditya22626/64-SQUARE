import chess
import numpy as np

class ActionEncoder:
    def __init__(self):
        # Piece mapping for our state vector
        self.piece_to_int = {
            chess.PAWN: 1,
            chess.KNIGHT: 2,
            chess.BISHOP: 3,
            chess.ROOK: 4,
            chess.QUEEN: 5,
            chess.KING: 6
        }

    def encode_board(self, board):
        """
        Converts a chess.Board into a 64-element 1D numpy array.
        White pieces are positive, Black pieces are negative.
        Empty squares are 0.
        """
        board_vector = np.zeros(64, dtype=np.int8)
        
        for square in chess.SQUARES: # 0 to 63
            piece = board.piece_at(square)
            if piece:
                # Determine sign (White is positive, Black is negative)
                sign = 1 if piece.color == chess.WHITE else -1
                board_vector[square] = self.piece_to_int[piece.piece_type] * sign
                
        return board_vector

    def encode_action(self, move):
        """Converts a move into a unique integer ID. Now optimized for Move objects."""
        if isinstance(move, str):
            move = chess.Move.from_uci(move)
            
        action_id = (move.from_square * 64) + move.to_square
        return action_id

    def decode_action(self, action_id):
        """
        Reverses the action ID back into a from_square and to_square.
        Useful later when the AI predicts a number and we need to play it on the board.
        """
        to_square = action_id % 64
        from_square = action_id // 64
        
        # Note: This is a foundational decoder. It doesn't handle pawn promotions (like e7e8q) yet, 
        # but it gives us the mathematical baseline we need for Phase 3.
        from_chess_square = chess.square_name(from_square)
        to_chess_square = chess.square_name(to_square)
        
        return f"{from_chess_square}{to_chess_square}"