# Self-Learning Chess AI

## Overview
This project is a self-learning chess artificial intelligence system that improves its gameplay by learning from its own mistakes through reinforcement learning.

Unlike traditional chess engines trained on static datasets, this system generates its own training data through self-play and continuously improves over time.

---

## Key Features
- Fully rule-based chess engine
- Self-play data generation
- Reinforcement learning (Q-learning → DQN)
- Mistake and blunder analysis
- Accuracy scoring similar to Chess.com
- Modular, scalable architecture

---

## System Architecture
The system is divided into independent modules:

- engine/       → Chess rules and game state
- evaluation/   → Position and move evaluation
- learning/     → Reinforcement learning models
- analysis/     → Mistake detection and accuracy
- ui/           → User interaction
- data/         → Game and training data

---

## Learning Loop
Play Game  
→ Store Moves  
→ Evaluate Outcome  
→ Assign Rewards  
→ Update Model  
→ Improve Next Game  

---

## Tech Stack
- Python
- python-chess
- NumPy
- PyTorch (later)
- SQLite

---

## Project Status
Phase 1: Project setup and architecture design (In Progress)
