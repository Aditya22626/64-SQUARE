import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const activeRooms = new Map(); // gameId -> { white, black, spectators }

export const setupSocketHandlers = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('username stats');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user?.username}`);

    // Join a game room
    socket.on('joinGame', ({ gameId }) => {
      socket.join(gameId);

      if (!activeRooms.has(gameId)) {
        activeRooms.set(gameId, { players: new Set(), spectators: new Set() });
      }

      const room = activeRooms.get(gameId);
      room.players.add(socket.user._id.toString());

      // Notify others
      socket.to(gameId).emit('playerJoined', {
        username: socket.user.username,
        userId: socket.user._id
      });

      socket.emit('roomStatus', {
        players: room.players.size,
        gameId
      });

      console.log(`🎮 ${socket.user.username} joined game ${gameId}`);
    });

    // Player makes a move (2-player mode sync)
    socket.on('makeMove', ({ gameId, moveData }) => {
      // Broadcast to other players in room
      socket.to(gameId).emit('opponentMove', moveData);
    });

    // Chat in game
    socket.on('chatMessage', ({ gameId, message }) => {
      if (message?.length > 200) return;
      io.to(gameId).emit('chatMessage', {
        username: socket.user.username,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Offer draw
    socket.on('offerDraw', ({ gameId }) => {
      socket.to(gameId).emit('drawOffer', { from: socket.user.username });
    });

    // Respond to draw offer
    socket.on('drawResponse', ({ gameId, accepted }) => {
      socket.to(gameId).emit('drawResponse', { accepted, from: socket.user.username });
    });

    // Game over notification
    socket.on('gameEnded', ({ gameId, winner, method }) => {
      io.to(gameId).emit('gameOver', { winner, method });
      activeRooms.delete(gameId);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user?.username}`);

      // Notify all rooms this user was in
      activeRooms.forEach((room, gameId) => {
        if (room.players.has(socket.user?._id?.toString())) {
          socket.to(gameId).emit('playerDisconnected', {
            username: socket.user?.username
          });
          room.players.delete(socket.user?._id?.toString());
        }
      });
    });

    // Ping/pong for connection health
    socket.on('ping', () => socket.emit('pong'));
  });

  console.log('🔌 Socket.io handlers initialized');
};
