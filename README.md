# Leisure - 2.5D Chat Univers

Et 2.5D chat univers inspireret af højhuset på n.dk, hvor brugere kan bevæge 2D avatarer rundt og chatte i realtid.

![Preview](https://raw.githubusercontent.com/jeffmayn/leisure-chat/main/app/src/img/preview.gif)


## Projekt Struktur

- **app/** - Vue 3 + TypeScript frontend med Socket.io client
- **server/** - Node.js backend med Socket.io server

## Kom i gang

### Backend (Server)

```bash
cd server
npm install
npm run dev
```

Server kører på http://localhost:3000

### Frontend (App)

```bash
cd app
npm install
npm run dev
```

Frontend kører på http://localhost:5173

## Funktioner

✅ Real-time multiplayer forbindelse via Socket.io

✅ **2D isometrisk grid med diamant-formede felter**

✅ Simple 2D avatarer med forskellige farver

✅ Klik på felter for at bevæge avatarer

✅ **Chat funktionalitet med bobler over avatarer**

  - Live typing bubbles (vises mens man skriver)
  - Dynamisk chat bubble varighed baseret på beskedlængde
  - Max 50 tegn per besked


✅ **Chat sidebar** med beskedhistorik (seneste 25 beskeder)

  - Filtrering: alle, chat, system beskeder
  - Timestamps på alle beskeder
  - Room-specifik chat historik (persistent via localStorage)


✅ Live antal spillere online

✅ Z-ordering (avatarer og items renderes korrekt)

✅ Toggle grid visning (grid altid aktiv, kun visuelt skjult)

✅ **Kollision detektion** - brugere kan ikke stå på samme felt

✅ **Rum system** med 3 forskellige rum

  - Hver rum har unik baggrund
  - Isoleret chat og bruger-state per rum
  - System beskeder ved rum skift


✅ **Brugernavn system**

  - Brugernavne vises under avatarer
  - Brugernavne i chat beskeder


✅ **MongoDB database integration**

  - Persistent bruger login (username/password)
  - Auto-login ved refresh
  - Items gemmes i database


✅ **Item system**

  - Items (blomster) kan placeres i rummet
  - Pick up/drop funktionalitet (spacebar)
  - Inventory system
  - Items persistent i database


✅ **Info panel system**

  - Vis bruger info ved klik på avatar
  - Rum oversigt
  - Inventory visning
  - Indstillinger (toggle grid)
  - Hjælp sektion

## Næste skridt

- [ ] Avatar customization (vælg farver, tøj, hår, etc.)
- [ ] Forbedret avatar animation (gå-animation, idle animation)
- [ ] Flere item typer (møbler, dekorationer, osv.)
- [ ] Trading system (bytte items mellem brugere)
- [ ] Lydeffekter og baggrundsmusik
- [ ] Emotes og animationer
- [ ] Private beskeder mellem brugere
- [ ] Avatar profil sider med statistikker
- [ ] Achievement system

## Teknologier

**Frontend:**
- Vue 3
- TypeScript
- Socket.io Client
- Vite
- HTML Canvas
- LocalStorage (chat persistence)

**Backend:**
- Node.js
- Express
- Socket.io
- MongoDB + Mongoose
- dotenv
- CORS

# leisure-chat
