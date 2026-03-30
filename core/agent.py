import random

class RandomAgent:
    def select_move(self, legal_moves):
        """Chooses a completely random move from the list of legal moves."""
        if not legal_moves:
            return None
        return random.choice(legal_moves)