<template>
  <div class="chat-panel">
    <!-- Header showing current room -->
    <div class="room-header">
      <h3>{{ getRoomName() }}</h3>
    </div>
    
    <!-- Two column layout -->
    <div class="panel-content">
      <!-- Left column: Info box -->
      <div class="info-column">
        <div class="info-box">
          <div class="info-header">
            <h4>📋 Information</h4>
          </div>
          <div class="info-content">
            <!-- User Info View -->
            <template v-if="props.selectedUser">
              <h5>Bruger Info</h5>
              <p><strong>ID:</strong> {{ props.selectedUser.id.substring(0, 8) }}</p>
              <p><strong>Position:</strong> ({{ props.selectedUser.gridX }}, {{ props.selectedUser.gridY }})</p>
              <button @click="emit('clear-selected')" class="close-info-btn">Luk</button>
            </template>

            <!-- Rooms View -->
            <template v-else-if="props.infoView === 'rooms'">
              <h5>Skift Rum</h5>
              <p>Vælg et rum at gå til:</p>
              <div class="room-list">
                <button 
                  v-for="room in rooms" 
                  :key="room.id"
                  @click="emit('change-room', room.id)"
                  :class="['room-select-btn', { active: props.currentRoom === room.id }]"
                  :disabled="props.currentRoom === room.id"
                >
                  {{ room.name }}
                  <span v-if="props.currentRoom === room.id"> (Nuværende)</span>
                </button>
              </div>
            </template>

            <!-- Settings View -->
            <template v-else-if="props.infoView === 'settings'">
              <h5>Indstillinger</h5>
              <div class="settings-list">
                <div class="setting-item">
                  <label>
                    <input type="checkbox" v-model="showGrid" @change="$emit('toggle-grid')">
                    Vis gitter-felter
                  </label>
                </div>
              </div>
            </template>

            <!-- Inventory View -->
            <template v-else-if="props.infoView === 'inventory'">
              <h5>Mine Ting</h5>
              <p v-if="props.inventory.length === 0">Du har ingen ting endnu.</p>
              <div v-else class="inventory-list">
                <div 
                  v-for="item in props.inventory" 
                  :key="item.id"
                  class="inventory-item"
                >
                  <span class="item-icon">{{ getItemEmoji(item.type) }}</span>
                  <span class="item-name">{{ getItemName(item.type) }}</span>
                  <button 
                    @click="emit('drop-item', item.id)" 
                    class="drop-btn"
                    title="Smid tingen"
                  >
                    Smid
                  </button>
                </div>
              </div>
              <p class="inventory-tip">💡 Tryk mellemrum for at samle ting op</p>
            </template>

            <!-- Profile View -->
            <template v-else-if="props.infoView === 'profile'">
              <h5>Min Profil</h5>
              <p>Din profil information kommer her...</p>
            </template>

            <!-- Help View -->
            <template v-else-if="props.infoView === 'help'">
              <h5>Hjælp</h5>
              <p><strong>Sådan bruger du Leisure Chatten:</strong></p>
              <ul>
                <li>Klik på et felt for at bevæge din avatar</li>
                <li>Tryk <strong>mellemrum</strong> for at samle ting op</li>
                <li>Smid ting fra din taske via 🎒 Ting knappen</li>
                <li>Klik på en bruger for at se deres info</li>
                <li>Brug 🚪 knappen for at skifte rum</li>
                <li>Skriv beskeder direkte på tastaturet</li>
                <li>Tryk <strong>Enter</strong> for at sende din besked</li>
              </ul>
            </template>

            <!-- Default View -->
            <template v-else>
              <p>Klik på en bruger for at se information</p>
              <hr>
              <p><strong>Tip:</strong> Brug knapperne nedenfor til at navigere</p>
            </template>
          </div>
        </div>
      </div>
      
      <!-- Right column: Chat -->
      <div class="chat-column">
        <div class="chat-box">
          <div class="chat-header">
            <h3>💬 Chat</h3>
            <div class="chat-filters">
              <button 
                @click="chatFilter = 'all'" 
                :class="['filter-btn', { active: chatFilter === 'all' }]"
              >
                Alle beskeder
              </button>
              <button 
                @click="chatFilter = 'chat'" 
                :class="['filter-btn', { active: chatFilter === 'chat' }]"
              >
                Chat
              </button>
              <button 
                @click="chatFilter = 'system'" 
                :class="['filter-btn', { active: chatFilter === 'system' }]"
              >
                System
              </button>
            </div>
          </div>
          <div class="chat-messages" ref="messagesRef">
            <div 
              v-for="(msg, index) in filteredMessages" 
              :key="index"
              :class="['chat-message', { 'system-message': msg.isSystem }]"
            >
              <template v-if="msg.isSystem">
                <span class="chat-text">🔔 {{ msg.message }}</span>
                <span class="chat-timestamp">{{ formatTime(msg.timestamp) }}</span>
              </template>
              <template v-else>
                <div class="message-content">
                  <span class="chat-user">{{ msg.username || 'Bruger ' + msg.id.substring(0, 4) }}:</span>
                  <span class="chat-text">{{ msg.message }}</span>
                </div>
                <span class="chat-timestamp">{{ formatTime(msg.timestamp) }}</span>
              </template>
            </div>
          </div>
          <div class="chat-info">
            <p>💬 Tryk på tastaturet for at skrive (max 50 tegn) - Enter for at sende</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { Socket } from 'socket.io-client'

