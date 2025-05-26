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
  const lobbyNameInput = document.getElementById('lobbyName');
  const createLobbyButton = document.getElementById('createLobbyButton');

  // Join Lobby Elements
  const joinLobbyScreen = document.getElementById('joinLobbyScreen');
  const lobbyCodeInput = document.getElementById('lobbyCode');
  const joinLobbyButton = document.getElementById('joinLobbyButton');

  // Host Lobby Elements
  const hostLobbyScreen = document.getElementById('hostLobbyScreen');
  const lobbyNameDisplay = document.querySelectorAll('#lobbyNameDisplay');
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
  let terrainMesh = null;

  // For debugging only
  // const instantStart = true;
  // if(instantStart){
  //   homeScreen.style.display = "none";
  //   gameCanvas.style.display = "block";
  //   singlePlayerMenuScreen.classList.add('hidden');
  //   game = new Game(gameCanvas, socket);
  //   game.start();
  // }

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
  }

  /////////////////////////////////////////////////////
  // Single Player Menu Events
  /////////////////////////////////////////////////////
  singlePlayerMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    singlePlayerMenuScreen.classList.remove('hidden');
  });

singlePlayerStartButton?.addEventListener('click', () => {
  homeScreen.style.display = "none";
  gameCanvas.style.display = "block";
  singlePlayerMenuScreen.classList.add('hidden');
  game = new Game(gameCanvas, socket, host, terrainMesh);
  game.start();
  window.game = game; // for debugging
});

  /////////////////////////////////////////////////////
  // Create Lobby Menu Events
  /////////////////////////////////////////////////////
  createLobbyMenuButton?.addEventListener('click', () => {
    hideAllScreens();
    createLobbyScreen.classList.remove('hidden');
  });

  createLobbyButton?.addEventListener('click', () => {
    const lobbyName = lobbyNameInput.value.trim();
    if (lobbyName) {
      socket.emit('createLobbyRequest', { lobbyName, socketId: socket.id });
    }
  });

  // Server -> Client: Lobby created
  socket.on('lobbyCreated', (data) => {
    hideAllScreens();
    hostLobbyScreen.classList.remove('hidden');
    
    lobbyNameDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyName;
    });
    
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
    
    lobbyNameDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyName;
    });
    
    lobbyCodeDisplay.forEach(el => {
      if (el) el.textContent = data.lobbyId;
    });
    
    updatePlayerList(data.players);
    host = false;
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

startGameButton?.addEventListener('click', () => {
  if (host) {
    socket.emit('startGameRequest');
    
    homeScreen.style.display = "none";
    gameCanvas.style.display = "block";
    game = new Game(gameCanvas, socket, host, terrainMesh);
    game.start();
  }
});

// Server -> Client: Game started by host
socket.on('gameStarted', () => {
  homeScreen.style.display = "none";
  gameCanvas.style.display = "block";
  game = new Game(gameCanvas, socket, host, terrainMesh);
  game.start();
});
});