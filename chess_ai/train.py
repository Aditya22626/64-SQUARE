import chess
from engine.board import ChessBoard
from learning.q_learning import QLearningAgent

def train_ai(episodes=100):
    print("---------------------------------------")
    print(f"🏋️‍♂️ Training AI for {episodes} games...")
    print("---------------------------------------")
    
    # We use one agent to play BOTH sides. This makes it learn twice as fast!
    agent = QLearningAgent(color=chess.WHITE, exploration_rate=0.5) 
    agent.load_model() # Load memory if it exists
    
    for episode in range(episodes):
        game = ChessBoard()
        
        # Memory variables to help the AI learn from its PREVIOUS move
        prev_state = None
        prev_move = None
        
        while not game.is_game_over():
            state = game.get_fen()
            legal_moves = game.get_legal_moves()
            
            # Agent picks a move
            move = agent.get_move(game.board)
            game.make_move(move)
            
            # Calculate Reward (1 for win, -1 for loss, 0 otherwise)
            reward = 0
            if game.is_game_over():
                result = game.get_result()
                if result == "1-0" or result == "0-1":
                    reward = 1 # Someone won, so the final move was good
                else:
                    reward = 0.1 # Small reward for drawing instead of losing
                    
            # 🧠 UPDATE THE BRAIN: Tell the AI if its last move was good or bad
            if prev_state is not None:
                agent.update_q_value(
                    state_fen=prev_state,
                    move_uci=prev_move,
                    reward=reward,
                    next_state_fen=state,
                    next_legal_moves=legal_moves
                )
            
            # Store current state for the next turn's update
            prev_state = state
            prev_move = move

        # Progress update every 10 games
        if (episode + 1) % 10 == 0:
            print(f"Game {episode + 1}/{episodes} complete. Brain size: {len(agent.q_table)} states.")

    # Save the massive brain to the hard drive
    print("\nTraining Complete!")
    agent.save_model()

if __name__ == "__main__":
    # Let's run 100 games to start
    train_ai(episodes=100)