interface Props {
  socket: Socket | null
  isConnected: boolean
  currentRoom: string
  selectedUser: { id: string, gridX: number, gridY: number } | null
  infoView: 'default' | 'rooms' | 'settings' | 'profile' | 'help' | 'inventory'
  inventory: Array<{ id: string, type: string }>
}

const props = defineProps<Props>()
const emit = defineEmits(['clear-selected', 'change-room', 'toggle-grid', 'drop-item'])

const chatHistory = ref<Array<{ id: string, message: string, timestamp: number, isSystem?: boolean, username?: string }>>([])
const messagesRef = ref<HTMLElement | null>(null)
const showGrid = ref(false)
const chatFilter = ref<'all' | 'chat' | 'system'>('chat') // Default to chat messages

// Room names for UI
const rooms = [
  { id: 'room1', name: 'Rum 1' },
  { id: 'room2', name: 'Rum 2' },
  { id: 'room3', name: 'Rum 3' }
]

// Filter and limit messages to last 25
const filteredMessages = computed(() => {
  let messages = chatHistory.value
  
  // Apply filter
  if (chatFilter.value === 'chat') {
    messages = messages.filter(msg => !msg.isSystem)
  } else if (chatFilter.value === 'system') {
    messages = messages.filter(msg => msg.isSystem)
  }
  
  // Return only last 25 messages
  return messages.slice(-25)
})

// Load chat history for current room from localStorage
const loadChatHistory = (room: string) => {
  const saved = localStorage.getItem(`chatHistory_${room}`)
  if (saved) {
    try {
      chatHistory.value = JSON.parse(saved)
      // Auto scroll to bottom after loading
      nextTick(() => {
        if (messagesRef.value) {
          messagesRef.value.scrollTop = messagesRef.value.scrollHeight
        }
      })
    } catch (e) {
      console.error('Failed to load chat history', e)
    }
  } else {
    chatHistory.value = []
  }
}

// Load chat history on mount
onMounted(() => {
  loadChatHistory(props.currentRoom)
})

// Watch for room changes and load appropriate chat
watch(() => props.currentRoom, (newRoom) => {
  loadChatHistory(newRoom)
})

// Save chat history to localStorage for current room
const saveChatHistory = () => {
  try {
    localStorage.setItem(`chatHistory_${props.currentRoom}`, JSON.stringify(chatHistory.value))
  } catch (e) {
    console.error('Failed to save chat history', e)
  }
}

// Get room name for display
const getRoomName = () => {
  const roomNames: Record<string, string> = {
    room1: 'Rum 1',
    room2: 'Rum 2',
    room3: 'Rum 3'
  }
  return roomNames[props.currentRoom] || 'Rummet'
}

// Format timestamp to HH:MM:SS
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// Get item emoji
const getItemEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    flower: '🌸'
  }
  return emojis[type] || '📦'
}

// Get item name
const getItemName = (type: string) => {
  const names: Record<string, string> = {
    flower: 'Blomst'
  }
  return names[type] || type
}

