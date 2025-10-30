import { Item } from '../models/Item.js';
import { isDBConnected } from '../db/connection.js';

// In-memory cache for performance
let itemCache = new Map();

// Load items from DB to cache
export const loadItemsToCache = async () => {
  if (!isDBConnected()) return false;
  
  try {
    const items = await Item.find({ 'currentLocation.inInventoryOf': null });
    itemCache.clear();
    
    items.forEach(item => {
      itemCache.set(item._id.toString(), {
        id: item._id.toString(),
        type: item.type,
        gridX: item.currentLocation.gridX,
        gridY: item.currentLocation.gridY,
        room: item.currentLocation.room
      });
    });
    
    console.log(`📦 Loaded ${itemCache.size} items to cache`);
    return true;
  } catch (error) {
    console.error('Error loading items:', error);
    return false;
  }
};

// Get items in a room (from cache)
export const getItemsInRoom = (room) => {
  const items = [];
  for (const [id, item] of itemCache.entries()) {
    if (item.room === room) {
      items.push({ id, ...item });
    }
  }
  return items;
};

// Pickup item
export const pickupItem = async (itemId, userId) => {
  const item = itemCache.get(itemId);
  if (!item) return null;
  
  // Remove from cache
  itemCache.delete(itemId);
  
  // Update in DB
  if (isDBConnected()) {
    try {
      await Item.findByIdAndUpdate(itemId, {
        'currentLocation.inInventoryOf': userId
      });
    } catch (error) {
      console.error('Error updating item in DB:', error);
    }
  }
  
  return item;
};

// Drop item
export const dropItem = async (itemId, userId, gridX, gridY, room) => {
  // Add to cache
  const item = {
    id: itemId,
    type: 'flower', // For now
    gridX,
    gridY,
    room
  };
  itemCache.set(itemId, item);
  
  // Update in DB
  if (isDBConnected()) {
    try {
      await Item.findByIdAndUpdate(itemId, {
        'currentLocation.gridX': gridX,
        'currentLocation.gridY': gridY,
        'currentLocation.room': room,
        'currentLocation.inInventoryOf': null
      });
    } catch (error) {
      console.error('Error updating item in DB:', error);
    }
  }
  
  return item;
};

// Find item at position
export const findItemAtPosition = (gridX, gridY, room) => {
  for (const [id, item] of itemCache.entries()) {
    if (item.gridX === gridX && item.gridY === gridY && item.room === room) {
      return { id, ...item };
    }
  }
  return null;
};

// Get user's inventory from database
export const getUserInventory = async (userId) => {
  if (!isDBConnected()) return [];
  
  try {
    const items = await Item.find({ 'currentLocation.inInventoryOf': userId });
    return items.map(item => ({
      id: item._id.toString(),
      type: item.type
    }));
  } catch (error) {
    console.error('Error getting user inventory:', error);
    return [];
  }
};

export { itemCache };
