import time
import chess
from engine.board import ChessBoard
from learning.q_learning import QLearningAgent # NEW IMPORT
from data.storage import GameTracker

def main():
    print("---------------------------------------")
    print("♟️  Chess AI - Phase 5 (Greedy Heuristics)")
    print("---------------------------------------")
    
    game = ChessBoard()
    tracker = GameTracker()
    
    # Initialize the new learning brain
    ai = QLearningAgent(color=chess.BLACK)
    
    while not game.is_game_over():
        print("\n" + str(game))
        current_fen = game.get_fen()
        
        # --- WHITE'S TURN (HUMAN) ---
        if game.board.turn == chess.WHITE:
            print("\nTurn: White (You)")
            user_move = input("Enter move (or 'quit'): ").strip()
            
            if user_move.lower() == 'quit':
                print("Game aborted.")
                break
            
            if game.make_move(user_move):
                print("✅ Move accepted.")
                tracker.record_move(current_fen, user_move, "Human")
            else:
                print(f"❌ Invalid move: '{user_move}'. Try again.")
                
        # --- BLACK'S TURN (AI) ---
        else:
            print("\nTurn: Black (AI)")
            print("🤖 Greedy AI is evaluating positions...")
            time.sleep(0.5) 
            
            # NEW: We pass the entire board to the AI so it can simulate moves
            ai_move = ai.get_move(game.board) 
            
            if game.make_move(ai_move):
                print(f"🎯 AI played: {ai_move}")
                tracker.record_move(current_fen, ai_move, "Greedy_AI")
            else:
                print("⚠️ AI attempted an illegal move.")
                break

    # --- GAME OVER ---
    if game.is_game_over():
        result = game.get_result()
        print("\n---------------------------------------")
        print("GAME OVER")
        print(game)
        print("Result:", result)
        tracker.save_game(result)
        print("---------------------------------------")

if __name__ == "__main__":
    main()