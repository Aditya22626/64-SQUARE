import time
import chess
from core.board import ChessEnvironment
from core.q_agent import QLearningAgent
from core.encoder import ActionEncoder
from core.agent import RandomAgent  # <-- This is the missing piece!

def train_self_play(epochs=10): 
    env = ChessEnvironment()
    encoder = ActionEncoder()
    agent = QLearningAgent(epsilon=0.5) 
    
    print("--- Initializing Fast AI ---")
    agent.load_model()

    for game in range(epochs):
        env.reset()
        
        # CACHE OPTIMIZATION: Get the state ONCE at the start of the game
        current_fen = env.get_state()
        legal_moves = env.get_legal_moves()
        
        while not env.is_game_over():
            turn_color = chess.WHITE if env.board.turn else chess.BLACK
            
            move = agent.select_move(current_fen, legal_moves)
            action_id = encoder.encode_action(move)
            
            # --- PHASE 8: STRATEGY IMPROVEMENT & SMART REWARDS ---
            # 1. Evaluate captures BEFORE pushing the move
            is_capture = env.board.is_capture(move)
            capture_reward = 0.0
            
            if is_capture:
                if env.board.is_en_passant(move):
                    capture_reward = 0.1 # Pawns are worth 0.1
                else:
                    # Look at the square the piece is moving to, and see what piece is currently sitting there
                    captured_piece = env.board.piece_at(move.to_square)
                    if captured_piece:
                        # Standard chess piece values scaled down
                        piece_values = {
                            chess.PAWN: 0.1, 
                            chess.KNIGHT: 0.3, 
                            chess.BISHOP: 0.3, 
                            chess.ROOK: 0.5, 
                            chess.QUEEN: 0.9
                        }
                        capture_reward = piece_values.get(captured_piece.piece_type, 0.1)

            # 2. Push the move
            env.push_move(move)
            
            # 3. Calculate the running reward
            reward = -0.01 + capture_reward # Time penalty + Capture reward
            
            # 4. Reward the AI for putting the enemy King in check!
            if env.board.is_check():
                reward += 0.2 
            
            # 5. Final Game Rewards
            if env.is_game_over():
                result = env.get_result()
                if result == "1/2-1/2": 
                    reward -= 0.5 
                elif (result == "1-0" and turn_color == chess.WHITE) or \
                     (result == "0-1" and turn_color == chess.BLACK):
                    reward += 1.0 
                else: 
                    reward -= 1.0 
            # -----------------------------------------------------
            
            next_fen = env.get_state()
            next_legal = env.get_legal_moves()
            
            agent.learn(current_fen, action_id, reward, next_fen, next_legal)

            current_fen = next_fen
            legal_moves = next_legal

        agent.decay_epsilon()

        if (game + 1) % 10 == 0 or game == epochs - 1:
            print(f"Batch {game + 1}/{epochs} | Result: {env.get_result()} | States: {len(agent.q_table)} | Epsilon: {agent.epsilon}")

    print("\n--- Saving Fast AI Knowledge ---")
    agent.save_model()

def evaluate_agent(games=100):
    env = ChessEnvironment()
    
    # Epsilon is 0.0! The AI must strictly use its brain, no random guessing.
    agent = QLearningAgent(epsilon=0.0) 
    random_bot = RandomAgent()
    
    print("--- Loading AI for Evaluation ---")
    agent.load_model()
    
    wins = 0
    losses = 0
    draws = 0
    
    print(f"\nStarting Evaluation Benchmark ({games} games) vs Random Bot...")
    
    for game in range(games):
        env.reset()
        
        # Alternate colors: AI plays White on even games, Black on odd games
        ai_is_white = (game % 2 == 0)
        
        # Cache optimization just like our training loop
        current_fen = env.get_state()
        legal_moves = env.get_legal_moves()
        
        while not env.is_game_over():
            # Determine if it's the AI's turn
            if (env.board.turn == chess.WHITE and ai_is_white) or \
               (env.board.turn == chess.BLACK and not ai_is_white):
                move = agent.select_move(current_fen, legal_moves)
            else:
                move = random_bot.select_move(legal_moves)
                
            env.push_move(move)
            
            # Update state cache
            current_fen = env.get_state()
            legal_moves = env.get_legal_moves()
            
        # Tally the results
        result = env.get_result()
        if result == "1/2-1/2":
            draws += 1
        elif (result == "1-0" and ai_is_white) or (result == "0-1" and not ai_is_white):
            wins += 1
        else:
            losses += 1

    # Print the final metrics
    print("\n" + "="*30)
    print("      EVALUATION RESULTS")
    print("="*30)
    print(f"Total Games Played : {games}")
    print(f"Wins               : {wins}")
    print(f"Losses             : {losses}")
    print(f"Draws              : {draws}")
    print("-" * 30)
    win_rate = (wins / games) * 100
    undefeated_rate = ((wins + draws) / games) * 100
    print(f"Win Rate           : {win_rate:.2f}%")
    print(f"Undefeated Rate    : {undefeated_rate:.2f}%")
    print("="*30)