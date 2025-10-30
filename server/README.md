# Leisure Server - MongoDB Integration

## Setup

### 1. MongoDB Atlas (Online Database) - ANBEFALET

1. Gå til [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Opret gratis konto
3. Klik "Build a Database" → Vælg **FREE** (M0)
4. Vælg region (tættest på dig, f.eks. Frankfurt)
5. Klik "Create"
6. Opret database bruger:
   - Username: `leisure`
   - Password: (gem dette)
7. Network Access → "Add IP Address" → "Allow Access from Anywhere"
8. Database → "Connect" → "Connect your application"
9. Kopier connection string (ser ud som: `mongodb+srv://leisure:PASSWORD@cluster0.xxxxx.mongodb.net/`)

### 2. Tilføj Connection String

Opret en `.env` fil i `server/` mappen (kør fra root mappen):

```bash
cat > server/.env << 'EOF'
MONGODB_URI=mongodb+srv://leisure:DIT_PASSWORD@cluster0.xxxxx.mongodb.net/leisure?retryWrites=true&w=majority
PORT=3000
EOF
```

**Husk at udskifte:**
- `DIT_PASSWORD` med dit MongoDB password
- `cluster0.xxxxx` med din cluster URL fra Atlas

### 3. Seed Database

```bash
npm run seed
```

This will create:
- 3 rooms (Rum 1, 2, 3) with background images
- ~10 flower items spread across rooms

### 3. Start Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

## Database Structure

### Collections

#### `rooms`
```javascript
{
  roomId: "room1",
  name: "Rum 1",
  backgroundImage: "bg1.jpeg",
  gridConfig: { width: 10, height: 32 },
  spawnPoints: [{ gridX: 4, gridY: 5 }, ...],
  maxCapacity: 50,
  isActive: true
}
```

#### `items`
```javascript
{
  type: "flower",
  properties: { name: "Blomst", image: "blomst.png" },
  currentLocation: {
    room: "room1",
    gridX: 2,
    gridY: 3,
    inInventoryOf: null  // or userId
  }
}
```

## How It Works

### Hybrid Architecture

The server uses a **hybrid approach** combining MongoDB persistence with in-memory caching:

1. **On Server Start:**
   - Connects to MongoDB
   - Loads rooms and items into memory cache
   - Falls back gracefully if DB unavailable

2. **Runtime:**
   - All queries use in-memory cache (fast!)
   - All changes write to both cache AND database (persistent!)

3. **Benefits:**
   - Fast real-time performance (cache)
   - Data persistence (database)
   - Graceful degradation (works without DB)

### Services

- **`itemService.js`**: Manages items (pickup, drop, queries)
- **`roomService.js`**: Manages rooms (loading, validation)

## Environment Variables

`.env` fil eksempel (MongoDB Atlas):

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/leisure?retryWrites=true&w=majority
PORT=3000
```

Eller lokal MongoDB:

```env
MONGODB_URI=mongodb://localhost:27017/leisure
PORT=3000
```

## Fallback Mode

If MongoDB is not available, the server will:
- Use default rooms (room1, room2, room3)
- Use in-memory items only (resets on restart)
- Log a warning but continue to function

## Next Steps

Future enhancements:
- User authentication (JWT)
- Persistent user accounts
- Chat history storage
- Item crafting system
- Admin panel for room creation