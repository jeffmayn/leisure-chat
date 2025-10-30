import { User } from '../models/User.js';
import { isDBConnected } from '../db/connection.js';

// Simple authentication (no encryption for now, just for testing)
export const authenticateUser = async (username, password) => {
  if (!isDBConnected()) {
    return null;
  }
  
  try {
    const user = await User.findOne({ username, password });
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
};

// Get user by username
export const getUserByUsername = async (username) => {
  if (!isDBConnected()) {
    return null;
  }
  
  try {
    return await User.findOne({ username });
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Update user inventory
export const updateUserInventory = async (username, inventory) => {
  if (!isDBConnected()) {
    return false;
  }
  
  try {
    await User.findOneAndUpdate(
      { username },
      { inventory },
      { new: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating inventory:', error);
    return false;
  }
};

// Update user position
export const updateUserPosition = async (username, room, gridX, gridY) => {
  if (!isDBConnected()) {
    return false;
  }
  
  try {
    await User.findOneAndUpdate(
      { username },
      { 'stats.lastPosition': { room, gridX, gridY } },
      { new: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating position:', error);
    return false;
  }
};

