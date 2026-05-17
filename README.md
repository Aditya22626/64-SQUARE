# ♟ 64-Square — Self-Learning Chess AI

A full-stack chess application featuring a **reinforcement learning AI** that genuinely improves from every game played. Built with React + Node.js + MongoDB.

---

## 🗂 Project Structure

```
chess-project/
├── backend/
│   ├── src/
│   │   ├── server.js                 ← Express + Socket.io entry point
│   │   ├── models/
│   │   │   ├── User.js               ← User schema (stats, auth)
│   │   │   ├── Game.js               ← Game schema (moves, analysis)
│   │   │   └── AIModel.js            ← RL model storage (Q-table, weights)
│   │   ├── routes/
│   │   │   ├── auth.js               ← Register, login, profile
│   │   │   ├── games.js              ← Create, move, end, history, review
│   │   │   ├── ai.js                 ← AI move, performance, status
│   │   │   └── users.js              ← Leaderboard, stats
│   │   ├── services/
│   │   │   ├── aiService.js          ← Q-Learning + DQN engine
│   │   │   ├── chessEngine.js        ← Minimax α-β + evaluation
│   │   │   └── socketService.js      ← Real-time Socket.io
│   │   └── middleware/
│   │       └── auth.js               ← JWT authentication
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.jsx           ← Game mode selection + stats
    │   │   ├── GamePage.jsx           ← Live chess board (AI + 2P)
    │   │   ├── GameReviewPage.jsx     ← Post-game analysis (chess.com-style)
    │   │   ├── HistoryPage.jsx        ← Game history browser
    │   │   ├── AIDashboardPage.jsx    ← AI learning performance charts
    │   │   ├── LeaderboardPage.jsx    ← Global player rankings
    │   │   ├── LoginPage.jsx
    │   │   └── RegisterPage.jsx
    │   ├── components/
    │   │   ├── Layout.jsx             ← Sidebar navigation
    │   │   └── LoadingScreen.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx        ← Auth state management
    │   └── utils/
    │       └── api.js                 ← Axios API client
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works perfectly)

### 1. Clone & Set Up MongoDB

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Create a free cluster
2. Create a database user and whitelist your IP (or use `0.0.0.0/0` for development)
3. Get your SRV connection string: `mongodb+srv://username:password@cluster.mongodb.net/chessai`

### 2. Backend Setup

```bash
cd chess-project/backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env and fill in your values:
#   MONGODB_URI=mongodb+srv://your-connection-string
#   JWT_SECRET=any-long-random-string-here

npm run dev
# ✅ Server starts on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd chess-project/frontend
npm install
npm run dev
# ✅ App opens on http://localhost:3000
```

---

## 🔧 Environment Variables

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chessai?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
```

---

## 🧠 How the AI Works

### Architecture: Q-Learning + Minimax + DQN

**1. Q-Learning (Temporal Difference)**
```
Q(s,a) = Q(s,a) + α × [r + γ × max_a' Q(s',a') - Q(s,a)]
```
- `α` = learning rate (0.001)
- `γ` = discount factor (0.95) — values future rewards
- Q-table stores learned values for (state, action) pairs
- After each game, all moves are updated with outcome reward

**2. ε-Greedy Exploration**
- `ε` starts at 1.0 (100% random exploration)
- Decays by 0.995 each game until `ε_min = 0.05`
- More games played → less exploration → more exploitation
- Difficulty also scales `ε` — lower difficulty = more random moves

**3. Minimax with Alpha-Beta Pruning**
- Used for exploitation phase (when not exploring)
- Depth scales with difficulty (1–4 plies)
- Position evaluation: material values + piece-square tables + mobility
- Rewards: captures, checks, terminal win/loss

**4. Experience Replay**
- Stores last 5,000 (state, action, reward, next_state) tuples
- Replayed during batch training for stability

### Reward Function

| Outcome | Reward |
|---------|--------|
| Checkmate win | +1.0 |
| Win by timeout/resign | +0.7–0.8 |
| Draw | +0.1 |
| Loss | -0.7 to -1.0 |
| Capture (immediate) | +0.1 |
| Check given (immediate) | +0.05 |

---

## 🎮 Features

| Feature | Description |
|---------|-------------|
| **vs AI** | Play against the self-learning RL engine (10 difficulty levels) |
| **2 Players** | Pass-and-play on same device with flip board |
| **Pawn Promotion** | Beautiful promotion picker dialog |
| **Game Review** | Chess.com-style move classifications with eval bar |
| **Accuracy Score** | Centipawn-loss based accuracy per player |
| **AI Dashboard** | Real-time charts of learning progress, radar chart, win history |
| **Game History** | Browse, filter, and review all past games |
| **Leaderboard** | Global rankings with player titles |
| **Auth System** | JWT login/register, data persisted in MongoDB |
| **Real-time** | Socket.io for live game sync |
| **Eval Bar** | Live position evaluation bar during games |

---

## 🏆 Move Classifications

| Symbol | Classification | Centipawn Loss |
|--------|----------------|----------------|
| ⭐ | Brilliant | Improves position |
| ! | Great | ≤ 0 loss |
| ✓ | Best/Excellent | ≤ 50 |
| ○ | Good | ≤ 100 |
| ?! | Inaccuracy | ≤ 200 |
| ? | Mistake | > 200 |
| ?? | Blunder | > 400 |

---

## 🏅 Player Titles

| Rating | Title |
|--------|-------|
| 2000+ | Master |
| 1800+ | Expert |
| 1600+ | Advanced |
| 1400+ | Intermediate |
| 1200+ | Beginner |
| < 1200 | Novice |

---

## 🔌 API Endpoints

```
POST /api/auth/register    → Create account
POST /api/auth/login       → Login
GET  /api/auth/me          → Current user

POST /api/games/create     → Start new game
GET  /api/games/history    → Game history
GET  /api/games/:id        → Single game
POST /api/games/:id/move   → Save move
POST /api/games/:id/end    → End game
GET  /api/games/:id/review → Game analysis

POST /api/ai/move          → Get AI move
GET  /api/ai/performance   → AI learning stats
GET  /api/ai/status        → AI model status

GET  /api/users/leaderboard     → Global rankings
GET  /api/users/me/stats        → My detailed stats
GET  /api/users/:id/profile     → User profile
```

---

## 🛠 Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, react-chessboard, chess.js, Recharts, Socket.io-client, Lucide React, react-hot-toast

**Backend:** Node.js, Express, MongoDB + Mongoose, Socket.io, JWT, bcryptjs, chess.js

**AI:** Q-Learning, Minimax + Alpha-Beta Pruning, ε-Greedy Exploration, Experience Replay
