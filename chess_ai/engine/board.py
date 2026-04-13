import chess

class ChessBoard:
    def __init__(self):
        self.board = chess.Board()

    def reset(self):
        self.board.reset()

    def get_fen(self):
        return self.board.fen()

    def get_legal_moves(self):
        return list(self.board.legal_moves)

    def make_move(self, move_str: str):
        # Try parsing as SAN (Standard Algebraic Notation, e.g., 'e4') first
        try:
            move = self.board.parse_san(move_str)
        except ValueError:
            # If SAN fails, try UCI (Universal Chess Interface, e.g., 'e2e4')
            try:
                move = chess.Move.from_uci(move_str)
            except ValueError:
                return False # Completely invalid format

        if move in self.board.legal_moves:
            self.board.push(move)
            return True
        return False

    def is_game_over(self):
        return self.board.is_game_over()

    def get_result(self):
        if not self.board.is_game_over():
            return None
        return self.board.result()

    def __str__(self):
        return str(self.board)
