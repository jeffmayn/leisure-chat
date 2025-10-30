import { Room } from '../models/Room.js';
import { isDBConnected } from '../db/connection.js';

// In-memory cache for rooms
let roomCache = new Map();

// Load rooms from DB to cache
export const loadRoomsToCache = async () => {
  if (!isDBConnected()) {
    // Fallback to default rooms if DB not connected
    const defaultRooms = [
      { roomId: 'room1', name: 'Rum 1', backgroundImage: 'bg1.jpeg' },
      { roomId: 'room2', name: 'Rum 2', backgroundImage: 'bg2.jpeg' },
      { roomId: 'room3', name: 'Rum 3', backgroundImage: 'bg3.jpg' }
    ];
    
    defaultRooms.forEach(room => {
      roomCache.set(room.roomId, room);
    });
    
    console.log('📦 Using default rooms (no DB connection)');
    return false;
  }
  
  try {
    const rooms = await Room.find({ isActive: true });
    roomCache.clear();
    
    rooms.forEach(room => {
      roomCache.set(room.roomId, {
        roomId: room.roomId,
        name: room.name,
        backgroundImage: room.backgroundImage,
        gridConfig: room.gridConfig,
        spawnPoints: room.spawnPoints,
        maxCapacity: room.maxCapacity
      });
    });
    
    console.log(`🏠 Loaded ${roomCache.size} rooms to cache`);
    return true;
  } catch (error) {
    console.error('Error loading rooms:', error);
    return false;
  }
};

// Get all room IDs
export const getAllRoomIds = () => {
  return Array.from(roomCache.keys());
};

// Get room by ID
export const getRoomById = (roomId) => {
  return roomCache.get(roomId);
};

// Check if room exists
export const roomExists = (roomId) => {
  return roomCache.has(roomId);
};

export { roomCache };
