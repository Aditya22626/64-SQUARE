import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('chess_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('chess_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// AUTH
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  me: () => api.get('/auth/me'),
  updatePreferences: (prefs) => api.put('/auth/preferences', prefs)
};

// GAMES
export const gamesAPI = {
  create: (mode, aiDifficulty, color, timeControl) =>
    api.post('/games/create', { mode, aiDifficulty, color, timeControl }),
  getHistory: (page = 1, limit = 20, mode) =>
    api.get('/games/history', { params: { page, limit, mode } }),
  getGame: (gameId) => api.get(`/games/${gameId}`),
  saveMove: (gameId, moveData) => api.post(`/games/${gameId}/move`, moveData),
  endGame: (gameId, result) => api.post(`/games/${gameId}/end`, result),
  getReview: (gameId) => api.get(`/games/${gameId}/review`)
};

// AI
export const aiAPI = {
  getMove: (fen, difficulty, gameId, moveHistory) =>
    api.post('/ai/move', { fen, difficulty, gameId, moveHistory }),
  getPerformance: (limit = 50) => api.get('/ai/performance', { params: { limit } }),
  getStatus: () => api.get('/ai/status')
};

// USERS
export const usersAPI = {
  getLeaderboard: () => api.get('/users/leaderboard'),
  getProfile: (userId) => api.get(`/users/${userId}/profile`),
  getMyStats: () => api.get('/users/me/stats')
};

export default api;
