import mongoose from 'mongoose';

// Stores AI model weights, Q-values, and learning history
const aiModelSchema = new mongoose.Schema({
  version: { type: Number, default: 1 },
  totalGamesPlayed: { type: Number, default: 0 },
  totalMovesLearned: { type: Number, default: 0 },

  // Q-Learning parameters
  qTable: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // Neural network weights (simplified representation)
  networkWeights: {
    inputLayer: [Number],
    hiddenLayer1: [Number],
    hiddenLayer2: [Number],
    outputLayer: [Number],
    biases: [Number]
  },

  // Learning hyperparameters
  hyperparams: {
    learningRate: { type: Number, default: 0.001 },
    epsilon: { type: Number, default: 1.0 },        // exploration rate
    epsilonMin: { type: Number, default: 0.05 },
    epsilonDecay: { type: Number, default: 0.995 },
    gamma: { type: Number, default: 0.95 },          // discount factor
    batchSize: { type: Number, default: 32 }
  },

  // Performance metrics over time
  performanceHistory: [{
    gameNumber: Number,
    winRate: Number,
    avgMoveQuality: Number,
    accuracyScore: Number,
    explorationRate: Number,
    timestamp: { type: Date, default: Date.now }
  }],

  // Win/loss/draw stats by difficulty
  statsByDifficulty: {
    type: Map,
    of: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      avgAccuracy: { type: Number, default: 0 }
    }
  },

  // Opening book learned
  openingBook: {
    type: Map,
    of: String
  },

  // Replay buffer (last N experiences)
  replayBuffer: [{
    state: String,      // FEN
    action: String,     // UCI move
    reward: Number,
    nextState: String,
    done: Boolean,
    timestamp: Date
  }],

  lastTrainedAt: { type: Date, default: Date.now },
  improvementRate: { type: Number, default: 0 },
  currentStrength: { type: Number, default: 1200 } // ELO estimate
}, { timestamps: true });

// Keep only latest per difficulty-version
aiModelSchema.index({ version: -1 });

export default mongoose.model('AIModel', aiModelSchema);
