import random
import pickle
import os
from core.encoder import ActionEncoder

class QLearningAgent:
    def __init__(self, epsilon=0.2, alpha=0.1, gamma=0.9):
        self.q_table = {}  
        self.epsilon = epsilon  
        self.alpha = alpha      
        self.gamma = gamma      
        self.encoder = ActionEncoder()

    def get_q_value(self, state_fen, action_id):
        """Fetches the Q-value for a state-action pair. Defaults to 0.0 if unknown."""
        return self.q_table.get(state_fen, {}).get(action_id, 0.0)

    def select_move(self, state_fen, legal_moves):
        """Chooses a move using the Epsilon-Greedy strategy."""
        if not legal_moves:
            return None

        # EXPLORATION: Pick a random move
        if random.uniform(0, 1) < self.epsilon:
            return random.choice(legal_moves)
            
        # EXPLOITATION: Pick the move with the highest Q-value
        best_move = None
        max_q = float('-inf')
        
        # We shuffle to prevent the bot from playing the exact same predictable game every time
        # if all Q-values are currently 0.0
        moves_list = list(legal_moves)
        random.shuffle(moves_list)

        for move_uci in moves_list:
            action_id = self.encoder.encode_action(move_uci)
            q_val = self.get_q_value(state_fen, action_id)
            
            if q_val > max_q:
                max_q = q_val
                best_move = move_uci
                
        return best_move

    def learn(self, state_fen, action_id, reward, next_state_fen, next_legal_moves):
        """Updates the Q-table using the Bellman Equation."""
        current_q = self.get_q_value(state_fen, action_id)
        
        # Find the maximum possible Q-value for the NEXT state
        max_next_q = 0.0
        if next_legal_moves:
            next_action_ids = [self.encoder.encode_action(m) for m in next_legal_moves]
            max_next_q = max([self.get_q_value(next_state_fen, a_id) for a_id in next_action_ids])
            
        # Apply the Bellman Equation
        new_q = current_q + self.alpha * (reward + self.gamma * max_next_q - current_q)
        
        # Save it back to the table
        if state_fen not in self.q_table:
            self.q_table[state_fen] = {}
        self.q_table[state_fen][action_id] = new_q

    def save_model(self, filepath="data/q_table.pkl"):
        """Saves the Q-table to a file."""
        # Ensure the data directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(self.q_table, f)
        print(f"Model saved successfully. Total states: {len(self.q_table)}")

    def load_model(self, filepath="data/q_table.pkl"):
        """Loads the Q-table from a file if it exists."""
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                self.q_table = pickle.load(f)
            print(f"Model loaded successfully. Total states: {len(self.q_table)}")
        else:
            print("No existing model found. Starting with a fresh brain.")
    
    def decay_epsilon(self, decay_rate=0.99, min_epsilon=0.01):
        """Reduces epsilon after each game so the agent relies more on its training over time."""
        if self.epsilon > min_epsilon:
            self.epsilon *= decay_rate
            # Rounding just to make the terminal output look cleaner
            self.epsilon = round(self.epsilon, 4)