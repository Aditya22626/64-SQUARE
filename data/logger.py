import sqlite3
import json

class GameLogger:
    def __init__(self, db_name="chess_training_data.db"):
        self.conn = sqlite3.connect(db_name)
        self.cursor = self.conn.cursor()
        self._create_table()

    def _create_table(self):
        # We drop the old table and recreate it with the new ML-ready columns
        self.cursor.execute('DROP TABLE IF EXISTS game_logs')
        self.cursor.execute('''
            CREATE TABLE game_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fen TEXT,
                state_vector TEXT,  -- NEW: The 64-element numpy array (saved as JSON string)
                move_played TEXT,
                action_id INTEGER,  -- NEW: The integer ID of the move
                player_turn TEXT,
                game_result TEXT
            )
        ''')
        self.conn.commit()

    def log_move(self, fen, state_vector, move_played, action_id, player_turn):
        # Convert the numpy array to a standard Python list, then to a JSON string
        state_json = json.dumps(state_vector.tolist())
        
        self.cursor.execute('''
            INSERT INTO game_logs (fen, state_vector, move_played, action_id, player_turn, game_result)
            VALUES (?, ?, ?, ?, ?, NULL)
        ''', (fen, state_json, move_played, action_id, player_turn))
        self.conn.commit()

    def update_final_result(self, result):
        self.cursor.execute('''
            UPDATE game_logs 
            SET game_result = ? 
            WHERE game_result IS NULL
        ''', (result,))
        self.conn.commit()

    def close(self):
        self.conn.close()