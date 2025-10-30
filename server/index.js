import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDB } from './db/connection.js';
import { loadItemsToCache, getItemsInRoom, pickupItem, dropItem, findItemAtPosition, getUserInventory } from './services/itemService.js';
import { loadRoomsToCache, getAllRoomIds, roomExists } from './services/roomService.js';
import { authenticateUser, getUserByUsername, updateUserInventory, updateUserPosition } from './services/userService.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Room grid configuration - grid filling entire canvas
const GRID_WIDTH = 10;
const GRID_HEIGHT = 32;

// Store connected users with grid positions
const users = new Map();

// All diamonds are walkable
const isWalkable = (gridX, gridY) => {
  return gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT;
};

// Check if a position is occupied by another user in the same room
const isPositionOccupied = (gridX, gridY, room, excludeUserId = null) => {
  for (const [userId, user] of users.entries()) {
    if (userId !== excludeUserId && user.currentRoom === room && user.gridX === gridX && user.gridY === gridY) {
      return true;
    }
  }
  return false;
};

// Find a random empty grid position
const findEmptyGridPosition = () => {
  const occupiedPositions = new Set(
    Array.from(users.values()).map(u => `${u.gridX},${u.gridY}`)
  );
  
  let attempts = 0;
  while (attempts < 100) {
    const x = Math.floor(Math.random() * GRID_WIDTH);
    const y = Math.floor(Math.random() * GRID_HEIGHT);
    const key = `${x},${y}`;
    
    if (!occupiedPositions.has(key) && isWalkable(x, y)) {
      return { gridX: x, gridY: y };
    }
    attempts++;
  }
  
  // Fallback to center
  return { 
    gridX: Math.floor(GRID_WIDTH / 2), 
    gridY: Math.floor(GRID_HEIGHT / 2)
  };
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle login
  socket.on('login', async ({ username, password }) => {
    console.log('Login attempt:', username);
    
    const user = await authenticateUser(username, password);
    
    if (!user) {
      socket.emit('loginError', 'Forkert brugernavn eller password');
      return;
    }
    
    // User authenticated successfully
    const defaultRoom = user.stats.lastPosition.room || 'room1';
    const position = {
      gridX: user.stats.lastPosition.gridX || 4,
      gridY: user.stats.lastPosition.gridY || 5
    };
    
    // Load user's inventory from Item collection
    const userInventory = await getUserInventory(user._id.toString());
    
    // Generate random avatar appearance
    const avatarTypes = ['male1', 'male2', 'female1', 'female2'];
    const hairColors = ['#000', '#8B4513', '#FFD700', '#FF6347', '#800080', '#FF1493'];
    const skinTones = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'];
    const clothingColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];
    
    users.set(socket.id, {
      id: socket.id,
      username: user.username,
      userId: user._id.toString(), // MongoDB user ID for item tracking
      gridX: position.gridX,
      gridY: position.gridY,
      currentRoom: defaultRoom,
      chatMessage: null,
      chatTimestamp: null,
      inventory: userInventory,
      avatar: {
        type: avatarTypes[Math.floor(Math.random() * avatarTypes.length)],
        hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
        skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
        clothingColor: clothingColors[Math.floor(Math.random() * clothingColors.length)]
      }
    });

    // Join the room first
    socket.join(defaultRoom);

    // Send login success and initial position to the new user
    socket.emit('loginSuccess', { username: user.username });
    socket.emit('initialPosition', { gridX: position.gridX, gridY: position.gridY, room: defaultRoom });

  // Send current users in the same room to the new user (excluding themselves)
  const usersInRoom = Array.from(users.values()).filter(u => u.currentRoom === defaultRoom && u.id !== socket.id);
  socket.emit('currentUsers', usersInRoom);

  // Send items in the current room to the new user
  const itemsInRoom = getItemsInRoom(defaultRoom);
  socket.emit('roomItems', itemsInRoom);

  // Broadcast new user to all other users in the same room
  socket.to(defaultRoom).emit('userJoined', users.get(socket.id));
  
  // Log to room that new user joined and their position
  io.to(defaultRoom).emit('systemMessage', {
    message: `${users.get(socket.id).username} kom ind i rummet på felt (${position.gridX}, ${position.gridY})`,
    userId: socket.id
  });

  // Handle user movement to grid position
  socket.on('moveToGrid', (position) => {
    const user = users.get(socket.id);
    if (user && position.gridX >= 0 && position.gridX < GRID_WIDTH && 
        position.gridY >= 0 && position.gridY < GRID_HEIGHT &&
        isWalkable(position.gridX, position.gridY) &&
        !isPositionOccupied(position.gridX, position.gridY, user.currentRoom, socket.id)) {
      user.gridX = position.gridX;
      user.gridY = position.gridY;
      io.to(user.currentRoom).emit('userMovedToGrid', { 
        id: socket.id, 
        gridX: position.gridX, 
        gridY: position.gridY 
      });
      
      // Log movement to chat
      io.to(user.currentRoom).emit('systemMessage', {
        message: `${user.username} flyttede til felt (${position.gridX}, ${position.gridY})`,
        userId: socket.id
      });
    }
  });

  // Handle chat messages
  socket.on('chat', (message) => {
    const user = users.get(socket.id);
    if (user && message && message.trim()) {
      // Limit message to 50 characters
      user.chatMessage = message.trim().substring(0, 50);
      user.chatTimestamp = Date.now();
      
      // Calculate timeout based on word count
      const wordCount = user.chatMessage.split(/\s+/).length;
      let timeout;
      if (wordCount < 4) {
        timeout = 3000; // 3 seconds for short messages
      } else if (wordCount < 7) {
        timeout = 5000; // 5 seconds for medium messages
      } else {
        timeout = 8000; // 8 seconds for longer messages
      }
      
      io.to(user.currentRoom).emit('userChat', {
        id: socket.id,
        username: user.username,
        message: user.chatMessage
      });
      
      // Clear message after calculated timeout
      setTimeout(() => {
        const currentUser = users.get(socket.id);
        if (currentUser && currentUser.chatTimestamp === user.chatTimestamp) {
          currentUser.chatMessage = null;
          currentUser.chatTimestamp = null;
          io.to(currentUser.currentRoom).emit('userChatCleared', socket.id);
        }
      }, timeout);
    }
  });

  // Handle item pickup
  socket.on('pickupItem', async () => {
    const user = users.get(socket.id);
    if (!user) return;

    // Find item at user's current position
    const foundItem = findItemAtPosition(user.gridX, user.gridY, user.currentRoom);

    if (foundItem) {
      // Add to user's in-memory inventory (client format)
      user.inventory.push({ 
        id: foundItem.id, 
        type: foundItem.type
      });
      
      // Update database (use MongoDB user ID)
      await pickupItem(foundItem.id, user.userId);
      
      // Notify all users in the room that item was picked up
      io.to(user.currentRoom).emit('itemPickedUp', { itemId: foundItem.id, userId: socket.id });
      
      // Send updated inventory to user
      socket.emit('inventoryUpdate', user.inventory);
      
      // Log to chat
      io.to(user.currentRoom).emit('systemMessage', {
        message: `${user.username} samlede ${foundItem.type} op`
      });
    }
  });

  // Handle item drop
  socket.on('dropItem', async (itemId) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Find item in user's inventory (client format uses 'id')
    const itemIndex = user.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    // Check if there's already an item at this position
    const existingItem = findItemAtPosition(user.gridX, user.gridY, user.currentRoom);

    if (existingItem) {
      socket.emit('systemMessage', { message: 'Der er allerede en ting på dette felt' });
      return;
    }

    // Remove from in-memory inventory
    const [droppedItem] = user.inventory.splice(itemIndex, 1);
    
    // Update database and world (use MongoDB user ID)
    const newItem = await dropItem(droppedItem.id, user.userId, user.gridX, user.gridY, user.currentRoom);

    // Notify all users in the room
    io.to(user.currentRoom).emit('itemDropped', { id: droppedItem.id, ...newItem });
    
    // Send updated inventory to user
    socket.emit('inventoryUpdate', user.inventory);
    
    // Log to chat
    io.to(user.currentRoom).emit('systemMessage', {
      message: `${user.username} smed ${droppedItem.type}`
    });
  });

  // Handle room change
  socket.on('changeRoom', (newRoom) => {
    const user = users.get(socket.id);
    if (user && roomExists(newRoom)) {
      const oldRoom = user.currentRoom;
      
      // Log to old room that user left
      io.to(oldRoom).emit('systemMessage', {
        message: `${user.username} forlod rummet`,
        userId: socket.id
      });
      
      // Leave old room
      socket.leave(oldRoom);
      io.to(oldRoom).emit('userLeft', socket.id);
      
      // Update user's room
      user.currentRoom = newRoom;
      user.gridX = Math.floor(GRID_WIDTH / 2);
      user.gridY = Math.floor(GRID_HEIGHT / 2);
      
      // Join new room
      socket.join(newRoom);
      
      // Confirm room change to client first
      socket.emit('roomChanged', { room: newRoom, gridX: user.gridX, gridY: user.gridY });
      
      // Send users in new room (after roomChanged so client can clear old users)
      const usersInRoom = Array.from(users.values()).filter(u => u.currentRoom === newRoom && u.id !== socket.id);
      socket.emit('currentUsers', usersInRoom);

      // Send items in new room
      const itemsInRoom = getItemsInRoom(newRoom);
      socket.emit('roomItems', itemsInRoom);
      
      // Notify others in new room
      socket.to(newRoom).emit('userJoined', user);
      
      // Log to new room that user joined
      io.to(newRoom).emit('systemMessage', {
        message: `${user.username} kom ind i rummet`,
        userId: socket.id
      });
    }
  });

  }); // End of login handler

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const user = users.get(socket.id);
    if (user) {
      // Log to room that user disconnected
      io.to(user.currentRoom).emit('systemMessage', {
        message: `${user.username} forlod rummet`,
        userId: socket.id
      });
      io.to(user.currentRoom).emit('userLeft', socket.id);
    }
    users.delete(socket.id);
  });
});

// Initialize database and start server
const initializeServer = async () => {
  console.log('🚀 Starting server...');
  
  // Connect to database
  await connectDB();
  
  // Load data to cache
  await loadRoomsToCache();
  await loadItemsToCache();
  
  // Start server
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📐 Grid size: ${GRID_WIDTH}x${GRID_HEIGHT}`);
  });
};

initializeServer();

