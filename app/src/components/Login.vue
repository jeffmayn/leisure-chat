<template>
  <div class="login-container">
    <div class="login-box">
      <h1>🏠 Leisure</h1>
      <p class="subtitle">Log ind for at starte</p>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Brugernavn:</label>
          <input 
            v-model="username" 
            type="text" 
            placeholder="Jeffmayn eller Zoidberg"
            required
            autofocus
          />
        </div>
        
        <div class="form-group">
          <label>Password:</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="password123"
            required
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <button type="submit" class="login-btn" :disabled="isLoading">
          {{ isLoading ? 'Logger ind...' : 'Log ind' }}
        </button>
      </form>
      
      <div class="hint">
        <p><strong>Test brugere:</strong></p>
        <p>Jeffmayn / password123</p>
        <p>Zoidberg / password123</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  socket: any
}

const props = defineProps<Props>()
const emit = defineEmits(['loginSuccess'])

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const handleLogin = () => {
  if (!props.socket) {
    error.value = 'Ingen forbindelse til serveren'
    return
  }
  
  error.value = ''
  isLoading.value = true
  
  // Send login request
  props.socket.emit('login', {
    username: username.value,
    password: password.value
  })
  
  // Save password to localStorage (for auto-login on refresh)
  localStorage.setItem('leisure_password', password.value)
  
  // Listen for response
  props.socket.once('loginSuccess', (data: { username: string }) => {
    isLoading.value = false
    emit('loginSuccess', data.username)
  })
  
  props.socket.once('loginError', (message: string) => {
    isLoading.value = false
    error.value = message
    // Clear saved password if login fails
    localStorage.removeItem('leisure_password')
  })
}
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
}

.login-box {
  background: #34495e;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 400px;
  max-width: 90%;
}

h1 {
  color: #ecf0f1;
  text-align: center;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.subtitle {
  color: #95a5a6;
  text-align: center;
  margin: 0 0 2rem 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  color: #ecf0f1;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #2c3e50;
  background: #2c3e50;
  color: #ecf0f1;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #3498db;
}

.error-message {
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover:not(:disabled) {
  background: #27ae60;
}

.login-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.hint {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #2c3e50;
  color: #95a5a6;
  font-size: 0.85rem;
}

.hint p {
  margin: 0.3rem 0;
  text-align: center;
}

.hint strong {
  color: #ecf0f1;
}
</style>

