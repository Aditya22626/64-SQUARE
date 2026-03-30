import chess

class ChessEnvironment:
    def __init__(self):
        # Initialize a standard chess board
        self.board = chess.Board()

    def reset(self):
        """Resets the board to the starting position."""
        self.board.reset()
        return self.get_state()

    def get_legal_moves(self):
        """Returns the actual chess.Move objects, saving thousands of string conversions."""
        return list(self.board.legal_moves)

    def push_move(self, move):
        """Executes a move (accepts both string or chess.Move object)."""
        if isinstance(move, str):
            try:
                move = chess.Move.from_uci(move)
            except ValueError:
                return False
                
        if move in self.board.legal_moves:
            self.board.push(move)
            return True
        return False

    def is_game_over(self):
        """Checks if the game has ended (checkmate, stalemate, draw)."""
        return self.board.is_game_over()

    def get_result(self):
        """Returns the result of the game ('1-0', '0-1', '1/2-1/2', or None)."""
        if self.is_game_over():
            return self.board.result()
        return None

    def get_state(self):
        """Returns the current board state (FEN string)."""
        return self.board.fen()

    def display(self):
        """Prints a simple CLI representation of the board."""
        print("\n" + str(self.board) + "\n")