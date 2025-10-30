import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  backgroundImage: {
    type: String,
    required: true
  },
  gridConfig: {
    width: { type: Number, default: 10 },
    height: { type: Number, default: 32 }
  },
  spawnPoints: [{
    gridX: Number,
    gridY: Number
  }],
  maxCapacity: {
    type: Number,
    default: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Room = mongoose.model('Room', roomSchema);
