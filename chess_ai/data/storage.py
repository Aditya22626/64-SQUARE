import sqlite3
import os
import uuid

class GameTracker:
    def __init__(self, db_path="data/games.db"):
        # Ensure the data directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.create_table()
        
        # Temporary memory for the current game
        self.current_game_moves = []

    def create_table(self):
        cursor = self.conn.cursor()
        # FEN = the board layout. Move = what was played.
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS moves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT,
                fen TEXT,
                move TEXT,
                player TEXT,
                result TEXT
            )
        ''')
        self.conn.commit()

    def record_move(self, fen: str, move: str, player: str):
        """Saves a move to temporary memory during the game."""
        self.current_game_moves.append({
            "fen": fen,
            "move": move,
            "player": player
        })

    def save_game(self, result: str):
        """Flushes the game memory to the actual SQLite database."""
        if not self.current_game_moves:
            return

        game_id = str(uuid.uuid4())[:8] # Generate a unique short ID for the game
        
        cursor = self.conn.cursor()
        for record in self.current_game_moves:
            cursor.execute('''
                INSERT INTO moves (game_id, fen, move, player, result)
                VALUES (?, ?, ?, ?, ?)
            ''', (game_id, record["fen"], record["move"], record["player"], result))
        
        self.conn.commit()
        self.current_game_moves = [] # Clear memory for the next game
        print(f"💾 Game {game_id} saved to database! ({len(self.current_game_moves)} moves recorded)")
        