import 'dotenv/config';
import { connectDB, disconnectDB } from './connection.js';
import { Room } from '../models/Room.js';
import { Item } from '../models/Item.js';
import { User } from '../models/User.js';

const seedRooms = async () => {
  const rooms = [
    {
      roomId: 'room1',
      name: 'Rum 1',
      backgroundImage: 'bg1.jpeg',
      spawnPoints: [
        { gridX: 4, gridY: 5 },
        { gridX: 5, gridY: 6 },
        { gridX: 6, gridY: 7 }
      ]
    },
    {
      roomId: 'room2',
      name: 'Rum 2',
      backgroundImage: 'bg2.jpeg',
      spawnPoints: [
        { gridX: 3, gridY: 4 },
        { gridX: 5, gridY: 5 },
        { gridX: 7, gridY: 6 }
      ]
    },
    {
      roomId: 'room3',
      name: 'Rum 3',
      backgroundImage: 'bg3.jpg',
      spawnPoints: [
        { gridX: 4, gridY: 6 },
        { gridX: 6, gridY: 5 },
        { gridX: 5, gridY: 8 }
      ]
    }
  ];

  for (const roomData of rooms) {
    await Room.findOneAndUpdate(
      { roomId: roomData.roomId },
      roomData,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Rooms seeded');
};

const seedItems = async () => {
  // Clear existing items
  await Item.deleteMany({});

  const items = [
    // Room 1 items
    { type: 'flower', currentLocation: { room: 'room1', gridX: 2, gridY: 3, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room1', gridX: 5, gridY: 8, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room1', gridX: 7, gridY: 5, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room1', gridX: 3, gridY: 10, inInventoryOf: null } },
    
    // Room 2 items
    { type: 'flower', currentLocation: { room: 'room2', gridX: 3, gridY: 6, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room2', gridX: 6, gridY: 4, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room2', gridX: 8, gridY: 9, inInventoryOf: null } },
    
    // Room 3 items
    { type: 'flower', currentLocation: { room: 'room3', gridX: 4, gridY: 7, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room3', gridX: 6, gridY: 3, inInventoryOf: null } },
    { type: 'flower', currentLocation: { room: 'room3', gridX: 2, gridY: 9, inInventoryOf: null } }
  ];

  await Item.insertMany(items);
  console.log('✅ Items seeded');
};

const seedUsers = async () => {
  const users = [
    {
      username: 'Jeffmayn',
      password: 'password123', // Simple password for testing
      inventory: [],
      stats: {
        lastPosition: { room: 'room1', gridX: 4, gridY: 5 },
        totalItemsCollected: 0
      }
    },
    {
      username: 'Zoidberg',
      password: 'password123', // Simple password for testing
      inventory: [],
      stats: {
        lastPosition: { room: 'room1', gridX: 5, gridY: 6 },
        totalItemsCollected: 0
      }
    }
  ];

  for (const userData of users) {
    await User.findOneAndUpdate(
      { username: userData.username },
      userData,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Users seeded');
};

export const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database...');
    
    await seedRooms();
    await seedItems();
    await seedUsers();
    
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    disconnectDB();
    process.exit(0);
  });
}