watch(() => props.socket, (socket) => {
  if (!socket) return
  
  socket.on('userChat', (data: { id: string, username: string, message: string }) => {
    chatHistory.value.push({
      id: data.id,
      username: data.username,
      message: data.message,
      timestamp: Date.now(),
      isSystem: false
    })
    
    if (chatHistory.value.length > 50) {
      chatHistory.value = chatHistory.value.slice(-50)
    }
    
    // Save to localStorage
    saveChatHistory()
    
    nextTick(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    })
  })
  
  socket.on('systemMessage', (data: { message: string, userId: string }) => {
    chatHistory.value.push({
      id: data.userId,
      message: data.message,
      timestamp: Date.now(),
      isSystem: true
    })
    
    if (chatHistory.value.length > 50) {
      chatHistory.value = chatHistory.value.slice(-50)
    }
    
    // Save to localStorage
    saveChatHistory()
    
    nextTick(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    })
  })
}, { immediate: true })
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.room-header {
  background: #2c3e50;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid #3498db;
}

.room-header h3 {
  color: #3498db;
  margin: 0;
  font-size: 1.2rem;
}

.panel-content {
  flex: 1;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
}

.info-column {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
}

.info-box {
  flex: 1;
  background: #2c3e50;
  border-radius: 8px;
  border: 2px solid #3498db;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.info-header {
  background: #3498db;
  color: white;
  padding: 0.8rem;
  text-align: center;
}

.info-header h4 {
  margin: 0;
  font-size: 1rem;
}

.info-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  color: #ecf0f1;
}

.info-content h5 {
  color: #3498db;
  margin: 0 0 0.8rem 0;
  font-size: 1rem;
}

.info-content p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.info-content hr {
  border: none;
  border-top: 1px solid #34495e;
  margin: 1rem 0;
}

.close-info-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
  width: 100%;
}

.close-info-btn:hover {
  background: #c0392b;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.room-select-btn {
  padding: 0.8rem 1rem;
  background: #3498db;
  color: white;
  border: 2px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  text-align: left;
}

.room-select-btn:hover:not(:disabled) {
  background: #2980b9;
  transform: translateX(5px);
}

.room-select-btn.active {
  background: #2ecc71;
  border-color: #27ae60;
  cursor: default;
}

.room-select-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.settings-list {
  margin-top: 1rem;
}

.setting-item {
  padding: 0.8rem;
  background: #34495e;
  border-radius: 5px;
  margin-bottom: 0.8rem;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.setting-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.info-content ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.info-content li {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1rem;
}

.inventory-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  background: #34495e;
  border-radius: 5px;
  border: 2px solid #3498db;
}

.item-icon {
  font-size: 1.5rem;
}

.item-name {
  flex: 1;
  color: #ecf0f1;
  font-weight: 500;
}

.drop-btn {
  padding: 0.4rem 0.8rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.drop-btn:hover {
  background: #c0392b;
}

.inventory-tip {
  margin-top: 1rem;
  padding: 0.8rem;
  background: rgba(52, 152, 219, 0.2);
  border-radius: 5px;
  border-left: 3px solid #3498db;
  font-size: 0.85rem;
  color: #ecf0f1;
}

.chat-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #2c3e50;
  border-radius: 8px;
  border: 2px solid #2ecc71;
  overflow: hidden;
}

.chat-header {
  background: #2ecc71;
  color: white;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.chat-header h3 {
  margin: 0;
  font-size: 1.1rem;
  text-align: center;
}

.chat-filters {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.3rem;
  border-radius: 5px;
}

.filter-btn {
  flex: 1;
  padding: 0.5rem 0.8rem;
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.filter-btn.active {
  background: white;
  color: #2ecc71;
  border-color: white;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-message {
  background: rgba(52, 152, 219, 0.2);
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid #3498db;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.chat-message.system-message {
  background: rgba(241, 196, 15, 0.15);
  border-left: 3px solid #f39c12;
  font-style: italic;
}

.message-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chat-user {
  font-weight: 600;
  color: #3498db;
  font-size: 0.85rem;
}

.chat-text {
  color: #ecf0f1;
  font-size: 0.9rem;
  word-wrap: break-word;
  flex: 1;
}

.chat-timestamp {
  color: #95a5a6;
  font-size: 0.75rem;
  align-self: flex-end;
  font-style: italic;
}

.system-message .chat-text {
  color: #f1c40f;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #3498db;
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #2980b9;
}

.chat-info {
  padding: 1rem;
  background: #34495e;
  border-top: 1px solid #2c3e50;
  text-align: center;
}

.chat-info p {
  margin: 0;
  color: #95a5a6;
  font-size: 0.85rem;
  font-style: italic;
}
</style>

