import mongoose from 'mongoose';

const moveSchema = new mongoose.Schema({
  san: String,
  uci: String,
  fen: String,
  piece: String,
  isCapture: Boolean,
  isCheck: Boolean,
  isCastle: Boolean,
  timeTaken: Number,
  moveNumber: Number
}, { _id: false });

const analysisSchema = new mongoose.Schema({
  whiteAccuracy: Number,
  blackAccuracy: Number,
  whiteBrilliant: { type: Number, default: 0 },
  whiteGreat: { type: Number, default: 0 },
  whiteBest: { type: Number, default: 0 },
  whiteGood: { type: Number, default: 0 },
  whiteInaccuracy: { type: Number, default: 0 },
  whiteMistake: { type: Number, default: 0 },
  whiteBlunder: { type: Number, default: 0 },
  blackBrilliant: { type: Number, default: 0 },
  blackGreat: { type: Number, default: 0 },
  blackBest: { type: Number, default: 0 },
  blackGood: { type: Number, default: 0 },
  blackInaccuracy: { type: Number, default: 0 },
  blackMistake: { type: Number, default: 0 },
  blackBlunder: { type: Number, default: 0 },
  moveClassifications: [String],
  bestMoves: [String],
  evalHistory: [Number],
  criticalMoments: [{
    moveNumber: Number,
    description: String,
    type: String
  }]
}, { _id: false });

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['ai', 'human'],
    required: true
  },
  white: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    rating: { type: Number, default: 1200 },
    isAI: { type: Boolean, default: false }  // FIX: AI can be white too
  },
  black: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    rating: { type: Number, default: 1200 },
    isAI: { type: Boolean, default: false }
  },
  moves: [moveSchema],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  result: {
    winner: String, // 'white', 'black', 'draw'
    method: String, // 'checkmate', 'resignation', 'timeout', 'stalemate', 'draw_agreement'
    endedAt: Date
  },
  aiDifficulty: { type: Number, min: 1, max: 10, default: 5 },
  timeControl: {
    initial: { type: Number, default: 600 },
    increment: { type: Number, default: 0 }
  },
  pgn: String,
  finalFen: String,
  analysis: analysisSchema,
  analysisStatus: {
    type: String,
    enum: ['pending', 'processing', 'complete', 'failed'],
    default: 'pending'
  }
}, { timestamps: true });

gameSchema.index({ 'white.userId': 1, createdAt: -1 });
gameSchema.index({ 'black.userId': 1, createdAt: -1 });
gameSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Game', gameSchema);
