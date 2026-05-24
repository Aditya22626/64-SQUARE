import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import GameReviewPage from './pages/GameReviewPage';
import HistoryPage from './pages/HistoryPage';
import AIDashboardPage from './pages/AIDashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: isDark ? '#1a1a2e' : '#ffffff',
          color: isDark ? '#e2e8f0' : '#1e293b',
          border: isDark ? '1px solid #2a2a4a' : '1px solid #dde1f0',
          borderRadius: '12px',
          fontSize: '14px'
        }
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ThemedToaster />
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<HomePage />} />
              <Route path="game/:gameId" element={<GamePage />} />
              <Route path="review/:gameId" element={<GameReviewPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="ai-dashboard" element={<AIDashboardPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}