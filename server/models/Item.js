import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['flower'] // Can expand later
  },
  properties: {
    name: { type: String, default: 'Blomst' },
    image: { type: String, default: 'blomst.png' }
  },
  currentLocation: {
    room: { type: String, required: true },
    gridX: { type: Number, required: true },
    gridY: { type: Number, required: true },
    inInventoryOf: { type: String, default: null } // userId or null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast queries
itemSchema.index({ 'currentLocation.room': 1, 'currentLocation.inInventoryOf': 1 });

export const Item = mongoose.model('Item', itemSchema);

