# 64-square ♟️ 
**An Autonomous Reinforcement Learning Chess Engine**

## 🚀 Project Overview
**64-square** is a machine learning project designed to demonstrate the application of reinforcement learning in highly complex environments. Instead of relying on traditional chess heuristics (like Minimax or Alpha-Beta pruning) or pre-existing engines like Stockfish, this agent starts with zero knowledge and learns optimal strategies strictly by playing thousands of games against itself.

**Current Milestone (Phase 8):** The engine has successfully trained on over **226,000 unique board states** through automated self-play, achieving a 95% undefeated rate against a randomized baseline agent.

### 🧠 Core Architecture & Features
* **Reinforcement Learning Engine:** Custom-built Q-Learning agent utilizing the Bellman equation for state-action evaluation.
* **Smart Reward Shaping:** Granular intermediate rewards for piece captures (scaled dynamically by standard piece values: Pawn=0.1 to Queen=0.9) and checking the enemy King, drastically reducing sparse-reward issues.
* **Epsilon-Greedy Exploration:** Dynamic exploration rate ($\epsilon$ decay) that smoothly transitions the bot from exploring random tactical lines to exploiting its learned Q-table.
* **Self-Play Automation:** Continuous, automated training loop allowing the agent to play as both White and Black simultaneously, forcing it to discover both offensive and defensive tactics.
* **High-Performance Caching:** Optimized board state caching and native object passing (bypassing heavy string conversions), reducing function call overhead by ~35% during massive training batches.
* **Data Logging Pipeline:** SQLite integration for recording vectorized board states (NumPy) and action IDs, preparing the pipeline for future Deep Q-Network (DQN) upgrades.

## 📂 Project Structure
```text
64-square/
├── core/
│   ├── __init__.py
│   ├── agent.py         # Baseline Random Agent for benchmarking
│   ├── board.py         # Optimized ChessEnvironment wrapper
│   ├── encoder.py       # Action & State vectorization (NumPy)
│   ├── game_loop.py     # High-speed training and evaluation loops
│   └── q_agent.py       # Q-Learning logic, Bellman math, and memory
├── data/
│   ├── chess_training_data.db  # SQLite database for game logs
│   └── q_table.pkl      # Saved Q-table model (ignored in version control)
├── .gitignore           # Prevents massive DB/Model files from bloating Git
├── README.md            # Project documentation
└── main.py              # Application entry point