# Self-Learning Chess AI ♟️🤖

A Python-based, modular chess engine that evolves from playing random moves to learning long-term strategy using Reinforcement Learning (Q-Learning). 

Unlike traditional chess engines trained on static datasets, this system learns by playing games, evaluating its mistakes, and updating its mathematical brain using the Bellman Equation.

---

## 🚀 Project Status: Phase 6 Complete (Q-Learning Brain)
The engine has successfully transitioned from a rule-based system to an autonomous learning agent. It can currently play games, evaluate positions using heuristics, and learn from its experiences by updating a Q-Table stored in long-term memory.

---

## 🧠 Features Implemented
- **Clean Engine Architecture:** A decoupled wrapper around `python-chess` that separates game rules from AI logic.
- **Data Collection Pipeline:** An integrated SQLite database (`games.db`) that records every FEN state, move, and game outcome for future training.
- **Minimax/Greedy Heuristics:** A 1-depth search algorithm that evaluates piece material and actively hunts for captures.
- **Reinforcement Learning (Q-Learning):** An agent utilizing an Epsilon-Greedy strategy and the Bellman Equation to learn long-term rewards over short-term gains.
- **Long-Term Memory:** JSON-based state saving so the AI retains its Q-Table knowledge between sessions.
- **Training Pipeline:** A Hyperbolic Time Chamber (`train.py`) allowing the AI to play thousands of self-play games in seconds.

---

## 🏗️ System Architecture
The project follows a strict modular design:

```text
chess_ai/
│
├── engine/          # Game logic & state management (board.py)
├── evaluation/      # Mathematical board scoring (heuristics.py)
├── learning/        # AI Agents: Random, Greedy, and Q-Learning
├── data/            # SQLite storage & JSON brain saves
│
├── main.py          # Interactive CLI for Human vs. AI games
├── train.py         # Automated self-play training loop
├── requirements.txt # Project dependencies
└── README.md
💻 How to Run
1. Setup the Environment

Bash
python -m venv venv

# Windows (Git Bash)
source venv/Scripts/activate  
# Mac/Linux
source venv/bin/activate  

pip install -r requirements.txt
2. Play Against the AI
Run the interactive Command Line Interface to play a game against the current version of the AI.

Bash
python main.py
3. Train the AI (Self-Play)
Run the automated training loop to allow the AI to play against itself and expand its Q-Table memory.

Bash
python train.py
📅 Roadmap to Completion
[x] Phase 1: Project setup and architecture design

[x] Phase 2: Playable Chess Engine Interface

[x] Phase 3: Baseline AI & CLI Game Loop

[x] Phase 4: SQLite Data Collection Pipeline

[x] Phase 5: Evaluation Heuristics & Greedy Agent

[x] Phase 6: Q-Learning Implementation & Memory

[ ] Phase 7: Experience Replay Buffer

[ ] Phase 8: Deep Q-Network (DQN) Integration

[ ] Phase 9: Advanced Self-Play Training Loop

[ ] Phase 10: Mistake Analysis Engine

[ ] Phase 11: UI & Visualization

[ ] Phase 12: Final Polish & Demo Prep
