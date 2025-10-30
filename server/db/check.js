import 'dotenv/config';
import { connectDB, disconnectDB } from './connection.js';
import { Item } from '../models/Item.js';
import { User } from '../models/User.js';

const checkDatabase = async () => {
  try {
    await connectDB();
    
    console.log('\n=== 🌸 ITEMS I DATABASEN ===\n');
    
    // Find items på jorden (ikke i inventory)
    const itemsOnGround = await Item.find({ 'currentLocation.inInventoryOf': null });
    console.log(`📍 Items på jorden: ${itemsOnGround.length}`);
    itemsOnGround.forEach(item => {
      console.log(`  - ${item.type} i ${item.currentLocation.room} på (${item.currentLocation.gridX}, ${item.currentLocation.gridY})`);
    });
    
    // Find items i inventory
    const itemsInInventory = await Item.find({ 'currentLocation.inInventoryOf': { $ne: null } });
    console.log(`\n🎒 Items i inventory: ${itemsInInventory.length}`);
    itemsInInventory.forEach(item => {
      console.log(`  - ${item.type} ejet af bruger ${item.currentLocation.inInventoryOf}`);
    });
    
    console.log('\n=== 👥 BRUGERE ===\n');
    const users = await User.find({});
    users.forEach(user => {
      console.log(`👤 ${user.username} (ID: ${user._id})`);
      console.log(`   Position: ${user.stats.lastPosition.room} (${user.stats.lastPosition.gridX}, ${user.stats.lastPosition.gridY})`);
      console.log(`   Oprettet: ${user.createdAt}`);
    });
    
    console.log('\n=== 📊 TOTAL OVERSIGT ===\n');
    console.log(`Total items: ${itemsOnGround.length + itemsInInventory.length}`);
    console.log(`Total brugere: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Fejl:', error);
  } finally {
    await disconnectDB();
  }
};

checkDatabase();

