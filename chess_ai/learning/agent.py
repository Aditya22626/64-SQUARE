from evaluation.heuristics import evaluate_board
import chess
import random

class GreedyAgent:
    def __init__(self, color: chess.Color):
        self.name = "Greedy Gobbler"
        self.color = color # Knows if it is White or Black
        
    def get_move(self, board: chess.Board):
        """
        Simulates all legal moves and picks the one with the best immediate score.
        """
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return None
            
        best_move = None
        # White wants positive infinity, Black wants negative infinity
        best_score = -float('inf') if self.color == chess.WHITE else float('inf')
        
        # Shuffle moves so it doesn't always play the exact same game if scores are tied
        random.shuffle(legal_moves)
        
        for move in legal_moves:
            # 1. Simulate the move
            board.push(move)
            
            # 2. Evaluate the new board state
            score = evaluate_board(board)
            
            # 3. Undo the move (crucial so we don't break the real game state)
            board.pop()
            
            # 4. Check if this is the best move so far
            if self.color == chess.WHITE:
                if score > best_score:
                    best_score = score
                    best_move = move
            else:
                if score < best_score: # Black wants the lowest score
                    best_score = score
                    best_move = move
                    
        return best_move.uci()