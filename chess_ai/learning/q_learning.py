import chess
import random
import json
import os

class QLearningAgent:
    def __init__(self, color: chess.Color, learning_rate=0.1, discount_factor=0.9, exploration_rate=0.2):
        self.name = "Q-Brain (Phase 6)"
        self.color = color
        
        # Hyperparameters
        self.lr = learning_rate          # How fast it overrides old info (Alpha)
        self.gamma = discount_factor     # How much it cares about long-term future rewards
        self.epsilon = exploration_rate  # 20% of the time, it will try a random move
        
        # The Brain: Maps state(FEN) -> { move(UCI) : Q-Value }
        self.q_table = {}

    def get_q_value(self, state_fen, move_uci):
        """Looks up the Q-Value. Defaults to 0.0 if it's a new position."""
        if state_fen not in self.q_table:
            return 0.0
        return self.q_table[state_fen].get(move_uci, 0.0)

    def get_move(self, board: chess.Board):
        """Selects a move using Epsilon-Greedy strategy."""
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return None

        state_fen = board.fen()

        # EXPLORE: Try a random move to discover new strategies
        if random.random() < self.epsilon:
            return random.choice(legal_moves).uci()

        # EXPLOIT: Pick the move with the highest known Q-Value
        best_move = None
        best_value = -float('inf')
        
        # Shuffle to break ties randomly
        random.shuffle(legal_moves)

        for move in legal_moves:
            move_uci = move.uci()
            q_value = self.get_q_value(state_fen, move_uci)
            
            if q_value > best_value:
                best_value = q_value
                best_move = move_uci

        return best_move

    def update_q_value(self, state_fen, move_uci, reward, next_state_fen, next_legal_moves):
        """
        The Core Math: Updates the brain using the Bellman Equation.
        """
        # 1. Get current Q-value
        old_q = self.get_q_value(state_fen, move_uci)
        
        # 2. Find the maximum possible Q-value for the NEXT state
        next_max_q = 0.0
        if next_legal_moves:
            next_max_q = max([self.get_q_value(next_state_fen, m.uci()) for m in next_legal_moves])

        # 3. Calculate the new Q-value (Bellman Equation)
        new_q = old_q + self.lr * (reward + (self.gamma * next_max_q) - old_q)
        
        # 4. Save it to the Q-Table
        if state_fen not in self.q_table:
            self.q_table[state_fen] = {}
        self.q_table[state_fen][move_uci] = new_q
        
    def save_model(self, filepath="data/q_table.json"):
        """Saves the brain to a file so it doesn't forget."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(self.q_table, f)
        print(f"💾 Brain saved! It now recognizes {len(self.q_table)} unique board states.")

    def load_model(self, filepath="data/q_table.json"):
        """Loads the brain from a file."""
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                self.q_table = json.load(f)
            print(f"🧠 Brain loaded! Existing knowledge: {len(self.q_table)} board states.")     