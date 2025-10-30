<template>
  <div class="canvas-container">
    <div class="canvas-wrapper">
      <canvas 
        ref="canvasRef" 
        @click="handleCanvasClick"
        width="600"
        height="600"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { Socket } from 'socket.io-client'
import bg1Image from '../img/bg1.jpeg'
import bg2Image from '../img/bg2.jpeg'
import bg3Image from '../img/bg3.jpg'
import avatarImage from '../img/avatar.png'
import flowerImage from '../img/blomst.png'

interface User {
  id: string
  username?: string
  gridX: number
  gridY: number
  chatMessage?: string | null
  avatar?: {
    type: string
    hairColor: string
    skinTone: string
    clothingColor: string
  }
}

interface Props {
  socket: Socket | null
  isConnected: boolean
  username?: string
}

const props = defineProps<Props>()

// Grid configuration - diamonds filling entire canvas with NO gaps
const GRID_COLS = 10
const GRID_ROWS = 32
const DIAMOND_WIDTH = 75   // Width of each diamond
const DIAMOND_HEIGHT = 37.5  // Height must be exactly half of width for no gaps

interface Item {
  id: string
  type: string
  gridX: number
  gridY: number
  room: string
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const users = ref<Record<string, User>>({})
const items = ref<Record<string, Item>>({})  // Items in the world
const inventory = ref<Array<{ id: string, type: string }>>([])  // User's inventory
const localPlayer = ref({ 
  gridX: 0, 
  gridY: 0,
  username: undefined as string | undefined,
  chatMessage: null as string | null,
  avatar: {
    type: 'male1',
    hairColor: '#8B4513',
    skinTone: '#FFDBAC',
    clothingColor: '#4caf50'
  }
})
const typingMessage = ref('')  // Message being typed
const showGrid = ref(false)  // Toggle for showing/hiding grid - hidden by default
const currentRoom = ref('room1')  // Current room
let animationFrameId: number | null = null
let backgroundImages: Record<string, HTMLImageElement> = {}
let avatarImg: HTMLImageElement | null = null
let flowerImg: HTMLImageElement | null = null

// Emit online count, room changes, user selection, and inventory updates to parent
const emit = defineEmits(['update-online', 'update-room', 'user-selected', 'inventory-updated'])

// Toggle grid visibility
const toggleGrid = () => {
  showGrid.value = !showGrid.value
}

// Expose toggleGrid so parent can call it
defineExpose({
  toggleGrid
})

const setupCanvas = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  // Fixed square canvas size
  canvas.width = 600
  canvas.height = 600
}

// Convert grid position to screen coordinates - tight isometric layout with NO gaps
const gridToScreen = (col: number, row: number) => {
  // Start from edge to fill entire canvas
  const offsetX = 0
  const offsetY = 0
  
  // Every other row is offset by half a diamond width
  const rowOffset = (row % 2) * (DIAMOND_WIDTH / 2)
  
  // Rows are spaced by half the diamond height for tight fit
  const x = offsetX + col * DIAMOND_WIDTH + rowOffset
  const y = offsetY + row * (DIAMOND_HEIGHT / 2)
  
  return { x, y }
}

// Convert screen coordinates to grid position - finds nearest diamond
const screenToGrid = (screenX: number, screenY: number) => {
  let closestCol = 0
  let closestRow = 0
  let minDistance = Infinity
  
  // Check all grid positions to find the nearest one
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const pos = gridToScreen(col, row)
      
      // Calculate distance from click to this diamond center
      const dx = screenX - pos.x
      const dy = screenY - pos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Update if this is closer
      if (distance < minDistance) {
        minDistance = distance
        closestCol = col
        closestRow = row
      }
    }
  }
  
  return { col: closestCol, row: closestRow }
}

