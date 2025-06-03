import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
  /////////////////////////////////////////////////////
  // DOM Elements
  /////////////////////////////////////////////////////

  // Main Menu
  const homeScreen = document.getElementById('homeScreen');
  const mainMenuScreen = document.getElementById('mainMenuScreen');
  const singlePlayerMenuButton = document.getElementById('singlePlayerMenuButton');
  const joinLobbyMenuButton = document.getElementById('joinLobbyMenuButton');
  const createLobbyMenuButton = document.getElementById('createLobbyMenuButton');

  // Single Player
  const singlePlayerMenuScreen = document.getElementById('singlePlayerMenuScreen');
  const singlePlayerStartButton = document.getElementById('singlePlayerStartButton');

  // Create Lobby
  const createLobbyScreen = document.getElementById('createLobbyScreen');
  const hostNicknameInput = document.getElementById('hostNickname');
  const createLobbyButton = document.getElementById('createLobbyButton');

  // Join Lobby
  const joinLobbyScreen = document.getElementById('joinLobbyScreen');
  const lobbyCodeInput = document.getElementById('lobbyCode');
  const joinLobbyButton = document.getElementById('joinLobbyButton');

  // Host Lobby
  const hostLobbyScreen = document.getElementById('hostLobbyScreen');
  const hostNicknameDisplay = document.querySelectorAll('#hostNicknameDisplay');
  const lobbyCodeDisplay = document.querySelectorAll('#lobbyCodeDisplay');
  const playerListItems = document.querySelectorAll('#playerListItems');
  const startGameButton = document.getElementById('startGameButton');

  // Participant Lobby
  const participantLobbyScreen = document.getElementById('participantLobbyScreen');

  // Common Lobby Elements
  const leaveLobbyButtons = document.querySelectorAll('#leaveLobbyButton');

  // Game Canvas
  const gameCanvas = document.getElementById('gameCanvas');
  const gameContainer = document.getElementById('gameContainer');

  /////////////////////////////////////////////////////
  // State Variables
  /////////////////////////////////////////////////////

  let socket = null;
  let game;
  let host = true;
  let terrainData = null;
  let currentLobbyId = null;

  try {
    socket = io();
  } catch (error) {
    console.error('Error initializing socket:', error);
  }

  /////////////////////////////////////////////////////
  // Navigation Functions
  /////////////////////////////////////////////////////

  function hideAllScreens() {
    [
      mainMenuScreen,
      singlePlayerMenuScreen,
      createLobbyScreen,
      joinLobbyScreen,
      hostLobbyScreen,
      participantLobbyScreen
    ].forEach(screen => {
      if (screen) screen.classList.add('hidden');
    });
  }

  function showMainMenu() {
    hideAllScreens();
    mainMenuScreen.classList.remove('hidden');
    currentLobbyId = null;
    terrainData = null;
  }

  /////////////////////////////////////////////////////
  // Game Start
  /////////////////////////////////////////////////////

  function startGameForPlayer() {
    console.log('=== STARTING GAME FOR PLAYER ===');

    hideAllScreens();
    homeScreen.style.display = 'none';
    gameCanvas.style.display = 'block';

    console.log('🎮 Creating new Game instance');

    game = new Game(gameCanvas, socket, host, terrainData);
    game.start();
    window.game = game; // For debugging

    console.log('✅ Game started successfully');

    if (currentLobbyId && socket.connected) {
      socket.emit('confirmGameStart', {
        lobbyId: currentLobbyId,
        socketId: socket.id
      });
    }
  }

  /////////////////////////////////////////////////////
  // Menu Event Handlers
  /////////////////////////////////////////////////////

  // Single Player
  singlePlayerMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    singlePlayerMenuScreen.classList.remove('hidden');
  });

  singlePlayerStartButton?.addEventListener('click', () => {
    startGameForPlayer();
  });

  // Create Lobby
  createLobbyMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    createLobbyScreen.classList.remove('hidden');
  });

  createLobbyButton?.addEventListener('click', () => {
    const hostNickname = hostNicknameInput.value.trim();
    socket.emit('createLobbyRequest', { hostNickname, socketId: socket.id });
  });

  // Join Lobby
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

  /////////////////////////////////////////////////////
  // Lobby Updates from Server
  /////////////////////////////////////////////////////

  socket.on('lobbyCreated', (data) => {
    hideAllScreens();
    hostLobbyScreen.classList.remove('hidden');

    currentLobbyId = data.lobbyId;
    host = true;

    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });

    updatePlayerList(data.players);
  });

  socket.on('lobbyJoined', (data) => {
    hideAllScreens();
    participantLobbyScreen.classList.remove('hidden');

    currentLobbyId = data.lobbyId;
    host = false;

    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });

    updatePlayerList(data.players);

    if (data.terrainData) {
      terrainData = data.terrainData;
      if (data.gameStarted) {
        setTimeout(startGameForPlayer, 100);
      }
    }
  });

  socket.on('lobbyUpdated', (data) => {
    updatePlayerList(data.players);
  });

  socket.on('gameStarted', (data) => {
    console.log('=== RECEIVED GAME STARTED EVENT ===');

    terrainData = data.terrainData;

    if (!host) {
      console.log('🚀 Starting game for non-host player');
      setTimeout(startGameForPlayer, 100);
    }
  });

  socket.on('terrainDataReceived', (data) => {
    console.log('Received terrain data from host (legacy event)');
    terrainData = data.terrainData;
  });

  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message);
  });

  /////////////////////////////////////////////////////
  // Lobby Actions
  /////////////////////////////////////////////////////

  function updatePlayerList(players) {
    playerListItems.forEach(el => {
      if (el) {
        el.innerHTML = '';
        players.forEach(player => {
          const li = document.createElement('li');
          li.textContent = player.name || player.id;
          if (player.isHost) li.textContent += ' (Host)';
          el.appendChild(li);
        });
      }
    });
  }

  leaveLobbyButtons.forEach(button => {
    button?.addEventListener('click', () => {
      socket.emit('leaveLobbyRequest');
      showMainMenu();
    });
  });

  startGameButton?.addEventListener('click', () => {
    console.log('=== HOST START GAME BUTTON CLICKED ===');
    if (host && currentLobbyId) {
      socket.emit('startGame', { lobbyId: currentLobbyId });
      startGameForPlayer();
    } else {
      console.log('❌ Cannot start game - missing requirements');
    }
  });
});
