<template>
  <!-- Show login screen if not logged in -->
  <Login 
    v-if="!isLoggedIn"
    :socket="socketValue"
    @loginSuccess="handleLoginSuccess"
  />
  
  <!-- Show main app after login -->
  <div v-else class="app-container">
    <div class="header">
      <h1>Leisure - Chat Univers</h1>
      <div class="header-info">
        <span class="username">👤 {{ username }}</span>
        <span class="online-count">Online: {{ onlineCount }}</span>
        <div class="connection-status" :class="{ connected: isConnected }">
          {{ isConnected ? '● Forbundet' : '○ Afbrudt' }}
        </div>
        <button class="logout-btn" @click="handleLogout" title="Log ud">⎋</button>
      </div>
    </div>
    
    <div class="main-content">
      <!-- Left side: Canvas + buttons -->
      <div class="left-panel">
        <Canvas 
          ref="canvasRef"
          :socket="socketValue" 
          :isConnected="isConnected"
          :username="username"
          @update-online="onlineCount = $event"
          @update-room="currentRoom = $event"
          @user-selected="selectedUser = $event"
          @inventory-updated="handleInventoryUpdate"
        />
        <div class="action-buttons">
          <button class="action-btn" :class="{ active: infoView === 'rooms' }" @click="selectedUser = null; infoView = 'rooms'" title="Skift rum">🚪</button>
          <button class="action-btn" :class="{ active: infoView === 'inventory' }" @click="selectedUser = null; infoView = 'inventory'" title="Ting">🎒</button>
          <button class="action-btn" :class="{ active: infoView === 'settings' }" @click="selectedUser = null; infoView = 'settings'" title="Indstillinger">⚙️</button>
          <button class="action-btn" :class="{ active: infoView === 'help' }" @click="selectedUser = null; infoView = 'help'" title="Hjælp">❓</button>
        </div>
      </div>
      
      <!-- Right side: Chat and info -->
      <div class="right-panel">
        <ChatPanel 
          :socket="socketValue" 
          :isConnected="isConnected" 
          :currentRoom="currentRoom"
          :selectedUser="selectedUser"
          :infoView="infoView"
          :inventory="inventory"
          @clear-selected="selectedUser = null; infoView = 'default'"
          @change-room="(room) => { if (socket) socket.emit('changeRoom', room) }"
          @toggle-grid="handleToggleGrid"
          @drop-item="(itemId) => { if (socket) socket.emit('dropItem', itemId) }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import Login from './components/Login.vue'
import Canvas from './components/Canvas.vue'
import ChatPanel from './components/ChatPanel.vue'

const socket = ref<Socket | null>(null)
const socketValue = computed(() => socket.value as Socket | null)
const isConnected = ref(false)
const isLoggedIn = ref(false)
const username = ref('')
const onlineCount = ref(1)
const currentRoom = ref('room1')
const selectedUser = ref<{ id: string, gridX: number, gridY: number } | null>(null)
const infoView = ref<'default' | 'rooms' | 'settings' | 'profile' | 'help' | 'inventory'>('default')
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null)
const inventory = ref<Array<{ id: string, type: string }>>([])

// Handle login success
const handleLoginSuccess = (loggedInUsername: string) => {
  username.value = loggedInUsername
  isLoggedIn.value = true
  // Save username to localStorage for persistence
  localStorage.setItem('leisure_username', loggedInUsername)
}

// Handle logout
const handleLogout = () => {
  // Clear saved credentials
  localStorage.removeItem('leisure_username')
  localStorage.removeItem('leisure_password')
  // Reset state
  isLoggedIn.value = false
  username.value = ''
  // Disconnect and reconnect socket
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
  // Reconnect for new login
  setTimeout(() => {
    const newSocket = io('http://localhost:3000')
    socket.value = newSocket
    
    newSocket.on('connect', () => {
      console.log('Reconnected to server')
      isConnected.value = true
    })
    
    newSocket.on('disconnect', () => {
      isConnected.value = false
    })
    
    newSocket.on('loginSuccess', (data: { username: string }) => {
      handleLoginSuccess(data.username)
    })
    
    newSocket.on('loginError', () => {
      localStorage.removeItem('leisure_username')
      localStorage.removeItem('leisure_password')
      isLoggedIn.value = false
    })
  }, 100)
}

// Handle inventory updates
const handleInventoryUpdate = (newInventory: Array<{ id: string, type: string }>) => {
  const previousCount = inventory.value.length
  inventory.value = newInventory
  
  // Auto-open inventory when picking up an item (not when dropping)
  if (newInventory.length > previousCount) {
    infoView.value = 'inventory'
  }
}

// Handle toggle grid event from ChatPanel
const handleToggleGrid = () => {
  if (canvasRef.value) {
    canvasRef.value.toggleGrid()
  }
}

onMounted(() => {
  // Connect to Socket.io server
  socket.value = io('http://localhost:3000')

  socket.value.on('connect', () => {
    console.log('Connected to server')
    isConnected.value = true
    
    // Check for saved login and auto-login
    const savedUsername = localStorage.getItem('leisure_username')
    const savedPassword = localStorage.getItem('leisure_password')
    
    if (savedUsername && savedPassword && !isLoggedIn.value) {
      console.log('Auto-login with saved credentials')
      socket.value?.emit('login', { username: savedUsername, password: savedPassword })
    }
  })

  socket.value.on('disconnect', () => {
    console.log('Disconnected from server')
    isConnected.value = false
  })
  
  // Listen for login responses globally
  socket.value.on('loginSuccess', (data: { username: string }) => {
    handleLoginSuccess(data.username)
  })
  
  socket.value.on('loginError', () => {
    // Clear saved credentials if login fails
    localStorage.removeItem('leisure_username')
    localStorage.removeItem('leisure_password')
    isLoggedIn.value = false
  })
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #2c3e50;
}

.header {
  background: #34495e;
  padding: 0.8rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid #2c3e50;
}

.header h1 {
  font-size: 1.5rem;
  color: #ecf0f1;
  margin: 0;
  font-weight: 600;
}

.header-info {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.username {
  color: #2ecc71;
  font-size: 0.95rem;
  font-weight: 600;
}

.online-count {
  color: #ecf0f1;
  font-size: 0.95rem;
  font-weight: 500;
}

.connection-status {
  font-size: 0.9rem;
  color: #e74c3c;
  font-weight: 500;
}

.connection-status.connected {
  color: #2ecc71;
}

.logout-btn {
  padding: 0.4rem 0.8rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #c0392b;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  background: #2c3e50;
  padding: 1rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  padding: 0.8rem;
  background: #34495e;
  border-radius: 8px;
  margin-top: 0.8rem;
  justify-content: center;
}

.action-btn {
  width: 50px;
  height: 50px;
  border: none;
  background: #3498db;
  border-radius: 8px;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.action-btn:hover {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn.active {
  background: #2ecc71;
  border: 2px solid #27ae60;
}

.right-panel {
  flex: 1;
  background: #34495e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