// Draw diamond-shaped tile at grid position
const drawTile = (ctx: CanvasRenderingContext2D, col: number, row: number) => {
  const pos = gridToScreen(col, row)
  const x = pos.x
  const y = pos.y
  const halfWidth = DIAMOND_WIDTH / 2
  const halfHeight = DIAMOND_HEIGHT / 2
  
  // Diamond shape
  ctx.beginPath()
  ctx.moveTo(x, y - halfHeight)           // Top
  ctx.lineTo(x + halfWidth, y)            // Right
  ctx.lineTo(x, y + halfHeight)           // Bottom
  ctx.lineTo(x - halfWidth, y)            // Left
  ctx.closePath()
  
  // Checkerboard pattern
  const isEven = (col + row) % 2 === 0
  ctx.fillStyle = isEven ? 'rgba(180, 160, 140, 0.75)' : 'rgba(160, 140, 120, 0.75)'
  ctx.fill()
  
  // Border
  ctx.strokeStyle = 'rgba(80, 60, 40, 0.9)'
  ctx.lineWidth = 1
  ctx.stroke()
  
  // Draw index number only for valid grid positions
  if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${col},${row}`, x, y)
  }
}

// Draw item on the ground
const drawItem = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
  if (type === 'flower' && flowerImg && flowerImg.complete) {
    // Draw flower image using full height
    const imgHeight = 60  // Use full height
    const aspectRatio = flowerImg.width / flowerImg.height
    const imgWidth = imgHeight * aspectRatio
    // Draw from higher up so it extends upward like avatar
    ctx.drawImage(flowerImg, x - imgWidth / 2, y - imgHeight + 10, imgWidth, imgHeight)
  } else {
    // Fallback to emoji if image not loaded
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🌸', x, y + 5)
  }
}

const drawAvatar = (ctx: CanvasRenderingContext2D, x: number, y: number, username?: string) => {
  if (avatarImg && avatarImg.complete) {
    // Draw the custom avatar image - use full height, can overlap tiles above
    const imgWidth = 50
    const imgHeight = 75  // Taller to use full height
    // Draw from higher up so it extends upward
    ctx.drawImage(avatarImg, x - imgWidth / 2, y - imgHeight + 10, imgWidth, imgHeight)
  } else {
    // Fallback if image not loaded - simple circle
    ctx.fillStyle = '#4caf50'
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  
  // Draw username below avatar
  if (username) {
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    
    // Background
    const textMetrics = ctx.measureText(username)
    const textWidth = textMetrics.width
    const padding = 4
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(x - textWidth / 2 - padding, y + 15 - padding, textWidth + padding * 2, 20)
    
    // Text
    ctx.fillStyle = '#2ecc71'
    ctx.fillText(username, x, y + 15)
  }
}

const drawChatBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, message: string) => {
  const padding = 10
  const maxWidth = 180
  
  ctx.font = '13px Arial'
  const lines = wrapText(ctx, message, maxWidth - padding * 2)
  const lineHeight = 18
  const bubbleHeight = lines.length * lineHeight + padding * 2
  const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2)
  
  const bubbleX = x - bubbleWidth / 2
  const bubbleY = y - 60 - bubbleHeight
  
  // Bubble background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  
  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8)
  ctx.fill()
  ctx.stroke()
  
  // Pointer
  ctx.beginPath()
  ctx.moveTo(x - 5, bubbleY + bubbleHeight)
  ctx.lineTo(x, bubbleY + bubbleHeight + 8)
  ctx.lineTo(x + 5, bubbleY + bubbleHeight)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  
  // Text
  ctx.fillStyle = '#333'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  lines.forEach((line, i) => {
    ctx.fillText(line, x, bubbleY + padding + i * lineHeight)
  })
}

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  })
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}

const render = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Draw background image based on current room
  const bgImage = backgroundImages[currentRoom.value]
  if (bgImage && bgImage.complete) {
    // Draw image to fill the square canvas
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
  } else {
    // Fallback color if image not loaded
    ctx.fillStyle = '#8B7D6B'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  
  // Draw all diamond tiles - only if grid is visible
  if (showGrid.value) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        drawTile(ctx, col, row)
      }
    }
  }
  
  // Draw all items (before users so avatars render on top)
  Object.values(items.value).forEach(item => {
    const pos = gridToScreen(item.gridX, item.gridY)
    drawItem(ctx, pos.x, pos.y, item.type)
  })
  
  // Collect all users with their positions for z-ordering
  const allUsers: Array<{ x: number, y: number, row: number, user: User | typeof localPlayer.value }> = []
  
  // Add other users
  Object.values(users.value).forEach(user => {
    const pos = gridToScreen(user.gridX, user.gridY)
    allUsers.push({ x: pos.x, y: pos.y, row: user.gridY, user })
  })
  
  // Add local player
  const localPos = gridToScreen(localPlayer.value.gridX, localPlayer.value.gridY)
  allUsers.push({ x: localPos.x, y: localPos.y, row: localPlayer.value.gridY, user: localPlayer.value })
  
  // Sort by row then column for proper z-ordering
  allUsers.sort((a, b) => {
    const aUser = a.user as any
    const bUser = b.user as any
    if (aUser.gridY !== bUser.gridY) return aUser.gridY - bUser.gridY
    return aUser.gridX - bUser.gridX
  })
  
  // Draw all users
  allUsers.forEach(({ x, y, user }) => {
    drawAvatar(ctx, x, y, user.username)
    
    // Check if this is the local player typing
    const isLocalPlayer = 'avatar' in user && user === localPlayer.value
    
    // For local player, prioritize typing message over sent message
    if (isLocalPlayer && typingMessage.value) {
      // Show typing message as chat bubble
      drawChatBubble(ctx, x, y, typingMessage.value + '...')
    } else if (user.chatMessage) {
      // Show regular chat message
      drawChatBubble(ctx, x, y, user.chatMessage)
    }
  })
  
  animationFrameId = requestAnimationFrame(render)
}

const handleCanvasClick = (e: MouseEvent) => {
  if (!canvasRef.value || !props.socket) return
  
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top
  
  // First, check if we clicked on an existing user (avatar)
  // Check all users (including local player)
  const allUsers = [
    { ...localPlayer.value, id: 'local' },
    ...Object.entries(users.value).map(([id, user]) => ({ ...user, id }))
  ]
  
  for (const user of allUsers) {
    const pos = gridToScreen(user.gridX, user.gridY)
    const avatarWidth = 50
    const avatarHeight = 75
    
    // Check if click is within avatar bounds (roughly)
    const dx = clickX - pos.x
    const dy = clickY - (pos.y - avatarHeight / 2)  // Adjusted for avatar offset
    
    if (Math.abs(dx) < avatarWidth / 2 && dy > -avatarHeight / 2 && dy < avatarHeight / 2) {
      // Clicked on a user - emit event to show info
      emit('user-selected', { id: user.id, gridX: user.gridX, gridY: user.gridY })
      return
    }
  }
  
  // No user clicked - handle as movement
  const grid = screenToGrid(clickX, clickY)
  
  // Check if position is already occupied by another user
  const isOccupied = Object.values(users.value).some(
    user => user.gridX === grid.col && user.gridY === grid.row
  )
  
  if (isOccupied) {
    // Don't move if position is occupied
    return
  }
  
  // Update local position immediately for responsive feel
  localPlayer.value.gridX = grid.col
  localPlayer.value.gridY = grid.row
  
  // Send to server
  props.socket.emit('moveToGrid', { gridX: grid.col, gridY: grid.row })
}

// Handle keyboard input for chat and item pickup
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.socket) return
  
  // Ignore if typing in an input field (though we removed those)
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }
  
  if (e.key === ' ' || e.key === 'Spacebar') {
    // Pickup item with spacebar
    e.preventDefault()
    props.socket.emit('pickupItem')
  } else if (e.key === 'Enter') {
    // Send message
    if (typingMessage.value.trim()) {
      props.socket.emit('chat', typingMessage.value.trim())
      typingMessage.value = ''
    }
  } else if (e.key === 'Backspace') {
    // Delete last character
    typingMessage.value = typingMessage.value.slice(0, -1)
  } else if (e.key.length === 1 && typingMessage.value.length < 50) {
    // Add character (only printable characters, max 50)
    typingMessage.value += e.key
  }
}


onMounted(() => {
  setupCanvas()
  
  // Load all background images
  const bgImages = {
    room1: bg1Image,
    room2: bg2Image,
    room3: bg3Image
  }
  
  Object.entries(bgImages).forEach(([roomId, imgSrc]) => {
    const img = new Image()
    img.src = imgSrc
    img.onload = () => {
      render()
    }
    backgroundImages[roomId] = img
  })
  
  // Load avatar image
  avatarImg = new Image()
  avatarImg.src = avatarImage
  avatarImg.onload = () => {
    render()
  }
  
  // Load flower image
  flowerImg = new Image()
  flowerImg.src = flowerImage
  flowerImg.onload = () => {
    render()
  }
  
  window.addEventListener('resize', setupCanvas)
  window.addEventListener('keydown', handleKeyDown)
  
  // Start render loop
  render()
})

watch(() => props.socket, (socket) => {
  if (!socket) return
  
  socket.on('initialPosition', (data: { gridX: number, gridY: number, room: string }) => {
    // Set initial position from server
    localPlayer.value.gridX = data.gridX
    localPlayer.value.gridY = data.gridY
    localPlayer.value.username = props.username
    currentRoom.value = data.room
    emit('update-room', data.room)
  })
  
  socket.on('currentUsers', (currentUsers: User[]) => {
    // Replace users instead of adding to avoid duplicates
    const newUsers: Record<string, User> = {}
    currentUsers.forEach(user => {
      newUsers[user.id] = user
    })
    users.value = newUsers
    emit('update-online', Object.keys(users.value).length + 1)
  })
  
  socket.on('userJoined', (user: User) => {
    users.value[user.id] = user
    emit('update-online', Object.keys(users.value).length + 1)
  })
  
  socket.on('userMovedToGrid', (data: { id: string, gridX: number, gridY: number }) => {
    if (data.id === socket.id) {
      // Update our own position from server confirmation
      localPlayer.value.gridX = data.gridX
      localPlayer.value.gridY = data.gridY
    } else if (users.value[data.id]) {
      // Update other user's position
      users.value[data.id].gridX = data.gridX
      users.value[data.id].gridY = data.gridY
    }
  })
  
  socket.on('userChat', (data: { id: string, username: string, message: string }) => {
    if (data.id === socket.id) {
      localPlayer.value.chatMessage = data.message
    } else if (users.value[data.id]) {
      users.value[data.id].chatMessage = data.message
    }
  })
  
  socket.on('userChatCleared', (userId: string) => {
    if (userId === socket.id) {
      localPlayer.value.chatMessage = null
    } else if (users.value[userId]) {
      users.value[userId].chatMessage = null
    }
  })
  
  socket.on('userLeft', (userId: string) => {
    delete users.value[userId]
    emit('update-online', Object.keys(users.value).length + 1)
  })
  
  // Item events
  socket.on('roomItems', (roomItems: Array<Item>) => {
    // Replace items with new room items
    const newItems: Record<string, Item> = {}
    roomItems.forEach(item => {
      newItems[item.id] = item
    })
    items.value = newItems
  })

  socket.on('itemPickedUp', (data: { itemId: string, userId: string }) => {
    // Remove item from world
    delete items.value[data.itemId]
  })

  socket.on('itemDropped', (item: Item) => {
    // Add item to world
    items.value[item.id] = item
  })

  socket.on('inventoryUpdate', (newInventory: Array<{ id: string, type: string }>) => {
    // Update local inventory
    inventory.value = newInventory
    emit('inventory-updated', newInventory)
  })

  socket.on('roomChanged', (data: { room: string, gridX: number, gridY: number }) => {
    // Clear all users from old room
    users.value = {}
    // Clear items from old room (will be repopulated by roomItems event)
    items.value = {}
    // Update current room
    currentRoom.value = data.room
    emit('update-room', data.room)
    // Update local player position
    localPlayer.value.gridX = data.gridX
    localPlayer.value.gridY = data.gridY
    // currentUsers event will populate users.value with users in new room
    emit('update-online', 1)
  })
}, { immediate: true })

onUnmounted(() => {
  window.removeEventListener('resize', setupCanvas)
  window.removeEventListener('keydown', handleKeyDown)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.canvas-wrapper {
  width: 600px;
  height: 600px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
}

canvas {
  display: block;
  cursor: pointer;
}
</style>

