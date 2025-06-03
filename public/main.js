import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Main Menu
  const homeScreen = document.getElementById('homeScreen');
  const mainMenuScreen = document.getElementById('mainMenuScreen');
  const singlePlayerMenuButton = document.getElementById('singlePlayerMenuButton');
  const joinLobbyMenuButton = document.getElementById('joinLobbyMenuButton');
  const createLobbyMenuButton = document.getElementById('createLobbyMenuButton');

  // Single Player Elements
  const singlePlayerMenuScreen = document.getElementById('singlePlayerMenuScreen');
  const singlePlayerStartButton = document.getElementById('singlePlayerStartButton');

  // Create Lobby Elements
  const createLobbyScreen = document.getElementById('createLobbyScreen');
  const hostNicknameInput = document.getElementById('hostNickname');
  const createLobbyButton = document.getElementById('createLobbyButton');

  // Join Lobby Elements
  const joinLobbyScreen = document.getElementById('joinLobbyScreen');
  const lobbyCodeInput = document.getElementById('lobbyCode');
  const joinLobbyButton = document.getElementById('joinLobbyButton');

  // Host Lobby Elements
  const hostLobbyScreen = document.getElementById('hostLobbyScreen');
  const hostNicknameDisplay = document.querySelectorAll('#hostNicknameDisplay');
  const lobbyCodeDisplay = document.querySelectorAll('#lobbyCodeDisplay');
  const playerListItems = document.querySelectorAll('#playerListItems');
  const startGameButton = document.getElementById('startGameButton');
  
  // Participant Lobby Elements
  const participantLobbyScreen = document.getElementById('participantLobbyScreen');

  // Common Lobby Elements
  const leaveLobbyButtons = document.querySelectorAll('#leaveLobbyButton');

  // Game Canvas
  const gameCanvas = document.getElementById('gameCanvas');
  const gameContainer = document.getElementById('gameContainer');

  // Socket Connection
  let socket = null;
  try {
    socket = io();
  } catch (error) {
    console.error('Error initializing socket:', error);
  }
  
  let game;
  let host = true;
  let terrainData = null;
  let currentLobbyId = null; // Track current lobby

  /////////////////////////////////////////////////////
  // Navigation Functions
  /////////////////////////////////////////////////////
  function hideAllScreens() {
    const screens = [
      mainMenuScreen, 
      singlePlayerMenuScreen, 
      createLobbyScreen, 
      joinLobbyScreen, 
      hostLobbyScreen, 
      participantLobbyScreen
    ];
    
    screens.forEach(screen => {
      if (screen) screen.classList.add('hidden');
    });
  }

  function showMainMenu() {
    hideAllScreens();
    mainMenuScreen.classList.remove('hidden');
    // Reset lobby state when returning to main menu
    currentLobbyId = null;
    terrainData = null;
  }

  function startGameForPlayer() {
    console.log('=== STARTING GAME FOR PLAYER ===');
    console.log('Player state:', {
      host: host,
      socketId: socket.id,
      currentLobbyId: currentLobbyId,
      terrainData: terrainData ? 'present' : 'null'
    });
    
    hideAllScreens();
    homeScreen.style.display = "none";
    gameCanvas.style.display = "block";
    
    console.log('🎮 Creating new Game instance');
    game = new Game(gameCanvas, socket, host, terrainData);
    game.start();
    window.game = game; // for debugging
    console.log('✅ Game started successfully');
  }

  /////////////////////////////////////////////////////
  // Single Player Menu Events
  /////////////////////////////////////////////////////
  singlePlayerMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    singlePlayerMenuScreen.classList.remove('hidden');
  });

  singlePlayerStartButton?.addEventListener('click', () => {
    startGameForPlayer();
  });

  /////////////////////////////////////////////////////
  // Create Lobby Menu Events
  /////////////////////////////////////////////////////
  createLobbyMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    createLobbyScreen.classList.remove('hidden');
  });

  createLobbyButton?.addEventListener('click', () => {
    const hostNickname = hostNicknameInput.value.trim();
    socket.emit('createLobbyRequest', { hostNickname, socketId: socket.id });
  });

  // Server -> Client: Lobby created
  socket.on('lobbyCreated', (data) => {
    hideAllScreens();
    hostLobbyScreen.classList.remove('hidden');
    
    currentLobbyId = data.lobbyId;
    
    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });
    
    updatePlayerList(data.players);
    host = true;
  });

  /////////////////////////////////////////////////////
  // Join Lobby Menu Events
  /////////////////////////////////////////////////////
  joinLobbyMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    joinLobbyScreen.classList.remove('hidden');
  });

  joinLobbyButton?.addEventListener('click', () => {
    const lobbyCode = lobbyCodeInput.value.trim().toUpperCase();
    if (lobbyCode) {
      socket.emit('joinLobbyRequest', { lobbyId: lobbyCode, socketId: socket.id });
    }
  });

  // Server -> Client: Joined a lobby
  socket.on('lobbyJoined', (data) => {
    hideAllScreens();
    participantLobbyScreen.classList.remove('hidden');
    
    currentLobbyId = data.lobbyId;
    
    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });
    
    updatePlayerList(data.players);
    host = false;
    
    // Check if terrain data was included (for existing lobbies where game already started)
    if (data.terrainData) {
      terrainData = data.terrainData;
      console.log('Received existing terrain data when joining lobby');
      // If game has already started, start it for this player too
      if (data.gameStarted) {
        setTimeout(() => startGameForPlayer(), 100); // Small delay to ensure UI is ready
      }
    }
  });

  /////////////////////////////////////////////////////
  // Common Lobby Functions
  /////////////////////////////////////////////////////
  function updatePlayerList(players) {
    playerListItems.forEach(el => {
      if (el) {
        el.innerHTML = '';
        players.forEach(player => {
          const li = document.createElement('li');
          li.textContent = player.name || player.id;
          if (player.isHost) {
            li.textContent += ' (Host)';
          }
          el.appendChild(li);
        });
      }
    });
  }

  // Leave Lobby Buttons
  leaveLobbyButtons.forEach(button => {
    button?.addEventListener('click', () => {
      socket.emit('leaveLobbyRequest');
      showMainMenu();
    });
  });

  // Server -> Client: Lobby updated (new player joined, player left, etc.)
  socket.on('lobbyUpdated', (data) => {
    updatePlayerList(data.players);
  });

  // Start game button for host
  startGameButton?.addEventListener('click', () => {
    console.log('=== HOST START GAME BUTTON CLICKED ===');
    console.log('Current state:', {
      host: host,
      currentLobbyId: currentLobbyId,
      terrainData: terrainData ? 'present' : 'null',
      socketId: socket.id
    });
    
    if (host && currentLobbyId) {
      console.log('✅ Host starting game for lobby:', currentLobbyId);
      // Notify server that game is starting
      socket.emit('startGame', { lobbyId: currentLobbyId });
      console.log('📤 Emitted startGame event to server');
      // Start the game for the host
      startGameForPlayer();
      console.log('🎮 Started game for host');
    } else {
      console.log('❌ Cannot start game - missing requirements:', {
        isHost: host,
        hasLobbyId: !!currentLobbyId
      });
    }
  });

  // Server -> Client: Game started by host
  socket.on('gameStarted', (data) => {
    console.log('=== RECEIVED GAME STARTED EVENT ===');
    console.log('Event data:', {
      terrainDataPresent: !!data.terrainData,
      currentHost: host,
      socketId: socket.id,
      currentLobbyId: currentLobbyId
    });
    
    terrainData = data.terrainData;
    console.log('💾 Terrain data stored');
    
    // Start the game for non-host players
    if (!host) {
      console.log('🚀 Starting game for non-host player');
      setTimeout(() => {
        console.log('⏰ Timeout executed, calling startGameForPlayer');
        startGameForPlayer();
      }, 100); // Small delay to ensure terrain data is set
    } else {
      console.log('ℹ️ Skipping game start - this is the host');
    }
  });

  // Legacy event - keeping for compatibility but shouldn't be needed with new flow
  socket.on('terrainDataReceived', (data) => {
    console.log('Received terrain data from host (legacy event)');
    terrainData = data.terrainData;
  });

  // Handle errors
  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message);
  });
});