import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  inventory: [{
    itemId: String,
    type: String,
    pickedUpAt: Date
  }],
  stats: {
    lastPosition: {
      room: { type: String, default: 'room1' },
      gridX: { type: Number, default: 4 },
      gridY: { type: Number, default: 5 }
    },
    totalItemsCollected: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model('User', userSchema);

